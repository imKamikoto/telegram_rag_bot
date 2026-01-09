import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv("../docker/.env")


@dataclass
class Settings:
    bot_token: str
    rag_api_url: str
    allowed_user_ids: set[int]
    admin_user_ids: set[int]
    admin_webapp_url: str | None


def load_settings() -> Settings:
    bot_token = os.getenv("BOT_TOKEN")
    if not bot_token:
        raise RuntimeError("BOT_TOKEN is not set in the environment or .env")

    rag_api_url = os.getenv("RAG_API_URL", "http://localhost:8000/api/v1").rstrip("/")
    if not rag_api_url:
        raise RuntimeError("RAG_API_URL is not set in the environment or .env")

    allowed_list_raw = os.getenv("ALLOWED_USER_IDS", "").strip()
    allowed_user_ids: set[int] = set()
    if allowed_list_raw:
        for value in allowed_list_raw.split(","):
            value = value.strip()
            if not value:
                continue
            try:
                allowed_user_ids.add(int(value))
            except ValueError:
                continue
    admin_list_raw = os.getenv("ADMIN_USER_IDS", "").strip()
    admin_user_ids: set[int] = set()
    if admin_list_raw:
        for value in admin_list_raw.split(","):
            value = value.strip()
            if not value:
                continue
            try:
                admin_user_ids.add(int(value))
            except ValueError:
                continue
    else:
        admin_user_ids = set(allowed_user_ids)

    admin_webapp_url = os.getenv("ADMIN_WEBAPP_URL", "").strip() or None

    return Settings(
        bot_token=bot_token,
        rag_api_url=rag_api_url,
        allowed_user_ids=allowed_user_ids,
        admin_user_ids=admin_user_ids,
        admin_webapp_url=admin_webapp_url,
    )
