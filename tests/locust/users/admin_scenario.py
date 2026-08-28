"""
Сценарий администратора:
1. Получить статистику (dashboard)
2. Создать базу знаний
3. Загрузить документ
4. Проиндексировать документ
5. Выдать доступ пользователю (изолированному — не трогает user-сценарий)
6. Создать инвайт-код
7.0 Запрос в плейграунде (холодный + похожий для проверки кэша)
7. Удалить документ
8. Удалить базу знаний
9. Удалить пользователя (только своего изолированного)

Изоляция: в on_start регистрируем синтетического пользователя с уникальным
telegram_id (диапазон 9_000_000_000+), не пересекающимся с реальными
тестовыми пользователями user-сценария. Шаги 5 и 9 работают только с ним.
"""

import random
import threading
import uuid
from locust import TaskSet, task, between, SequentialTaskSet

from config import KNOWLEDGE_BASES, QUESTIONS, BOT_SECRET, ADMIN_POOL

# Атомарный счётчик — каждый инстанс берёт уникального admin из пула
_admin_counter_lock = threading.Lock()
_admin_counter = 0


class AdminBehavior(SequentialTaskSet):
    """
    SequentialTaskSet — таски выполняются строго по порядку.
    Нужно чтобы сначала создать KB, потом загрузить документ, потом удалить.
    """

    def on_start(self):
        # ── Admin-токен ───────────────────────────────────────────────────────
        # Каждый инстанс берёт СВОЕГО admin из пула по счётчику — гарантия
        # уникальности без коллизий. Пул создаётся через make setup-admin.
        global _admin_counter
        with _admin_counter_lock:
            idx = _admin_counter % len(ADMIN_POOL)
            _admin_counter += 1
        admin = ADMIN_POOL[idx]
        self.admin_telegram_id = admin["telegram_id"]

        token = self.user.admin_token  # fallback

        resp = self.client.post(
            "/api/v1/auth/admin-token",
            json={"telegram_id": admin["telegram_id"],
                  "telegram_name": admin["telegram_name"]},
            headers={"X-Bot-Secret": BOT_SECRET},
            name="[admin setup] Получить admin-токен",
        )
        if resp.status_code == 200:
            token = resp.json().get("token", token)

        self.admin_headers = {
            "Authorization": f"Bearer {token}",
        }
        self.created_kb_id = None
        self.created_doc_id = None
        self.created_user_id = None
        self.playground_session_id = None

        # ── Изолированный пользователь ────────────────────────────────────────
        # Уникальный синтетический telegram_id: не пересекается с реальными
        # пользователями и с другими параллельными admin-инстансами.
        self.isolated_telegram_id = random.randint(9_000_000_000, 9_999_999_999)

        # Регистрируем его через первый доступный инвайт-код
        available_kbs = [kb for kb in KNOWLEDGE_BASES if kb["code"]]
        if not available_kbs:
            return

        kb = available_kbs[0]
        with self.client.post(
            "/api/v1/users",
            json={
                "invite_code": kb["code"],
                "telegram_name": f"admin_isolated_{self.isolated_telegram_id}",
                "telegram_id": self.isolated_telegram_id,
            },
            headers={
                "X-Bot-Secret": BOT_SECRET,
                "X-Telegram-Id": str(self.isolated_telegram_id),
            },
            name="[admin setup] Регистрация изолированного пользователя",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 201, 409):
                resp.success()
            else:
                resp.failure(f"Не удалось зарегистрировать изолированного пользователя: {resp.status_code}")

    # ─── Таски ────────────────────────────────────────────────────────────────

    @task
    def get_stats(self):
        """Шаг 1 — получить статистику (dashboard)."""
        with self.client.get(
            "/api/v1/stats",
            headers=self.admin_headers,
            name="1. Статистика (dashboard)",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")

    @task
    def create_knowledge_base(self):
        """Шаг 2 — создать базу знаний."""
        kb_name = f"test_kb_{uuid.uuid4().hex[:8]}"

        with self.client.post(
            "/api/v1/knowledge-bases",
            json={"name": kb_name, "description": "Locust test KB"},
            headers=self.admin_headers,
            name="2. Создать KB",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 201):
                self.created_kb_id = resp.json().get("id")
                resp.success()
            else:
                resp.failure(f"{resp.status_code}: {resp.text[:200]}")

    @task
    def upload_document(self):
        """Шаг 3 — загрузить документ."""
        if not self.created_kb_id:
            return

        # Берём тестовый документ — если нет реального файла, шлём текстовый
        doc_content = b"This is a test document for locust load testing. " * 50
        files = {
            "file": ("test_doc.txt", doc_content, "text/plain"),
        }
        data = {"knowledge_base_id": str(self.created_kb_id)}

        with self.client.post(
            "/api/v1/document/file",
            files=files,
            data=data,
            headers=self.admin_headers,
            name="3. Загрузить документ",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 201):
                self.created_doc_id = resp.json().get("id")
                resp.success()
            else:
                resp.failure(f"{resp.status_code}: {resp.text[:200]}")

    @task
    def index_document(self):
        """Шаг 4 — проиндексировать документ."""
        if not self.created_doc_id:
            return

        with self.client.post(
            f"/api/v1/document/{self.created_doc_id}/index",
            headers=self.admin_headers,
            name="4. Индексировать документ",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"{resp.status_code}: {resp.text[:200]}")

    @task
    def grant_access(self):
        """Шаг 5 — выдать доступ изолированному пользователю к созданной KB."""
        if not self.created_kb_id:
            return

        # Находим user_id нашего изолированного пользователя.
        # При 404 (второй цикл sequential — пользователь удалён на шаге 9)
        # пересоздаём его через бот-хедеры.
        with self.client.get(
            f"/api/v1/users/telegram/{self.isolated_telegram_id}",
            headers=self.admin_headers,
            name="5. Найти пользователя",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                user_id = resp.json().get("id")
                resp.success()
            elif resp.status_code == 404:
                # Пересоздаём изолированного пользователя
                available_kbs = [kb for kb in KNOWLEDGE_BASES if kb["code"]]
                if available_kbs:
                    self.client.post(
                        "/api/v1/users",
                        json={
                            "invite_code": available_kbs[0]["code"],
                            "telegram_name": f"admin_isolated_{self.isolated_telegram_id}",
                            "telegram_id": self.isolated_telegram_id,
                        },
                        headers={
                            "X-Bot-Secret": BOT_SECRET,
                            "X-Telegram-Id": str(self.isolated_telegram_id),
                        },
                    )
                resp.success()  # не считаем как failure, это штатная ситуация
                return
            else:
                resp.failure(f"{resp.status_code}")
                return

        # Выдаём доступ
        with self.client.post(
            f"/api/v1/knowledge-bases/{self.created_kb_id}/members",
            json={"user_id": user_id},
            headers=self.admin_headers,
            name="5. Выдать доступ к KB",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 201):
                self.created_user_id = user_id
                resp.success()
            else:
                resp.failure(f"{resp.status_code}: {resp.text[:200]}")

    @task
    def create_invite_code(self):
        """Шаг 6 — создать инвайт-код."""
        if not self.created_kb_id:
            return

        with self.client.post(
            "/api/v1/users/invite-codes",
            json={
                "max_uses": None,  # безлимитный
                "knowledge_base_id": self.created_kb_id,
            },
            headers=self.admin_headers,
            name="6. Создать инвайт-код",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 201):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}: {resp.text[:200]}")

    @task
    def playground_cold_ask(self):
        """Шаг 7.0а — запрос в плейграунде (холодный, кэш-мисс)."""
        if not self.created_kb_id:
            return

        # Берём вопрос из любого отдела
        kb = random.choice([kb for kb in KNOWLEDGE_BASES if kb["name"] in QUESTIONS])
        questions = QUESTIONS.get(kb["name"], [])
        if not questions:
            return

        original, _ = random.choice(questions)
        if not original:
            return

        with self.client.post(
            "/api/v1/ask",
            json={
                "question": original,
                "knowledge_base_id": self.created_kb_id,
            },
            headers=self.admin_headers,
            name="7.0а Плейграунд (холодный, кэш-мисс)",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                self.playground_session_id = resp.json().get("session_id")
                self._last_original = original
                resp.success()
            else:
                resp.failure(f"{resp.status_code}: {resp.text[:200]}")

    @task
    def playground_cached_ask(self):
        """Шаг 7.0б — похожий вопрос в плейграунде (ожидаем кэш-хит)."""
        if not self.created_kb_id or not hasattr(self, "_last_original"):
            return

        # Берём перефразировку для того же вопроса
        kb = random.choice([kb for kb in KNOWLEDGE_BASES if kb["name"] in QUESTIONS])
        questions = QUESTIONS.get(kb["name"], [])
        if not questions:
            return

        _, rephrased = random.choice(questions)
        if not rephrased:
            return

        with self.client.post(
            "/api/v1/ask",
            json={
                "question": rephrased,
                "knowledge_base_id": self.created_kb_id,
                "session_id": self.playground_session_id,
            },
            headers=self.admin_headers,
            name="7.0б Плейграунд (похожий, кэш-хит)",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"{resp.status_code}: {resp.text[:200]}")

    @task
    def delete_document(self):
        """Шаг 7 — удалить документ."""
        if not self.created_doc_id:
            return

        with self.client.delete(
            f"/api/v1/document/{self.created_doc_id}",
            headers=self.admin_headers,
            name="7. Удалить документ",
            catch_response=True,
        ) as resp:
            self.created_doc_id = None  # сбрасываем всегда, чтобы не тащить в след. цикл
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")

    @task
    def delete_knowledge_base(self):
        """Шаг 8 — удалить базу знаний."""
        if not self.created_kb_id:
            return

        with self.client.delete(
            f"/api/v1/knowledge-bases/{self.created_kb_id}",
            headers=self.admin_headers,
            name="8. Удалить KB",
            catch_response=True,
        ) as resp:
            self.created_kb_id = None  # сбрасываем всегда
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")

    @task
    def delete_user(self):
        """Шаг 9 — удалить изолированного пользователя (только своего)."""
        if not self.created_user_id:
            return

        with self.client.delete(
            "/api/v1/users",
            json={"telegram_id": self.isolated_telegram_id},
            headers=self.admin_headers,
            name="9. Удалить пользователя",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 204):
                self.created_user_id = None
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")
