"""
Точка входа Locust.

Запуск с UI:
    locust -f locustfile.py --host=http://localhost:8000

Запуск headless:
    locust -f locustfile.py \
        --host=http://localhost:8000 \
        --users=20 \
        --spawn-rate=2 \
        --run-time=120s \
        --headless \
        --html=reports/report.html

Сценарии:
    - RagUser      — обычный пользователь (80%)
    - RagAdminUser — администратор (20%)
"""

from locust import HttpUser, between, events

from config import BOT_SECRET, ADMIN_TOKEN
from users.user_scenario import UserBehavior
from users.admin_scenario import AdminBehavior
from logger import RequestLogger

# ─── Глобальный логгер ────────────────────────────────────────────────────────
_logger: RequestLogger | None = None


@events.init.add_listener
def on_locust_init(environment, **kwargs):
    global _logger
    _logger = RequestLogger(log_dir="logs")
    environment.events.request.add_listener(_logger.on_request)


@events.quitting.add_listener
def on_locust_quit(environment, **kwargs):
    if _logger:
        _logger.close()


# ─── Пользователи ─────────────────────────────────────────────────────────────

class RagUser(HttpUser):
    """Обычный пользователь — общается через бота."""
    tasks = [UserBehavior]
    wait_time = between(1, 5)
    weight = 4  # 80%

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.bot_secret = BOT_SECRET


class RagAdminUser(HttpUser):
    """Администратор — управляет системой через веб-панель."""
    tasks = [AdminBehavior]
    wait_time = between(2, 8)
    weight = 1  # 20%

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.admin_token = ADMIN_TOKEN
