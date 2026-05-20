import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from rag_app.api.v1 import api_router
from rag_app.config import get_settings
from rag_app.db.session import AsyncSessionLocal, init_db
from rag_app.services.users import UserService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    await init_db()
    await _seed_admins()
    yield


# ─── Tag descriptions ─────────────────────────────────────────────────────────

TAGS_METADATA = [
    {
        "name": "ask",
        "description": "RAG-запросы к базам знаний. Принимает вопрос, возвращает ответ LLM "
                       "с релевантными чанками и ссылками на исходные документы.",
    },
    {
        "name": "document",
        "description": "Управление документами: загрузка файлов (PDF, DOCX, MD, TXT), "
                       "запуск индексации, переключение активности, удаление.",
    },
    {
        "name": "knowledge-bases",
        "description": "CRUD для баз знаний и управление доступом пользователей.",
    },
    {
        "name": "users",
        "description": "Управление пользователями: список, роли, удаление, "
                       "приглашения через invite-коды.",
    },
    {
        "name": "auth",
        "description": "Аутентификация через Telegram WebApp InitData.",
    },
    {
        "name": "stats",
        "description": "Аналитика: обзорная статистика, топ баз знаний, лог активности.",
    },
    {
        "name": "health",
        "description": "Проверка состояния сервисов: БД, LLM, embed-модель, MinIO.",
    },
]

app = FastAPI(
    title="RAG Admin API",
    version="2.4.0",
    description="""
## RAG-платформа — API для администрирования

Управление базами знаний, документами и пользователями.
Все запросы (кроме `/auth` и `/users` по invite) требуют заголовок:

```
Authorization: Bearer <token>
```

Токен получается через Telegram WebApp — передаётся как query-параметр `token`
при открытии админ-панели.

### Типичный flow загрузки документа

1. `POST /document/file` — загрузить файл → статус `pending`
2. `POST /document/{id}/index` — проиндексировать → статус `ready`
3. `POST /ask` — задать вопрос по базе знаний
""",
    openapi_tags=TAGS_METADATA,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)


async def _seed_admins() -> None:
    if not settings.admin_telegram_ids:
        return
    async with AsyncSessionLocal() as session:
        service = UserService(session)
        for tg_id in settings.admin_telegram_ids:
            user = await service.get_user_by_telegram_id(tg_id)
            if user is None:
                await service.create_user(
                    telegram_name=f"admin_{tg_id}",
                    telegram_id=tg_id,
                    role="admin",
                )
            elif user.role != "admin":
                await service.update_user_role(user.id, "admin")
