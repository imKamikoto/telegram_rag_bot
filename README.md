# telegram_rag_bot

## RAG API (FastAPI + Ollama + Postgres/pgvector)
- Установка зависимостей: `cd rag_app && uv sync`.
- Локальный старт: `cd rag_app && uv run uvicorn main:app --reload`.
- Docker: `cd docker && docker compose up --build` (поднимет Postgres c pgvector и Ollama API на порту 8000).
- Основные эндпоинты:
  - `GET /api/v1/health` - проверка состояния.
  - `POST /api/v1/document/pdf` - загрузка PDF и индексация (`file` в multipart).
  - `DELETE /api/v1/document/{id}` - удалить документ с чанками.
  - `PATCH /api/v1/document/{id}/active` - включить/выключить документ в выдаче.
  - `GET /api/v1/document` - список документов (админ).
  - `POST /api/v1/ask` - `{ "question": "..." }`, отвечает из RAG.
  - Пользователи/инвайты (WebApp auth): `GET /users/me`, `GET /users`, `PATCH /users/{id}/role`, `DELETE /users`, `GET/POST /users/invite-codes`, `POST /users` (по инвайту).

## Telegram Bot (aiogram + uv)
- Установка: `cd bot_app && uv sync`.
- Запуск: `make run` (использует переменные из `docker/.env`, нужны `BOT_TOKEN` и `RAG_API_URL`).
- Команда `/admin` открывает мини-приложение для админов (если настроен URL и user_id в списке админов).
- Доступ по инвайтам: отправьте `/code`, вставьте инвайт, бот зарегистрирует пользователя через RAG API.

## Admin mini-app
- React + Vite Telegram mini app для администрирования документов, пользователей и инвайт-кодов в `admin_webapp/`.
- Сборка: `cd admin_webapp && npm install && npm run dev` (локально на 5173) или `npm run build` (билд в `dist/`).
- Деплой: разместите `dist/` на публичном https и задайте `ADMIN_WEBAPP_URL` для бота.
- Авторизация: через Telegram WebApp init data (`X-Telegram-Init-Data`), доступ только для админов.
> если надо локально запущ. фронт в мини апе открыть (для тестов наприм) - ssh -R 80:localhost:5173 ssh.localhost.run
