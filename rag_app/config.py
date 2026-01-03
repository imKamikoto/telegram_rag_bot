from functools import lru_cache

from pydantic import Field
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


@lru_cache
def get_settings() -> Settings:
    return Settings()
