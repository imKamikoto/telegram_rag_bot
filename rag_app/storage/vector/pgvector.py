from collections.abc import Sequence

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.db.models import Document, DocumentChunk
from rag_app.services.documents import DocumentChunkService, DocumentService
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

        doc_service = DocumentService(session)
        chunk_service = DocumentChunkService(session)

        stored_doc = await doc_service.create_document(
            file_name=document.file_name,
            content=document.content,
            source=document.source,
            active=document.active,
            knowledge_base_id=document.knowledge_base_id,
            s3_key=document.s3_key,
            page_count=document.page_count,
            status=document.status,
        )

        for embedding in embeddings:
            if self.embed_dim and len(embedding) != self.embed_dim:
                raise ValueError("Embedding dimension mismatch")

        await chunk_service.create_chunks_bulk(stored_doc.id, chunks, embeddings)
        return stored_doc

    async def similarity_search(
        self,
        session: AsyncSession,
        embedding: Sequence[float],
        limit: int,
        knowledge_base_id: int | None = None,
    ) -> list[RetrievedChunk]:
        distance_expr = DocumentChunk.embedding.cosine_distance(embedding)

        stmt: Select[tuple[DocumentChunk, Document, float]] = (
            select(DocumentChunk, Document, distance_expr.label("distance"))
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(Document.active.is_(True))
            .order_by(distance_expr)
            .limit(limit)
        )

        if knowledge_base_id is not None:
            stmt = stmt.where(Document.knowledge_base_id == knowledge_base_id)

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
