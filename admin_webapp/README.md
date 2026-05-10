## Telegram RAG Admin Mini-App

React + Vite мини‑приложение для администрирования документов и пользователей RAG.

### Возможности
- Просмотр и удаление загруженных документов, переключение участия в выдаче.
- Загрузка PDF с мгновенной индексацией.
- Список пользователей, смена ролей, удаление по `telegram_id`.
- Генерация и просмотр инвайт‑кодов.
- Авторизация через Telegram WebApp init data; доступ только для админов.

### Настройка окружения
1) Для RAG API добавьте переменные окружения:
   - `RAG_TELEGRAM_BOT_TOKEN` (или используйте уже существующий `BOT_TOKEN`).
   - `RAG_ADMIN_TELEGRAM_IDS` — список telegram_id админов через запятую.
   - При необходимости `RAG_TELEGRAM_INIT_EXPIRE_SECONDS` (TTL init data, по умолчанию 600).
2) Для бота:
   - `ADMIN_WEBAPP_URL` — публичный https‑URL, по которому доступен билд админки.
   - `ADMIN_USER_IDS` — кому показывать кнопку входа (если пусто, берётся `ALLOWED_USER_IDS`).
3) Поднимите API/bot как обычно (`docker compose`, `uv run` и т.п.).

### Сборка и запуск
```bash
cd admin_webapp
npm install
npm run dev      # локально на 5173
npm run build    # продакшн-билд в dist/
```

Готовый `dist/` разместите на публичном https‑хосте и пропишите URL в `ADMIN_WEBAPP_URL`.
Внутри Telegram отправьте `/admin` боту, чтобы открыть мини‑приложение.
