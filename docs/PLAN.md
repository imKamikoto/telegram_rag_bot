# План реализации RAG Bot

> **LLM / Embedding** — внешний сервер (уже поднят), настраивается через `.env`. Контейнеры Ollama/LiteLLM в docker-compose не нужны.

---

## Статус фаз

| Фаза | Описание | Статус |
|------|----------|--------|
| 0 | Исправление багов | ⬜ |
| 1 | KnowledgeBase + рефакторинг моделей | ⬜ |
| 2 | Chat Sessions + история + semantic cache | ⬜ |
| 3 | MinIO + presigned URLs + MD/DOCX | ⬜ |
| 4 | LLM провайдер через .env | ⬜ |
| 5 | Бот: KB selection + загрузка файлов + источники | ⬜ |
| 6 | Docker Compose: полный stack | ⬜ |
| 7 | Редизайн Admin WebApp по макету | ⬜ |

---

## Фаза 0 — Исправление багов

- [x] `rag_app/api/deps.py:49` — убрать хардкод `529936774`, использовать `tg_user.id`
- [x] `rag_app/api/v1/endpoints/users.py:30` — `_user_response` возвращает `user.id` (int), а не строку
- [x] `bot_app/rag_service.py:29` — починить кодировку fallback-строки `"(пустой ответ от RAG API)"`
- [x] Убедиться что `UserResponse.id: int` во всей цепочке (schemas → endpoint → api.ts)

---

## Фаза 1 — KnowledgeBase + рефакторинг моделей

### 1.1 Модели БД
- [x] `KnowledgeBase`: `id, name, description, created_by (FK→User), created_at, updated_at`
- [x] `UserKnowledgeBase`: `id, user_id (FK), knowledge_base_id (FK), created_at` — UNIQUE composite
- [x] `ChatSession`: `id, user_id (FK), knowledge_base_id (FK), created_at, updated_at`
- [x] `ChatMessage`: `id, session_id (FK), role, content, sources_json (JSONB), created_at`
- [x] `InviteCode`: добавить `expires_at (TIMESTAMP)`, `is_used (BOOL)`, `knowledge_base_id (FK)`
- [x] `Document`: добавить `knowledge_base_id (FK)`, `s3_key (VARCHAR)`, `page_count`, `status`

### 1.2 API — Knowledge Bases
- [x] `POST /api/v1/knowledge-bases` — создать KB (admin)
- [x] `GET /api/v1/knowledge-bases` — список KB (admin — все, user — только свои)
- [x] `GET /api/v1/knowledge-bases/{id}` — детали KB
- [x] `DELETE /api/v1/knowledge-bases/{id}` — удалить KB (admin)
- [x] `GET /api/v1/knowledge-bases/{id}/documents` — список документов KB
- [x] `GET /api/v1/knowledge-bases/{id}/members` — список пользователей с доступом

### 1.3 API — обновить существующие endpoints
- [x] `POST /api/v1/ingest/file` — принимать `knowledge_base_id` в multipart-форме
- [x] `POST /api/v1/ask` — добавить `knowledge_base_id` в `AskRequest`, фильтровать чанки по KB
- [x] `POST /api/v1/users/invite-codes` — добавить `knowledge_base_id` в запрос
- [x] `POST /api/v1/users` (register by invite) — при регистрации дать доступ к KB из инвайта

### 1.4 Сервисы
- [x] `KnowledgeBaseService` — CRUD, проверка доступа пользователя к KB
- [x] `UserService.create_invite_code` — принимать `knowledge_base_id`
- [x] `UserService.create_user_by_invite` — при регистрации добавлять запись `UserKnowledgeBase`
- [x] Обновить `UserService` с валидацией `expires_at` и `is_used` при активации инвайта
- [x] `pgvector.py / similarity_search` — добавить фильтр по `knowledge_base_id` через JOIN

### 1.5 Schemas
- [x] Добавить `KnowledgeBaseResponse`, `KnowledgeBaseCreateRequest`, `KnowledgeBaseListResponse`
- [x] Обновить `IngestResponse` — добавить `knowledge_base_id`
- [x] Обновить `AskRequest` — добавить `knowledge_base_id`
- [x] Обновить `InviteCodeCreateRequest` — добавить `knowledge_base_id`

---

## Фаза 2 — Chat Sessions + история контекста + Semantic Cache

### 2.1 Redis
- [x] Добавить `redis:7-alpine` в `docker/docker-compose.yml`
- [x] Добавить `REDIS_URL` в `docker/.env.example`
- [x] `rag_app/config.py` — добавить `redis_url: str`
- [x] `rag_app/cache/redis.py` — клиент: `get_session_history`, `set_session_history`, `invalidate_kb_cache`

### 2.2 Session management в pipeline
- [x] `pipeline.py` — при `/ask` загружать последние 10 сообщений из Redis по `session_id`
- [x] `rag/prompts.py` — `build_messages` принимает историю и добавляет в промпт
- [x] `pipeline.py` — после ответа сохранять пару user/assistant в Redis (TTL 2ч)
- [x] `pipeline.py` — сохранять `ChatMessage` в PostgreSQL
- [x] `AskRequest` — добавить `session_id: str | None`
- [x] `AskResponse` — добавить `session_id: str` (создать если не передан)

### 2.3 Semantic cache — обязательная часть пайплайна

Логика работы:
```
Вопрос → embedding → cosine similarity с векторами вопросов в Redis
    ├─ HIT (≥ порога ~0.92) → вернуть кешированный ответ (~200мс)
    └─ MISS → полный RAG pipeline → сохранить {embedding, answer, sources} в Redis
```

Redis структура:
- `cache:{kb_id}:{embedding_hash}` — Hash, TTL 24ч — `{answer, sources_json, embedding_vector}`
- `cache_index:{kb_id}` — Set — множество `embedding_hash` для данной KB (для инвалидации)

- [x] `cache/redis.py` — `search_semantic_cache(kb_id, question_embedding, threshold)` — перебирает `cache_index:{kb_id}`, считает cosine similarity вопроса с каждым сохранённым вектором, возвращает ответ при схожести ≥ порога
- [x] `cache/redis.py` — `set_semantic_cache(kb_id, question_embedding, answer, sources_json)` — сохраняет вектор вопроса + ответ, добавляет hash в `cache_index:{kb_id}`
- [x] `config.py` — добавить `semantic_cache_threshold: float = 0.92` (порог схожести)
- [x] `pipeline.py` — встроить в `ask()`: embed вопроса → Redis semantic search → HIT/MISS ветка
- [x] `pipeline.py` — при MISS: после генерации ответа сохранять в Redis semantic cache
- [x] `pipeline.py` — инвалидация при загрузке/удалении документа: удалить все `cache:{kb_id}:*` + `cache_index:{kb_id}`

---

## Фаза 3 — MinIO + presigned URLs + MD/DOCX

### 3.1 MinIO
- [x] Добавить `minio/minio` в `docker/docker-compose.yml`
- [x] Добавить `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` в `.env.example`
- [x] `rag_app/config.py` — добавить MinIO настройки
- [x] `rag_app/storage/minio.py` — `upload_file`, `delete_file`, `get_presigned_url` (TTL 1ч)

### 3.2 Document flow с MinIO
- [x] `pipeline.py` — при загрузке: PUT файл в MinIO, сохранить `s3_key` в `Document`
- [x] `pipeline.py` — при удалении: DELETE из MinIO
- [x] `pipeline.py` — в ответе генерировать presigned URL для каждого источника
- [x] `AskResponse.contexts` — добавить `presigned_url: str | None` в `ContextChunk`

### 3.3 MD / DOCX парсинг
- [x] Добавить `python-docx`, `markdown` в `rag_app/pyproject.toml`
- [x] `pipeline.py` — `ingest_md(file_name, file_bytes)`
- [x] `pipeline.py` — `ingest_docx(file_name, file_bytes)`
- [x] `api/v1/endpoints/ingest.py` — заменить `/pdf` на `/file`, определять формат по MIME/расширению
- [x] Обновить фронтенд: `accept="application/pdf,.md,.docx"` → все форматы

---

## Фаза 4 — LLM провайдер через .env

> LLM и Embedding уже запущены на внешнем сервере. Нужно только настроить куда идут запросы.

- [x] `rag_app/config.py` — заменить `ollama_base_url` на `llm_base_url` и `llm_api_key`
- [x] `pipeline.py` — использовать `openai.AsyncOpenAI(base_url=..., api_key=...)` вместо `ollama.Client`
- [x] `docker/.env.example` — добавить `RAG_LLM_BASE_URL`, `RAG_LLM_API_KEY`, `RAG_EMBED_BASE_URL`
- [x] Удалить `ollama` из `rag_app/pyproject.toml`, добавить `openai`

---

## Фаза 5 — Бот: KB selection + загрузка файлов + источники

### 5.1 Выбор KB
- [x] `bot_app/rag_service.py` — `get_user_knowledge_bases(telegram_id)` → список KB
- [x] `bot_app/handlers.py` — FSM: после `/start` показывать inline-кнопки с KB пользователя
- [x] `bot_app/handlers.py` — сохранять `kb_id` и `session_id` в FSM state
- [x] Команда `/kb` — переключить базу знаний (показать список заново)
- [x] `chat` handler — передавать `knowledge_base_id` и `session_id` в `/ask`

### 5.2 Загрузка файлов (для Admin)
- [x] `bot_app/handlers.py` — обработчик `F.document` (aiogram Document type)
- [x] Перед загрузкой: показать inline-кнопки с выбором KB
- [x] FSM: `AdminUploadStates` — `waiting_for_kb`, `waiting_for_file`
- [x] `bot_app/rag_service.py` — `upload_file(kb_id, file_bytes, filename, mime_type)` → multipart POST
- [x] Уведомление об успехе/ошибке после загрузки

### 5.3 Источники в ответе
- [x] `bot_app/rag_service.py` — `ask()` возвращает `{"answer": ..., "sources": [...]}`
- [x] `bot_app/handlers.py` — форматировать ответ: текст + список источников с presigned URL
- [x] Обрезать URL-ы с `InlineKeyboardMarkup` кнопками если источников > 0

---

## Фаза 6 — Docker Compose: полный stack

- [x] `docker/docker-compose.yml` — добавить `redis:7-alpine`
- [x] `docker/docker-compose.yml` — добавить `minio/minio`
- [x] `docker/docker-compose.yml` — удалить закомментированный `ollama` (не нужен)
- [x] `docker/docker-compose.yml` — добавить сервис `bot_app`
- [x] `docker/docker-compose.yml` — добавить сервис `admin_webapp` (nginx + static build)
- [x] `docker/bot.Dockerfile` — проверить и обновить
- [x] Создать `docker/webapp.Dockerfile` — multi-stage: `npm build` → `nginx`
- [x] `docker/.env.example` — актуализировать все переменные
- [x] Прописать `depends_on`, `healthcheck` для postgres, redis, minio
- [x] Создать `docker/nginx.conf` для проксирования `rag_app` + раздачи `admin_webapp`

---

## Фаза 7 — Редизайн Admin WebApp по макету

> Макет лежит в `docs/rag-app-web-concept/`.

### 7.1 Инфраструктура UI
- [x] Удалить `react-snowfall`
- [x] Добавить CSS-переменные из макета: `--accent`, `--surface`, `--surface-2`, `--border`, `--muted`, `--fg`, `--mono`
- [x] Поддержка Telegram тёмной темы через `window.Telegram.WebApp.colorScheme`
- [x] Реализовать простой state-based router: `navigate(screen, params)`
- [x] Bottom navigation bar: Dashboard / KBs / Users / Codes / Settings

### 7.2 Примитивы (компоненты)
- [x] `Section` — секция с заголовком и опциональным action-слотом
- [x] `Chip` / `Badge` — тег с тонами: `accent`, `neutral`, `muted`
- [x] `SearchField` — поле поиска с иконкой
- [x] `Segmented` — сегментированный контрол (фильтр)
- [x] `Avatar` — аватар пользователя (инициалы)
- [x] `IconBox` — иконка в контейнере
- [x] `Btn` — кнопка: `primary`, `ghost`, `danger`, `full`
- [x] `EmptyState` — заглушка для пустых списков

### 7.3 Экраны
- [x] `ScreenDashboard` — KPI карточки (KB, документы, пользователи), быстрые действия, последняя активность
- [x] `ScreenKBList` — список KB с поиском, кнопка создания, удаление
- [x] `ScreenKBDetail` — вкладки Documents / Members, загрузка файла в KB
- [x] `ScreenUsers` — поиск, фильтр по роли (all/admin/member), list/card view toggle
- [x] `ScreenUserDetail` — доступные KB, управление ролью
- [x] `ScreenCodes` — генерация кода с выбором KB, таблица кодов с копированием
- [x] `ScreenSettings` — язык (ru/en), тема (light/dark), плотность (compact/default)

### 7.4 API клиент
- [x] `api.ts` — добавить функции для KB: `fetchKnowledgeBases`, `createKB`, `deleteKB`, `fetchKBDetail`
- [x] `api.ts` — обновить `uploadFile` — принимать `knowledge_base_id`
- [x] `api.ts` — `fetchKBMembers`, `addMemberToKB`, `removeMemberFromKB`
- [x] `types.ts` — добавить `KnowledgeBase`, обновить `Document` (добавить `knowledge_base_id`)
- [x] `types.ts` — обновить `InviteCode` (добавить `knowledge_base_id`, `expires_at`, `is_used`)
