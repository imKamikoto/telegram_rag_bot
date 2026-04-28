from typing import Iterable, Set

from aiogram import Dispatcher, F
from aiogram.fsm.context import FSMContext
from aiogram.filters import CommandStart
from aiogram.types import Message

from keyboards import main_keyboard
from rag_service import RagService


def register_handlers(
    dp: Dispatcher,
    rag_service: RagService,
    allowed_user_ids: Iterable[int] | None = None,
    invitation_code: str = "",
) -> None:
    allowed_ids: Set[int] = set(allowed_user_ids or [])

    async def _is_blocked(message: Message) -> bool:
        if not allowed_ids:
            await message.answer("Список разрешённых пользователей пуст. Обратитесь к администратору.")
            return True
        user_id = message.from_user.id if message.from_user else None
        if user_id in allowed_ids:
            return False
        await message.answer("Доступ к боту ограничен. Обратитесь к администратору.")
        return True

    @dp.message(CommandStart())
    async def start(message: Message) -> None:
        await message.answer(
            "👋 Привет! Я бот, который отвечает из базы знаний.\n"
            "Задай вопрос — я спрошу RAG сервис и верну ответ.\n\n"
            "Команды и кнопки:\n"
            "/start — начать заново\n"
            "/reset — перезапустить диалог (контекст не сохраняется)\n"
            "/code - ввести код приглашения\n",
            reply_markup=main_keyboard(),
        )

    @dp.message(F.text == "/code")
    async def start_invite(message: Message, state: FSMContext):
        if message.from_user.id in allowed_ids:
            await message.answer(
                "У вас уже есть доступ ✅",
                reply_markup=main_keyboard()
            )
            return

        await message.answer("Введите код приглашения:")
        await state.set_state(InviteStates.waiting_for_code)

    @dp.message(InviteStates.waiting_for_code)
    async def process_invite_code(message: Message, state: FSMContext):
        if message.text.strip() != invitation_code:
            await message.answer("❌ Неверный код. Попробуйте ещё раз.")
            return

        allowed_ids.add(message.from_user.id)
        await state.clear()

        await message.answer(
            "✅ Доступ к боту предоставлен",
            reply_markup=main_keyboard()
        )

    @dp.message(F.text == "/reset")
    async def reset(message: Message) -> None:
        if await _is_blocked(message):
            return
        await message.answer(
            "Контекст не сохраняется. Можешь задавать новый вопрос ✅",
            reply_markup=main_keyboard(),
        )

    @dp.message(F.text)
    async def chat(message: Message) -> None:
        if await _is_blocked(message):
            return
        text = message.text.strip()
        if text.startswith("/"):
            return

        if not text:
            await message.answer("Отправь текстовое сообщение.")
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


from aiogram.fsm.state import StatesGroup, State

class InviteStates(StatesGroup):
    waiting_for_code = State()
