from http import HTTPStatus
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.db.models import Document, DocumentChunk


class DocumentServiceError(Exception):
    def __init__(self, status_code: HTTPStatus, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class DocumentService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_document(
        self, file_name: str, content: str, source: str = "upload", active: bool = True
    ) -> Document:
        document = Document(file_name=file_name, content=content, source=source, active=active)
        self.session.add(document)
        await self.session.commit()
        await self.session.refresh(document)
        return document

    async def get_document_by_id(self, document_id: int) -> Optional[Document]:
        return await self.session.scalar(select(Document).where(Document.id == document_id))

    async def list_documents(self, limit: int = 100, offset: int = 0) -> list[Document]:
        stmt = select(Document).order_by(Document.id).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def delete_document(self, document_id: int) -> Document:
        document = await self.get_document_by_id(document_id)
        if document is None:
            raise DocumentServiceError(HTTPStatus.NOT_FOUND, "Документ не найден")

        await self.session.delete(document)
        await self.session.commit()
        return document

    async def set_active(self, document_id: int, active: bool) -> Document:
        document = await self.get_document_by_id(document_id)
        if document is None:
            raise DocumentServiceError(HTTPStatus.NOT_FOUND, "Документ не найден")

        document.active = active
        await self.session.commit()
        await self.session.refresh(document)
        return document


class DocumentChunkService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_chunk(
        self,
        document_id: int,
        chunk_index: int,
        content: str,
        embedding: Sequence[float],
    ) -> DocumentChunk:
        chunk = DocumentChunk(
            document_id=document_id,
            chunk_index=chunk_index,
            content=content,
            embedding=list(embedding),
        )
        self.session.add(chunk)
        await self.session.commit()
        await self.session.refresh(chunk)
        return chunk

    async def create_chunks_bulk(
        self, document_id: int, chunks: Sequence[str], embeddings: Sequence[Sequence[float]]
    ) -> list[DocumentChunk]:
        if len(chunks) != len(embeddings):
            raise ValueError("Chunks and embeddings length mismatch")

        rows: list[DocumentChunk] = []
        for idx, (content, embedding) in enumerate(zip(chunks, embeddings)):
            rows.append(
                DocumentChunk(
                    document_id=document_id,
                    chunk_index=idx,
                    content=content,
                    embedding=list(embedding),
                )
            )

        self.session.add_all(rows)
        await self.session.commit()
        return rows

    async def get_chunk_by_id(self, chunk_id: int) -> Optional[DocumentChunk]:
        return await self.session.scalar(select(DocumentChunk).where(DocumentChunk.id == chunk_id))

    async def list_chunks_by_document(
        self, document_id: int, limit: int = 100, offset: int = 0
    ) -> list[DocumentChunk]:
        stmt = (
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index)
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
