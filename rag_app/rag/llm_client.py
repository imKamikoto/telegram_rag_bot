import asyncio
import logging

import httpx

logger = logging.getLogger("rag.llm_client")

_RETRIES = 3
_RETRY_DELAY = 0.5  # seconds


class LLMClient:
    """Минимальный OpenAI-совместимый клиент — прямой httpx для обоих вызовов."""

    def __init__(
        self,
        llm_base_url: str,
        embed_base_url: str,
        api_key: str,
        llm_model: str,
        embed_model: str,
    ) -> None:
        self._llm_model   = llm_model
        self._embed_model = embed_model

        base = llm_base_url.rstrip("/")
        embed_base = embed_base_url.rstrip("/")

        self._chat_url  = f"{base}/chat/completions"
        self._embed_url = f"{embed_base}/embeddings"

        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            # Отключаем keep-alive — предотвращает "Server disconnected" при reuse stale соединения
            "Connection": "close",
        }

        self._http = httpx.AsyncClient(timeout=120.0)

    async def _post(self, url: str, body: dict) -> dict:
        """POST с авто-retry при разрыве соединения."""
        last_exc: Exception | None = None
        for attempt in range(1, _RETRIES + 1):
            try:
                resp = await self._http.post(url, headers=self._headers, json=body)
                resp.raise_for_status()
                return resp.json()
            except (httpx.RemoteProtocolError, httpx.ConnectError) as exc:
                last_exc = exc
                logger.warning(
                    "llm_client | attempt=%d/%d | %s: %s | url=%s",
                    attempt, _RETRIES, type(exc).__name__, exc, url,
                )
                if attempt < _RETRIES:
                    await asyncio.sleep(_RETRY_DELAY * attempt)
        raise last_exc  # type: ignore[misc]

    async def embed(self, text: str) -> list[float]:
        data = await self._post(
            self._embed_url,
            {"model": self._embed_model, "input": text},
        )
        return data["data"][0]["embedding"]

    async def generate(self, messages: list[dict]) -> str:
        data = await self._post(
            self._chat_url,
            {"model": self._llm_model, "messages": messages},
        )
        return data["choices"][0]["message"]["content"] or ""
