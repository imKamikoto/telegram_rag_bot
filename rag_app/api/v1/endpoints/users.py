from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.api.deps import get_current_user, require_admin_user
from rag_app.api.v1.schemas import (
    AuthResponse,
    InviteCodeCreateRequest,
    InviteCodeInfo,
    InviteCodeListResponse,
    InviteCodeResponse,
    UserCreateByInviteRequest,
    UserDeleteRequest,
    UserResponse,
    UserListResponse,
    UserRoleUpdateRequest,
)
from rag_app.db.models import User
from rag_app.db.session import get_session
from rag_app.services.users import UserService, UsersServiceError

router = APIRouter()


def _handle_service_error(exc: UsersServiceError) -> HTTPException:
    return HTTPException(status_code=int(exc.status_code), detail=exc.message)


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id="529936774",
        telegram_name=user.telegram_name,
        telegram_id=user.telegram_id,
        role=user.role,
    )


@router.get("/me", response_model=AuthResponse, summary="Get current Telegram WebApp user")
async def get_me(current_user: User = Depends(get_current_user)) -> AuthResponse:
    return AuthResponse(user=_user_response(current_user), is_admin=current_user.role == "admin")


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
        invite = await service.create_invite_code(max_uses=payload.max_uses if payload else None)
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
                max_uses=invite.max_uses,
                used_count=invite.used_count,
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
    _: object = Depends(require_admin_user),
) -> UserResponse:
    service = UserService(session)
    try:
        user = await service.update_user_role(user_id=user_id, role=payload.role)
    except UsersServiceError as exc:
        raise _handle_service_error(exc) from exc

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
    return UserListResponse(users=[_user_response(user) for user in users])


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
