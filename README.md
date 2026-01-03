# telegram_rag_bot

## RAG API (FastAPI + Ollama + Postgres/pgvector)
- Зависимости: `cd rag_app && uv sync`.
- Локальный запуск: `cd rag_app && uv run uvicorn main:app --reload`.
- Docker: `cd docker && docker compose up --build` (поднимет Postgres c pgvector, Ollama и API на 8000).
- Эндпоинты:
  - `GET /api/v1/health` — проверка сервиса.
  - `POST /api/v1/ingest/pdf` — multipart загрузка PDF (`file`) с парсингом и индексированием.
  - `POST /api/v1/ask` — `{ "question": "..." }`, отвечает на основе ближайших чанков.
