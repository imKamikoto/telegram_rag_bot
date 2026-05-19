from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# ─── Knowledge Bases ────────────────────────────────────────────────────────

class KnowledgeBaseCreateRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"name": "Engineering Wiki", "description": "Технические гайды и архитектура"}
    })

    name: str = Field(..., min_length=1, max_length=128, description="Название базы знаний")
    description: str | None = Field(default=None, description="Описание (необязательно)")


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
    model_config = ConfigDict(json_schema_extra={"example": {"user_id": 42}})

    user_id: int = Field(..., description="ID пользователя которому открывается доступ")


# ─── Documents ──────────────────────────────────────────────────────────────

class IngestResponse(BaseModel):
    document_id: int = Field(..., description="ID проиндексированного документа")
    chunks_indexed: int = Field(..., description="Количество созданных чанков")
    knowledge_base_id: int | None = Field(default=None, description="ID базы знаний")


class DocumentResponse(BaseModel):
    id: int
    file_name: str = Field(..., description="Имя файла")
    source: str = Field(..., description="Путь к файлу в MinIO (s3_key)")
    active: bool = Field(..., description="Участвует ли документ в поиске")
    status: str = Field(..., description="pending | indexing | ready | error")
    knowledge_base_id: int | None
    created_at: datetime
    page_count: int | None = Field(default=None, description="Количество страниц (только PDF)")
    chunk_count: int = Field(default=0, description="Количество векторных чанков")
    content_length: int = Field(default=0, description="Размер текста в символах")


class DocumentActiveUpdateRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"active": True}})

    active: bool = Field(..., description="true — включить в поиск, false — исключить")


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]


# ─── Ask / RAG ──────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "question": "Сколько дней длится базовый ежегодный отпуск?",
            "knowledge_base_id": 2,
            "session_id": None,
        }
    })

    question: str = Field(..., description="Вопрос на естественном языке")
    knowledge_base_id: int = Field(..., description="ID базы знаний для поиска")
    session_id: str | None = Field(
        default=None,
        description="ID сессии для поддержания контекста диалога. "
                    "Если не передан — создаётся новый.",
    )


class ContextChunk(BaseModel):
    chunk_id: int = Field(..., description="ID чанка в векторном хранилище")
    document_id: int
    document_name: str
    content: str = Field(..., description="Текст чанка, использованного как контекст")
    score: float = Field(..., description="Косинусная близость (0–1)")
    presigned_url: str | None = Field(
        default=None,
        description="Временная ссылка на исходный файл в MinIO (если настроен MINIO_PUBLIC_URL)",
    )


class AskResponse(BaseModel):
    answer: str = Field(..., description="Ответ LLM")
    contexts: list[ContextChunk] = Field(..., description="Чанки, использованные для ответа")
    session_id: str = Field(..., description="ID сессии (для следующих запросов в диалоге)")


# ─── Users ──────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: int
    telegram_name: str
    telegram_id: int
    role: Literal["user", "admin"]
    kb_ids: list[int] = Field(default_factory=list, description="ID баз знаний с доступом")


class UserListResponse(BaseModel):
    users: list[UserResponse]


class UserCreateRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"telegram_name": "ivan_petrov", "telegram_id": 123456789, "role": "user"}
    })

    telegram_name: str
    telegram_id: int
    role: Literal["user", "admin"] = "user"


class UserCreateByInviteRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "invite_code": "ENG-X9K2-A4M7",
            "telegram_name": "ivan_petrov",
            "telegram_id": 123456789,
        }
    })

    invite_code: str = Field(..., description="Инвайт-код полученный от администратора")
    telegram_name: str
    telegram_id: int


class UserRoleUpdateRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"role": "admin"}})

    role: Literal["user", "admin"]


class UserDeleteRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"telegram_id": 123456789}})

    telegram_id: int


class AuthResponse(BaseModel):
    user: UserResponse
    is_admin: bool
    knowledge_bases: list[KnowledgeBaseResponse] = Field(default_factory=list)


# ─── Invite Codes ────────────────────────────────────────────────────────────

class InviteCodeCreateRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"max_uses": 10, "knowledge_base_id": 2, "code": "ENG-X9K2-A4M7"}
    })

    max_uses: int | None = Field(
        default=None, ge=1,
        description="Лимит использований. null — без ограничений.",
    )
    knowledge_base_id: int | None = Field(
        default=None,
        description="Привязать код к конкретной базе знаний (опционально).",
    )
    code: str | None = Field(
        default=None,
        description="Использовать указанный код вместо генерации нового.",
    )


class InviteCodeResponse(BaseModel):
    code: str = Field(..., description="Сгенерированный (или указанный) инвайт-код")


class InviteCodeInfo(BaseModel):
    id: int
    code: str
    knowledge_base_id: int | None
    max_uses: int | None = Field(description="null — без ограничений")
    used_count: int
    is_used: bool = Field(..., description="true — лимит исчерпан")
    expires_at: datetime | None
    created_at: datetime


class InviteCodeListResponse(BaseModel):
    invite_codes: list[InviteCodeInfo]


# ─── Stats ───────────────────────────────────────────────────────────────────

class StatsCountStat(BaseModel):
    total: int = Field(..., description="Всего за всё время")
    week: int = Field(..., description="За последние 7 дней")


class StatsOverview(BaseModel):
    knowledge_bases: StatsCountStat
    documents: StatsCountStat
    users: StatsCountStat
    queries_today: int = Field(..., description="Запросов за сегодня")


class StatsTopKb(BaseModel):
    kb_id: int
    name: str
    query_count: int


class StatsActivityItem(BaseModel):
    event: str = Field(
        ...,
        description="Тип события: kb_created | document_uploaded | user_registered | "
                    "kb_access_granted | kb_access_revoked | role_changed",
    )
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


# ─── Health ──────────────────────────────────────────────────────────────────

class ServiceHealth(BaseModel):
    ok: bool = Field(..., description="true — сервис доступен")
    latency_ms: float | None = Field(default=None, description="Задержка в миллисекундах")
    error: str | None = Field(default=None, description="Сообщение об ошибке")
    note: str | None = None
    objects: int | None = Field(default=None, description="Количество объектов (MinIO)")
    size_mb: float | None = Field(default=None, description="Размер данных МБ (MinIO)")
    status_code: int | None = None


class ServicesHealthResponse(BaseModel):
    pgvector: ServiceHealth
    llm: ServiceHealth
    embed: ServiceHealth
    minio: ServiceHealth
