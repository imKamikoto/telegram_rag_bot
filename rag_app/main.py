from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from rag_app.api.v1 import api_router
from rag_app.config import get_settings
from rag_app.db.session import AsyncSessionLocal, init_db
from rag_app.services.users import UserService

settings = get_settings()

app = FastAPI(title="RAG API", version="0.1.0")

# Basic CORS setup for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.on_event("startup")
async def startup_event() -> None:
    await init_db()
    await _seed_admins()


async def _seed_admins() -> None:
    if not settings.admin_telegram_ids:
        return
    async with AsyncSessionLocal() as session:
        service = UserService(session)
        for tg_id in settings.admin_telegram_ids:
            user = await service.get_user_by_telegram_id(tg_id)
            if user is None:
                await service.create_user(
                    telegram_name=f"admin_{tg_id}",
                    telegram_id=tg_id,
                    role="admin",
                )
            elif user.role != "admin":
                await service.update_user_role(user.id, "admin")
