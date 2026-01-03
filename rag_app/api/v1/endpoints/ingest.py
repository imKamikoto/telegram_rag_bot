from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.api.deps import get_pipeline
from rag_app.api.v1.schemas import IngestResponse
from rag_app.db.session import get_session
from rag_app.rag.pipeline import RAGPipeline

router = APIRouter()


@router.post("/pdf", response_model=IngestResponse, summary="Загрузить PDF и проиндексировать")
async def ingest_pdf(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    pipeline: RAGPipeline = Depends(get_pipeline),
) -> IngestResponse:
    if file.content_type not in {"application/pdf", "application/x-pdf", "binary/octet-stream", ""}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Поддерживаются только PDF файлы"
        )

    file_bytes = await file.read()
    try:
        result = await pipeline.ingest_pdf(session, file.filename, file_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return IngestResponse(**result)
