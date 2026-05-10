from dataclasses import dataclass, field
from typing import Protocol, Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.db.models import Document


@dataclass
class RetrievedChunk:
    chunk_id: int
    document_id: int
    document_name: str
    content: str
    score: float
    presigned_url: str | None = field(default=None)


class VectorStore(Protocol):
    async def add_document(
        self,
        session: AsyncSession,
        document: Document,
        chunks: Sequence[str],
        embeddings: Sequence[Sequence[float]],
    ) -> Document:
        raise NotImplementedError

    async def similarity_search(
        self,
        session: AsyncSession,
        embedding: Sequence[float],
        limit: int,
        knowledge_base_id: int | None = None,
    ) -> list[RetrievedChunk]:
        raise NotImplementedError
