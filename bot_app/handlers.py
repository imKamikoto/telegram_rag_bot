from typing import Iterable, Set

from aiogram import Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Document, Message

from history import ChatHistory
from keyboards import main_keyboard
from rag_service import RagService

SYSTEM_PROMPT = (
    "Ты — ассистент базы знаний. Отвечай кратко и по делу, только на основе контекста."
)


class InviteStates(StatesGroup):
    waiting_for_code = State()


def register_handlers(
    dp: Dispatcher,
    rag_service: RagService,
    chat_history: ChatHistory,
    allowed_user_ids: Iterable[int] | None = None,
    invitation_code: str = "",
) -> None:
    allowed_ids: Set[int] = set(allowed_user_ids or [])

    async def _is_blocked(message: Message) -> bool:
        if not allowed_ids and not invitation_code:
            return False
        user_id = message.from_user.id if message.from_user else None
        if user_id in allowed_ids:
            return False
        await message.answer(
            "⛔ Доступ ограничен. Введите код приглашения: /code",
        )
        return True

    @dp.message(CommandStart())
    async def start(message: Message) -> None:
        await message.answer(
            "👋 Привет! Я бот, который отвечает из базы знаний.\n\n"
            "Просто задай вопрос — и я найду ответ в документах.\n\n"
            "Команды:\n"
            "/start — начать заново\n"
            "/reset — сбросить историю диалога\n"
            "/code — ввести код приглашения\n"
            "/upload — загрузить PDF-документ в базу знаний",
            reply_markup=main_keyboard(),
        )

    @dp.message(F.text == "/code")
    async def start_invite(message: Message, state: FSMContext):
        if message.from_user.id in allowed_ids:
            await message.answer("✅ У вас уже есть доступ.", reply_markup=main_keyboard())
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
        await message.answer("✅ Доступ предоставлен!", reply_markup=main_keyboard())

    @dp.message(F.text == "/reset")
    async def reset(message: Message) -> None:
        if await _is_blocked(message):
            return
        user_id = message.from_user.id
        chat_history.reset(user_id)
        await message.answer("🔄 История диалога сброшена.", reply_markup=main_keyboard())

    @dp.message(F.text == "/upload")
    async def upload_prompt(message: Message) -> None:
        if await _is_blocked(message):
            return
        await message.answer("📎 Отправьте PDF-файл для загрузки в базу знаний.")

    @dp.message(F.document)
    async def upload_document(message: Message) -> None:
        if await _is_blocked(message):
            return

        doc: Document = message.document
        if not doc.mime_type == "application/pdf":
            await message.answer("❌ Поддерживаются только PDF-файлы.")
            return

        await message.answer("⏳ Загружаю и индексирую документ...")
        await message.bot.send_chat_action(message.chat.id, "upload_document")

        try:
            file = await message.bot.get_file(doc.file_id)
            file_bytes_io = await message.bot.download_file(file.file_path)
            file_bytes = file_bytes_io.read()

            result = await rag_service.ingest_pdf(doc.file_name or "document.pdf", file_bytes)
            chunks = result.get("chunks_indexed", "?")
            await message.answer(
                f"✅ Документ *{doc.file_name}* загружен.\n"
                f"Проиндексировано чанков: {chunks}",
                parse_mode="Markdown",
                reply_markup=main_keyboard(),
            )
        except Exception as exc:
            await message.answer(f"❌ Ошибка при загрузке: {exc}")

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

        user_id = message.from_user.id
        history_messages = chat_history.get_for_api(user_id)

        try:
            answer = await rag_service.ask(text, history=history_messages or None)
        except Exception as exc:
            await message.answer(f"❌ Ошибка при запросе к RAG: {exc}")
            return

        chat_history.add_user(user_id, text)
        chat_history.add_assistant(user_id, answer)

        if len(answer) <= 4000:
            await message.answer(answer, reply_markup=main_keyboard())
            return

        for i in range(0, len(answer), 4000):
            await message.answer(answer[i: i + 4000], reply_markup=main_keyboard())
