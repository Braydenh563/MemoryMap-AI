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

import logging
import os
import sys
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
    with_loader_criteria,
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

class Space(Base):
    """A workspace container for entries."""
    __tablename__ = "spaces"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    icon: Mapped[str] = mapped_column(String, nullable=False, default="ph-circles-four")



class WorkspaceMixin:
    """Soft separation of notes and data.
    Added to every major model so querying can be scoped globally by workspace."""
    workspace_id: Mapped[str] = mapped_column(String, server_default="default", index=True, default="default")


def workspace_scoped_models() -> tuple[type, ...]:
    """Every mapped class that carries WorkspaceMixin.

    Discovered from the mapper registry instead of hand-listed, so
    delete_space's "reassign every workspace-scoped row to default" pass
    (routes_spaces.py) can't silently skip a model that gets WorkspaceMixin
    added after this list was last updated — a class missed there leaves
    rows pointing at a space id that no longer exists, which reads back as
    data that just vanished.
    """
    return tuple(
        mapper.class_
        for mapper in Base.registry.mappers
        if issubclass(mapper.class_, WorkspaceMixin)
    )

@event.listens_for(Session, "do_orm_execute")
def _add_workspace_filter(execute_state):
    # Only filter if the statement is a select() or similar ORM statement
    if execute_state.is_select or execute_state.is_update or execute_state.is_delete:
        workspace_id = execute_state.session.info.get("workspace_id")
        if workspace_id and workspace_id != "all":
            # Add criteria to all entities that have a workspace_id column
            execute_state.statement = execute_state.statement.options(
                with_loader_criteria(
                    WorkspaceMixin,
                    lambda cls: cls.workspace_id == workspace_id,
                    include_aliases=True
                )
            )

@event.listens_for(Session, "before_flush")
def _set_workspace(session, flush_context, instances):
    workspace_id = session.info.get("workspace_id")
    if workspace_id and workspace_id != "all":
        for obj in session.new:
            if isinstance(obj, WorkspaceMixin):
                # Ensure we don't overwrite if manually set elsewhere
                if not obj.__dict__.get("workspace_id"):
                    obj.workspace_id = workspace_id

class User(Base):
    """Single-user unlock. One row, bcrypt password hash."""

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


class Category(Base, WorkspaceMixin):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Entry(Base, WorkspaceMixin):
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
    # question — feeds the "most used" dashboard.
    access_count: Mapped[int] = mapped_column(Integer, default=0)
    # Train-of-thought threads: a child continues its parent.
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
    # Soft delete = recycle bin (adds restore/auto-clear).
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    # Archive = kept, but out of the way — a third state, distinct from the
    # recycle bin: archiving never counts as deleting, so it's excluded from
    # normal listings the same way a binned note is, but nothing about it is
    # bound for auto-clear or purge. Null means "not archived"; the timestamp
    # itself (not a separate boolean) is the flag, same pattern as
    # deleted_at above (BACKLOG §4 item 3 / §26, ROADMAP Tier 3 §30b).
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
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
    # A note captured quickly — from a text-selection popup, say — and not
    # yet looked at properly. Shown normally everywhere (unlike is_private,
    # this changes nothing about how the note reads or where it appears),
    # just flagged, so nothing captured on the fly gets lost in the list
    # before its author comes back to it. Scalar default so the additive
    # auto-migrator backfills every existing row as not-a-draft.
    is_draft: Mapped[bool] = mapped_column(Boolean, default=False)
    # Where a clipped web-reader highlight came from (BACKLOG §65's
    # "reader-mode capture" — the Kortex/Eden read's item 6). Real metadata
    # now, not just a link folded into `content`: `saveSelectionAsNote`
    # (app.js) still writes the same markdown blockquote-plus-link into the
    # body too — a note is fundamentally plain markdown and must stay
    # readable/exportable with no app behind it — but a queryable column is
    # what lets a note card show a real "from the web" badge, or a future
    # "show me everything I clipped from this site" filter, without parsing
    # markdown to find out. Null means "not a clipping", same convention as
    # every other optional column here.
    source_url: Mapped[str | None] = mapped_column(String(2000), default=None)
    source_title: Mapped[str | None] = mapped_column(String(300), default=None)


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


class EntryLink(Base, WorkspaceMixin):
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
    # What *kind* of connection this is, from LINK_TYPES below — or null,
    # which is what every link created before this column existed carries and
    # means exactly what a link has always meant: "these are related".
    #
    # Nullable and additive on purpose: the auto-migrator can ADD COLUMN and
    # nothing else (see this module's own header), so a default of null is the
    # only shape that leaves an existing notebook's links valid and unchanged.
    #
    # A closed vocabulary rather than free text, because three things read it —
    # the graph styles edges by it, the traversal weights them by it, and the
    # model has to choose one — and none of those can do their job against an
    # open set of synonyms. The free-text half of "why" already exists and is
    # `reason` above; this is the part that has to be machine-readable.
    link_type: Mapped[str | None] = mapped_column(String(24), default=None)


#: The kinds of connection a link can carry, and what each one means.
#:
#: `contradicts` is the one worth having built this for: a notebook that can
#: show you where you disagreed with yourself is not something an embedding
#: similarity score can ever produce, however well tuned.
LINK_TYPES: dict[str, str] = {
    "related": "Related — these belong together",
    "continues": "Continues — this carries on from that",
    "context": "Extra context — this explains or supports that",
    "supports": "Supports — this is evidence for that",
    "contradicts": "Contradicts — these disagree",
    "example_of": "Example of — this is an instance of that",
}

# ROADMAP §87.5's first slice, using only what a link already stores — no new
# column, no migration. A named type is a considered choice (a person or the
# AI, with approval) and reads as a stronger connection than a bare link,
# which is why every one of the six above gets the same boost regardless of
# which: the distinction that matters here is "somebody decided this" versus
# "nobody said", not a ranking between "supports" and "contradicts" — those
# are equally deliberate.
TYPED_LINK_BOOST = 1.5

# A floor, not a zero: `reason_confidence` only exists on a reason nobody
# actually gave (see the column's own docstring) — it is a guess, and a
# low-confidence guess should weigh less, but even a 10%-confidence deduction
# is still a real signal, not nothing.
DEDUCED_LINK_FLOOR = 0.5


def link_strength(link_type: str | None, reason_confidence: float | None) -> float:
    """One number for how strong an `EntryLink` is. 1.0 is the baseline — a
    bare link with no type and no deduced-reason confidence, which is what
    every link created before either column existed still is.

    Consumed by `entry/paths.py`'s shortest-path weighting (as a divisor —
    strength up, cost down) and `search_manager.graph_expansion()`'s
    neighbour ordering (as a sort key — strength up, ranked first), so a
    typed or well-evidenced connection is preferred over a bare one in both
    the places that already claimed to do this and did not.

    Deliberately **not** the full composite §87.5 scopes (shared tags,
    category, temporal proximity) — those are derived signals that would
    need computing per-pair at query time on two hot paths (every chat/ask
    retrieval goes through `graph_expansion`), and neither has been measured
    against real usage yet. This uses only what a link already carries.
    """
    strength = TYPED_LINK_BOOST if link_type else 1.0
    if reason_confidence is not None:
        strength *= max(DEDUCED_LINK_FLOOR, reason_confidence)
    return strength


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
    """A file the user attached to an entry. The bytes live in
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


class Conversation(Base, WorkspaceMixin):
    """A saved chat. Turns are a JSON list of
    {"role": "user"|"assistant", "content": str, "thinking": str|None}
    — one blob per conversation is the boring right size for a
    single-user app.

    Was missing WorkspaceMixin entirely — reported directly: the Library
    showed every chat regardless of which space was active, while notes and
    documents (which do carry it) correctly scoped to zero. Chat history is
    named explicitly as space-specific in the spaces design notes; this was
    the one model that shipped without the mixin the feature depends on.
    Existing rows get `workspace_id="default"` from the additive
    auto-migrator's column default, same as every other backfilled column
    on this table."""

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


class AskTurn(Base, WorkspaceMixin):
    """One question asked in the Ask box (Notes tab), with its answer and
    which notes answered it — durable so the box can be browsed back through
    like the notes it's about, not just re-asked from a five-item chip row.

    Deliberately not a Conversation: the Ask box is single-shot, notes-only
    Q&A (§35A) with no follow-up thread, so a flat row per question beats a
    JSON message list a saved chat needs. `raw_result_ids` records which
    notes answered it at the time — resolved back to live entries on read
    (routes_ask_history.py), so an edited or deleted note since then shows
    as it is now, or drops out cleanly rather than serving a stale copy.
    """

    __tablename__ = "ask_turns"

    id: Mapped[int] = mapped_column(primary_key=True)
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    raw_result_ids: Mapped[str] = mapped_column(Text, default="[]")
    search_mode: Mapped[str] = mapped_column(String(40), default="")
    when_phrase: Mapped[str] = mapped_column(String(120), default="")
    # Same provenance the live Ask box shows as a badge on each result
    # (similarity score, matched keyword(s), or "linked to a match") — kept
    # so browsing back through history shows the same explanation the
    # answer originally had, not results with no reason attached.
    match_info: Mapped[str] = mapped_column(Text, default="{}")
    connected_ids: Mapped[str] = mapped_column(Text, default="[]")
    # Pinned turns survive "clear history" and sort first — the same shape
    # Conversation.pinned already uses for saved chats.
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Reminder(Base):
    """A reminder, optionally attached to an entry."""

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


class Document(Base, WorkspaceMixin):
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
    # What kind of file this is — a bare extension, no dot ("md", "py",
    # "sql"). See core/filetypes.py for the table and why it is shared with
    # the frontend rather than duplicated there. A scalar default (not a
    # server_default or a callable) so the additive auto-migrator backfills
    # every document that existed before file types did as markdown, which is
    # what all of them are.
    file_type: Mapped[str] = mapped_column(String(20), default="md")
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


class DocumentAiEdit(Base):
    """One accepted AI edit on a document — a changelog, asked for
    directly: "allow edits made by the AI to be undone or altered before
    and after they are set." Before acceptance, the AI panel's own result
    textarea already covers "altered before" (edit the suggestion, then
    accept whatever you kept). This table covers "undone... after": a
    durable, per-document history of what the AI actually applied, each
    entry revertible on its own — distinct from the app's session-only
    global undo stack (app.js's pushUndo), which still also fires on
    accept for an immediate Ctrl+Z, but forgets everything on reload. This
    is the record that survives one.

    Stores full before/after snapshots rather than a diff: documents are
    markdown text, not the kind of structured data a real diff format
    would represent as anything smaller than the text itself, and a revert
    needs to restore an exact prior state, not replay a patch against
    whatever the content happens to be *now* (which may have been edited
    by hand since). Bounded per document (`MAX_ENTRIES_PER_DOCUMENT` below,
    enforced in routes_documents.py) rather than kept forever, the same
    "a log, not an unbounded table" reasoning `taskhistory.py` uses for its
    own ring buffer — except this one has to survive a restart (a revert
    button pointing at nothing after closing the app would be worse than
    not offering one), so it is a real table, not an in-memory deque.
    """

    __tablename__ = "document_ai_edits"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"), index=True)
    verb: Mapped[str] = mapped_column(String(10), default="edit")
    instruction: Mapped[str] = mapped_column(String(500), default="")
    #: Whichever passage was targeted, trimmed to a display-sized excerpt —
    #: never the full document (that's what before_content is for), just
    #: enough for the changelog entry to say what it touched.
    selection_excerpt: Mapped[str] = mapped_column(String(200), default="")
    before_content: Mapped[str] = mapped_column(Text, default="")
    after_content: Mapped[str] = mapped_column(Text, default="")
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
    #: Local OCR text (core/ocr.py), filled in on a background thread after
    #: upload — NULL means "not extracted yet or nothing found", never
    #: distinguished from each other, since neither blocks the upload and a
    #: caller only ever wants "is there searchable text here at all".
    #: Populated for raster images only (`ocr.OCR_SUFFIXES`); a PDF upload
    #: stays NULL forever, honestly — no page-rasterisation step exists.
    ocr_text: Mapped[str | None] = mapped_column(Text, default=None)
    #: A vision model's own description of the image (`ai/captioning.py`),
    #: filled in on a background thread after upload — same NULL convention
    #: as `ocr_text` above: "not captioned yet or no vision model available",
    #: never distinguished, since neither blocks the upload. Written once and
    #: left alone after that (a caption an AI or a person already read and
    #: trusted must not silently change under them) unless the user presses
    #: Regenerate — see `routes_files.caption_media`.
    caption: Mapped[str | None] = mapped_column(Text, default=None)
    #: Which model wrote the caption currently stored, or NULL when there is
    #: no caption or it was only ever typed by hand. Asked for directly: a
    #: caption with no visible author reads as this app's own opinion rather
    #: than one specific (possibly wrong) model's guess. Reset to NULL when
    #: the caption is cleared back to empty, same as `caption` itself.
    caption_model: Mapped[str | None] = mapped_column(String(200), default=None)
    #: True once a person has typed over an AI caption (or typed one from
    #: scratch) — `caption_media`'s `text` path is the only way this is set.
    #: `caption_model` is left as whichever model wrote the caption *before*
    #: the edit (or NULL if there never was one) rather than cleared, so the
    #: badge can still say "started as granite3-vision, edited by you"
    #: instead of losing that history the moment someone fixes a typo.
    caption_edited: Mapped[bool] = mapped_column(Boolean, default=False)
    #: Verbatim text a vision model transcribed from the image
    #: (`ai/vision_ocr.py`) — distinct from `ocr_text` above (Tesseract,
    #: local and exact) and from `caption` (a natural-language description,
    #: not a transcription). Asked for directly as a separate "extractor
    #: mode": Tesseract fails on handwriting, low-contrast photos and most
    #: non-Latin scripts, all of which a vision model can often still read.
    #: NULL until run — manual-trigger only (`POST /media/{id}/vision-ocr`),
    #: never automatic on upload, since it is a full model round trip a
    #: person opts into rather than something every upload should pay for.
    vision_ocr_text: Mapped[str | None] = mapped_column(Text, default=None)
    #: Which model produced `vision_ocr_text`, or NULL when there is none —
    #: same "credit the model, not the app" reasoning as `caption_model`.
    vision_ocr_model: Mapped[str | None] = mapped_column(String(200), default=None)


class UserPreference(Base):
    """Agent Memory Streams: Learned preferences and instructions appended by the AI."""

    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    #: True while the *model* has proposed this and the user has not answered.
    #: A proposal is not in the prompt and is not "off" — those are different
    #: states and the UI shows them differently. Asked for directly: "can the
    #: ai pick up things and suggest the user adds it as a preference in that
    #: section with an accept or deny or similar popup??"
    #:
    #: The distinction matters beyond tidiness. `save_user_preference` used to
    #: write a standing instruction into every future prompt with no
    #: confirmation of any kind — the tool's own description said "quietly
    #: append" — so a model that misread one sentence could give itself a
    #: permanent rule the user never agreed to and would only find by opening
    #: a settings page they had no reason to visit.
    #:
    #: Scalar default (not a server_default or a callable) so the additive
    #: auto-migrator backfills every preference that existed before proposals
    #: did as already-accepted, which is what they are.
    proposed: Mapped[bool] = mapped_column(Boolean, default=False)


class AuditLog(Base):
    """Every meaningful action, logged from the start (plan §4)."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    action: Mapped[str] = mapped_column(String(50))  # created/edited/deleted/...
    entity_type: Mapped[str] = mapped_column(String(50))  # entry/category/...
    entity_id: Mapped[int | None] = mapped_column(Integer, default=None)
    detail: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


_logger = logging.getLogger("memorymap.database")


def _migrations_root() -> Path:
    """Where `alembic.ini` and `migrations/` live, source or frozen.

    Mirrors `api/app.py`'s own `FRONTEND_DIR` resolution exactly — same
    directory depth from this file (`src/memorymap/core/database.py`) to
    the repo root, same `sys.frozen`/`_MEIPASS` split for a PyInstaller
    build. Kept here rather than imported from `app.py` because `core/` is
    the bottom layer (`deps.register_cache_reset`'s own docstring, above,
    already explains why that direction matters in this codebase).
    """
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
    return Path(__file__).resolve().parents[3]


def _ensure_alembic_baseline(db_path: Path) -> None:
    """Make Alembic aware of this exact database, without ever running DDL
    against one that doesn't need it.

    Every database this app opens already has the correct current schema by
    the time this runs — `create_all()` and `_add_missing_columns()` above
    guarantee that, unchanged, for both a brand-new database and an existing
    one missing a column. What Alembic adds is only for the day a *rename*
    or *drop* is actually needed, which those two never could do (`core/
    database.py`'s own module docstring has said so from the start). So:

    - No `alembic_version` table yet (every database before this function
      existed, plus every fresh one `create_all()` just built) → **stamp**
      to the baseline revision. Stamping records "this database is already
      at revision X" without executing revision X's `upgrade()` — correct
      here specifically because the schema already matches it by
      construction, not because stamping is generally safe to reach for.
    - `alembic_version` already exists → a previous startup already
      stamped or migrated this database, so **upgrade** to head. A no-op
      when nothing newer than what's stamped has been added; applies any
      real migration that has, the actual point of wiring this in at all.

    Never allowed to stop the app from starting: this is new, additive
    infrastructure layered on a schema mechanism that already works on its
    own, not a replacement for it. Any failure here — a packaging issue in
    a frozen build that didn't bundle `migrations/` correctly, a locked
    file, anything — is logged and swallowed rather than raised.

    `DatabaseManager.__init__` skips calling this at all under pytest
    (`PYTEST_CURRENT_TEST`, which pytest itself sets — no per-test opt-in
    needed) — a throwaway `tmp_path` database that gets discarded the
    moment its one test ends has nothing to gain from being stamped, and
    this measured ~30ms per call against a suite where `DatabaseManager`
    runs in a large fraction of the ~1,600 tests: real minutes, for a
    database that will never see a second startup to make the "upgrade"
    half of this function's job matter. The skip lives at the call site,
    not in here, so `tests/test_alembic_baseline.py` can call this function
    directly and actually exercise it.
    """
    try:
        from alembic import command
        from alembic.config import Config
        from alembic.runtime.migration import MigrationContext
        from sqlalchemy import create_engine as _create_engine

        root = _migrations_root()
        ini_path = root / "alembic.ini"
        if not ini_path.is_file():
            _logger.warning("Alembic config not found at %s — skipping", ini_path)
            return

        cfg = Config(str(ini_path))
        cfg.set_main_option("script_location", str(root / "migrations"))
        cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")
        # alembic.ini's own [loggers] section defaults to INFO, meant for a
        # human watching a terminal run `alembic upgrade head` by hand — not
        # for every one of this app's own startups. This runs silently
        # unless something actually goes wrong (the except below still logs).
        logging.getLogger("alembic").setLevel(logging.WARNING)

        probe_engine = _create_engine(f"sqlite:///{db_path}")
        try:
            with probe_engine.connect() as connection:
                current = MigrationContext.configure(connection).get_current_revision()
        finally:
            probe_engine.dispose()

        # migrations/env.py calls logging.config.fileConfig() every time
        # command.stamp/upgrade below runs it, and that call unconditionally
        # REPLACES the handler list (and resets the level) of every logger
        # alembic.ini explicitly configures — root among them — regardless
        # of disable_existing_loggers, which only protects loggers *not*
        # listed there from being disabled. alembic.ini's own
        # [logger_root] sets handlers = console, so this silently tore
        # logbuffer.install()'s own handler off the root logger and
        # replaced it with Alembic's plain console handler for the rest of
        # this process's life — reported directly: the Settings -> Logs
        # viewer showed nothing but Alembic's own plugin-registration
        # lines, forever, because nothing the app itself logs reaches a
        # handler that no longer exists. Same mechanism undid the
        # WARNING level just set above ([logger_alembic] says INFO),
        # which is why those plugin lines were visible at all. Restored
        # here rather than in env.py itself, because a human running
        # `alembic upgrade head` directly from a terminal *wants*
        # fileConfig()'s effect to stick for that short-lived process —
        # this restore only matters for the in-process caller, which is
        # this function.
        root_logger = logging.getLogger()
        saved_root_handlers = list(root_logger.handlers)
        saved_root_level = root_logger.level
        saved_alembic_level = logging.getLogger("alembic").level
        try:
            if current is None:
                command.stamp(cfg, "head")
            else:
                command.upgrade(cfg, "head")
        finally:
            root_logger.handlers = saved_root_handlers
            root_logger.setLevel(saved_root_level)
            logging.getLogger("alembic").setLevel(saved_alembic_level)
    except Exception:  # noqa: BLE001 — see docstring: never fatal to startup
        _logger.warning("Alembic baseline/upgrade step failed", exc_info=True)


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
        self._ensure_indexes()
        # See _ensure_alembic_baseline's own docstring for why this is
        # skipped under pytest — a throwaway per-test database has nothing
        # to gain from being stamped, and the constructor runs in most of
        # this suite's ~1,600 tests.
        if not os.environ.get("PYTEST_CURRENT_TEST"):
            _ensure_alembic_baseline(db_path)
        self._session_factory = sessionmaker(
            bind=self.engine, expire_on_commit=False
        )
        self._ensure_default_spaces()

    def _ensure_default_spaces(self) -> None:
        """Seed default spaces if none exist."""
        with self.session() as session:
            if session.query(Space).first() is None:
                defaults = [
                    Space(id="default", name="Default Space", icon="ph-house"),
                    Space(id="work", name="Work", icon="ph-briefcase"),
                    Space(id="personal", name="Personal", icon="ph-user"),
                    Space(id="projects", name="Projects", icon="ph-kanban")
                ]
                session.add_all(defaults)
                session.commit()


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

    #: The list queries that run on essentially every page load, and the
    #: composite index each one needs to be served from an index instead of a
    #: sort. Kept as data in one place rather than as `Index()` objects on the
    #: model, for a reason worth stating: `create_all()` "creates missing
    #: tables only" (see its call site above), so an index declared on an
    #: already-existing table would be created on a *fresh* database and
    #: silently never appear on anybody's real one — the same
    #: works-on-a-new-profile-only trap `_add_missing_columns` exists to avoid
    #: for columns.
    #:
    #: The column order in each is the query's own shape: equality filters
    #: first, then the ORDER BY terms in order and in their own direction.
    #: SQLite will only skip the sort if the index's trailing columns match
    #: the ORDER BY exactly, direction included — which is why `pinned DESC`
    #: is spelled out rather than left to default ASC.
    _INDEXES: tuple[tuple[str, str], ...] = (
        # manager.list_entries() — the Notes tab, GET /entries, and most
        # background jobs. Measured before this existed: EXPLAIN QUERY PLAN
        # reported "USE TEMP B-TREE FOR ORDER BY", i.e. SQLite sorted every
        # live note in the notebook on every call.
        (
            "ix_entries_live",
            "entries (workspace_id, is_deleted, archived_at, "
            "pinned DESC, created_at DESC, id DESC)",
        ),
        # manager.list_deleted_entries() — the recycle bin.
        (
            "ix_entries_bin",
            "entries (workspace_id, is_deleted, deleted_at DESC, id DESC)",
        ),
        # manager.list_archived_entries() — the archive.
        (
            "ix_entries_archive",
            "entries (workspace_id, is_deleted, archived_at DESC, id DESC)",
        ),
        # routes_library._notes() and routes_graph's entry scan both add
        # `is_draft = 0` to the live filter; without `is_draft` in an index
        # they fall back to the same full scan the live index above removes.
        (
            "ix_entries_live_nodraft",
            "entries (workspace_id, is_deleted, is_draft, archived_at, "
            "created_at DESC, id DESC)",
        ),
    )

    def _ensure_indexes(self) -> None:
        """Create the composite indexes the hot list queries need.

        `IF NOT EXISTS` throughout, run on every startup — the same additive
        convention `_ensure_fts5` and `_add_missing_columns` already use, and
        for the same reason: it has to be correct on a database created by any
        earlier version, not only on a fresh one.

        Adding an index is not free — every write to `entries` maintains it —
        but these are read-heavy paths by a wide margin in a notebook app, and
        the alternative measured on a 20k-note database was a temp B-tree sort
        of the whole table per request.
        """
        with self.engine.begin() as connection:
            for name, definition in self._INDEXES:
                connection.exec_driver_sql(
                    f"CREATE INDEX IF NOT EXISTS {name} ON {definition}"
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
