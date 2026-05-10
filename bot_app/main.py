import asyncio

from aiogram import Bot, Dispatcher
from aiogram.client.session.aiohttp import AiohttpSession

from config import load_settings
from handlers import register_handlers
from rag_service import RagService


async def main() -> None:
    settings = load_settings()

    rag_service = RagService(api_base_url=settings.rag_api_url)

    dp = Dispatcher()
    register_handlers(
        dp,
        rag_service=rag_service,
        allowed_user_ids=settings.allowed_user_ids,
        admin_user_ids=settings.admin_user_ids,
        admin_webapp_url=settings.admin_webapp_url,
    )

    session = AiohttpSession()
    bot = Bot(token=settings.bot_token, session=session)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
