from collections.abc import AsyncIterator
from urllib.parse import urlsplit

from peewee import BooleanField, CharField, DateTimeField, Field, IntegerField, SQL
from playhouse.migrate import PostgresqlMigrator, migrate
from playhouse.postgres_ext import PostgresqlExtDatabase
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from rag_app.config import get_settings


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""


class PgVectorField(Field):
    """Minimal pgvector field for peewee migrations."""

    def __init__(self, dim: int, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.field_type = f"VECTOR({dim})"


settings = get_settings()
engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session


def _run_schema_migrations() -> None:
    """Idempotent schema migrations using PostgresqlMigrator (peewee)."""
    # Convert async URL to sync form for peewee
    sync_url = settings.database_url.replace("+asyncpg", "")
    parsed = urlsplit(sync_url)
    db_name = parsed.path.lstrip("/") or "postgres"

    db = PostgresqlExtDatabase(
        db_name,
        user=parsed.username,
        password=parsed.password,
        host=parsed.hostname or "localhost",
        port=parsed.port or 5432,
    )

    def _columns(table: str) -> set[str]:
        try:
            return {col.name for col in db.get_columns(table)}
        except Exception:
            return set()

    migrator = PostgresqlMigrator(db)
    db.connect(reuse_if_open=True)
    try:
        db.execute_sql("CREATE EXTENSION IF NOT EXISTS vector")

        doc_cols = _columns("documents")
        chunk_cols = _columns("document_chunks")
        user_cols = _columns("users")
        ops = []

        if "source" not in doc_cols:
            ops.append(
                migrator.add_column(
                    "documents",
                    "source",
                    CharField(max_length=32, default="upload", null=False),
                )
            )
        if "active" not in doc_cols:
            ops.append(
                migrator.add_column(
                    "documents",
                    "active",
                    BooleanField(default=True, null=False),
                )
            )
        if "created_at" not in doc_cols:
            ops.append(
                migrator.add_column(
                    "documents",
                    "created_at",
                    DateTimeField(null=False, constraints=[SQL("DEFAULT NOW()")]),
                )
            )

        if chunk_cols:
            if "chunk_index" not in chunk_cols:
                ops.append(
                    migrator.add_column(
                        "document_chunks",
                        "chunk_index",
                        IntegerField(default=0, null=False),
                    )
                )
            if "embedding" not in chunk_cols:
                ops.append(
                    migrator.add_column(
                        "document_chunks",
                        "embedding",
                        PgVectorField(settings.embed_dim, null=False),
                    )
                )
            db.execute_sql(
                "CREATE INDEX IF NOT EXISTS ix_document_chunks_document_id ON document_chunks (document_id)"
            )

        if "role" not in user_cols:
            ops.append(
                migrator.add_column(
                    "users",
                    "role",
                    CharField(max_length=16, default="user", null=False),
                )
            )
        if "created_at" not in user_cols:
            ops.append(
                migrator.add_column(
                    "users",
                    "created_at",
                    DateTimeField(null=False, constraints=[SQL("DEFAULT NOW()")]),
                )
            )

        if ops:
            migrate(*ops)

        db.execute_sql(
            """
            CREATE TABLE IF NOT EXISTS invite_codes (
                id SERIAL PRIMARY KEY,
                code VARCHAR(64) UNIQUE NOT NULL,
                max_uses INTEGER NULL,
                used_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        db.execute_sql("CREATE INDEX IF NOT EXISTS ix_invite_codes_code ON invite_codes (code)")
    finally:
        if not db.is_closed():
            db.close()


async def init_db() -> None:
    from rag_app.db.models import Document, DocumentChunk, InviteCode, User  # noqa: F401

    _run_schema_migrations()

    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
