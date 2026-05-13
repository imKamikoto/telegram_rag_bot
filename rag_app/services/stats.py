from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.db.models import (
    ActivityLog, ChatMessage, ChatSession,
    Document, KnowledgeBase, User, UserKnowledgeBase,
)

_WEEK = timedelta(days=7)
_DAY  = timedelta(days=1)


class StatsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_overview(self) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        week_ago = now - _WEEK
        day_ago  = now - _DAY

        # totals
        total_kbs   = await self.session.scalar(select(func.count()).select_from(KnowledgeBase)) or 0
        total_docs  = await self.session.scalar(select(func.count()).select_from(Document)) or 0
        total_users = await self.session.scalar(select(func.count()).select_from(User)) or 0

        # week deltas
        kbs_week   = await self.session.scalar(
            select(func.count()).select_from(KnowledgeBase)
            .where(KnowledgeBase.created_at >= week_ago)
        ) or 0
        docs_week  = await self.session.scalar(
            select(func.count()).select_from(Document)
            .where(Document.created_at >= week_ago)
        ) or 0
        users_week = await self.session.scalar(
            select(func.count()).select_from(User)
            .where(User.created_at >= week_ago)
        ) or 0

        # queries today
        queries_today = await self.session.scalar(
            select(func.count()).select_from(ChatMessage)
            .where(ChatMessage.role == "user", ChatMessage.created_at >= day_ago)
        ) or 0

        return {
            "knowledge_bases": {"total": total_kbs,   "week": kbs_week},
            "documents":       {"total": total_docs,   "week": docs_week},
            "users":           {"total": total_users,  "week": users_week},
            "queries_today":   queries_today,
        }

    async def get_top_kbs(self, limit: int = 5) -> list[dict[str, Any]]:
        rows = await self.session.execute(
            select(
                ChatSession.knowledge_base_id,
                KnowledgeBase.name,
                func.count(ChatMessage.id).label("query_count"),
            )
            .join(ChatMessage, ChatMessage.session_id == ChatSession.id)
            .join(KnowledgeBase, KnowledgeBase.id == ChatSession.knowledge_base_id)
            .where(ChatMessage.role == "user")
            .group_by(ChatSession.knowledge_base_id, KnowledgeBase.name)
            .order_by(func.count(ChatMessage.id).desc())
            .limit(limit)
        )
        return [
            {"kb_id": r.knowledge_base_id, "name": r.name, "query_count": r.query_count}
            for r in rows
        ]

    async def get_activity(self, limit: int = 30) -> list[dict[str, Any]]:
        # Pull from activity_log (role changes, access revocation, etc.)
        log_rows = await self.session.execute(
            select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit)
        )
        log_items = [
            {
                "event":             row.event,
                "actor_id":          row.actor_id,
                "target_user_id":    row.target_user_id,
                "knowledge_base_id": row.knowledge_base_id,
                "document_id":       row.document_id,
                "meta":              row.meta or {},
                "created_at":        row.created_at.isoformat(),
            }
            for row in log_rows.scalars()
        ]

        # Supplement with derived events from entity tables (no log entry yet for old data)
        derived: list[dict[str, Any]] = []

        doc_rows = await self.session.execute(
            select(Document.id, Document.file_name, Document.knowledge_base_id, Document.created_at)
            .order_by(Document.created_at.desc()).limit(limit)
        )
        for r in doc_rows:
            derived.append({
                "event": "document_uploaded",
                "actor_id": None, "target_user_id": None,
                "knowledge_base_id": r.knowledge_base_id,
                "document_id": r.id,
                "meta": {"file_name": r.file_name},
                "created_at": r.created_at.isoformat(),
            })

        user_rows = await self.session.execute(
            select(User.id, User.telegram_name, User.created_at)
            .order_by(User.created_at.desc()).limit(limit)
        )
        for r in user_rows:
            derived.append({
                "event": "user_registered",
                "actor_id": None, "target_user_id": r.id,
                "knowledge_base_id": None, "document_id": None,
                "meta": {"telegram_name": r.telegram_name},
                "created_at": r.created_at.isoformat(),
            })

        access_rows = await self.session.execute(
            select(
                UserKnowledgeBase.user_id,
                UserKnowledgeBase.knowledge_base_id,
                UserKnowledgeBase.created_at,
            )
            .order_by(UserKnowledgeBase.created_at.desc()).limit(limit)
        )
        for r in access_rows:
            derived.append({
                "event": "kb_access_granted",
                "actor_id": None, "target_user_id": r.user_id,
                "knowledge_base_id": r.knowledge_base_id, "document_id": None,
                "meta": {},
                "created_at": r.created_at.isoformat(),
            })

        all_items = log_items + derived
        all_items.sort(key=lambda x: x["created_at"], reverse=True)
        return all_items[:limit]

    async def log(
        self,
        event: str,
        actor_id: int | None = None,
        target_user_id: int | None = None,
        knowledge_base_id: int | None = None,
        document_id: int | None = None,
        meta: dict | None = None,
    ) -> None:
        self.session.add(ActivityLog(
            event=event,
            actor_id=actor_id,
            target_user_id=target_user_id,
            knowledge_base_id=knowledge_base_id,
            document_id=document_id,
            meta=meta,
        ))
        await self.session.commit()
