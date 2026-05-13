from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.api.deps import require_admin_user
from rag_app.api.v1.schemas import StatsOverviewResponse
from rag_app.db.models import User
from rag_app.db.session import get_session
from rag_app.services.stats import StatsService

router = APIRouter()


@router.get("", response_model=StatsOverviewResponse)
async def get_stats(
    _: User = Depends(require_admin_user),
    session: AsyncSession = Depends(get_session),
):
    svc = StatsService(session)
    overview = await svc.get_overview()
    top_kbs = await svc.get_top_kbs()
    activity = await svc.get_activity()
    return StatsOverviewResponse(overview=overview, top_kbs=top_kbs, activity=activity)
