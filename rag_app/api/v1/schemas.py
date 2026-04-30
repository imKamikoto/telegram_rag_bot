from pydantic import BaseModel, Field


class IngestResponse(BaseModel):
    document_id: int = Field(..., description="Идентификатор сохраненного документа")
    chunks_indexed: int = Field(..., description="Количество проиндексированных чанков")


class HistoryMessage(BaseModel):
    role: str = Field(..., description="Роль: 'user' или 'assistant'")
    content: str = Field(..., description="Текст сообщения")


class AskRequest(BaseModel):
    question: str = Field(..., description="Вопрос пользователя")
    history: list[HistoryMessage] = Field(default_factory=list, description="История диалога")


class ContextChunk(BaseModel):
    chunk_id: int
    document_id: int
    document_name: str
    content: str
    score: float


class AskResponse(BaseModel):
    answer: str
    contexts: list[ContextChunk]
