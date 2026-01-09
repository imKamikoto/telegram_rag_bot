from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the RAG API service."""

    model_config = SettingsConfigDict(env_file="../docker/.env", env_prefix="RAG_", extra="ignore")

    database_url: str = Field(
        default="postgresql+asyncpg://rag_user:rag_password@localhost:5432/rag",
        description="Async SQLAlchemy DSN with pgvector extension available.",
    )
    ollama_base_url: str = Field(
        default="http://localhost:11434", description="Base URL for the Ollama API."
    )
    llm_model: str = Field(default="llama3", description="Ollama chat model for generation.")
    embed_model: str = Field(default="nomic-embed-text", description="Ollama model for embeddings.")
    embed_dim: int = Field(default=768, description="Embedding dimension for pgvector column.")

    chunk_size: int = Field(default=800, description="Chunk size in characters for PDF splits.")
    chunk_overlap: int = Field(default=100, description="Overlap between chunks in characters.")
    top_k: int = Field(default=4, description="Number of chunks to retrieve for answering.")

    api_prefix: str = Field(default="/api/v1", description="API prefix for versioned routes.")
    api_host: str = Field(default="0.0.0.0", description="API host binding.")
    api_port: int = Field(default=8000, description="API port.")

    telegram_bot_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices("RAG_TELEGRAM_BOT_TOKEN", "BOT_TOKEN"),
        description="Telegram bot token used to validate WebApp init data.",
    )
    admin_telegram_ids: list[int] = Field(
        default_factory=list,
        validation_alias=AliasChoices("RAG_ADMIN_TELEGRAM_IDS", "ADMIN_TELEGRAM_IDS"),
        description="Comma-separated list of Telegram user IDs allowed to administer the RAG panel.",
    )
    telegram_init_expire_seconds: int = Field(
        default=600, description="Max age in seconds for Telegram WebApp init data."
    )

    @field_validator("admin_telegram_ids", mode="before")
    @classmethod
    def _split_admin_ids(cls, value: object) -> list[int]:
        if value is None:
            return []
        if isinstance(value, (int, float)):
            return [int(value)]
        if isinstance(value, list):
            return [int(v) for v in value]
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            items: list[int] = []
            for part in raw.split(","):
                part = part.strip()
                if not part:
                    continue
                try:
                    items.append(int(part))
                except ValueError:
                    continue
            return items
        raise TypeError("admin_telegram_ids must be a comma-separated string or list of ints")


@lru_cache
def get_settings() -> Settings:
    return Settings()
