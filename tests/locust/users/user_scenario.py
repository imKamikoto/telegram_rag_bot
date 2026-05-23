"""
Сценарий пользователя:
0. Регистрация по инвайт-коду (on_start)
1. Получить список доступных KB
2. Выбрать KB
3. Задать вопрос (холодный, кэш-мисс)
4. Задать похожий вопрос (кэш-хит)
4.1 Запросить presigned URL документа-источника
5. Посмотреть историю диалога

Изоляция: каждый виртуальный пользователь получает уникальный синтетический
telegram_id (диапазон 8_000_000_000+), исключающий коллизии между параллельными
воркерами и пересечение с реальными ID и admin-изолированными (9_000_000_000+).
"""

import random
from locust import TaskSet, task, between

from config import KNOWLEDGE_BASES, QUESTIONS


class UserBehavior(TaskSet):

    def on_start(self):
        """Регистрация по инвайт-коду — выполняется один раз при старте юзера."""
        # Выбираем случайную KB и соответствующий код
        self.kb = random.choice([kb for kb in KNOWLEDGE_BASES if kb["id"] and kb["code"]])

        # Уникальный синтетический telegram_id для этого виртуального пользователя.
        # Диапазон 8_000_000_000–8_999_999_999 не пересекается с реальными ID
        # и с admin-изолированными (9_000_000_000+).
        self.telegram_id = random.randint(8_000_000_000, 8_999_999_999)
        self.telegram_name = f"load_user_{self.telegram_id}"
        self.session_id = None
        self.last_presigned_url = None

        self.bot_headers = {
            "X-Bot-Secret": self.user.bot_secret,
            "X-Telegram-Id": str(self.telegram_id),
        }

        # Шаг 0 — регистрация по инвайт-коду
        with self.client.post(
            "/api/v1/users",
            json={
                "invite_code": self.kb["code"],
                "telegram_name": self.telegram_name,
                "telegram_id": self.telegram_id,
            },
            name="0. Регистрация по инвайт-коду",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 201):
                resp.success()
            else:
                resp.failure(f"Регистрация провалилась: {resp.status_code} {resp.text}")

        # Выбираем вопросы для этой KB
        self.questions = QUESTIONS.get(self.kb["name"], [])

    # ─── Таски ────────────────────────────────────────────────────────────────

    @task(2)
    def get_knowledge_bases(self):
        """Шаг 1 — получить список доступных KB."""
        with self.client.get(
            "/api/v1/knowledge-bases",
            headers=self.bot_headers,
            name="1. Получить список KB",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")

    @task(10)
    def ask_question_cold(self):
        """Шаг 3 — задать вопрос (холодный, ожидаем кэш-мисс)."""
        if not self.questions:
            return

        original, _ = random.choice(self.questions)
        if not original:
            return

        with self.client.post(
            "/api/v1/ask",
            json={
                "question": original,
                "knowledge_base_id": self.kb["id"],
                "session_id": self.session_id,
            },
            headers=self.bot_headers,
            name="3. Вопрос (холодный, кэш-мисс)",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                self.session_id = data.get("session_id")

                # Сохраняем presigned_url если есть
                contexts = data.get("contexts", [])
                urls = [c.get("presigned_url") for c in contexts if c.get("presigned_url")]
                self.last_presigned_url = urls[0] if urls else None

                resp.success()
            else:
                resp.failure(f"{resp.status_code}: {resp.text[:200]}")

    @task(5)
    def ask_question_cached(self):
        """Шаг 4 — задать похожий вопрос (ожидаем кэш-хит)."""
        if not self.questions:
            return

        _, rephrased = random.choice(self.questions)
        if not rephrased:
            return

        with self.client.post(
            "/api/v1/ask",
            json={
                "question": rephrased,
                "knowledge_base_id": self.kb["id"],
                "session_id": self.session_id,
            },
            headers=self.bot_headers,
            name="4. Вопрос (похожий, кэш-хит)",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"{resp.status_code}: {resp.text[:200]}")

    @task(3)
    def get_presigned_url(self):
        """Шаг 4.1 — запросить документ-источник по presigned URL."""
        if not self.last_presigned_url:
            return

        with self.client.get(
            self.last_presigned_url,
            name="4.1 Запрос документа-источника (presigned URL)",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 206):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")

    @task(3)
    def get_me(self):
        """Шаг 5 — получить профиль текущего пользователя."""
        with self.client.get(
            "/api/v1/users/me",
            headers=self.bot_headers,
            name="5. Профиль пользователя (me)",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")
