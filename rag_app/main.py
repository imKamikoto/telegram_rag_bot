from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from rag_app.api.v1 import api_router
from rag_app.config import get_settings
from rag_app.db.session import init_db

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
