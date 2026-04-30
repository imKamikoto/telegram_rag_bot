import asyncio

from aiogram import Bot, Dispatcher
from aiogram.client.session.aiohttp import AiohttpSession

from config import load_settings
from handlers import register_handlers
from history import ChatHistory
from rag_service import RagService

SYSTEM_PROMPT = (
    "Ты — ассистент базы знаний. Отвечай кратко и по делу, только на основе контекста."
)


async def main() -> None:
    settings = load_settings()

    rag_service = RagService(api_base_url=settings.rag_api_url)
    chat_history = ChatHistory(system_prompt=SYSTEM_PROMPT, max_turns=10)

    dp = Dispatcher()
    register_handlers(
        dp,
        rag_service=rag_service,
        chat_history=chat_history,
        allowed_user_ids=settings.allowed_user_ids,
        invitation_code=settings.invitation_code,
    )

    session = AiohttpSession()
    bot = Bot(token=settings.bot_token, session=session)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
