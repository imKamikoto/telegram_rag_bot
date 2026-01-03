from __future__ import annotations

import aiohttp


class RagService:
    """Client for sending questions to the RAG API."""

    def __init__(self, api_base_url: str) -> None:
        self.ask_url = f"{api_base_url.rstrip('/')}/ask"

    async def ask(self, question: str) -> str:
        payload = {"question": question}
        timeout = aiohttp.ClientTimeout(total=180)

        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(self.ask_url, json=payload) as response:
                if response.status != 200:
                    text = await response.text()
                    raise RuntimeError(f"RAG API error {response.status}: {text}")

                data = await response.json()

        answer = (data.get("answer") or "").strip()
        return answer or "(пустой ответ от RAG API)"
