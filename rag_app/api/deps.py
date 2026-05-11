from functools import lru_cache
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.cache.redis import RedisCache
from rag_app.config import get_settings
from rag_app.db.models import User
from rag_app.db.session import get_session
from rag_app.rag.pipeline import RAGPipeline
from rag_app.services.users import UserService
from rag_app.storage.minio import MinioStorage
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
        public_url=settings.minio_public_url,
    )
    return pipeline


def get_pipeline() -> RAGPipeline:
    return _pipeline()


async def get_current_user(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
    session: AsyncSession = Depends(get_session),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization: Bearer <token> header required",
        )

    token = authorization[len("Bearer "):]
    settings = get_settings()
    cache = RedisCache(settings.redis_url)
    try:
        token_data = await cache.get_admin_token(token)
    finally:
        await cache.close()

    if token_data is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    service = UserService(session)
    user = await service.get_user_by_telegram_id(token_data["telegram_id"])
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def require_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
