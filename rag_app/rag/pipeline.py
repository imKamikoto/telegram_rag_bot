import asyncio
from io import BytesIO
from typing import Any

import ollama
from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.config import Settings
from rag_app.db.models import Document
from rag_app.rag.chunking import chunk_text
from rag_app.rag.prompts import build_messages
from rag_app.rag.retriever import Retriever
from rag_app.storage.vector import RetrievedChunk, VectorStore


class RAGPipeline:
    def __init__(self, settings: Settings, vector_store: VectorStore) -> None:
        self.settings = settings
        self.vector_store = vector_store
        self.retriever = Retriever(vector_store, settings.top_k)
        self.client = ollama.Client(host=settings.ollama_base_url)

    async def ingest_pdf(self, session: AsyncSession, file_name: str, file_bytes: bytes) -> dict[str, Any]:
        text = await asyncio.to_thread(self._pdf_to_text, file_bytes)
        if not text.strip():
            raise ValueError("Не удалось извлечь текст из PDF")

        chunks = chunk_text(text, self.settings.chunk_size, self.settings.chunk_overlap)
        if not chunks:
            raise ValueError("Нет текста для индексации после разбиения на чанки")

        embeddings = [await self._embed(chunk) for chunk in chunks]
        document = Document(file_name=file_name, content=text)
        stored = await self.vector_store.add_document(session, document, chunks, embeddings)
        return {"document_id": stored.id, "chunks_indexed": len(chunks)}

    async def ask(self, session: AsyncSession, question: str) -> dict[str, Any]:
        query_embedding = await self._embed(question)
        contexts = await self.retriever.retrieve(session, query_embedding)
        messages = build_messages(question, contexts)
        answer = await self._generate(messages)
        return {"answer": answer, "contexts": contexts}

    async def _embed(self, text: str) -> list[float]:
        response = await asyncio.to_thread(
            self.client.embeddings, model=self.settings.embed_model, prompt=text
        )
        return response["embedding"]

    async def _generate(self, question, messages: list[dict[str, str]] = None) -> str:
        response = await asyncio.to_thread(
            self.client.chat, model=self.settings.llm_model, messages=messages
        )
        message = response.get("message") or {}
        return message.get("content", "")

    @staticmethod
    def _pdf_to_text(file_bytes: bytes) -> str:
        reader = PdfReader(BytesIO(file_bytes))
        pages_text = []
        for page in reader.pages:
            page_text = page.extract_text() or ""
            pages_text.append(page_text)
        return "\n".join(pages_text)
