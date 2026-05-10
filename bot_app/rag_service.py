from __future__ import annotations

import aiohttp


class RagService:
    """Client for interacting with the RAG API."""

    def __init__(self, api_base_url: str) -> None:
        base = api_base_url.rstrip("/")
        self.ask_url = f"{base}/ask"
        self.user_url = f"{base}/users"
        self.user_by_telegram_url = f"{base}/users/telegram"
        self.kb_url = f"{base}/knowledge-bases"
        self.document_url = f"{base}/document"

    # ─── RAG ──────────────────────────────────────────────────────────────────

    async def ask(
        self, question: str, knowledge_base_id: int, session_id: str | None = None
    ) -> dict:
        payload: dict = {"question": question, "knowledge_base_id": knowledge_base_id}
        if session_id:
            payload["session_id"] = session_id
        timeout = aiohttp.ClientTimeout(total=180)

        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(self.ask_url, json=payload) as response:
                if response.status != 200:
                    text = await response.text()
                    raise RuntimeError(f"RAG API error {response.status}: {text}")
                return await response.json()

    # ─── Users ────────────────────────────────────────────────────────────────

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
                return await response.json()

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

    # ─── Knowledge Bases ──────────────────────────────────────────────────────

    async def get_user_knowledge_bases(self, telegram_init_data: str) -> list[dict]:
        timeout = aiohttp.ClientTimeout(total=15)
        headers = {"X-Telegram-Init-Data": telegram_init_data}
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(self.kb_url, headers=headers) as response:
                if response.status != 200:
                    text = await response.text()
                    raise RuntimeError(f"RAG API error {response.status}: {text}")
                data = await response.json()
                return data.get("knowledge_bases", [])

    # ─── Documents ────────────────────────────────────────────────────────────

    async def upload_file(
        self,
        telegram_init_data: str,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        knowledge_base_id: int,
    ) -> dict:
        timeout = aiohttp.ClientTimeout(total=120)
        headers = {"X-Telegram-Init-Data": telegram_init_data}
        form = aiohttp.FormData()
        form.add_field("knowledge_base_id", str(knowledge_base_id))
        form.add_field(
            "file",
            file_bytes,
            filename=filename,
            content_type=content_type,
        )
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                f"{self.document_url}/file", data=form, headers=headers
            ) as response:
                text = await response.text()
                if response.status not in (200, 201):
                    raise RuntimeError(f"RAG API error {response.status}: {text}")
                return await response.json()
