ITERATIONS ?= 5
DELAY      ?= 1.0
TIMEOUT    ?= 60

.PHONY: install auth run smoke clean help

## Установить зависимости
install:
	pip install -r requirements.txt

## Авторизовать аккаунты (первый запуск — введи код из SMS)
auth:
	python -c "\
import asyncio, os, sys; \
sys.path.insert(0, '.'); \
from config import ACCOUNTS; \
from telethon import TelegramClient; \
async def auth(): \
    os.makedirs('sessions', exist_ok=True); \
    for acc in ACCOUNTS: \
        c = TelegramClient(acc['session_name'], acc['api_id'], acc['api_hash']); \
        await c.start(phone=acc['phone']); \
        print(f'Account {acc[\"index\"]} — OK'); \
        await c.disconnect(); \
asyncio.run(auth())"

## Запустить полный сценарий (все аккаунты, параллельно)
run:
	ITERATIONS=$(ITERATIONS) MESSAGE_DELAY=$(DELAY) RESPONSE_TIMEOUT=$(TIMEOUT) \
	python runner.py

## Smoke: 1 итерация, быстро
smoke:
	ITERATIONS=1 MESSAGE_DELAY=0.5 RESPONSE_TIMEOUT=30 \
	python runner.py

## Удалить логи и файлы сессий
clean:
	rm -f logs/telethon_*.jsonl
	rm -f sessions/*.session sessions/*.session-journal

## Помощь
help:
	@echo ""
	@echo "Использование:"
	@echo "  make install              Установить зависимости"
	@echo "  make auth                 Авторизовать Telegram-аккаунты (первый запуск)"
	@echo "  make run                  Запустить сценарий (дефолтные параметры)"
	@echo "  make smoke                Быстрый прогон (1 итерация)"
	@echo "  make run ITERATIONS=10    Задать количество итераций"
	@echo "  make run DELAY=2.0        Пауза между сообщениями (сек)"
	@echo "  make clean                Удалить логи и сессии"
	@echo ""
	@echo "Параметры (можно переопределить):"
	@echo "  ITERATIONS=$(ITERATIONS)"
	@echo "  DELAY=$(DELAY)"
	@echo "  TIMEOUT=$(TIMEOUT)"
	@echo ""
