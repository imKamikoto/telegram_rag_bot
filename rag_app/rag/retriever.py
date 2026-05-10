from collections.abc import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.storage.vector import RetrievedChunk, VectorStore


class Retriever:
    def __init__(self, vector_store: VectorStore, top_k: int) -> None:
        self.vector_store = vector_store
        self.top_k = top_k

    async def retrieve(
        self,
        session: AsyncSession,
        embedding: Sequence[float],
        knowledge_base_id: int | None = None,
    ) -> list[RetrievedChunk]:
        return await self.vector_store.similarity_search(
            session, embedding, self.top_k, knowledge_base_id=knowledge_base_id
        )
