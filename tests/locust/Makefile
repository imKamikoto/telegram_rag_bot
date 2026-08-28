HOST      ?= http://localhost:8000
USERS     ?= 20
SPAWN     ?= 2
DURATION  ?= 120s
FILE      := locustfile.py

# Создаём папку для отчётов если нет
$(shell mkdir -p reports)

.PHONY: install setup-admin ui smoke load stress run users-only admin-only clean help

## Установить зависимости
install:
	pip install -r requirements.txt

## Создать пул admin-пользователей после docker compose down -v
## Запускать один раз после пересборки проекта
setup-admin:
	@echo "Создаём пул admin-пользователей в БД..."
	docker exec rag_postgres psql -U rag_user -d rag -c "\
		INSERT INTO users (telegram_id, telegram_name, role) VALUES \
		  (529936774,  'arnch',        'admin'), \
		  (7000000001, 'test_admin_2', 'admin'), \
		  (7000000002, 'test_admin_3', 'admin'), \
		  (7000000003, 'test_admin_4', 'admin'), \
		  (7000000004, 'test_admin_5', 'admin') \
		ON CONFLICT (telegram_id) DO UPDATE SET role = 'admin'; \
	"
	@echo "✅ Готово. Можно запускать тесты."

## Запуск с веб-UI (http://localhost:8089)
ui:
	locust -f $(FILE) --host=$(HOST)

## Smoke-тест — 5 пользователей, 30 сек
smoke:
	locust -f $(FILE) \
		--host=$(HOST) \
		--users=5 \
		--spawn-rate=1 \
		--run-time=30s \
		--headless \
		--exit-code-on-error 0 \
		--html=reports/smoke_report.html

## Load-тест — 20 пользователей, 2 мин
load:
	locust -f $(FILE) \
		--host=$(HOST) \
		--users=20 \
		--spawn-rate=2 \
		--run-time=120s \
		--headless \
		--html=reports/load_report.html

## Stress-тест — 50 пользователей, 3 мин
stress:
	locust -f $(FILE) \
		--host=$(HOST) \
		--users=50 \
		--spawn-rate=5 \
		--run-time=180s \
		--headless \
		--html=reports/stress_report.html

## Кастомный запуск (make run USERS=30 SPAWN=3 DURATION=90s)
run:
	locust -f $(FILE) \
		--host=$(HOST) \
		--users=$(USERS) \
		--spawn-rate=$(SPAWN) \
		--run-time=$(DURATION) \
		--headless \
		--html=reports/custom_report.html

## Только пользовательский сценарий
users-only:
	locust -f $(FILE) \
		--host=$(HOST) \
		--users=$(USERS) \
		--spawn-rate=$(SPAWN) \
		--run-time=$(DURATION) \
		--headless \
		--class-picker \
		--html=reports/users_report.html \
		RagUser

## Только сценарий администратора
admin-only:
	locust -f $(FILE) \
		--host=$(HOST) \
		--users=3 \
		--spawn-rate=1 \
		--run-time=$(DURATION) \
		--headless \
		--html=reports/admin_report.html \
		RagAdminUser

## Удалить все отчёты
clean:
	rm -f reports/*.html reports/*.csv

## Помощь
help:
	@echo ""
	@echo "Использование:"
	@echo "  make install          Установить зависимости"
	@echo "  make ui               Запустить с веб-UI (localhost:8089)"
	@echo "  make smoke            Smoke-тест (5 users, 30s)"
	@echo "  make load             Load-тест (20 users, 2min)"
	@echo "  make stress           Stress-тест (50 users, 3min)"
	@echo "  make run              Кастомный запуск"
	@echo "  make users-only       Только пользовательский сценарий"
	@echo "  make admin-only       Только сценарий администратора"
	@echo "  make clean            Удалить отчёты"
	@echo ""
	@echo "Параметры (переопределяются):"
	@echo "  HOST=$(HOST)"
	@echo "  USERS=$(USERS)"
	@echo "  SPAWN=$(SPAWN)"
	@echo "  DURATION=$(DURATION)"
	@echo ""
