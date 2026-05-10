from fastapi import APIRouter

from rag_app.api.v1.endpoints import ask, health, ingest, users

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(ingest.router, prefix="/document", tags=["document"])
api_router.include_router(ask.router, prefix="/ask", tags=["ask"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
