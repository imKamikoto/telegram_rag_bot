import asyncio
import logging
import time
import uuid
from io import BytesIO
from typing import Any

from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.config import Settings
from rag_app.db.models import ChatMessage, ChatSession, Document
from rag_app.rag.chunking import chunk_text
from rag_app.rag.llm_client import LLMClient
from rag_app.services.documents import DocumentChunkService, DocumentService
from rag_app.rag.prompts import build_messages
from rag_app.rag.retriever import Retriever
from rag_app.storage.vector import RetrievedChunk, VectorStore

logger = logging.getLogger("rag.pipeline")

MAX_HISTORY_MESSAGES = 10


class RAGPipeline:
    def __init__(self, settings: Settings, vector_store: VectorStore) -> None:
        self.settings = settings
        self.vector_store = vector_store
        self.retriever = Retriever(vector_store, settings.top_k)

        self._client = LLMClient(
            llm_base_url=settings.llm_base_url,
            embed_base_url=settings.embed_base_url or settings.llm_base_url,
            api_key=settings.llm_api_key,
            llm_model=settings.llm_model,
            embed_model=settings.embed_model,
        )

        # Injected after construction (set in deps.py)
        self.cache: Any = None    # RedisCache instance
        self.minio: Any = None    # MinioStorage instance

    # ─── Ingest ──────────────────────────────────────────────────────────────

    async def upload_file(
        self,
        session: AsyncSession,
        file_name: str,
        file_bytes: bytes,
        fmt: str,
        knowledge_base_id: int | None = None,
    ) -> Document:
        """Parse + upload to MinIO, save to DB with status='pending'. No embedding."""
        text = await asyncio.to_thread(self._parse_file, file_bytes, fmt)
        if not text.strip():
            raise ValueError("Не удалось извлечь текст из документа")

        s3_key: str | None = None
        if self.minio is not None:
            s3_key = await self.minio.upload_file(
                file_bytes=file_bytes,
                file_name=file_name,
                knowledge_base_id=knowledge_base_id,
            )

        page_count = await asyncio.to_thread(self._count_pages, file_bytes, fmt)

        doc_service = DocumentService(session)
        return await doc_service.create_document(
            file_name=file_name,
            content=text,
            knowledge_base_id=knowledge_base_id,
            s3_key=s3_key,
            status="pending",
            page_count=page_count,
        )

    async def index_document(
        self,
        session: AsyncSession,
        document_id: int,
    ) -> dict[str, Any]:
        """Chunk, embed, and write vectors for an already-uploaded document."""
        logger.info("index_document | doc_id=%d | start", document_id)
        doc_service = DocumentService(session)
        document = await doc_service.get_document_by_id(document_id)
        if document is None:
            raise ValueError("Документ не найден")
        if not document.content.strip():
            raise ValueError("Документ не содержит текста для индексации")

        await doc_service.update_status(document_id, "indexing")

        chunks = chunk_text(document.content, self.settings.chunk_size, self.settings.chunk_overlap)
        if not chunks:
            await doc_service.update_status(document_id, "pending")
            raise ValueError("Нет текста после разбиения на чанки")

        logger.info("index_document | doc_id=%d | chunks=%d | embedding...", document_id, len(chunks))
        embeddings = [await self._embed(chunk) for chunk in chunks]

        chunk_service = DocumentChunkService(session)
        await chunk_service.create_chunks_bulk(document_id, chunks, embeddings)

        document.status = "ready"
        document.active = True
        await session.commit()

        if self.cache is not None and document.knowledge_base_id is not None:
            await self.cache.invalidate_kb_cache(document.knowledge_base_id)

        logger.info("index_document | doc_id=%d | done | chunks_indexed=%d", document_id, len(chunks))
        return {
            "document_id": document_id,
            "chunks_indexed": len(chunks),
            "knowledge_base_id": document.knowledge_base_id,
        }

    # ─── Ask ─────────────────────────────────────────────────────────────────

    async def ask(
        self,
        session: AsyncSession,
        question: str,
        knowledge_base_id: int | None = None,
        session_id: str | None = None,
        user_id: int | None = None,
    ) -> dict[str, Any]:
        t0 = time.monotonic()
        if session_id is None:
            session_id = str(uuid.uuid4())

        logger.info(
            "ask | kb=%s | session=%s | question=%r",
            knowledge_base_id, session_id, question[:120],
        )

        query_embedding = await self._embed(question)

        # 1. Semantic cache lookup
        if self.cache is not None and knowledge_base_id is not None:
            cached = await self.cache.search_semantic_cache(
                kb_id=knowledge_base_id,
                question_embedding=query_embedding,
                threshold=self.settings.semantic_cache_threshold,
            )
            if cached is not None:
                logger.info("ask | cache_hit | %.2fs", time.monotonic() - t0)
                return {
                    "answer": cached["answer"],
                    "contexts": [],
                    "session_id": session_id,
                }

        logger.info("ask | cache_miss")

        # 2. Load session history
        history: list[dict[str, str]] = []
        if self.cache is not None:
            history = await self.cache.get_session_history(session_id)
        logger.info("ask | history_messages=%d", len(history))

        # 3. Vector retrieval
        t_ret = time.monotonic()
        contexts = await self.retriever.retrieve(
            session, query_embedding, knowledge_base_id=knowledge_base_id
        )
        logger.info(
            "ask | retrieved=%d chunks in %.2fs | scores=%s",
            len(contexts),
            time.monotonic() - t_ret,
            [round(c.score, 3) for c in contexts],
        )

        # 4. Attach presigned URLs
        if self.minio is not None:
            contexts = await self._attach_presigned_urls(session, contexts)
            has_urls = sum(1 for c in contexts if getattr(c, "presigned_url", None))
            logger.info("ask | presigned_urls=%d/%d", has_urls, len(contexts))
        else:
            logger.warning("ask | minio not configured — presigned URLs skipped")

        # 5. LLM generation
        t_llm = time.monotonic()
        messages = build_messages(question, contexts, history=history)
        answer = await self._generate(messages)
        logger.info("ask | generated in %.2fs | answer_len=%d", time.monotonic() - t_llm, len(answer))

        # 6. Persist
        if self.cache is not None:
            await self.cache.set_session_history(
                session_id=session_id,
                role_user=question,
                role_assistant=answer,
                max_messages=MAX_HISTORY_MESSAGES,
            )
            if knowledge_base_id is not None:
                sources_json = [
                    {"document_id": c.document_id, "document_name": c.document_name}
                    for c in contexts
                ]
                await self.cache.set_semantic_cache(
                    kb_id=knowledge_base_id,
                    question_embedding=query_embedding,
                    answer=answer,
                    sources_json=sources_json,
                )

        # 7. Persist messages to DB (for stats/history)
        if user_id is not None and knowledge_base_id is not None:
            try:
                await self._persist_chat(session, user_id, knowledge_base_id, question, answer, contexts)
            except Exception as exc:
                logger.warning("ask | db_persist_failed: %s", exc)

        logger.info("ask | total=%.2fs", time.monotonic() - t0)
        return {"answer": answer, "contexts": contexts, "session_id": session_id}

    # ─── Helpers ─────────────────────────────────────────────────────────────

    async def _persist_chat(
        self,
        session: AsyncSession,
        user_id: int,
        knowledge_base_id: int,
        question: str,
        answer: str,
        contexts: list[RetrievedChunk],
    ) -> None:
        """Сохраняет вопрос и ответ в ChatSession/ChatMessage для статистики и истории."""
        from sqlalchemy import select as sa_select

        chat_session = await session.scalar(
            sa_select(ChatSession).where(
                ChatSession.user_id == user_id,
                ChatSession.knowledge_base_id == knowledge_base_id,
            ).limit(1)
        )
        if chat_session is None:
            chat_session = ChatSession(user_id=user_id, knowledge_base_id=knowledge_base_id)
            session.add(chat_session)
            await session.flush()  # нужен id

        sources = [
            {"document_id": c.document_id, "document_name": c.document_name}
            for c in contexts
        ]
        session.add(ChatMessage(session_id=chat_session.id, role="user",    content=question))
        session.add(ChatMessage(session_id=chat_session.id, role="assistant", content=answer, sources_json=sources))
        await session.commit()

    async def _embed(self, text: str) -> list[float]:
        return await self._client.embed(text)

    async def _generate(self, messages: list[dict[str, str]]) -> str:
        return await self._client.generate(messages)

    async def _attach_presigned_urls(
        self, session: AsyncSession, contexts: list[RetrievedChunk]
    ) -> list[RetrievedChunk]:
        from sqlalchemy import select
        from rag_app.db.models import Document as DocModel

        doc_ids = list({ctx.document_id for ctx in contexts})
        result = await session.execute(
            select(DocModel.id, DocModel.s3_key).where(DocModel.id.in_(doc_ids))
        )
        s3_keys: dict[int, str | None] = {row[0]: row[1] for row in result.all()}

        for ctx in contexts:
            s3_key = s3_keys.get(ctx.document_id)
            if s3_key:
                try:
                    ctx.presigned_url = await self.minio.get_presigned_url(s3_key)
                except Exception:
                    pass
        return contexts

    @staticmethod
    def _count_pages(file_bytes: bytes, fmt: str) -> int | None:
        if fmt == "pdf":
            try:
                from io import BytesIO
                from pypdf import PdfReader
                return len(PdfReader(BytesIO(file_bytes)).pages)
            except Exception:
                return None
        return None

    @staticmethod
    def _parse_file(file_bytes: bytes, fmt: str) -> str:
        if fmt == "pdf":
            return RAGPipeline._pdf_to_text(file_bytes)
        if fmt == "docx":
            return RAGPipeline._docx_to_text(file_bytes)
        if fmt in ("md", "txt"):
            return file_bytes.decode("utf-8", errors="replace")
        raise ValueError(f"Неизвестный формат: {fmt}")

    @staticmethod
    def _pdf_to_text(file_bytes: bytes) -> str:
        reader = PdfReader(BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    @staticmethod
    def _docx_to_text(file_bytes: bytes) -> str:
        try:
            import docx  # type: ignore[import]
            doc = docx.Document(BytesIO(file_bytes))
            return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
        except ImportError as exc:
            raise ValueError("python-docx не установлен") from exc
