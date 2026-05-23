"""
Логгер запросов/ответов для Locust.
Пишет в logs/requests_<timestamp>.jsonl (JSON Lines — одна запись на строку).

Подключается через event hooks в locustfile.py.
"""

import json
import os
from datetime import datetime, timezone


class RequestLogger:
    def __init__(self, log_dir: str = "logs"):
        os.makedirs(log_dir, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        self._path = os.path.join(log_dir, f"requests_{ts}.jsonl")
        self._file = open(self._path, "a", encoding="utf-8")
        print(f"[RequestLogger] Логи пишутся в: {self._path}")

    def log(self, record: dict) -> None:
        self._file.write(json.dumps(record, ensure_ascii=False) + "\n")
        self._file.flush()

    def close(self) -> None:
        self._file.close()

    # ─── Event handlers ───────────────────────────────────────────────────────

    def on_request(
        self,
        request_type: str,
        name: str,
        response_time: float,
        response_length: int,
        response,
        context: dict,
        exception,
        **kwargs,
    ) -> None:
        """Вызывается после каждого запроса."""

        record: dict = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "type": request_type,
            "name": name,
            "response_time_ms": round(response_time, 1),
            "response_length": response_length,
            "status_code": getattr(response, "status_code", None),
            "success": exception is None,
            "error": str(exception) if exception else None,
        }

        # Для /ask логируем вопрос и ответ
        if "/ask" in name.lower() or "вопрос" in name.lower() or "плейграунд" in name.lower():
            try:
                # Запрос
                req_body = getattr(response, "request", None)
                if req_body and hasattr(req_body, "body") and req_body.body:
                    payload = json.loads(req_body.body)
                    record["question"] = payload.get("question")
                    record["knowledge_base_id"] = payload.get("knowledge_base_id")
                    record["session_id"] = payload.get("session_id")

                # Ответ
                if response and response.status_code == 200:
                    resp_json = response.json()
                    record["answer"] = resp_json.get("answer")
                    record["session_id_returned"] = resp_json.get("session_id")

                    # Источники (только имена документов)
                    contexts = resp_json.get("contexts", [])
                    record["sources"] = [
                        {
                            "document_name": c.get("document_name"),
                            "score": round(c.get("score", 0), 4),
                        }
                        for c in contexts
                    ]
                    record["cache_hit"] = len(contexts) == 0  # если нет контекстов — вероятно кэш

            except Exception as e:
                record["parse_error"] = str(e)

        self.log(record)
