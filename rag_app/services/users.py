from datetime import datetime, timedelta, timezone
from http import HTTPStatus
import secrets
from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from rag_app.db.models import InviteCode, User, UserKnowledgeBase

INVITE_CODE_TTL_DAYS = 7


class UsersServiceError(Exception):
    def __init__(self, status_code: HTTPStatus, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ----- Invite codes -----

    async def create_invite_code(
        self,
        max_uses: int | None = None,
        knowledge_base_id: int | None = None,
        code: str | None = None,
    ) -> InviteCode:
        if max_uses is not None and max_uses <= 0:
            raise UsersServiceError(HTTPStatus.BAD_REQUEST, "max_uses должен быть больше нуля")

        expires_at = datetime.now(timezone.utc) + timedelta(days=INVITE_CODE_TTL_DAYS)

        for _ in range(5):
            code = code or self._generate_invite_code()
            invite = InviteCode(
                code=code,
                max_uses=max_uses,
                knowledge_base_id=knowledge_base_id,
                expires_at=expires_at,
                is_used=False,
            )
            self.session.add(invite)
            try:
                await self.session.commit()
            except IntegrityError:
                await self.session.rollback()
                continue

            await self.session.refresh(invite)
            return invite

        raise UsersServiceError(
            HTTPStatus.INTERNAL_SERVER_ERROR, "Не удалось сгенерировать код приглашения"
        )

    async def get_invite_by_code(
        self, code: str, *, for_update: bool = False
    ) -> Optional[InviteCode]:
        stmt = select(InviteCode).where(InviteCode.code == code)
        if for_update:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def list_invite_codes(self, limit: int = 100, offset: int = 0) -> list[InviteCode]:
        stmt = select(InviteCode).order_by(InviteCode.id).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # ----- Users -----

    async def create_user(
        self, telegram_name: str, telegram_id: int, role: str = "user"
    ) -> User:
        telegram_name = telegram_name.strip()
        if not telegram_name:
            raise UsersServiceError(HTTPStatus.BAD_REQUEST, "Пустое имя пользователя")

        user = User(telegram_name=telegram_name, telegram_id=telegram_id, role=role)
        self.session.add(user)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise UsersServiceError(
                HTTPStatus.CONFLICT, "Пользователь с таким telegram_id уже существует"
            ) from exc

        await self.session.refresh(user)
        return user

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        return await self.session.scalar(select(User).where(User.id == user_id))

    async def get_user_by_telegram_id(self, telegram_id: int) -> Optional[User]:
        return await self.session.scalar(select(User).where(User.telegram_id == telegram_id))

    async def list_users(self, limit: int = 100, offset: int = 0) -> list[User]:
        stmt = select(User).order_by(User.id).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_user_by_invite(
        self, invite_code: str, telegram_name: str, telegram_id: int
    ) -> User:
        invite_code = invite_code.strip()
        telegram_name = telegram_name.strip()
        if not invite_code:
            raise UsersServiceError(HTTPStatus.BAD_REQUEST, "Пустой код приглашения")
        if not telegram_name:
            raise UsersServiceError(HTTPStatus.BAD_REQUEST, "Пустое имя пользователя")

        now = datetime.now(timezone.utc)

        try:
            async with self.session.begin():
                invite = await self.session.scalar(
                    select(InviteCode)
                    .where(
                        InviteCode.code == invite_code,
                        InviteCode.is_used.is_(False),
                        (InviteCode.expires_at.is_(None)) | (InviteCode.expires_at > now),
                        (InviteCode.max_uses.is_(None))
                        | (InviteCode.used_count < InviteCode.max_uses),
                    )
                    .with_for_update()
                )
                if invite is None:
                    raise UsersServiceError(
                        HTTPStatus.BAD_REQUEST,
                        "Код приглашения недействителен, истёк или уже использован",
                    )

                user = User(
                    telegram_name=telegram_name,
                    telegram_id=telegram_id,
                    role="user",
                )
                self.session.add(user)
                await self.session.flush()

                invite.used_count += 1
                if invite.max_uses is not None and invite.used_count >= invite.max_uses:
                    invite.is_used = True

                # Grant access to the KB linked with this invite
                if invite.knowledge_base_id is not None:
                    self.session.add(
                        UserKnowledgeBase(
                            user_id=user.id,
                            knowledge_base_id=invite.knowledge_base_id,
                        )
                    )

        except UsersServiceError:
            raise
        except IntegrityError as exc:
            await self.session.rollback()
            raise UsersServiceError(
                HTTPStatus.CONFLICT, "Пользователь с таким telegram_id уже существует"
            ) from exc

        await self.session.refresh(user)
        return user

    async def update_user_role(self, user_id: int, role: str) -> User:
        user = await self.session.scalar(select(User).where(User.id == user_id))
        if user is None:
            raise UsersServiceError(HTTPStatus.NOT_FOUND, "Пользователь не найден")

        user.role = role
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def delete_user_by_id(self, user_id: int) -> User:
        user = await self.get_user_by_id(user_id)
        if user is None:
            raise UsersServiceError(HTTPStatus.NOT_FOUND, "Пользователь не найден")

        await self.session.delete(user)
        await self.session.commit()
        return user

    async def delete_user_by_telegram_id(self, telegram_id: int) -> User:
        user = await self.get_user_by_telegram_id(telegram_id)
        if user is None:
            raise UsersServiceError(HTTPStatus.NOT_FOUND, "Пользователь не найден")

        await self.session.delete(user)
        await self.session.commit()
        return user

    @staticmethod
    def _generate_invite_code() -> str:
        return secrets.token_urlsafe(16)
