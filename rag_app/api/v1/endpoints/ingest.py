from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.api.deps import get_pipeline, require_admin_user
from rag_app.api.v1.schemas import (
    DocumentActiveUpdateRequest,
    DocumentListResponse,
    DocumentResponse,
    IngestResponse,
)
from rag_app.db.session import get_session
from rag_app.rag.pipeline import RAGPipeline
from rag_app.services.documents import DocumentService, DocumentServiceError

router = APIRouter()


def _doc_response(doc: object) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        file_name=doc.file_name,
        source=doc.source,
        active=doc.active,
        created_at=doc.created_at,
    )


def _handle_doc_error(exc: DocumentServiceError) -> HTTPException:
    return HTTPException(status_code=int(exc.status_code), detail=exc.message)


@router.post("/pdf", response_model=IngestResponse, summary="Upload PDF and index it")
async def ingest_pdf(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    pipeline: RAGPipeline = Depends(get_pipeline),
    _: object = Depends(require_admin_user),
) -> IngestResponse:
    if file.content_type not in {"application/pdf", "application/x-pdf", "binary/octet-stream", ""}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported",
        )

    file_bytes = await file.read()
    try:
        result = await pipeline.ingest_pdf(session, file.filename, file_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return IngestResponse(**result)


@router.delete(
    "/{document_id}", response_model=DocumentResponse, summary="Delete document with chunks"
)
async def delete_document(
    document_id: int,
    session: AsyncSession = Depends(get_session),
    _: object = Depends(require_admin_user),
) -> DocumentResponse:
    service = DocumentService(session)
    try:
        doc = await service.delete_document(document_id)
    except DocumentServiceError as exc:
        raise _handle_doc_error(exc) from exc

    return _doc_response(doc)


@router.patch(
    "/{document_id}/active",
    response_model=DocumentResponse,
    summary="Toggle document participation in retrieval",
)
async def update_document_active(
    document_id: int,
    payload: DocumentActiveUpdateRequest,
    session: AsyncSession = Depends(get_session),
    _: object = Depends(require_admin_user),
) -> DocumentResponse:
    service = DocumentService(session)
    try:
        doc = await service.set_active(document_id, payload.active)
    except DocumentServiceError as exc:
        raise _handle_doc_error(exc) from exc

    return _doc_response(doc)


@router.get("", response_model=DocumentListResponse, summary="List indexed documents")
async def list_documents(
    limit: int = 100,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    _: object = Depends(require_admin_user),
) -> DocumentListResponse:
    service = DocumentService(session)
    docs = await service.list_documents(limit=limit, offset=offset)
    return DocumentListResponse(documents=[_doc_response(doc) for doc in docs])
