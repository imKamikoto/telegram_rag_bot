"""
Telethon-сценарий пользователя.

Шаги:
  0. Отправить /start боту
  1. Зарегистрироваться по инвайт-коду (отправить код боту)
  2. N итераций:
     2a. Задать «холодный» вопрос (ожидаем кэш-мисс)
     2b. Задать перефразированный вопрос (ожидаем кэш-хит)

Каждый шаг измеряет latency_ms — от отправки сообщения до получения ответа.
"""

import asyncio
import random
import time
from typing import TYPE_CHECKING

from telethon import TelegramClient, events
from telethon.tl.types import Message

if TYPE_CHECKING:
    from logger import TelethonLogger

from config import (
    BOT_USERNAME,
    INVITE_CODES,
    ITERATIONS,
    MESSAGE_DELAY,
    QUESTIONS,
    RESPONSE_TIMEOUT,
)


async def _wait_for_response(
    client: TelegramClient,
    bot_username: str,
    timeout: int = RESPONSE_TIMEOUT,
) -> tuple[str | None, float]:
    """
    Ждёт ответного сообщения от бота.
    Возвращает (текст_сообщения, latency_ms) или (None, timeout_ms).
    """
    future: asyncio.Future[Message] = asyncio.get_event_loop().create_future()

    @client.on(events.NewMessage(from_users=bot_username))
    async def handler(event: events.NewMessage.Event):
        if not future.done():
            future.set_result(event.message)

    t0 = time.perf_counter()
    try:
        msg: Message = await asyncio.wait_for(future, timeout=timeout)
        latency_ms = (time.perf_counter() - t0) * 1000
        return msg.text or "", latency_ms
    except asyncio.TimeoutError:
        latency_ms = timeout * 1000
        return None, latency_ms
    finally:
        client.remove_event_handler(handler)


async def run_user_scenario(
    client: TelegramClient,
    account_index: int,
    logger: "TelethonLogger",
) -> dict:
    """
    Полный сценарий для одного аккаунта.
    Возвращает словарь со статистикой: total/ok/fail, latencies.
    """
    stats = {
        "account": account_index,
        "total": 0,
        "ok": 0,
        "fail": 0,
        "latencies_ms": [],
        "errors": [],
    }

    # Выбираем KB с инвайт-кодом
    available_kbs = [(kb, code) for kb, code in INVITE_CODES.items() if QUESTIONS.get(kb)]
    if not available_kbs:
        print(f"[Account {account_index}] Нет KB с вопросами, пропускаем.")
        return stats

    kb_name, invite_code = random.choice(available_kbs)
    questions = QUESTIONS[kb_name]

    print(f"[Account {account_index}] KB={kb_name}, итераций={ITERATIONS}")

    # ── Шаг 0: /start ────────────────────────────────────────────────────────
    try:
        await client.send_message(BOT_USERNAME, "/start")
        response, latency_ms = await _wait_for_response(client, BOT_USERNAME)
        logger.log_step(
            account_index=account_index,
            kb=kb_name,
            step="0. /start",
            latency_ms=latency_ms,
            answer=response,
            success=response is not None,
            error=None if response else "timeout",
        )
        stats["total"] += 1
        if response:
            stats["ok"] += 1
        else:
            stats["fail"] += 1
    except Exception as exc:
        logger.log_step(account_index=account_index, kb=kb_name, step="0. /start",
                        success=False, error=str(exc))
        stats["total"] += 1
        stats["fail"] += 1

    await asyncio.sleep(MESSAGE_DELAY)

    # ── Шаг 1: инвайт-код ────────────────────────────────────────────────────
    try:
        await client.send_message(BOT_USERNAME, invite_code)
        response, latency_ms = await _wait_for_response(client, BOT_USERNAME)

        # Успех — любой ответ (уже зарегистрирован тоже ок)
        success = response is not None
        logger.log_step(
            account_index=account_index,
            kb=kb_name,
            step="1. Инвайт-код",
            latency_ms=latency_ms,
            answer=response,
            success=success,
            error=None if success else "timeout",
        )
        stats["total"] += 1
        if success:
            stats["ok"] += 1
        else:
            stats["fail"] += 1
    except Exception as exc:
        logger.log_step(account_index=account_index, kb=kb_name, step="1. Инвайт-код",
                        success=False, error=str(exc))
        stats["total"] += 1
        stats["fail"] += 1

    await asyncio.sleep(MESSAGE_DELAY)

    # ── Шаги 2a / 2b: вопросы ────────────────────────────────────────────────
    for iteration in range(1, ITERATIONS + 1):
        original, rephrased = random.choice(questions)

        # 2a. Холодный вопрос
        await _ask_and_log(
            client=client,
            account_index=account_index,
            kb_name=kb_name,
            question=original,
            step=f"2a. Вопрос (холодный) iter={iteration}",
            logger=logger,
            stats=stats,
        )
        await asyncio.sleep(MESSAGE_DELAY)

        # 2b. Перефразированный (кэш-хит)
        await _ask_and_log(
            client=client,
            account_index=account_index,
            kb_name=kb_name,
            question=rephrased,
            step=f"2b. Вопрос (кэш-хит) iter={iteration}",
            logger=logger,
            stats=stats,
        )
        await asyncio.sleep(MESSAGE_DELAY)

    return stats


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _ask_and_log(
    *,
    client: TelegramClient,
    account_index: int,
    kb_name: str,
    question: str,
    step: str,
    logger: "TelethonLogger",
    stats: dict,
) -> None:
    try:
        await client.send_message(BOT_USERNAME, question)
        answer, latency_ms = await _wait_for_response(client, BOT_USERNAME)
        success = answer is not None
        logger.log_step(
            account_index=account_index,
            kb=kb_name,
            step=step,
            latency_ms=latency_ms,
            question=question,
            answer=answer,
            success=success,
            error=None if success else "timeout",
        )
        stats["total"] += 1
        if success:
            stats["ok"] += 1
            stats["latencies_ms"].append(latency_ms)
        else:
            stats["fail"] += 1
            stats["errors"].append(f"{step}: timeout")

    except Exception as exc:
        logger.log_step(
            account_index=account_index,
            kb=kb_name,
            step=step,
            question=question,
            success=False,
            error=str(exc),
        )
        stats["total"] += 1
        stats["fail"] += 1
        stats["errors"].append(f"{step}: {exc}")
