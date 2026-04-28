from collections.abc import Sequence

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.db.models import Document, DocumentChunk
from rag_app.storage.vector.base import RetrievedChunk, VectorStore


class PgVectorStore(VectorStore):
    """Vector store backed by Postgres + pgvector."""

    def __init__(self, embed_dim: int) -> None:
        self.embed_dim = embed_dim

    async def add_document(
        self,
        session: AsyncSession,
        document: Document,
        chunks: Sequence[str],
        embeddings: Sequence[Sequence[float]],
    ) -> Document:
        if not chunks:
            raise ValueError("Document has no text to index")
        if len(chunks) != len(embeddings):
            raise ValueError("Chunks and embeddings length mismatch")

        session.add(document)
        await session.flush()

        chunk_rows: list[DocumentChunk] = []
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            if self.embed_dim and len(embedding) != self.embed_dim:
                raise ValueError("Embedding dimension mismatch")
            chunk_rows.append(
                DocumentChunk(
                    document_id=document.id,
                    chunk_index=idx,
                    content=chunk,
                    embedding=list(embedding),
                )
            )

        session.add_all(chunk_rows)
        await session.commit()
        await session.refresh(document)
        return document

    async def similarity_search(
        self, session: AsyncSession, embedding: Sequence[float], limit: int
    ) -> list[RetrievedChunk]:
        distance_expr = DocumentChunk.embedding.cosine_distance(embedding)

        stmt: Select[tuple[DocumentChunk, Document, float]] = (
            select(DocumentChunk, Document, distance_expr.label("distance"))
            .join(Document, DocumentChunk.document_id == Document.id)
            .order_by(distance_expr)
            .limit(limit)
        )

        result = await session.execute(stmt)
        rows = result.all()
        retrieved: list[RetrievedChunk] = []
        for chunk, document, distance in rows:
            score = max(0.0, 1.0 - float(distance))
            retrieved.append(
                RetrievedChunk(
                    chunk_id=chunk.id,
                    document_id=document.id,
                    document_name=document.file_name,
                    content=chunk.content,
                    score=score,
                )
            )
        return retrieved
