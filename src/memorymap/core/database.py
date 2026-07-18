"""SQLAlchemy engine, ORM models, and session factory.

The full MVP schema (build plan §5) is created up front — tables the
AI needs later (embeddings, entry_links) are cheap to have from day
one and painful to retrofit.

Schema upgrades: once real user data exists, "delete the db" stops
being acceptable, so DatabaseManager does additive auto-migration —
any column that exists in the models but not in the on-disk database
is added with ALTER TABLE at startup. Renames/removals would still
need a real migration tool, so don't do those casually.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    create_engine,
    event,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    sessionmaker,
)


def utcnow() -> datetime:
    """Timezone-aware UTC now (datetime.utcnow is deprecated — plan §4)."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    """Single-user unlock (Phase 4). One row, bcrypt password hash."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Entry(Base):
    __tablename__ = "entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(Text)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id"), default=None
    )
    # JSON string array, e.g. '["joke", "dad"]' (plan §5).
    tags: Mapped[str] = mapped_column(Text, default="[]")
    # 0–100. How sure the AI was when it filed this (0 = no AI involved).
    ai_confidence: Mapped[int] = mapped_column(Integer, default=0)
    # Bumped every time this entry is opened or returned by a chat
    # question — feeds the "most used" dashboard (Phase 5).
    access_count: Mapped[int] = mapped_column(Integer, default=0)
    # Train-of-thought threads (Wave B): a child continues its parent.
    # (Added by the auto-migrator as a plain column on old DBs — the FK
    # constraint only exists on freshly created databases.)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("entries.id"), default=None
    )
    # Pinned entries float to the top of lists and the dashboard.
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    # True when the USER chose the category (guided mode or a manual
    # move) — the janitor then keeps its hands off during re-filing.
    user_filed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )
    # Soft delete = recycle bin (Phase 4 adds restore/auto-clear).
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)


class EntryLink(Base):
    """A user- or AI-made connection between two entries."""

    __tablename__ = "entry_links"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id"))
    target_entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class EmbeddingRecord(Base):
    """One vector per entry, stored as raw float32 bytes — never pickle
    (plan §4). model_version + dim let us detect stale vectors after an
    embedding-backend switch (plan §6.5)."""

    __tablename__ = "embeddings"

    id: Mapped[int] = mapped_column(primary_key=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id"), unique=True)
    embedding: Mapped[bytes] = mapped_column(LargeBinary)
    dim: Mapped[int] = mapped_column(Integer)
    model_version: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Attachment(Base):
    """A file the user attached to an entry (Wave B). The bytes live in
    the uploads/ folder under a random stored_name; the original
    filename is kept for downloads."""

    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(primary_key=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id"))
    filename: Mapped[str] = mapped_column(String(255))
    stored_name: Mapped[str] = mapped_column(String(80), unique=True)
    mime: Mapped[str] = mapped_column(String(100), default="application/octet-stream")
    size: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Conversation(Base):
    """A saved chat (Wave C). Turns are a JSON list of
    {"role": "user"|"assistant", "content": str, "thinking": str|None}
    — one blob per conversation is the boring right size for a
    single-user app."""

    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    messages: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )


class AuditLog(Base):
    """Every meaningful action, from Phase 1 onward (plan §4)."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    action: Mapped[str] = mapped_column(String(50))  # created/edited/deleted/...
    entity_type: Mapped[str] = mapped_column(String(50))  # entry/category/...
    entity_id: Mapped[int | None] = mapped_column(Integer, default=None)
    detail: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class DatabaseManager:
    """Owns the one engine + session factory for the whole app."""

    def __init__(self, db_path: Path) -> None:
        # check_same_thread=False because FastAPI serves requests from a
        # threadpool; SQLAlchemy still gives each request its own session.
        self.engine = create_engine(
            f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
        )

        # SQLite ignores foreign keys unless told otherwise, per connection.
        @event.listens_for(self.engine, "connect")
        def _enable_foreign_keys(dbapi_connection, _record):  # noqa: ANN001
            dbapi_connection.execute("PRAGMA foreign_keys=ON")

        Base.metadata.create_all(self.engine)  # creates missing tables only
        self._add_missing_columns()
        self._session_factory = sessionmaker(
            bind=self.engine, expire_on_commit=False
        )

    def _add_missing_columns(self) -> None:
        """Additive auto-migration for existing databases.

        create_all() never touches tables that already exist, so a
        database made by an older version lacks newly added columns and
        every query on that table would 500. Add them here instead of
        making the user delete their data."""
        with self.engine.begin() as connection:
            for table in Base.metadata.tables.values():
                rows = connection.exec_driver_sql(
                    f'PRAGMA table_info("{table.name}")'
                ).fetchall()
                if not rows:
                    continue  # brand-new table — create_all just made it
                existing = {row[1] for row in rows}
                for column in table.columns:
                    if column.name in existing:
                        continue
                    ddl = (
                        f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" '
                        f"{column.type.compile(self.engine.dialect)}"
                    )
                    # Backfill old rows with the model's default when it's a
                    # plain value (callables like utcnow can't run in DDL —
                    # those columns stay NULL for pre-existing rows).
                    if column.default is not None and column.default.is_scalar:
                        value = column.default.arg
                        if isinstance(value, bool):
                            value = int(value)
                        if isinstance(value, str):
                            ddl += f" DEFAULT '{value}'"
                        else:
                            ddl += f" DEFAULT {value}"
                    connection.exec_driver_sql(ddl)

    def session(self) -> Session:
        """A fresh session; caller is responsible for closing it."""
        return self._session_factory()
