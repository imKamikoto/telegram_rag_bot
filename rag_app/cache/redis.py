"""Redis client: session history + semantic cache."""
from __future__ import annotations

import hashlib
import json
import math
from typing import Any

import redis.asyncio as aioredis

SESSION_TTL = 2 * 60 * 60   # 2 hours
CACHE_TTL = 24 * 60 * 60    # 24 hours


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _embedding_hash(embedding: list[float]) -> str:
    raw = ",".join(f"{v:.6f}" for v in embedding)
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


class RedisCache:
    def __init__(self, redis_url: str) -> None:
        self._client: aioredis.Redis = aioredis.from_url(redis_url, decode_responses=True)

    # ─── Session history ──────────────────────────────────────────────────────

    async def get_session_history(self, session_id: str) -> list[dict[str, str]]:
        key = f"session:{session_id}"
        raw = await self._client.get(key)
        if raw is None:
            return []
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return []

    async def set_session_history(
        self,
        session_id: str,
        role_user: str,
        role_assistant: str,
        max_messages: int = 10,
    ) -> None:
        key = f"session:{session_id}"
        history = await self.get_session_history(session_id)
        history.append({"role": "user", "content": role_user})
        history.append({"role": "assistant", "content": role_assistant})
        # Keep only the last max_messages pairs (×2 entries)
        if len(history) > max_messages * 2:
            history = history[-(max_messages * 2):]
        await self._client.setex(key, SESSION_TTL, json.dumps(history, ensure_ascii=False))

    # ─── Semantic cache ───────────────────────────────────────────────────────

    async def search_semantic_cache(
        self,
        kb_id: int,
        question_embedding: list[float],
        threshold: float,
    ) -> dict[str, Any] | None:
        index_key = f"cache_index:{kb_id}"
        hashes = await self._client.smembers(index_key)
        if not hashes:
            return None

        best_score = -1.0
        best_data: dict[str, Any] | None = None

        for emb_hash in hashes:
            cache_key = f"cache:{kb_id}:{emb_hash}"
            raw = await self._client.hgetall(cache_key)
            if not raw:
                continue
            try:
                stored_embedding: list[float] = json.loads(raw["embedding_vector"])
            except (KeyError, json.JSONDecodeError):
                continue

            score = _cosine_similarity(question_embedding, stored_embedding)
            if score > best_score:
                best_score = score
                best_data = raw

        if best_score >= threshold and best_data is not None:
            try:
                return {
                    "answer": best_data["answer"],
                    "sources_json": json.loads(best_data.get("sources_json", "[]")),
                }
            except (KeyError, json.JSONDecodeError):
                return None

        return None

    async def set_semantic_cache(
        self,
        kb_id: int,
        question_embedding: list[float],
        answer: str,
        sources_json: list[dict[str, Any]],
    ) -> None:
        emb_hash = _embedding_hash(question_embedding)
        cache_key = f"cache:{kb_id}:{emb_hash}"
        index_key = f"cache_index:{kb_id}"

        await self._client.hset(
            cache_key,
            mapping={
                "answer": answer,
                "sources_json": json.dumps(sources_json, ensure_ascii=False),
                "embedding_vector": json.dumps(question_embedding),
            },
        )
        await self._client.expire(cache_key, CACHE_TTL)
        await self._client.sadd(index_key, emb_hash)

    async def invalidate_kb_cache(self, kb_id: int) -> None:
        index_key = f"cache_index:{kb_id}"
        hashes = await self._client.smembers(index_key)
        if hashes:
            keys_to_delete = [f"cache:{kb_id}:{h}" for h in hashes]
            await self._client.delete(*keys_to_delete)
        await self._client.delete(index_key)

    async def close(self) -> None:
        await self._client.close()
