from __future__ import annotations

import aiohttp


class RagService:
    """Client for interacting with the RAG API."""

    def __init__(self, api_base_url: str, bot_token: str = "") -> None:
        base = api_base_url.rstrip("/")
        self._bot_token = bot_token
        self.ask_url = f"{base}/ask"
        self.auth_url = f"{base}/auth"
        self.user_url = f"{base}/users"
        self.user_by_telegram_url = f"{base}/users/telegram"
        self.kb_url = f"{base}/knowledge-bases"
        self.document_url = f"{base}/document"

    # ─── Auth ─────────────────────────────────────────────────────────────────

    async def generate_user_token(self, telegram_id: int, telegram_name: str) -> str:
        """Get a short-lived Bearer token for any registered user."""
        timeout = aiohttp.ClientTimeout(total=15)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                f"{self.auth_url}/user-token",
                json={"telegram_id": telegram_id, "telegram_name": telegram_name},
                headers={"X-Bot-Secret": self._bot_token},
            ) as resp:
                text = await resp.text()
                if not resp.ok:
                    raise RuntimeError(f"RAG API error {resp.status}: {text}")
                data = await resp.json()
                return data["token"]

    async def generate_admin_token(self, telegram_id: int, telegram_name: str) -> str:
        """Get a short-lived Bearer token for an admin user (for the admin webapp link)."""
        timeout = aiohttp.ClientTimeout(total=15)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                f"{self.auth_url}/admin-token",
                json={"telegram_id": telegram_id, "telegram_name": telegram_name},
                headers={"X-Bot-Secret": self._bot_token},
            ) as resp:
                text = await resp.text()
                if not resp.ok:
                    raise RuntimeError(f"RAG API error {resp.status}: {text}")
                data = await resp.json()
                return data["token"]

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

    async def get_knowledge_bases(self, bearer_token: str) -> list[dict]:
        """Return KBs accessible to the token's user."""
        timeout = aiohttp.ClientTimeout(total=15)
        headers = {"Authorization": f"Bearer {bearer_token}"}
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(self.kb_url, headers=headers) as response:
                if response.status != 200:
                    text = await response.text()
                    raise RuntimeError(f"RAG API error {response.status}: {text}")
                data = await response.json()
                return data.get("knowledge_bases", [])

    # ─── RAG ──────────────────────────────────────────────────────────────────

    async def ask(
        self,
        question: str,
        knowledge_base_id: int,
        bearer_token: str,
        session_id: str | None = None,
    ) -> dict:
        payload: dict = {"question": question, "knowledge_base_id": knowledge_base_id}
        if session_id:
            payload["session_id"] = session_id
        timeout = aiohttp.ClientTimeout(total=180)
        headers = {"Authorization": f"Bearer {bearer_token}"}
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(self.ask_url, json=payload, headers=headers) as response:
                if response.status != 200:
                    text = await response.text()
                    raise RuntimeError(f"RAG API error {response.status}: {text}")
                return await response.json()
