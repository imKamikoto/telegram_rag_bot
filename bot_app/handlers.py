from typing import Iterable, Set

from aiogram import Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo

from keyboards import main_keyboard
from rag_service import RagService


class InviteStates(StatesGroup):
    waiting_for_code = State()


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

        # check backend for user and role
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

    @dp.message(CommandStart())
    async def start(message: Message) -> None:
        await message.answer(
            "Привет! Я бот для вопросов к RAG.\n"
            "Доступ по списку / инвайтам. Команды:\n"
            "/start — помощь\n"
            "/reset — очистить контекст\n"
            "/code — отправить инвайт-код",
            reply_markup=main_keyboard(),
        )

        if _is_admin(message.from_user.id if message.from_user else None):
            markup = _admin_markup()
            if markup:
                await message.answer("Админ-панель:", reply_markup=markup)

    @dp.message(Command("admin"))
    async def open_admin(message: Message) -> None:
        if await _is_blocked(message):
            return
        if not _is_admin(message.from_user.id if message.from_user else None):
            await message.answer("Недостаточно прав для открытия админ-панели.")
            return
        markup = _admin_markup()
        if not markup:
            await message.answer("URL админ-панели не настроен.")
            return
        await message.answer("Открыть RAG Admin:", reply_markup=markup)

    @dp.message(F.text == "/code")
    async def start_invite(message: Message, state: FSMContext):
        if message.from_user and message.from_user.id in allowed_ids:
            await message.answer("Доступ уже активен.", reply_markup=main_keyboard())
            return

        await message.answer("Пришлите инвайт-код:")
        await state.set_state(InviteStates.waiting_for_code)

    @dp.message(InviteStates.waiting_for_code)
    async def process_invite_code(message: Message, state: FSMContext):
        code = (message.text or "").strip()
        if not code:
            await message.answer("Пустой код. Пришлите инвайт.")
            return

        tg_user = message.from_user
        user_id = tg_user.id if tg_user else None
        if user_id is None:
            await message.answer("Не удалось определить ваш telegram_id. Попробуйте снова.")
            return

        display_name = tg_user.full_name if tg_user and tg_user.full_name else tg_user.username or "user"

        try:
            created = await rag_service.register_by_invite(code, user_id, display_name)
        except Exception as exc:
            await message.answer(f"Инвайт не принят: {exc}")
            return

        allowed_ids.add(user_id)
        if created.get("role") == "admin":
            admin_ids.add(user_id)

        await state.clear()

        await message.answer("✅ Доступ по инвайту включен.", reply_markup=main_keyboard())

    @dp.message(F.text == "/reset")
    async def reset(message: Message) -> None:
        if await _is_blocked(message):
            return
        await message.answer("Контекст очищен. Можно задавать новый вопрос.", reply_markup=main_keyboard())

    @dp.message(F.text)
    async def chat(message: Message) -> None:
        if await _is_blocked(message):
            return
        text = (message.text or "").strip()
        if text.startswith("/"):
            return

        if not text:
            await message.answer("Пустой запрос.")
            return

        await message.bot.send_chat_action(message.chat.id, "typing")

        try:
            answer = await rag_service.ask(text)
        except Exception as exc:
            await message.answer(f"Ошибка при запросе к RAG: {exc}")
            return

        if len(answer) <= 4000:
            await message.answer(answer, reply_markup=main_keyboard())
            return

        for i in range(0, len(answer), 4000):
            await message.answer(answer[i : i + 4000], reply_markup=main_keyboard())
