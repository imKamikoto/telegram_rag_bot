import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    bot_token: str
    ollama_url: str
    ollama_model: str
    system_prompt: str
    max_turns: int
    allowed_user_ids: set[int]
    invitation_code: str


def load_settings() -> Settings:
    bot_token = os.getenv("BOT_TOKEN")
    if not bot_token:
        raise RuntimeError("BOT_TOKEN is not set in the environment or .env")

    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.1")
    system_prompt = os.getenv("SYSTEM_PROMPT", "Ты полезный ассистент.")

    try:
        max_turns = int(os.getenv("MAX_TURNS", "12"))
    except ValueError:
        max_turns = 12

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
    invitation_code = os.getenv("INVITATION_CODE", "").strip()

    return Settings(
        bot_token=bot_token,
        ollama_url=ollama_url,
        ollama_model=ollama_model,
        system_prompt=system_prompt,
        max_turns=max_turns,
        allowed_user_ids=allowed_user_ids,
        invitation_code=invitation_code,
    )
