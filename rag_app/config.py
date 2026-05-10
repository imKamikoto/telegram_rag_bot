from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the RAG API service."""

    model_config = SettingsConfigDict(env_file="../docker/.env", env_prefix="RAG_", extra="ignore")

    # ─── Database ────────────────────────────────────────────────────────────
    database_url: str = Field(
        default="postgresql+asyncpg://rag_user:rag_password@localhost:5432/rag",
    )

    # ─── LLM / Embedding (OpenAI-compatible endpoint) ────────────────────────
    llm_base_url: str = Field(
        default="http://localhost:11434/v1",
        description="Base URL for OpenAI-compatible LLM API (LiteLLM, Ollama, vLLM, etc.)",
    )
    llm_api_key: str = Field(
        default="ollama",
        description="API key for the LLM provider (use any non-empty string for local Ollama).",
    )
    llm_model: str = Field(default="llama3", description="Chat model name.")
    embed_model: str = Field(default="nomic-embed-text", description="Embedding model name.")
    embed_base_url: str | None = Field(
        default=None,
        description="Override base URL for embedding requests (if different from llm_base_url).",
    )
    embed_dim: int = Field(default=768, description="Embedding vector dimension.")

    # ─── RAG pipeline ────────────────────────────────────────────────────────
    chunk_size: int = Field(default=800, description="Chunk size in characters.")
    chunk_overlap: int = Field(default=100, description="Overlap between chunks in characters.")
    top_k: int = Field(default=5, description="Number of chunks to retrieve.")
    semantic_cache_threshold: float = Field(
        default=0.92,
        description="Cosine similarity threshold for semantic cache hit (0–1).",
    )

    # ─── Redis ───────────────────────────────────────────────────────────────
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL.",
    )

    # ─── MinIO / S3 ──────────────────────────────────────────────────────────
    minio_endpoint: str = Field(default="localhost:9000")
    minio_access_key: str = Field(default="minioadmin")
    minio_secret_key: str = Field(default="minioadmin")
    minio_bucket: str = Field(default="rag-documents")
    minio_secure: bool = Field(default=False)

    # ─── API server ──────────────────────────────────────────────────────────
    api_prefix: str = Field(default="/api/v1")
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)

    # ─── Telegram ────────────────────────────────────────────────────────────
    telegram_bot_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices("RAG_TELEGRAM_BOT_TOKEN", "BOT_TOKEN"),
    )
    admin_telegram_ids: list[int] = Field(
        default_factory=list,
        validation_alias=AliasChoices("RAG_ADMIN_TELEGRAM_IDS", "ADMIN_TELEGRAM_IDS"),
    )
    telegram_init_expire_seconds: int = Field(default=600)

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
