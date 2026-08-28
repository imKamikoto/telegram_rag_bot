"""
Логгер для Telethon-тестов.
Пишет в logs/telethon_<timestamp>.jsonl (JSON Lines — одна запись на строку).

Каждая запись содержит:
  - ts           — время UTC
  - account      — индекс аккаунта (1, 2, 3)
  - kb           — название базы знаний
  - step         — шаг сценария
  - question     — вопрос (если есть)
  - answer       — ответ бота (если есть)
  - latency_ms   — время от отправки до получения ответа (мс)
  - success      — True/False
  - error        — текст ошибки или None
  - cache_hint   — угадываем по скорости ответа (< 2s → вероятно кэш)
"""

import json
import os
from datetime import datetime, timezone


class TelethonLogger:
    CACHE_THRESHOLD_MS = 2000  # быстрее 2 сек → вероятно кэш-хит

    def __init__(self, log_dir: str = "logs"):
        os.makedirs(log_dir, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        self._path = os.path.join(log_dir, f"telethon_{ts}.jsonl")
        self._file = open(self._path, "a", encoding="utf-8")
        print(f"[TelethonLogger] Логи пишутся в: {self._path}")

    # ─── Public API ───────────────────────────────────────────────────────────

    def log_step(
        self,
        *,
        account_index: int,
        kb: str,
        step: str,
        latency_ms: float | None = None,
        question: str | None = None,
        answer: str | None = None,
        success: bool = True,
        error: str | None = None,
    ) -> None:
        record: dict = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "account": account_index,
            "kb": kb,
            "step": step,
            "latency_ms": round(latency_ms, 1) if latency_ms is not None else None,
            "success": success,
            "error": error,
        }
        if question is not None:
            record["question"] = question
        if answer is not None:
            record["answer"] = answer[:500]  # не пишем гигантские ответы целиком
        if latency_ms is not None:
            record["cache_hint"] = latency_ms < self.CACHE_THRESHOLD_MS

        self._write(record)

    def log_summary(self, stats: dict) -> None:
        """Итоговая статистика после прогона."""
        record = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "type": "summary",
            **stats,
        }
        self._write(record)

    def close(self) -> None:
        self._file.close()

    # ─── Internal ─────────────────────────────────────────────────────────────

    def _write(self, record: dict) -> None:
        self._file.write(json.dumps(record, ensure_ascii=False) + "\n")
        self._file.flush()
