import asyncio

from aiogram import Bot, Dispatcher
from aiogram.client.session.aiohttp import AiohttpSession

from config import load_settings
from handlers import register_handlers
from history import ChatHistory
from ollama_temp_client import OllamaClient


async def main() -> None:
    settings = load_settings()

    history = ChatHistory(
        system_prompt=settings.system_prompt,
        max_turns=settings.max_turns,
    )
    ollama = OllamaClient(
        base_url=settings.ollama_url,
        model=settings.ollama_model,
    )

    dp = Dispatcher()
    register_handlers(
        dp,
        history=history,
        ollama=ollama,
        allowed_user_ids=settings.allowed_user_ids,
        invitation_code=settings.invitation_code,
    )

    session = AiohttpSession()
    bot = Bot(token=settings.bot_token, session=session)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
