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



@router.post("/admin-token")
async def generate_admin_token(
    body: AdminTokenRequest,
    x_bot_secret: str = Header(..., alias="X-Bot-Secret"),
    session: AsyncSession = Depends(get_session),
) -> dict:
    settings = get_settings()

    if x_bot_secret != settings.telegram_bot_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bot secret")

    service = UserService(session)
    user = await service.get_user_by_telegram_id(body.telegram_id)

    is_config_admin = body.telegram_id in set(settings.admin_telegram_ids)

    if user is None:
        if not is_config_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an admin")
        user = await service.create_user(
            telegram_name=body.telegram_name,
            telegram_id=body.telegram_id,
            role="admin",
        )
    elif user.role != "admin":
        if not is_config_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an admin")
        user.role = "admin"
        await session.commit()

    token = secrets.token_urlsafe(16)
    cache = RedisCache(settings.redis_url)
    try:
        await cache.revoke_tokens_for_user(body.telegram_id)
        await cache.set_token(token, body.telegram_id, body.telegram_name, "admin")
    finally:
        await cache.close()

    return {"token": token}
