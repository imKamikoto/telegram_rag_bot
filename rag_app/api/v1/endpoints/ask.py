from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.api.deps import get_pipeline
from rag_app.api.v1.schemas import AskRequest, AskResponse, ContextChunk
from rag_app.db.session import get_session
from rag_app.rag.pipeline import RAGPipeline
from rag_app.storage.vector.base import RetrievedChunk

router = APIRouter()


def _map_context(ctx: RetrievedChunk) -> ContextChunk:
    return ContextChunk(
        chunk_id=ctx.chunk_id,
        document_id=ctx.document_id,
        document_name=ctx.document_name,
        content=ctx.content,
        score=ctx.score,
    )


@router.post("", response_model=AskResponse, summary="Задать вопрос к базе знаний")
async def ask(
    payload: AskRequest,
    session: AsyncSession = Depends(get_session),
    pipeline: RAGPipeline = Depends(get_pipeline),
) -> AskResponse:
    question = payload.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Вопрос не может быть пустым"
        )

    history = [{"role": m.role, "content": m.content} for m in payload.history]
    result = await pipeline.ask(session, question, history=history or None)
    contexts = [_map_context(ctx) for ctx in result["contexts"]]
    return AskResponse(answer=result["answer"], contexts=contexts)
