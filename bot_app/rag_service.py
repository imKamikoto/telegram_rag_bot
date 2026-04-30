from __future__ import annotations

from typing import Any

import aiohttp


class RagService:
    """Client for the RAG API."""

    def __init__(self, api_base_url: str) -> None:
        base = api_base_url.rstrip("/")
        self.ask_url = f"{base}/ask"
        self.ingest_url = f"{base}/ingest/pdf"

    async def ask(
        self,
        question: str,
        history: list[dict[str, str]] | None = None,
    ) -> str:
        payload: dict[str, Any] = {"question": question}
        if history:
            payload["history"] = history

        timeout = aiohttp.ClientTimeout(total=180)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(self.ask_url, json=payload) as response:
                if response.status != 200:
                    text = await response.text()
                    raise RuntimeError(f"RAG API error {response.status}: {text}")
                data = await response.json()

        answer = (data.get("answer") or "").strip()
        return answer or "(пустой ответ от RAG API)"

    async def ingest_pdf(self, file_name: str, file_bytes: bytes) -> dict:
        timeout = aiohttp.ClientTimeout(total=300)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            form = aiohttp.FormData()
            form.add_field("file", file_bytes, filename=file_name, content_type="application/pdf")
            async with session.post(self.ingest_url, data=form) as response:
                if response.status != 200:
                    text = await response.text()
                    raise RuntimeError(f"Ingest error {response.status}: {text}")
                return await response.json()
