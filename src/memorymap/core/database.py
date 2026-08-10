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
    Float,
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
    # ROADMAP.md item 34. Null means "never scanned"; set (even with zero
    # entities found) after a pass, so a note that genuinely mentions none
    # isn't rescanned by every autonomous pass forever. A plain timestamp
    # rather than a boolean so a future re-scan policy ("older than 30
    # days") has something to compare against without a second column.
    entities_extracted_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)


class Entity(Base):
    """A person/project/thing worth naming, independent of any one note.

    ROADMAP.md item 34: every edge in the graph used to connect two whole
    notes; a name mentioned in passing across a dozen notes was a dozen
    separate matches, not one thing with a dozen mentions. Deliberately
    smaller than a full ontology — no entity-to-entity graph, no type
    system beyond the free-text `name` a local model already extracted.
    Membership (`EntityMention`) is the only edge kind, on purpose (see
    `ai/entities.py`).
    """

    __tablename__ = "entities"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Not unique at the DB level: two different models/passes proposing
    # "Sarah" for two actually-different Sarahs is a real ambiguity this
    # MVP doesn't try to resolve, matching the roadmap item's own explicit
    # scope cut. `entities.py` still merges exact, case-folded name matches
    # within one pass so the same note doesn't create the same entity twice.
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class EntityMention(Base):
    """One note mentioning one entity — membership, not a graph edge kind."""

    __tablename__ = "entity_mentions"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_id: Mapped[int] = mapped_column(ForeignKey("entities.id"))
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class EntryLink(Base):
    """A user- or AI-made connection between two entries."""

    __tablename__ = "entry_links"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id"))
    target_entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    # Optional, free text — "why are these connected?" A shared tag or a
    # reply thread says why on its own; a manual or AI-made link often
    # doesn't ("a note about uni and gym might still be related if they're
    # both about scheduling" — user-reported). Nullable rather than an empty
    # string default so "no reason given" and "reason is blank" aren't the
    # same row on old links backfilled by the auto-migrator.
    reason: Mapped[str | None] = mapped_column(Text, default=None)
    # How sure `create_link` was of a reason it deduced itself, 0..1 — set
    # only when the reason above came from embedding similarity rather than
    # from a person or the AI saying it in words. A human- or model-given
    # reason is taken at face value and leaves this null; null also means
    # "nothing could be deduced", which is deliberately indistinguishable
    # from "nobody tried" — both display as no reason at all.
    reason_confidence: Mapped[float | None] = mapped_column(Float, default=None)


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


class EntryDate(Base):
    """What a relative time phrase in a note meant, on the day it was written.

    "Tomorrow" is correct when it is typed and misleading forever afterwards,
    and nothing recorded what it resolved to (roadmap §10A). The phrase is
    kept alongside the date deliberately: the resolution is a rule, not a
    fact, and a reader can only disagree with it if they can see both.

    `precision` says how exact the phrase was — "last week" did not mean a
    day, and rendering it as one would invent precision the writer never used.
    """

    __tablename__ = "entry_dates"

    id: Mapped[int] = mapped_column(primary_key=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id"), index=True)
    phrase: Mapped[str] = mapped_column(String(60))
    at: Mapped[datetime] = mapped_column(DateTime)
    precision: Mapped[str] = mapped_column(String(10), default="day")
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


class DocumentLink(Base):
    """A note attached to a document.

    Notes and documents are deliberately different things — a note is a
    captured thought, a document is something you sat down and write — but
    they are usually *about* the same thing, and until now there was no way to
    say so. Asked for directly: "I want a way to link documents to new notes I
    create in the capture tab; the documents and notes sections need to be
    more integrated."

    Its own table rather than a column on either side: the relationship is
    many-to-many (a document draws on several notes; a note can feed several
    documents), and neither side owns the other.
    """

    __tablename__ = "document_links"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"), index=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class WhiteboardNode(Base):
    """A note card placed on the whiteboard canvas."""

    __tablename__ = "whiteboard_nodes"

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int | None] = mapped_column(ForeignKey("entries.id"), default=None)
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id"))
    x: Mapped[float] = mapped_column(Float, default=0.0)
    y: Mapped[float] = mapped_column(Float, default=0.0)
    z: Mapped[int] = mapped_column(Integer, default=0)
    #: A card's own size — asked for directly ("resizing... cards"). Nullable:
    #: unset means "auto", the CSS-sized ~250x150 every card used before this
    #: existed, so an old row (and the auto-migrator's own NULL backfill for
    #: it) renders exactly as it always did.
    width: Mapped[float | None] = mapped_column(Float, default=None)
    height: Mapped[float | None] = mapped_column(Float, default=None)
    #: Degrees, clockwise, about the card's own centre. Asked for directly
    #: ("rotations"); nullable/unset renders identically to 0 (no rotation),
    #: same reasoning as `width`/`height` above.
    rotation: Mapped[float | None] = mapped_column(Float, default=None)
    #: A persisted group (Ctrl+G) — unlike `wbMultiSelection`'s own in-memory
    #: set, this survives a reload. An opaque client-generated id, not a
    #: foreign key to anything: a group spans three different tables (nodes,
    #: sketches, objects), so there is no one row for it to point at.
    group_id: Mapped[str | None] = mapped_column(String(40), default=None, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class WhiteboardSketch(Base):
    """A freehand sketch placed on the whiteboard canvas."""

    __tablename__ = "whiteboard_sketches"

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int | None] = mapped_column(ForeignKey("entries.id"), default=None)
    # The strokes data (JSON/SVG). Can be encrypted at rest later if needed.
    data: Mapped[str] = mapped_column(Text)
    x: Mapped[float] = mapped_column(Float, default=0.0)
    y: Mapped[float] = mapped_column(Float, default=0.0)
    z: Mapped[int] = mapped_column(Integer, default=0)
    group_id: Mapped[str | None] = mapped_column(String(40), default=None, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class WhiteboardObject(Base):
    """A freeform item on the whiteboard that isn't tied to a note: a pasted/
    dropped/uploaded image, or a text box — the two things asked for
    directly ("I want the whiteboard to basically be like OneNote and
    Microsoft Whiteboard") that a card (always wraps an existing note) and a
    sketch (a path, not a placeable rectangle) don't cover.

    One table with a `kind` discriminator rather than two — an image and a
    text box already share every other column (board, position, size), and
    the two things that differ (a media URL vs. styled text) both fit in one
    JSON `data` blob the same way a sketch's own stroke data already does.
    """

    __tablename__ = "whiteboard_objects"

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int | None] = mapped_column(ForeignKey("entries.id"), default=None)
    kind: Mapped[str] = mapped_column(String(20))
    #: image: {"url": "/media/..."}. text: {"content": str, "color": str, "font_size": int}.
    data: Mapped[str] = mapped_column(Text)
    x: Mapped[float] = mapped_column(Float, default=0.0)
    y: Mapped[float] = mapped_column(Float, default=0.0)
    z: Mapped[int] = mapped_column(Integer, default=0)
    width: Mapped[float] = mapped_column(Float, default=200.0)
    height: Mapped[float] = mapped_column(Float, default=120.0)
    #: Degrees, clockwise, about the object's own centre — same reasoning as
    #: `WhiteboardNode.rotation`.
    rotation: Mapped[float | None] = mapped_column(Float, default=None)
    group_id: Mapped[str | None] = mapped_column(String(40), default=None, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class MediaUpload(Base):
    """Every file `/media/upload` has ever produced — an image pasted or
    dropped into a *note's* own markdown, unlike a whiteboard image object
    (`WhiteboardObject`), had no row tracking it at all: nothing could list
    it, delete it, or tell a live note apart from one whose image had
    already been removed from disk by hand (ROADMAP.md item 20a). One row
    per upload, regardless of where the resulting `/media/...` url ends up
    being pasted — a note's markdown, a whiteboard object, a document — so
    a single gallery and a single delete path cover all of them.
    """

    __tablename__ = "media_uploads"

    id: Mapped[int] = mapped_column(primary_key=True)
    #: The stored, random filename — `/media/{filename}` serves it.
    filename: Mapped[str] = mapped_column(String(140))
    #: What the uploader's own file was called, kept for a readable gallery
    #: label only — never used to resolve a path.
    original_name: Mapped[str] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class UserPreference(Base):
    """Agent Memory Streams: Learned preferences and instructions appended by the AI."""

    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


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
        self._ensure_fts5()
        self._session_factory = sessionmaker(
            bind=self.engine, expire_on_commit=False
        )

    def _ensure_fts5(self) -> None:
        """An FTS5 index over `entries`, kept in sync by triggers.

        ROADMAP.md item 32: `keyword_search` used to be a leading-wildcard
        `ILIKE`, which no index can serve, plus a hand-rolled integer score
        that treats a rare word the same as a common one. FTS5's own
        `bm25()` gives real IDF-weighted relevance — already in SQLite, no
        new dependency — for the cost of one virtual table.

        `content='entries', content_rowid='id'` makes this an *external
        content* table: FTS5 stores only its own index, not a second copy
        of the text, and `entries.id` already is the SQLite rowid (a plain
        `INTEGER PRIMARY KEY` column is a rowid alias). The three triggers
        are what an external-content table needs instead of the automatic
        upkeep a normal table gets from the ORM — SQLite doesn't have
        anything that reaches into a virtual table on its own, so every
        write path (the ORM, a raw migration script, anything future) stays
        in sync for free rather than needing to remember to call something.
        `IF NOT EXISTS` throughout makes this safe to run on every startup,
        the same additive convention `_add_missing_columns` already uses.
        """
        with self.engine.begin() as connection:
            connection.exec_driver_sql(
                "CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5("
                "content, tags, content='entries', content_rowid='id'"
                ")"
            )
            # A fresh virtual table starts empty even when `entries` already
            # has rows (a database from before this existed) — the
            # external-content trick means FTS5 never scanned the real table
            # on its own. `INSERT INTO ... SELECT` once, guarded by the
            # trigger's own existence so it can't re-run and duplicate rows
            # on every subsequent startup.
            already_wired = connection.exec_driver_sql(
                "SELECT count(*) FROM sqlite_master "
                "WHERE type='trigger' AND name='entries_fts_ai'"
            ).scalar()
            if not already_wired:
                connection.exec_driver_sql(
                    "INSERT INTO entries_fts(rowid, content, tags) "
                    "SELECT id, content, tags FROM entries"
                )
            connection.exec_driver_sql(
                "CREATE TRIGGER IF NOT EXISTS entries_fts_ai "
                "AFTER INSERT ON entries BEGIN "
                "INSERT INTO entries_fts(rowid, content, tags) "
                "VALUES (new.id, new.content, new.tags); "
                "END"
            )
            connection.exec_driver_sql(
                "CREATE TRIGGER IF NOT EXISTS entries_fts_ad "
                "AFTER DELETE ON entries BEGIN "
                "INSERT INTO entries_fts(entries_fts, rowid, content, tags) "
                "VALUES ('delete', old.id, old.content, old.tags); "
                "END"
            )
            connection.exec_driver_sql(
                "CREATE TRIGGER IF NOT EXISTS entries_fts_au "
                "AFTER UPDATE ON entries BEGIN "
                "INSERT INTO entries_fts(entries_fts, rowid, content, tags) "
                "VALUES ('delete', old.id, old.content, old.tags); "
                "INSERT INTO entries_fts(rowid, content, tags) "
                "VALUES (new.id, new.content, new.tags); "
                "END"
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
