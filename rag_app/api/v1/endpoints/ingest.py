from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.api.deps import get_pipeline, require_admin_user
from rag_app.api.v1.schemas import (
    DocumentActiveUpdateRequest,
    DocumentListResponse,
    DocumentResponse,
    IngestResponse,
)
from rag_app.db.models import Document, User
from rag_app.db.session import get_session
from rag_app.rag.pipeline import RAGPipeline
from rag_app.services.documents import DocumentChunkService, DocumentService, DocumentServiceError
from rag_app.services.stats import StatsService

router = APIRouter()

SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "application/x-pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/markdown",
    "text/plain",
    "binary/octet-stream",
    "",
}


def _doc_response(doc: Document, chunk_count: int = 0) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        file_name=doc.file_name,
        source=doc.source,
        active=doc.active,
        status=doc.status,
        knowledge_base_id=doc.knowledge_base_id,
        created_at=doc.created_at,
        page_count=doc.page_count,
        chunk_count=chunk_count,
        content_length=len(doc.content) if doc.content else 0,
    )


def _handle_doc_error(exc: DocumentServiceError) -> HTTPException:
    return HTTPException(status_code=int(exc.status_code), detail=exc.message)


def _detect_format(filename: str, content_type: str) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf") or "pdf" in content_type:
        return "pdf"
    if name.endswith(".docx") or "wordprocessingml" in content_type:
        return "docx"
    if name.endswith(".md") or name.endswith(".markdown") or "markdown" in content_type:
        return "md"
    if name.endswith(".txt") or "text/plain" in content_type:
        return "txt"
    raise ValueError(f"Неподдерживаемый формат файла: {filename}")


@router.post("/file", response_model=DocumentResponse, summary="Upload a document (parse + MinIO, no indexing)")
async def upload_file(
    file: UploadFile = File(...),
    knowledge_base_id: int | None = Form(default=None),
    session: AsyncSession = Depends(get_session),
    pipeline: RAGPipeline = Depends(get_pipeline),
    current_user: User = Depends(require_admin_user),
) -> DocumentResponse:
    try:
        fmt = _detect_format(file.filename or "", file.content_type or "")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    file_bytes = await file.read()
    try:
        doc = await pipeline.upload_file(
            session, file.filename or "document", file_bytes, fmt, knowledge_base_id=knowledge_base_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    await StatsService(session).log(
        "document_uploaded",
        actor_id=current_user.id,
        knowledge_base_id=doc.knowledge_base_id,
        document_id=doc.id,
        meta={"file_name": doc.file_name},
    )
    return _doc_response(doc)


@router.post("/{document_id}/index", response_model=IngestResponse, summary="Index an uploaded document")
async def index_document(
    document_id: int,
    session: AsyncSession = Depends(get_session),
    pipeline: RAGPipeline = Depends(get_pipeline),
    _: object = Depends(require_admin_user),
) -> IngestResponse:
    try:
        result = await pipeline.index_document(session, document_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return IngestResponse(**result)


@router.delete("/{document_id}", response_model=DocumentResponse, summary="Delete document with chunks")
async def delete_document(
    document_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin_user),
) -> DocumentResponse:
    service = DocumentService(session)
    try:
        doc = await service.delete_document(document_id)
    except DocumentServiceError as exc:
        raise _handle_doc_error(exc) from exc

    await StatsService(session).log(
        "document_deleted",
        actor_id=current_user.id,
        knowledge_base_id=doc.knowledge_base_id,
        document_id=doc.id,
        meta={"file_name": doc.file_name},
    )
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


@router.get("", response_model=DocumentListResponse, summary="List documents")
async def list_documents(
    limit: int = 100,
    offset: int = 0,
    knowledge_base_id: int | None = None,
    session: AsyncSession = Depends(get_session),
    _: object = Depends(require_admin_user),
) -> DocumentListResponse:
    service = DocumentService(session)
    docs = await service.list_documents(limit=limit, offset=offset, knowledge_base_id=knowledge_base_id)
    chunk_counts = await DocumentChunkService(session).get_chunk_counts([d.id for d in docs])
    return DocumentListResponse(documents=[_doc_response(doc, chunk_counts.get(doc.id, 0)) for doc in docs])
