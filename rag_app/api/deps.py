from functools import lru_cache

from rag_app.config import get_settings
from rag_app.rag.pipeline import RAGPipeline
from rag_app.storage.vector.pgvector import PgVectorStore


@lru_cache
def _pipeline() -> RAGPipeline:
    settings = get_settings()
    vector_store = PgVectorStore(settings.embed_dim)
    return RAGPipeline(settings, vector_store)


def get_pipeline() -> RAGPipeline:
    return _pipeline()
