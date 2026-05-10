from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.api.deps import get_current_user, get_pipeline
from rag_app.api.v1.schemas import AskRequest, AskResponse, ContextChunk
from rag_app.db.models import User
from rag_app.db.session import get_session
from rag_app.rag.pipeline import RAGPipeline
from rag_app.services.knowledge_bases import KnowledgeBaseService
from rag_app.storage.vector.base import RetrievedChunk

router = APIRouter()


def _map_context(ctx: RetrievedChunk) -> ContextChunk:
    return ContextChunk(
        chunk_id=ctx.chunk_id,
        document_id=ctx.document_id,
        document_name=ctx.document_name,
        content=ctx.content,
        score=ctx.score,
        presigned_url=getattr(ctx, "presigned_url", None),
    )


@router.post("", response_model=AskResponse, summary="Задать вопрос к базе знаний")
async def ask(
    payload: AskRequest,
    session: AsyncSession = Depends(get_session),
    pipeline: RAGPipeline = Depends(get_pipeline),
    current_user: User = Depends(get_current_user),
) -> AskResponse:
    question = payload.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Вопрос не может быть пустым"
        )

    kb_service = KnowledgeBaseService(session)

    if current_user.role != "admin":
        has_access = await kb_service.has_access(current_user.id, payload.knowledge_base_id)
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к этой базе знаний",
            )

    result = await pipeline.ask(
        session,
        question,
        knowledge_base_id=payload.knowledge_base_id,
        session_id=payload.session_id,
        user_id=current_user.id,
    )
    contexts = [_map_context(ctx) for ctx in result["contexts"]]
    return AskResponse(
        answer=result["answer"],
        contexts=contexts,
        session_id=result["session_id"],
    )
