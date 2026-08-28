# Telethon E2E-тесты

Тестирование через реальный Telegram-клиент. В отличие от Locust (прямые HTTP-запросы к API),
здесь мы симулируем живого пользователя: сообщения идут через Telegram → bot_app → rag_app.

Цель — измерить **сквозную latency** с учётом накладных расходов Telegram-прослойки
и сравнить с результатами Locust.

---

## Структура

```
tests/telethon/
├── .env.example            # шаблон переменных окружения
├── .env                    # заполни сам (не коммитить!)
├── config.py               # парсинг .env, вопросы, параметры
├── logger.py               # JSON Lines логгер
├── runner.py               # точка входа, параллельный запуск аккаунтов
├── requirements.txt
├── Makefile
├── sessions/               # файлы Telethon-сессий (создаются автоматически)
├── logs/                   # JSONL-логи прогонов
└── scenarios/
    └── user_scenario.py    # сценарий: /start → инвайт-код → вопросы
```

---

## Быстрый старт

### 1. Получи Telegram API credentials

1. Зайди на [my.telegram.org](https://my.telegram.org) под номером тестового аккаунта
2. → **API development tools**
3. Создай приложение, получи `api_id` и `api_hash`
4. Повтори для второго аккаунта

### 2. Заполни .env

```bash
cp .env.example .env
# открой .env и заполни все поля
```

Минимум нужен 1 аккаунт (`TG_API_ID_1`, `TG_API_HASH_1`, `TG_PHONE_1`).

### 3. Установи зависимости

```bash
make install
# или
pip install -r requirements.txt
```

### 4. Авторизуй аккаунты (только первый раз)

```bash
make auth
```

Telethon запросит SMS-код для каждого аккаунта.
Сессии сохраняются в `sessions/` — повторная авторизация не нужна.

### 5. Запусти тесты

```bash
# Быстрый smoke (1 итерация)
make smoke

# Полный прогон (5 итераций по умолчанию)
make run

# С кастомными параметрами
make run ITERATIONS=10 DELAY=2.0
```

---

## Параметры (.env)

| Переменная        | Описание                                     | Дефолт |
|-------------------|----------------------------------------------|--------|
| `ITERATIONS`      | Кол-во пар вопросов на аккаунт               | 5      |
| `MESSAGE_DELAY`   | Пауза между сообщениями (сек)                | 1.0    |
| `RESPONSE_TIMEOUT`| Таймаут ожидания ответа бота (сек)           | 60     |

---

## Логи

Каждый прогон создаёт файл `logs/telethon_<YYYYMMDD_HHMMSS>.jsonl`.

Пример записи вопроса:
```json
{
  "ts": "2025-01-15T12:00:00.000000+00:00",
  "account": 1,
  "kb": "IT",
  "step": "2a. Вопрос (холодный) iter=1",
  "latency_ms": 4812.3,
  "success": true,
  "question": "На каком решении построен корпоративный VPN?",
  "answer": "Корпоративный VPN построен на решении...",
  "cache_hint": false
}
```

Последняя запись в файле — итоговая статистика (`"type": "summary"`).

### Сравнение с Locust

| Метрика       | Locust (прямой API) | Telethon (через TG) |
|---------------|--------------------|--------------------|
| avg latency   | ~X ms              | ~Y ms              |
| p95 latency   | ~X ms              | ~Y ms              |

Разница Y−X ≈ накладные расходы Telegram (обычно 200–800 мс).

---

## Устранение проблем

**`SessionPasswordNeededError`** — аккаунт с двухфакторной авторизацией.
Добавь пароль в `client.start(phone=..., password="...")` в `runner.py`.

**`FloodWaitError`** — Telegram ограничил частоту. Увеличь `MESSAGE_DELAY`.

**Бот не отвечает** — проверь `BOT_USERNAME` в `.env` (должен быть с `@`).
Убедись что бот запущен: `docker compose ps`.

**`timeout`** — увеличь `RESPONSE_TIMEOUT`. Если LLM медленный — норма 30–60 с.
