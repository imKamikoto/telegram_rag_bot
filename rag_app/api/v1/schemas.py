from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class IngestResponse(BaseModel):
    document_id: int = Field(..., description="Идентификатор сохраненного документа")
    chunks_indexed: int = Field(..., description="Количество проиндексированных чанков")


class AskRequest(BaseModel):
    question: str = Field(..., description="Вопрос пользователя")


class ContextChunk(BaseModel):
    chunk_id: int
    document_id: int
    document_name: str
    content: str
    score: float


class AskResponse(BaseModel):
    answer: str
    contexts: list[ContextChunk]


class InviteCodeResponse(BaseModel):
    code: str


class InviteCodeCreateRequest(BaseModel):
    max_uses: int | None = Field(default=None, ge=1, description="Сколько раз можно использовать код (None = без лимита)")


class UserCreateByInviteRequest(BaseModel):
    invite_code: str
    telegram_name: str
    telegram_id: int


class UserRoleUpdateRequest(BaseModel):
    role: Literal["user", "admin"]


class UserDeleteRequest(BaseModel):
    telegram_id: int


class UserResponse(BaseModel):
    id: int
    telegram_name: str
    telegram_id: int
    role: Literal["user", "admin"]


class UserListResponse(BaseModel):
    users: list[UserResponse]


class DocumentResponse(BaseModel):
    id: int
    file_name: str
    source: str
    active: bool
    created_at: datetime


class DocumentActiveUpdateRequest(BaseModel):
    active: bool


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]


class InviteCodeInfo(BaseModel):
    id: int
    code: str
    max_uses: int | None
    used_count: int
    created_at: datetime


class InviteCodeListResponse(BaseModel):
    invite_codes: list[InviteCodeInfo]


class AuthResponse(BaseModel):
    user: UserResponse
    is_admin: bool
