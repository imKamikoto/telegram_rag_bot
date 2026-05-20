from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.api.deps import get_current_user, get_pipeline, require_admin_user
from rag_app.db.models import ChatMessage, ChatSession, Document, KnowledgeBase
from rag_app.api.v1.schemas import (
    KBAccessRequest,
    KBMemberListResponse,
    KBMemberResponse,
    KbQueryItem,
    KbQueryListResponse,
    KnowledgeBaseCreateRequest,
    KnowledgeBaseListResponse,
    KnowledgeBaseResponse,
)
from rag_app.db.models import User
from rag_app.db.session import get_session
from rag_app.rag.pipeline import RAGPipeline
from rag_app.services.knowledge_bases import KnowledgeBaseService, KnowledgeBaseServiceError
from rag_app.services.stats import StatsService

router = APIRouter()


def _kb_response(kb: KnowledgeBase) -> KnowledgeBaseResponse:
    return KnowledgeBaseResponse(
        id=kb.id,
        name=kb.name,
        description=kb.description,
        created_by=kb.created_by,
        created_at=kb.created_at,
    )


def _handle_kb_error(exc: KnowledgeBaseServiceError) -> HTTPException:
    return HTTPException(status_code=int(exc.status_code), detail=exc.message)


@router.post("", response_model=KnowledgeBaseResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base(
    payload: KnowledgeBaseCreateRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin_user),
) -> KnowledgeBaseResponse:
    service = KnowledgeBaseService(session)
    try:
        kb = await service.create(
            name=payload.name,
            description=payload.description,
            created_by=current_user.id,
        )
    except KnowledgeBaseServiceError as exc:
        raise _handle_kb_error(exc) from exc

    await StatsService(session).log(
        "kb_created",
        actor_id=current_user.id,
        knowledge_base_id=kb.id,
        meta={"name": kb.name},
    )
    return _kb_response(kb)


@router.get("", response_model=KnowledgeBaseListResponse)
async def list_knowledge_bases(
    limit: int = 100,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> KnowledgeBaseListResponse:
    service = KnowledgeBaseService(session)
    if current_user.role == "admin":
        kbs = await service.list_all(limit=limit, offset=offset)
    else:
        kbs = await service.list_for_user(current_user.id)
    return KnowledgeBaseListResponse(knowledge_bases=[_kb_response(kb) for kb in kbs])


@router.get("/{kb_id}", response_model=KnowledgeBaseResponse)
async def get_knowledge_base(
    kb_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> KnowledgeBaseResponse:
    service = KnowledgeBaseService(session)
    kb = await service.get_by_id(kb_id)
    if kb is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="База знаний не найдена")

    if current_user.role != "admin":
        has_access = await service.has_access(current_user.id, kb_id)
        if not has_access:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нет доступа")

    return _kb_response(kb)


@router.delete("/{kb_id}", response_model=KnowledgeBaseResponse)
async def delete_knowledge_base(
    kb_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin_user),
    pipeline: RAGPipeline = Depends(get_pipeline),
) -> KnowledgeBaseResponse:
    # Собираем s3_key ДО удаления — потом документов уже не будет
    s3_keys_result = await session.execute(
        select(Document.s3_key).where(
            Document.knowledge_base_id == kb_id,
            Document.s3_key.is_not(None),
        )
    )
    s3_keys = [row[0] for row in s3_keys_result.all()]

    service = KnowledgeBaseService(session)
    try:
        kb = await service.delete(kb_id)
    except KnowledgeBaseServiceError as exc:
        raise _handle_kb_error(exc) from exc

    # Чистим файлы из MinIO (если настроен)
    if pipeline.minio and s3_keys:
        for key in s3_keys:
            try:
                await pipeline.minio.delete_file(key)
            except Exception:
                pass

    # Инвалидируем кеш
    if pipeline.cache:
        try:
            await pipeline.cache.invalidate_kb_cache(kb_id)
        except Exception:
            pass

    await StatsService(session).log(
        "kb_deleted",
        actor_id=current_user.id,
        meta={"name": kb.name},
    )
    return _kb_response(kb)


@router.get("/{kb_id}/members", response_model=KBMemberListResponse)
async def list_kb_members(
    kb_id: int,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin_user),
) -> KBMemberListResponse:
    service = KnowledgeBaseService(session)
    members = await service.list_members(kb_id)
    return KBMemberListResponse(
        members=[
            KBMemberResponse(
                user_id=m.user_id,
                knowledge_base_id=m.knowledge_base_id,
                created_at=m.created_at,
            )
            for m in members
        ]
    )


@router.post("/{kb_id}/members", response_model=KBMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_kb_member(
    kb_id: int,
    payload: KBAccessRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin_user),
) -> KBMemberResponse:
    service = KnowledgeBaseService(session)
    try:
        access = await service.grant_access(user_id=payload.user_id, kb_id=kb_id)
    except KnowledgeBaseServiceError as exc:
        raise _handle_kb_error(exc) from exc

    await StatsService(session).log(
        "kb_access_granted",
        actor_id=current_user.id,
        target_user_id=payload.user_id,
        knowledge_base_id=kb_id,
    )
    return KBMemberResponse(
        user_id=access.user_id,
        knowledge_base_id=access.knowledge_base_id,
        created_at=access.created_at,
    )


@router.get("/{kb_id}/queries", response_model=KbQueryListResponse, summary="История запросов к базе знаний")
async def list_kb_queries(
    kb_id: int,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin_user),
) -> KbQueryListResponse:
    rows = await session.execute(
        select(ChatMessage)
        .join(ChatSession, ChatSession.id == ChatMessage.session_id)
        .where(
            ChatSession.knowledge_base_id == kb_id,
            ChatMessage.role == "user",
        )
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    messages = list(rows.scalars())
    return KbQueryListResponse(
        queries=[
            KbQueryItem(
                id=m.id,
                role=m.role,
                content=m.content,
                created_at=m.created_at,
                sources_json=m.sources_json,
            )
            for m in messages
        ]
    )


@router.delete("/{kb_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_kb_member(
    kb_id: int,
    user_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin_user),
) -> None:
    service = KnowledgeBaseService(session)
    try:
        await service.revoke_access(user_id=user_id, kb_id=kb_id)
    except KnowledgeBaseServiceError as exc:
        raise _handle_kb_error(exc) from exc

    await StatsService(session).log(
        "kb_access_revoked",
        actor_id=current_user.id,
        target_user_id=user_id,
        knowledge_base_id=kb_id,
    )
