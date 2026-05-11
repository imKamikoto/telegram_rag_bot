from typing import Iterable, Set

from aiogram import Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)

from keyboards import main_keyboard
from rag_service import RagService


class UserStates(StatesGroup):
    waiting_for_invite = State()


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

    async def _check_access(message: Message) -> bool:
        """Return True if user has access, False otherwise (and reply with error)."""
        user_id = message.from_user.id if message.from_user else None
        if user_id is None:
            await message.answer("Не удалось определить ваш telegram_id.")
            return False
        if user_id in allowed_ids:
            return True
        try:
            user = await rag_service.get_user_by_telegram(user_id)
        except Exception as exc:
            await message.answer(f"Не удалось проверить доступ: {exc}")
            return False
        if user is None:
            await message.answer("Нет доступа. Введите /code и пришлите инвайт-код.")
            return False
        allowed_ids.add(user_id)
        if user.get("role") == "admin":
            admin_ids.add(user_id)
        return True

    async def _get_user_token(tg_id: int, display_name: str) -> str | None:
        try:
            return await rag_service.generate_user_token(tg_id, display_name)
        except Exception:
            return None

    async def _show_kb_selection(message: Message, bearer_token: str) -> None:
        try:
            kbs = await rag_service.get_knowledge_bases(bearer_token)
        except Exception as exc:
            await message.answer(f"Не удалось загрузить базы знаний: {exc}")
            return

        if not kbs:
            await message.answer("У вас нет доступа ни к одной базе знаний. Обратитесь к администратору.")
            return

        buttons = [
            [InlineKeyboardButton(text=kb["name"], callback_data=f"kb:{kb['id']}")]
            for kb in kbs
        ]
        await message.answer(
            "Выберите базу знаний для поиска:",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
        )

    # ─── /start ───────────────────────────────────────────────────────────────

    @dp.message(CommandStart())
    async def start(message: Message, state: FSMContext) -> None:
        await state.clear()
        tg_user = message.from_user
        if tg_user is None:
            return

        is_admin = _is_admin(tg_user.id)
        hint = "/kb — выбрать базу знаний\n/reset — очистить контекст диалога"
        if is_admin:
            hint += "\n/admin — открыть панель администратора"
        else:
            hint += "\n/code — активировать по инвайт-коду"

        await message.answer(
            f"Привет! Я помогаю искать ответы в базах знаний.\n\n{hint}",
            reply_markup=main_keyboard(is_admin=is_admin),
        )

        if is_admin and admin_webapp_url:
            name = tg_user.full_name or tg_user.username or "admin"
            try:
                token = await rag_service.generate_admin_token(tg_user.id, name)
                url = f"{admin_webapp_url}?token={token}"
                markup = InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="Открыть админку", web_app=WebAppInfo(url=url))]
                ])
                await message.answer("Панель администратора:", reply_markup=markup)
            except Exception:
                pass

    # ─── /code — активация по инвайту ────────────────────────────────────────

    @dp.message(Command("code"))
    async def start_invite(message: Message, state: FSMContext) -> None:
        user_id = message.from_user.id if message.from_user else None
        if user_id and user_id in allowed_ids:
            await message.answer("Доступ уже активен.", reply_markup=main_keyboard(is_admin=_is_admin(user_id)))
            return
        await message.answer("Пришлите инвайт-код:")
        await state.set_state(UserStates.waiting_for_invite)

    @dp.message(UserStates.waiting_for_invite)
    async def process_invite_code(message: Message, state: FSMContext) -> None:
        code = (message.text or "").strip()
        if not code:
            await message.answer("Пустой код. Пришлите инвайт-код.")
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

        is_new_admin = created.get("role") == "admin"
        await state.clear()
        await message.answer("✅ Доступ активирован!", reply_markup=main_keyboard(is_admin=is_new_admin))

        token = await _get_user_token(tg_user.id, display_name)
        if token:
            await _show_kb_selection(message, token)

    # ─── /admin ───────────────────────────────────────────────────────────────

    @dp.message(Command("admin"))
    async def open_admin(message: Message) -> None:
        if not await _check_access(message):
            return
        tg_user = message.from_user
        if not _is_admin(tg_user.id if tg_user else None):
            await message.answer("Недостаточно прав.")
            return
        if not admin_webapp_url:
            await message.answer("URL админ-панели не настроен.")
            return

        display_name = tg_user.full_name or tg_user.username or "admin"
        try:
            token = await rag_service.generate_admin_token(tg_user.id, display_name)
        except Exception as exc:
            await message.answer(f"Ошибка генерации токена: {exc}")
            return

        url = f"{admin_webapp_url}?token={token}"
        markup = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="Открыть админку", web_app=WebAppInfo(url=url))]
        ])
        await message.answer(
            f"Токен действителен 1 час:\n<code>{token}</code>",
            reply_markup=markup,
            parse_mode="HTML",
        )

    # ─── /kb — выбор базы знаний ──────────────────────────────────────────────

    @dp.message(Command("kb"))
    async def choose_kb(message: Message, state: FSMContext) -> None:
        if not await _check_access(message):
            return
        tg_user = message.from_user
        if tg_user is None:
            return
        display_name = tg_user.full_name or tg_user.username or "user"
        token = await _get_user_token(tg_user.id, display_name)
        if token is None:
            await message.answer("Не удалось получить доступ. Попробуйте позже.")
            return
        await _show_kb_selection(message, token)

    @dp.callback_query(F.data.startswith("kb:"))
    async def select_kb(callback: CallbackQuery, state: FSMContext) -> None:
        kb_id_str = (callback.data or "").split(":", 1)[-1]
        try:
            kb_id = int(kb_id_str)
        except ValueError:
            await callback.answer("Неверный ID базы.")
            return

        await state.update_data(kb_id=kb_id, session_id=None)
        await callback.answer("База выбрана ✅")
        if callback.message:
            await callback.message.edit_text(f"✅ База знаний #{kb_id} выбрана. Задавайте вопросы!")

    # ─── /reset ───────────────────────────────────────────────────────────────

    @dp.message(Command("reset"))
    async def reset(message: Message, state: FSMContext) -> None:
        if not await _check_access(message):
            return
        user_id = message.from_user.id if message.from_user else None
        await state.update_data(session_id=None)
        await message.answer("Контекст очищен.", reply_markup=main_keyboard(is_admin=_is_admin(user_id)))

    # ─── Текстовые сообщения → RAG ask ───────────────────────────────────────

    @dp.message(F.text)
    async def chat(message: Message, state: FSMContext) -> None:
        if not await _check_access(message):
            return

        text = (message.text or "").strip()
        if text.startswith("/") or not text:
            return

        tg_user = message.from_user
        if tg_user is None:
            return

        data = await state.get_data()
        kb_id: int | None = data.get("kb_id")

        if kb_id is None:
            display_name = tg_user.full_name or tg_user.username or "user"
            token = await _get_user_token(tg_user.id, display_name)
            if token:
                await _show_kb_selection(message, token)
            else:
                await message.answer("База знаний не выбрана. Используйте /kb.")
            return

        display_name = tg_user.full_name or tg_user.username or "user"
        token = await _get_user_token(tg_user.id, display_name)
        if token is None:
            await message.answer("Не удалось получить доступ. Попробуйте позже.")
            return

        session_id: str | None = data.get("session_id")
        await message.bot.send_chat_action(message.chat.id, "typing")

        try:
            result = await rag_service.ask(
                text, knowledge_base_id=kb_id, bearer_token=token, session_id=session_id
            )
        except Exception as exc:
            await message.answer(f"Ошибка при запросе к RAG: {exc}")
            return

        answer = (result.get("answer") or "").strip() or "(пустой ответ)"
        new_session_id = result.get("session_id")
        if new_session_id:
            await state.update_data(session_id=new_session_id)

        is_admin = _is_admin(tg_user.id)
        if len(answer) > 4000:
            for i in range(0, len(answer), 4000):
                await message.answer(answer[i: i + 4000])
        else:
            await message.answer(answer, reply_markup=main_keyboard(is_admin=is_admin))

        contexts = result.get("contexts") or []
        sources = [c for c in contexts if c.get("presigned_url")]
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
