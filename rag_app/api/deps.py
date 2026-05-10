from functools import lru_cache

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.cache.redis import RedisCache
from rag_app.config import get_settings
from rag_app.storage.minio import MinioStorage
from rag_app.db.models import User
from rag_app.db.session import get_session
from rag_app.rag.pipeline import RAGPipeline
from rag_app.security.telegram import TelegramAuthError, parse_telegram_init_data
from rag_app.services.users import UserService, UsersServiceError
from rag_app.storage.vector.pgvector import PgVectorStore


@lru_cache
def _pipeline() -> RAGPipeline:
    settings = get_settings()
    vector_store = PgVectorStore(settings.embed_dim)
    pipeline = RAGPipeline(settings, vector_store)
    pipeline.cache = RedisCache(settings.redis_url)
    pipeline.minio = MinioStorage(
        endpoint=settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        bucket=settings.minio_bucket,
        secure=settings.minio_secure,
    )
    return pipeline


def get_pipeline() -> RAGPipeline:
    return _pipeline()


async def get_current_user(
    x_telegram_init_data: str = Header(..., alias="X-Telegram-Init-Data"),
    session: AsyncSession = Depends(get_session),
) -> User:
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Telegram bot token is not configured for WebApp auth",
        )
    try:
        tg_user = parse_telegram_init_data(
            x_telegram_init_data,
            settings.telegram_bot_token,
            settings.telegram_init_expire_seconds,
        )
    except TelegramAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    admin_ids = set(settings.admin_telegram_ids)
    service = UserService(session)
    try:
        user = await service.get_user_by_telegram_id(tg_user.id)
        should_be_admin = tg_user.id in admin_ids

        if user is None:
            role = "admin" if should_be_admin else "user"
            user = await service.create_user(
                telegram_name=tg_user.display_name, telegram_id=tg_user.id, role=role
            )
        elif should_be_admin and user.role != "admin":
            user.role = "admin"
            await session.commit()
            await session.refresh(user)
    except UsersServiceError as exc:
        raise HTTPException(status_code=int(exc.status_code), detail=exc.message) from exc

    return user


async def require_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
