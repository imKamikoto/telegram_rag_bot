import asyncio
import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.config import get_settings
from rag_app.db.session import get_session

router = APIRouter()
settings = get_settings()


@router.get("", summary="Health check")
async def health() -> dict[str, str]:
    return {"status": "ok"}


async def _check_db(session: AsyncSession) -> dict[str, Any]:
    t0 = time.monotonic()
    try:
        await session.execute(text("SELECT 1"))
        return {"ok": True, "latency_ms": round((time.monotonic() - t0) * 1000)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _check_llm() -> dict[str, Any]:
    base = settings.llm_base_url.rstrip("/")
    url = f"{base}/models"
    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(url, headers={"Authorization": f"Bearer {settings.llm_api_key}"})
        ok = r.status_code < 500
        return {"ok": ok, "status_code": r.status_code, "latency_ms": round((time.monotonic() - t0) * 1000)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _check_embed() -> dict[str, Any]:
    base = (settings.embed_base_url or settings.llm_base_url).rstrip("/")
    if base == settings.llm_base_url.rstrip("/"):
        return {"ok": True, "note": "same as llm"}
    url = f"{base}/models"
    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(url, headers={"Authorization": f"Bearer {settings.llm_api_key}"})
        ok = r.status_code < 500
        return {"ok": ok, "status_code": r.status_code, "latency_ms": round((time.monotonic() - t0) * 1000)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _check_minio() -> dict[str, Any]:
    t0 = time.monotonic()
    try:
        from minio import Minio  # type: ignore[import]

        client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )

        def _stat() -> dict[str, Any]:
            exists = client.bucket_exists(settings.minio_bucket)
            if not exists:
                return {"ok": False, "error": "bucket not found"}
            total_bytes = 0
            count = 0
            for obj in client.list_objects(settings.minio_bucket, recursive=True):
                total_bytes += obj.size or 0
                count += 1
            return {"ok": True, "objects": count, "size_mb": round(total_bytes / 1024 / 1024, 2)}

        result = await asyncio.to_thread(_stat)
        result["latency_ms"] = round((time.monotonic() - t0) * 1000)
        return result
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/services", summary="External services health")
async def health_services(session: AsyncSession = Depends(get_session)) -> dict[str, Any]:
    db_task, llm_task, embed_task, minio_task = await asyncio.gather(
        _check_db(session),
        _check_llm(),
        _check_embed(),
        _check_minio(),
    )
    return {
        "pgvector": db_task,
        "llm":      llm_task,
        "embed":    embed_task,
        "minio":    minio_task,
    }
