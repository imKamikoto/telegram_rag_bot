from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ─── Knowledge Bases ────────────────────────────────────────────────────────

class KnowledgeBaseCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str | None = None


class KnowledgeBaseResponse(BaseModel):
    id: int
    name: str
    description: str | None
    created_by: int | None
    created_at: datetime


class KnowledgeBaseListResponse(BaseModel):
    knowledge_bases: list[KnowledgeBaseResponse]


class KBMemberResponse(BaseModel):
    user_id: int
    knowledge_base_id: int
    created_at: datetime


class KBMemberListResponse(BaseModel):
    members: list[KBMemberResponse]


class KBAccessRequest(BaseModel):
    user_id: int


# ─── Documents ──────────────────────────────────────────────────────────────

class IngestResponse(BaseModel):
    document_id: int = Field(..., description="Идентификатор сохраненного документа")
    chunks_indexed: int = Field(..., description="Количество проиндексированных чанков")
    knowledge_base_id: int | None = None


class DocumentResponse(BaseModel):
    id: int
    file_name: str
    source: str
    active: bool
    status: str
    knowledge_base_id: int | None
    created_at: datetime
    page_count: int | None = None
    chunk_count: int = 0
    content_length: int = 0


class DocumentActiveUpdateRequest(BaseModel):
    active: bool


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]


# ─── Ask / RAG ──────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str = Field(..., description="Вопрос пользователя")
    knowledge_base_id: int = Field(..., description="ID базы знаний для поиска")
    session_id: str | None = Field(default=None, description="ID сессии (опционально)")


class ContextChunk(BaseModel):
    chunk_id: int
    document_id: int
    document_name: str
    content: str
    score: float
    presigned_url: str | None = None


class AskResponse(BaseModel):
    answer: str
    contexts: list[ContextChunk]
    session_id: str


# ─── Users ──────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: int
    telegram_name: str
    telegram_id: int
    role: Literal["user", "admin"]
    kb_ids: list[int] = Field(default_factory=list)


class UserListResponse(BaseModel):
    users: list[UserResponse]


class UserCreateRequest(BaseModel):
    telegram_name: str
    telegram_id: int
    role: Literal["user", "admin"] = "user"


class UserCreateByInviteRequest(BaseModel):
    invite_code: str
    telegram_name: str
    telegram_id: int


class UserRoleUpdateRequest(BaseModel):
    role: Literal["user", "admin"]


class UserDeleteRequest(BaseModel):
    telegram_id: int


class AuthResponse(BaseModel):
    user: UserResponse
    is_admin: bool
    knowledge_bases: list[KnowledgeBaseResponse] = Field(default_factory=list)


# ─── Invite Codes ────────────────────────────────────────────────────────────

class InviteCodeCreateRequest(BaseModel):
    max_uses: int | None = Field(default=None, ge=1)
    knowledge_base_id: int | None = None
    code: str | None = None  # если передан — использовать его, иначе сгенерировать


class InviteCodeResponse(BaseModel):
    code: str


class InviteCodeInfo(BaseModel):
    id: int
    code: str
    knowledge_base_id: int | None
    max_uses: int | None
    used_count: int
    is_used: bool
    expires_at: datetime | None
    created_at: datetime


class InviteCodeListResponse(BaseModel):
    invite_codes: list[InviteCodeInfo]


# ─── Stats ───────────────────────────────────────────────────────────────────

class StatsCountStat(BaseModel):
    total: int
    week: int


class StatsOverview(BaseModel):
    knowledge_bases: StatsCountStat
    documents: StatsCountStat
    users: StatsCountStat
    queries_today: int


class StatsTopKb(BaseModel):
    kb_id: int
    name: str
    query_count: int


class StatsActivityItem(BaseModel):
    event: str
    actor_id: int | None
    target_user_id: int | None
    knowledge_base_id: int | None
    document_id: int | None
    meta: dict
    created_at: str


class StatsOverviewResponse(BaseModel):
    overview: StatsOverview
    top_kbs: list[StatsTopKb]
    activity: list[StatsActivityItem]
