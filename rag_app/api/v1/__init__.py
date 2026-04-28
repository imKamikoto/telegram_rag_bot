from fastapi import APIRouter

from rag_app.api.v1.endpoints import ask, health, ingest

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(ingest.router, prefix="/ingest", tags=["ingest"])
api_router.include_router(ask.router, prefix="/ask", tags=["ask"])
