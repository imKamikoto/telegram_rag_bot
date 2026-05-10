from __future__ import annotations

import aiohttp


class RagService:
    """Client for interacting with the RAG API."""

    def __init__(self, api_base_url: str) -> None:
        base = api_base_url.rstrip("/")
        self.ask_url = f"{base}/ask"
        self.user_url = f"{base}/users"
        self.user_by_telegram_url = f"{base}/users/telegram"

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
        return answer or "(РїС?С?С'Р?Р№ Р?С'Р?РчС' Р?С' RAG API)"

    async def register_by_invite(
        self, invite_code: str, telegram_id: int, telegram_name: str
    ) -> dict:
        payload = {
            "invite_code": invite_code,
            "telegram_id": telegram_id,
            "telegram_name": telegram_name,
        }
        timeout = aiohttp.ClientTimeout(total=30)

        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(self.user_url, json=payload) as response:
                text = await response.text()
                if response.status != 200:
                    raise RuntimeError(f"RAG API error {response.status}: {text}")
                data = await response.json()
        return data

    async def get_user_by_telegram(self, telegram_id: int) -> dict | None:
        timeout = aiohttp.ClientTimeout(total=15)
        url = f"{self.user_by_telegram_url}/{telegram_id}"
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url) as response:
                if response.status == 404:
                    return None
                if response.status != 200:
                    text = await response.text()
                    raise RuntimeError(f"RAG API error {response.status}: {text}")
                return await response.json()
