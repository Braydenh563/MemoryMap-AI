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
    DateTime as SaDateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    TypeDecorator,
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


class DateTime(TypeDecorator):
    """A DateTime that is always UTC, and always says so.

    SQLite has no timezone type, so a plain DateTime column silently drops the
    offset on the way in and hands back a NAIVE datetime on the way out. Every
    value here is UTC — utcnow() and the API both guarantee it — but "naive"
    and "UTC" are not the same claim, and the difference reaches the user:
    FastAPI serialises a naive datetime with no offset, and JavaScript parses a
    timezone-less date-time string as LOCAL time.

    So a reminder due in five minutes came back reading ten hours overdue for a
    user in UTC+10 (user-reported). It was worse than a display bug, because
    the POST response carried the offset (SQLAlchemy returned the object still
    in memory) and only a later read from disk lost it — so it looked right
    until it didn't.

    Attaching UTC on the way out costs nothing and makes every timestamp the
    API emits unambiguous, for every table at once rather than per endpoint.
    """

    impl = SaDateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect):
        if value is None:
            return None
        # Normalise to UTC before storing, so a caller that passes a local
        # aware datetime doesn't quietly write a different instant.
        if value.tzinfo is not None:
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

    def process_result_value(self, value: datetime | None, dialect):
        if value is None:
            return None
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class Base(DeclarativeBase):
    pass


class User(Base):
    """Single-user unlock (Phase 4). One row, bcrypt password hash."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Vault(Base):
    """The wrapped data key for private notes (one row).

    Only the *wrapped* key is stored. Unwrapping needs the password, so this
    row on its own reveals nothing — which is the whole point of keeping it
    next to the notes it protects.
    """

    __tablename__ = "vault"

    id: Mapped[int] = mapped_column(primary_key=True)
    kdf_salt: Mapped[bytes] = mapped_column(LargeBinary(32))
    wrapped_dek: Mapped[bytes] = mapped_column(LargeBinary(128))
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
    # Private notes have their content encrypted at rest. Scalar default so
    # the additive auto-migrator backfills every existing row as not-private.
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)
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
    # Pinned chats sort above the rest. The list is flat and grows forever,
    # so the thread you keep coming back to sinks under a week of one-offs.
    # (Added by the auto-migrator on existing databases, defaulting to false.)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )


class Reminder(Base):
    """A reminder, optionally attached to an entry (Wave D)."""

    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(primary_key=True)
    entry_id: Mapped[int | None] = mapped_column(ForeignKey("entries.id"), default=None)
    text: Mapped[str] = mapped_column(String(500))
    due_at: Mapped[datetime] = mapped_column(DateTime)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    # Scalar defaults so the additive auto-migrator backfills existing rows.
    priority: Mapped[str] = mapped_column(String(10), default="normal")  # low|normal|high
    recurring: Mapped[str] = mapped_column(String(10), default="none")  # none|daily|weekly|monthly
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class EntryRevision(Base):
    """A note's text as it was before an edit.

    The recycle bin covers deletion; nothing covered editing, so rewriting a
    note destroyed what it used to say with no way back. Revisions are written
    before the change lands, so the newest one is always the version being
    replaced.
    """

    __tablename__ = "entry_revisions"

    id: Mapped[int] = mapped_column(primary_key=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    tags: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Document(Base):
    """A long-form document (the editor tab).

    Kept separate from Entry on purpose. A note is a captured thought — short,
    auto-categorised, embedded for semantic search, and surfaced by the AI. A
    document is something you sit down and write. Sharing one table would mean
    every half-written document turning up in search results and in the graph.
    """

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), default="Untitled")
    content: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


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

        # Per-connection SQLite settings. All of these are per-connection
        # rather than per-database, so they have to be set on every connect.
        @event.listens_for(self.engine, "connect")
        def _configure_connection(dbapi_connection, _record):  # noqa: ANN001
            # SQLite ignores foreign keys unless told otherwise.
            dbapi_connection.execute("PRAGMA foreign_keys=ON")
            # WAL lets readers carry on while a write is in progress. Without
            # it, saving a note blocks every concurrent read — and FastAPI
            # serves from a threadpool, so a background job (the janitor, an
            # embedding write) overlapping a page load is routine rather than
            # rare. WAL persists on the file, but setting it per connection is
            # harmless and covers a database created by an older version.
            dbapi_connection.execute("PRAGMA journal_mode=WAL")
            # When two writers do collide, wait rather than failing instantly.
            # The default is 0, which turns a millisecond of contention into a
            # "database is locked" error the user sees as a broken save.
            dbapi_connection.execute("PRAGMA busy_timeout=5000")
            # NORMAL is the recommended durability level under WAL: still
            # crash-safe, without an fsync on every single commit.
            dbapi_connection.execute("PRAGMA synchronous=NORMAL")

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
