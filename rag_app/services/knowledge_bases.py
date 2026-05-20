from http import HTTPStatus
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.db.models import Document, KnowledgeBase, UserKnowledgeBase


class KnowledgeBaseServiceError(Exception):
    def __init__(self, status_code: HTTPStatus, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class KnowledgeBaseService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self, name: str, description: str | None = None, created_by: int | None = None
    ) -> KnowledgeBase:
        name = name.strip()
        if not name:
            raise KnowledgeBaseServiceError(HTTPStatus.BAD_REQUEST, "Название не может быть пустым")

        kb = KnowledgeBase(name=name, description=description, created_by=created_by)
        self.session.add(kb)
        await self.session.commit()
        await self.session.refresh(kb)
        return kb

    async def get_by_id(self, kb_id: int) -> Optional[KnowledgeBase]:
        return await self.session.scalar(
            select(KnowledgeBase).where(KnowledgeBase.id == kb_id)
        )

    async def list_all(self, limit: int = 100, offset: int = 0) -> list[KnowledgeBase]:
        result = await self.session.execute(
            select(KnowledgeBase).order_by(KnowledgeBase.id).offset(offset).limit(limit)
        )
        return list(result.scalars().all())

    async def list_for_user(self, user_id: int) -> list[KnowledgeBase]:
        result = await self.session.execute(
            select(KnowledgeBase)
            .join(UserKnowledgeBase, UserKnowledgeBase.knowledge_base_id == KnowledgeBase.id)
            .where(UserKnowledgeBase.user_id == user_id)
            .order_by(KnowledgeBase.id)
        )
        return list(result.scalars().all())

    async def delete(self, kb_id: int) -> KnowledgeBase:
        kb = await self.get_by_id(kb_id)
        if kb is None:
            raise KnowledgeBaseServiceError(HTTPStatus.NOT_FOUND, "База знаний не найдена")

        # Явно удаляем документы (их chunks каскадно удалятся через ORM/DB CASCADE).
        # Без этого в async-сессии lazy-cascade не срабатывает, и FK ondelete=SET NULL
        # оставляет документы в базе без knowledge_base_id.
        docs_result = await self.session.scalars(
            select(Document).where(Document.knowledge_base_id == kb_id)
        )
        for doc in docs_result.all():
            await self.session.delete(doc)

        await self.session.delete(kb)
        await self.session.commit()
        return kb

    async def grant_access(self, user_id: int, kb_id: int) -> UserKnowledgeBase:
        existing = await self.session.scalar(
            select(UserKnowledgeBase).where(
                UserKnowledgeBase.user_id == user_id,
                UserKnowledgeBase.knowledge_base_id == kb_id,
            )
        )
        if existing:
            return existing

        kb = await self.get_by_id(kb_id)
        if kb is None:
            raise KnowledgeBaseServiceError(HTTPStatus.NOT_FOUND, "База знаний не найдена")

        access = UserKnowledgeBase(user_id=user_id, knowledge_base_id=kb_id)
        self.session.add(access)
        await self.session.commit()
        await self.session.refresh(access)
        return access

    async def revoke_access(self, user_id: int, kb_id: int) -> None:
        access = await self.session.scalar(
            select(UserKnowledgeBase).where(
                UserKnowledgeBase.user_id == user_id,
                UserKnowledgeBase.knowledge_base_id == kb_id,
            )
        )
        if access is None:
            raise KnowledgeBaseServiceError(HTTPStatus.NOT_FOUND, "Доступ не найден")

        await self.session.delete(access)
        await self.session.commit()

    async def list_members(self, kb_id: int) -> list[UserKnowledgeBase]:
        result = await self.session.execute(
            select(UserKnowledgeBase)
            .where(UserKnowledgeBase.knowledge_base_id == kb_id)
            .order_by(UserKnowledgeBase.id)
        )
        return list(result.scalars().all())

    async def has_access(self, user_id: int, kb_id: int) -> bool:
        access = await self.session.scalar(
            select(UserKnowledgeBase).where(
                UserKnowledgeBase.user_id == user_id,
                UserKnowledgeBase.knowledge_base_id == kb_id,
            )
        )
        return access is not None
