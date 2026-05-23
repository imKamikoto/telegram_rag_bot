"""
Запускает Telethon-сценарий параллельно для всех аккаунтов из config.ACCOUNTS.

Использование:
    python runner.py

Каждый аккаунт авторизуется один раз (сессия сохраняется в sessions/).
Затем все аккаунты стартуют параллельно и прогоняют user_scenario.

По завершении выводится сводная статистика и пишется итоговая запись в лог.
"""

import asyncio
import os
import statistics
import sys

from telethon import TelegramClient

# Добавляем текущую директорию в путь (для импорта config/logger)
sys.path.insert(0, os.path.dirname(__file__))

from config import ACCOUNTS
from logger import TelethonLogger
from scenarios.user_scenario import run_user_scenario


async def _run_account(
    account: dict,
    logger: TelethonLogger,
) -> dict:
    """Создаёт клиент, авторизуется и запускает сценарий."""
    os.makedirs("sessions", exist_ok=True)

    client = TelegramClient(
        session=account["session_name"],
        api_id=account["api_id"],
        api_hash=account["api_hash"],
    )

    index = account["index"]
    print(f"[Account {index}] Подключение...")

    try:
        await client.start(phone=account["phone"])
        print(f"[Account {index}] Подключён.")
        stats = await run_user_scenario(client, index, logger)
    except Exception as exc:
        print(f"[Account {index}] ОШИБКА: {exc}")
        stats = {
            "account": index,
            "total": 0,
            "ok": 0,
            "fail": 0,
            "latencies_ms": [],
            "errors": [str(exc)],
        }
    finally:
        await client.disconnect()
        print(f"[Account {index}] Отключён.")

    return stats


def _print_summary(all_stats: list[dict], logger: TelethonLogger) -> None:
    print("\n" + "=" * 60)
    print("ИТОГОВАЯ СТАТИСТИКА")
    print("=" * 60)

    total_ok = sum(s["ok"] for s in all_stats)
    total_fail = sum(s["fail"] for s in all_stats)
    all_latencies = [lat for s in all_stats for lat in s["latencies_ms"]]

    for s in all_stats:
        lats = s["latencies_ms"]
        print(f"\n  Аккаунт {s['account']}:")
        print(f"    Успешно: {s['ok']} / {s['total']}")
        if lats:
            print(f"    Latency: avg={statistics.mean(lats):.0f}ms  "
                  f"p50={statistics.median(lats):.0f}ms  "
                  f"max={max(lats):.0f}ms")
        for err in s["errors"]:
            print(f"    ⚠ {err}")

    print(f"\n  Всего: ok={total_ok}  fail={total_fail}")
    if all_latencies:
        avg = statistics.mean(all_latencies)
        p50 = statistics.median(all_latencies)
        p95 = sorted(all_latencies)[int(len(all_latencies) * 0.95)]
        p_max = max(all_latencies)
        print(f"  Latency (все аккаунты): avg={avg:.0f}ms  p50={p50:.0f}ms  "
              f"p95={p95:.0f}ms  max={p_max:.0f}ms")
    print("=" * 60)

    # Пишем итог в лог
    summary: dict = {
        "accounts_total": len(all_stats),
        "requests_ok": total_ok,
        "requests_fail": total_fail,
    }
    if all_latencies:
        sorted_lats = sorted(all_latencies)
        summary["latency_avg_ms"] = round(statistics.mean(all_latencies), 1)
        summary["latency_p50_ms"] = round(statistics.median(all_latencies), 1)
        summary["latency_p95_ms"] = round(sorted_lats[int(len(sorted_lats) * 0.95)], 1)
        summary["latency_max_ms"] = round(max(all_latencies), 1)

    logger.log_summary(summary)


async def main() -> None:
    if not ACCOUNTS:
        print("❌  Нет настроенных аккаунтов. Заполни tests/telethon/.env")
        sys.exit(1)

    logger = TelethonLogger(log_dir="logs")

    try:
        tasks = [_run_account(acc, logger) for acc in ACCOUNTS]
        all_stats = await asyncio.gather(*tasks)
    finally:
        logger.close()

    _print_summary(list(all_stats), logger)


if __name__ == "__main__":
    asyncio.run(main())
