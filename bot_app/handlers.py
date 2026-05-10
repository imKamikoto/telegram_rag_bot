from typing import Iterable, Set

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)

from keyboards import main_keyboard
from rag_service import RagService

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".md", ".txt"}


class UserStates(StatesGroup):
    waiting_for_invite = State()
    waiting_for_kb_selection = State()


class AdminStates(StatesGroup):
    waiting_for_upload_kb = State()
    waiting_for_file = State()


def register_handlers(
    dp: Dispatcher,
    rag_service: RagService,
    allowed_user_ids: Iterable[int] | None = None,
    admin_user_ids: Iterable[int] | None = None,
    admin_webapp_url: str | None = None,
) -> None:
    allowed_ids: Set[int] = set(allowed_user_ids or [])
    admin_ids: Set[int] = set(admin_user_ids or allowed_ids)

    def _is_admin(user_id: int | None) -> bool:
        return bool(user_id and user_id in admin_ids)

    async def _is_blocked(message: Message) -> bool:
        user_id = message.from_user.id if message.from_user else None
        if user_id is None:
            await message.answer("Не удалось определить ваш telegram_id.")
            return True
        if user_id in allowed_ids:
            return False
        try:
            user = await rag_service.get_user_by_telegram(user_id)
        except Exception as exc:
            await message.answer(f"Не удалось проверить доступ: {exc}")
            return True
        if user is None:
            await message.answer("Нет доступа. Введите /code и пришлите инвайт.")
            return True
        allowed_ids.add(user_id)
        if user.get("role") == "admin":
            admin_ids.add(user_id)
        return False

    def _admin_markup() -> InlineKeyboardMarkup | None:
        if not admin_webapp_url:
            return None
        return InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text="Открыть админку", web_app=WebAppInfo(url=admin_webapp_url))]
            ]
        )

    def _kb_markup(kbs: list[dict]) -> InlineKeyboardMarkup:
        buttons = [
            [InlineKeyboardButton(text=kb["name"], callback_data=f"kb:{kb['id']}")]
            for kb in kbs
        ]
        return InlineKeyboardMarkup(inline_keyboard=buttons)

    # ─── /start ───────────────────────────────────────────────────────────────

    @dp.message(CommandStart())
    async def start(message: Message, state: FSMContext) -> None:
        await state.clear()
        user_id = message.from_user.id if message.from_user else None

        await message.answer(
            "Привет! Я бот для вопросов к базам знаний.\n"
            "Команды:\n"
            "/start — начало / сменить базу знаний\n"
            "/kb — выбрать другую базу знаний\n"
            "/reset — очистить контекст диалога\n"
            "/code — активировать по инвайту",
            reply_markup=main_keyboard(),
        )

        if _is_admin(user_id) and admin_webapp_url:
            await message.answer("Панель администратора:", reply_markup=_admin_markup())

    # ─── /code (invite) ───────────────────────────────────────────────────────

    @dp.message(Command("code"))
    async def start_invite(message: Message, state: FSMContext) -> None:
        user_id = message.from_user.id if message.from_user else None
        if user_id and user_id in allowed_ids:
            await message.answer("Доступ уже активен.", reply_markup=main_keyboard())
            return
        await message.answer("Пришлите инвайт-код:")
        await state.set_state(UserStates.waiting_for_invite)

    @dp.message(UserStates.waiting_for_invite)
    async def process_invite_code(message: Message, state: FSMContext) -> None:
        code = (message.text or "").strip()
        if not code:
            await message.answer("Пустой код. Пришлите инвайт.")
            return

        tg_user = message.from_user
        if tg_user is None:
            await message.answer("Не удалось определить ваш telegram_id.")
            return

        display_name = tg_user.full_name or tg_user.username or "user"
        try:
            created = await rag_service.register_by_invite(code, tg_user.id, display_name)
        except Exception as exc:
            await message.answer(f"Инвайт не принят: {exc}")
            return

        allowed_ids.add(tg_user.id)
        if created.get("role") == "admin":
            admin_ids.add(tg_user.id)

        await state.clear()
        await message.answer("✅ Доступ активирован. Выберите базу знаний:", reply_markup=main_keyboard())
        await _prompt_kb_selection(message, state)

    # ─── /admin ───────────────────────────────────────────────────────────────

    @dp.message(Command("admin"))
    async def open_admin(message: Message) -> None:
        if await _is_blocked(message):
            return
        if not _is_admin(message.from_user.id if message.from_user else None):
            await message.answer("Недостаточно прав.")
            return
        markup = _admin_markup()
        if not markup:
            await message.answer("URL админ-панели не настроен.")
            return
        await message.answer("Открыть RAG Admin:", reply_markup=markup)

    # ─── /kb — выбор базы знаний ──────────────────────────────────────────────

    @dp.message(Command("kb"))
    async def choose_kb(message: Message, state: FSMContext) -> None:
        if await _is_blocked(message):
            return
        await _prompt_kb_selection(message, state)

    async def _prompt_kb_selection(message: Message, state: FSMContext) -> None:
        # For KB list we need initData — in bot context we construct a minimal one
        # The simplest approach: call the API with telegram_id directly (no auth header)
        # For now — fetch via admin endpoint or store KB list per user
        user_id = message.from_user.id if message.from_user else None
        if user_id is None:
            return
        try:
            user_data = await rag_service.get_user_by_telegram(user_id)
        except Exception:
            user_data = None

        # We can't call the WebApp-only auth endpoint from the bot easily.
        # Store available KBs from invite registration or use a bot-specific endpoint.
        # For now: send message asking user to use /kb after admin grants access.
        await message.answer(
            "Используйте /kb для выбора базы знаний после того, как администратор выдаст вам доступ.\n"
            "Пока выбрана база знаний по умолчанию (если есть)."
        )
        # In a full implementation, we'd fetch the KB list and show inline buttons.
        # This requires the API to expose a bot-accessible endpoint (no WebApp initData).
        # Tracked as Фаза 5 improvement.

    # ─── /reset ───────────────────────────────────────────────────────────────

    @dp.message(Command("reset"))
    async def reset(message: Message, state: FSMContext) -> None:
        if await _is_blocked(message):
            return
        await state.update_data(session_id=None)
        await message.answer("Контекст очищен.", reply_markup=main_keyboard())

    # ─── Document upload (Admin) ───────────────────────────────────────────────

    @dp.message(F.document)
    async def handle_document(message: Message, state: FSMContext) -> None:
        if await _is_blocked(message):
            return
        if not _is_admin(message.from_user.id if message.from_user else None):
            await message.answer("Загрузка документов доступна только администраторам.")
            return

        doc = message.document
        if doc is None:
            return

        ext = ""
        if doc.file_name:
            for s in SUPPORTED_EXTENSIONS:
                if doc.file_name.lower().endswith(s):
                    ext = s
                    break

        if not ext:
            await message.answer(
                f"Неподдерживаемый формат. Поддерживаются: {', '.join(SUPPORTED_EXTENSIONS)}"
            )
            return

        await state.update_data(
            pending_file_id=doc.file_id,
            pending_file_name=doc.file_name,
            pending_file_mime=doc.mime_type or "application/octet-stream",
        )

        await message.answer(
            "Введите ID базы знаний для загрузки документа (число).\n"
            "Посмотреть список баз можно в /admin → Admin Panel."
        )
        await state.set_state(AdminStates.waiting_for_upload_kb)

    @dp.message(AdminStates.waiting_for_upload_kb)
    async def process_upload_kb(message: Message, state: FSMContext, bot: Bot) -> None:
        kb_id_str = (message.text or "").strip()
        try:
            kb_id = int(kb_id_str)
        except ValueError:
            await message.answer("Введите числовой ID базы знаний.")
            return

        data = await state.get_data()
        file_id = data.get("pending_file_id")
        file_name = data.get("pending_file_name", "document")
        mime_type = data.get("pending_file_mime", "application/octet-stream")

        if not file_id:
            await message.answer("Файл не найден. Попробуйте снова.")
            await state.clear()
            return

        await message.answer(f"Загружаю «{file_name}» в базу #{kb_id}...")
        await state.clear()

        try:
            tg_file = await bot.get_file(file_id)
            if tg_file.file_path is None:
                raise RuntimeError("Не удалось получить путь к файлу")
            file_bytes_io = await bot.download_file(tg_file.file_path)
            if file_bytes_io is None:
                raise RuntimeError("Не удалось скачать файл")
            file_bytes = file_bytes_io.read()
        except Exception as exc:
            await message.answer(f"Ошибка при скачивании файла: {exc}")
            return

        user_id = message.from_user.id if message.from_user else 0
        # Bot doesn't have Telegram WebApp initData — use a minimal placeholder
        # This requires the API to support bot-token auth or a separate endpoint.
        # For now: send telegram_id as a simple header workaround (Фаза 5 improvement).
        try:
            result = await rag_service.upload_file(
                telegram_init_data=str(user_id),
                file_bytes=file_bytes,
                filename=file_name,
                content_type=mime_type,
                knowledge_base_id=kb_id,
            )
            chunks = result.get("chunks_indexed", "?")
            await message.answer(
                f"✅ Документ «{file_name}» загружен.\n"
                f"Проиндексировано чанков: {chunks}",
                reply_markup=main_keyboard(),
            )
        except Exception as exc:
            await message.answer(f"Ошибка загрузки: {exc}", reply_markup=main_keyboard())

    # ─── Text messages → RAG ask ──────────────────────────────────────────────

    @dp.message(F.text)
    async def chat(message: Message, state: FSMContext) -> None:
        if await _is_blocked(message):
            return
        text = (message.text or "").strip()
        if text.startswith("/"):
            return
        if not text:
            await message.answer("Пустой запрос.")
            return

        data = await state.get_data()
        kb_id: int | None = data.get("kb_id")
        session_id: str | None = data.get("session_id")

        if kb_id is None:
            await message.answer(
                "База знаний не выбрана. Используйте /kb для выбора.\n"
                "Если у вас нет доступа ни к одной базе — обратитесь к администратору."
            )
            return

        await message.bot.send_chat_action(message.chat.id, "typing")

        try:
            result = await rag_service.ask(text, knowledge_base_id=kb_id, session_id=session_id)
        except Exception as exc:
            await message.answer(f"Ошибка при запросе к RAG: {exc}")
            return

        answer = (result.get("answer") or "").strip() or "(пустой ответ от RAG API)"
        new_session_id = result.get("session_id")
        if new_session_id:
            await state.update_data(session_id=new_session_id)

        contexts = result.get("contexts") or []
        sources = [c for c in contexts if c.get("presigned_url")]

        if len(answer) > 4000:
            for i in range(0, len(answer), 4000):
                await message.answer(answer[i: i + 4000])
        else:
            await message.answer(answer, reply_markup=main_keyboard())

        if sources:
            buttons = [
                [InlineKeyboardButton(
                    text=f"📄 {c.get('document_name', 'Источник')}",
                    url=c["presigned_url"],
                )]
                for c in sources[:5]
            ]
            await message.answer(
                "Источники:",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
            )
