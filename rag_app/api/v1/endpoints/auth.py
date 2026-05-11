import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.cache.redis import RedisCache
from rag_app.config import get_settings
from rag_app.db.session import get_session
from rag_app.services.users import UserService

router = APIRouter()


class AdminTokenRequest(BaseModel):
    telegram_id: int
    telegram_name: str


class UserTokenRequest(BaseModel):
    telegram_id: int
    telegram_name: str


@router.post("/user-token", summary="Short-lived token for any registered user (bot use only)")
async def generate_user_token(
    body: UserTokenRequest,
    x_bot_secret: str = Header(..., alias="X-Bot-Secret"),
    session: AsyncSession = Depends(get_session),
) -> dict:
    settings = get_settings()
    if x_bot_secret != settings.telegram_bot_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bot secret")

    service = UserService(session)
    user = await service.get_user_by_telegram_id(body.telegram_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    token = secrets.token_urlsafe(16)
    cache = RedisCache(settings.redis_url)
    try:
        await cache.set_admin_token(token, body.telegram_id, body.telegram_name, user.role)
    finally:
        await cache.close()

    return {"token": token}


@router.post("/admin-token")
async def generate_admin_token(
    body: AdminTokenRequest,
    x_bot_secret: str = Header(..., alias="X-Bot-Secret"),
    session: AsyncSession = Depends(get_session),
) -> dict:
    settings = get_settings()

    if x_bot_secret != settings.telegram_bot_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bot secret")

    if body.telegram_id not in set(settings.admin_telegram_ids):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an admin")

    service = UserService(session)
    user = await service.get_user_by_telegram_id(body.telegram_id)
    if user is None:
        user = await service.create_user(
            telegram_name=body.telegram_name,
            telegram_id=body.telegram_id,
            role="admin",
        )
    elif user.role != "admin":
        user.role = "admin"
        await session.commit()

    token = secrets.token_urlsafe(16)
    cache = RedisCache(settings.redis_url)
    try:
        await cache.set_admin_token(token, body.telegram_id, body.telegram_name, "admin")
    finally:
        await cache.close()

    return {"token": token}
