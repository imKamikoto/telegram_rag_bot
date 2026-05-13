from typing import Literal, cast

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.api.deps import get_current_user, require_admin_user
from rag_app.api.v1.schemas import (
    AuthResponse,
    InviteCodeCreateRequest,
    InviteCodeInfo,
    InviteCodeListResponse,
    InviteCodeResponse,
    UserCreateByInviteRequest,
    UserCreateRequest,
    UserDeleteRequest,
    UserResponse,
    UserListResponse,
    UserRoleUpdateRequest,
)
from rag_app.db.models import User, UserKnowledgeBase
from rag_app.db.session import get_session
from rag_app.services.stats import StatsService
from rag_app.services.users import UserService, UsersServiceError

router = APIRouter()


def _handle_service_error(exc: UsersServiceError) -> HTTPException:
    return HTTPException(status_code=int(exc.status_code), detail=exc.message)


def _user_response(user: User, kb_ids: list[int] | None = None) -> UserResponse:
    return UserResponse(
        id=user.id,
        telegram_name=user.telegram_name,
        telegram_id=user.telegram_id,
        role=cast(Literal["user", "admin"], user.role),
        kb_ids=kb_ids or [],
    )


@router.get("/me", response_model=AuthResponse, summary="Get current Telegram WebApp user")
async def get_me(current_user: User = Depends(get_current_user)) -> AuthResponse:
    return AuthResponse(user=_user_response(current_user), is_admin=current_user.role == "admin")


@router.post("/direct", response_model=UserResponse, summary="Create user directly (admin)")
async def create_user_direct_endpoint(
    payload: UserCreateRequest,
    session: AsyncSession = Depends(get_session),
    _: object = Depends(require_admin_user),
) -> UserResponse:
    service = UserService(session)
    try:
        user = await service.create_user(
            telegram_name=payload.telegram_name,
            telegram_id=payload.telegram_id,
            role=payload.role,
        )
    except UsersServiceError as exc:
        raise _handle_service_error(exc) from exc

    return _user_response(user)


@router.post(
    "/invite-codes",
    response_model=InviteCodeResponse
)
async def create_invite_code_endpoint(
    payload: InviteCodeCreateRequest | None = None,
    session: AsyncSession = Depends(get_session),
    _: object = Depends(require_admin_user),
) -> InviteCodeResponse:
    service = UserService(session)
    try:
        invite = await service.create_invite_code(
            max_uses=payload.max_uses if payload else None,
            knowledge_base_id=payload.knowledge_base_id if payload else None,
            code=payload.code if payload else None,
        )
    except UsersServiceError as exc:
        raise _handle_service_error(exc) from exc

    return InviteCodeResponse(code=invite.code)


@router.get(
    "/invite-codes",
    response_model=InviteCodeListResponse,
    summary="List invite codes",
)
async def list_invite_codes_endpoint(
    limit: int = 100,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    _: object = Depends(require_admin_user),
) -> InviteCodeListResponse:
    service = UserService(session)
    invites = await service.list_invite_codes(limit=limit, offset=offset)
    return InviteCodeListResponse(
        invite_codes=[
            InviteCodeInfo(
                id=invite.id,
                code=invite.code,
                knowledge_base_id=invite.knowledge_base_id,
                max_uses=invite.max_uses,
                used_count=invite.used_count,
                is_used=invite.is_used,
                expires_at=invite.expires_at,
                created_at=invite.created_at,
            )
            for invite in invites
        ]
    )


@router.post("", response_model=UserResponse)
async def create_user_by_invite_endpoint(
    payload: UserCreateByInviteRequest,
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    service = UserService(session)
    try:
        user = await service.create_user_by_invite(
            invite_code=payload.invite_code,
            telegram_name=payload.telegram_name,
            telegram_id=payload.telegram_id,
        )
    except UsersServiceError as exc:
        raise _handle_service_error(exc) from exc

    return _user_response(user)


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role_endpoint(
    user_id: int,
    payload: UserRoleUpdateRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin_user),
) -> UserResponse:
    service = UserService(session)
    try:
        user = await service.update_user_role(user_id=user_id, role=payload.role)
    except UsersServiceError as exc:
        raise _handle_service_error(exc) from exc

    await StatsService(session).log(
        "role_changed",
        actor_id=current_user.id,
        target_user_id=user.id,
        meta={"new_role": payload.role},
    )
    return _user_response(user)


@router.delete("", response_model=UserResponse)
async def delete_user_endpoint(
    payload: UserDeleteRequest,
    session: AsyncSession = Depends(get_session),
    _: object = Depends(require_admin_user),
) -> UserResponse:
    service = UserService(session)
    try:
        user = await service.delete_user_by_telegram_id(payload.telegram_id)
    except UsersServiceError as exc:
        raise _handle_service_error(exc) from exc

    return _user_response(user)


@router.get("", response_model=UserListResponse, summary="List users")
async def list_users_endpoint(
    limit: int = 100,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    _: object = Depends(require_admin_user),
) -> UserListResponse:
    service = UserService(session)
    users = await service.list_users(limit=limit, offset=offset)

    # Batch-load KB memberships for all users
    user_ids = [u.id for u in users]
    kb_rows = await session.execute(
        select(UserKnowledgeBase.user_id, UserKnowledgeBase.knowledge_base_id)
        .where(UserKnowledgeBase.user_id.in_(user_ids))
    )
    kb_map: dict[int, list[int]] = {}
    for row in kb_rows.all():
        kb_map.setdefault(row.user_id, []).append(row.knowledge_base_id)

    return UserListResponse(users=[_user_response(u, kb_map.get(u.id, [])) for u in users])


@router.get(
    "/telegram/{telegram_id}",
    response_model=UserResponse,
    summary="Get user by telegram_id",
)
async def get_user_by_telegram_id(
    telegram_id: int,
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    service = UserService(session)
    user = await service.get_user_by_telegram_id(telegram_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_response(user)


@router.get("/{user_id}", response_model=UserResponse, summary="Get user by id")
async def get_user_by_id_endpoint(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    _: object = Depends(require_admin_user),
) -> UserResponse:
    service = UserService(session)
    user = await service.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_response(user)


@router.delete("/{user_id}", response_model=UserResponse, summary="Delete user by id")
async def delete_user_by_id_endpoint(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    _: object = Depends(require_admin_user),
) -> UserResponse:
    service = UserService(session)
    try:
        user = await service.delete_user_by_id(user_id)
    except UsersServiceError as exc:
        raise _handle_service_error(exc) from exc

    return _user_response(user)
