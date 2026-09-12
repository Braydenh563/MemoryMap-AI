"""The event log: every change is a fact, the tables are views.

WORLD_CLASS_PLAN B1, SESSION_BRIEFS Brief 7, spec in `tests/test_events.py`.

Three things live here and nothing else does:

1. **`record()`**, the one writer of `AuditLog` rows. `manager.log_action`
   delegates to it, so the eighty-odd call sites that already existed gained
   an actor and a payload without any of them being rewritten.
2. **The write scope** (`writes`), which is what makes "every manager write
   records exactly one event" true by construction rather than by everybody
   remembering. A manager write opens a scope; anything recorded inside it
   (a category created on the way past, the dates re-resolved because the
   text changed) is folded into that one event's payload under `also`
   instead of becoming a row of its own. The alternative, a helper each
   write has to remember to call exactly once, is the failure mode the
   enumeration test in the spec exists to catch.
3. **`replay()`**, which rebuilds an entity from its own events by applying
   each event's `payload["after"]` in order. This is why payloads carry
   whole field values and not diffs: a diff is only meaningful if every
   earlier event is present, correct and applied, and the day one is
   missing the diff silently reconstructs a note that never existed.

`AuditLog` is the table (`core/database.py`), extended with `actor` and
`payload`. No second `events` table: two half-histories, each missing what
the other recorded, is worse than one.

This module deliberately imports nothing from `entry/` or `api/` at module
level, and reaches `entry.manager` through `importlib` in the one place it
needs to (`exercise_for_test`), for the reason `manager.record_dates`
already states: CodeQL's py/cyclic-import flags the import statement
itself, not only module-level ones.
"""
from __future__ import annotations

import contextlib
import functools
import importlib
import json
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.core.database import AuditLog, Entry

#: A person pressed something. The default, and the honest description of
#: every row written before this module existed.
ACTOR_USER = "user"

#: Actions that are bookkeeping rather than news: they exist so a version can
#: be rebuilt, and they always accompany an `edited` event that says the same
#: thing in the user's language. The activity feed hides them; `/audit`, which
#: is the audit trail rather than a feed, still shows everything.
QUIET_ACTIONS = frozenset({"revised", "dated"})

_actor: ContextVar[str] = ContextVar("memorymap_event_actor", default=ACTOR_USER)
_suppress: ContextVar[bool] = ContextVar("memorymap_event_suppress", default=False)


def current_actor() -> str:
    """Who the events being recorded right now belong to."""
    return _actor.get()


@contextlib.contextmanager
def acting_as(actor: str):
    """Everything recorded inside this block is attributed to `actor`.

    `user`, `ai:<tool or skill>`, `system:<job>`. A context variable rather
    than a parameter threaded through every call because the actor is a
    property of *why* the process is running, which the code doing the write
    usually cannot see: `manager.update_entry` is the same function whether a
    person edited the note, a skill rewrote it, or the auto-filer moved it.
    """
    token = _actor.set(actor or ACTOR_USER)
    try:
        yield
    finally:
        _actor.reset(token)


@contextlib.contextmanager
def suppressed():
    """Record nothing inside this block.

    Test support, and used by `exercise_for_test` only: the spec counts rows
    around one call, so the scaffolding that call needs (a second note to
    link to, a binned note to purge) must not write events of its own. Not
    for production code: an unrecorded change is exactly what this module
    exists to make impossible.
    """
    token = _suppress.set(True)
    try:
        yield
    finally:
        _suppress.reset(token)


@dataclass
class _Write:
    """One manager write in flight: the scope that owns its single event.

    `entity_type` and `action` together say which of the events recorded
    inside the call is the write's own. Both are needed: `create_entry`
    resolves the dates of the note it just made, and that inner `dated`
    event is on the same entity as the `created` event that describes the
    write, so entity alone would let whichever happened first take the
    write's identity.
    """

    entity_type: str
    action: str
    owner: AuditLog | None = None
    #: Recorded before the owner event existed, waiting to be folded into it.
    pending: list[dict] = field(default_factory=list)


_writes: ContextVar[tuple[_Write, ...]] = ContextVar("memorymap_event_writes", default=())


def _fold(scope: _Write, item: dict) -> None:
    """Attach one inner action to the event that owns this write.

    Reassigns `payload` rather than mutating it in place: a JSON column is
    not change-tracked, so an in-place append to a list inside it is a change
    SQLAlchemy never sees and never writes.
    """
    if scope.owner is None:
        scope.pending.append(item)
        return
    payload = dict(scope.owner.payload or {})
    payload["also"] = [*payload.get("also", []), item]
    scope.owner.payload = payload


def record(
    session: Session,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    detail: str | None = None,
    payload: dict | None = None,
    actor: str | None = None,
) -> AuditLog | None:
    """Append one event, in the caller's transaction. The only writer.

    Returns the row, or None when the event was folded into the write that
    contains it (see the module docstring) or suppressed entirely.
    """
    if _suppress.get():
        return None
    stack = _writes.get()
    scope = stack[-1] if stack else None
    claims = (
        scope is not None
        and scope.owner is None
        and entity_type == scope.entity_type
        and action == scope.action
    )
    if scope is not None and not claims:
        # Either this write already has its event, or this is something else
        # happening on the way past (a category created so a note could be
        # filed). Both are part of the one change the caller asked for.
        _fold(
            scope,
            {
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "detail": detail,
            },
        )
        return None

    row = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail,
        actor=actor or current_actor(),
        payload=payload or None,
    )
    session.add(row)
    if scope is not None:
        scope.owner = row
        for item in scope.pending:
            _fold(scope, item)
        scope.pending.clear()
    return row


def writes(entity_type: str, action: str):
    """Mark a function as one write: one event, whatever it does inside.

    `entity_type` and `action` name the event that *is* this write, so
    `create_entry` owns the `created`/`entry` event and the category it had
    to make on the way, and the dates it resolved, are folded into that one
    event rather than counted as three changes.

    **The outermost write wins.** A decorated function called from inside
    another decorated one does not open a scope of its own: `create_entry`
    calling `record_dates` is one change the user made, not two, and the
    only reason `record_dates` records at all is that it is also called on
    its own. Only decorate a function that is genuinely one change: a
    function that loops over several writes (`seed_example_notes`,
    `sync_wiki_links`) must stay undecorated or it would fold a whole batch
    into a single event.
    """

    def decorate(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            if _writes.get():
                return fn(*args, **kwargs)
            scope = _Write(entity_type, action)
            token = _writes.set((*_writes.get(), scope))
            try:
                return fn(*args, **kwargs)
            finally:
                _writes.reset(token)
                if scope.owner is None and scope.pending:
                    # Nothing claimed the write but something happened inside
                    # it. Unreachable today (every write that does anything
                    # records its own event first); folding would lose the
                    # fact, so it is written out instead, in whatever
                    # transaction the caller goes on to commit.
                    leftover_session = _session_of(args, kwargs)
                    if leftover_session is not None:
                        for item in scope.pending:
                            leftover_session.add(
                                AuditLog(
                                    action=item["action"],
                                    entity_type=item["entity_type"],
                                    entity_id=item["entity_id"],
                                    detail=item["detail"],
                                    actor=current_actor(),
                                )
                            )

        return wrapper

    return decorate


def _session_of(args: tuple, kwargs: dict) -> Session | None:
    for candidate in (*args, *kwargs.values()):
        if isinstance(candidate, Session):
            return candidate
    return None


# --- reading it back ---------------------------------------------------------


def events_for(
    session: Session,
    entity_type: str,
    entity_id: int,
    *,
    newest_first: bool = True,
    limit: int | None = None,
    before_id: int | None = None,
) -> list[AuditLog]:
    """This entity's events. Ascending is replay order; descending is history."""
    query = select(AuditLog).where(
        AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id
    )
    if before_id is not None:
        query = query.where(AuditLog.id < before_id)
    query = query.order_by(AuditLog.id.desc() if newest_first else AuditLog.id.asc())
    if limit is not None:
        query = query.limit(limit)
    return list(session.scalars(query))


def replay(
    session: Session, entity_type: str, entity_id: int, upto_event_id: int | None = None
) -> dict[str, Any]:
    """Rebuild an entity's state from its own events.

    Every event's `payload["after"]` holds whole field values, so replaying
    is one dict update per event in id order. `upto_event_id` stops after
    that event, which is what restoring a version is: the state the note was
    in immediately after the change you picked.
    """
    state: dict[str, Any] = {}
    for row in events_for(session, entity_type, entity_id, newest_first=False):
        after = (row.payload or {}).get("after")
        if isinstance(after, dict):
            state.update(after)
        if upto_event_id is not None and row.id >= upto_event_id:
            break
    return state


def tags_of(entry: Entry) -> list[str]:
    """An entry's tags as a list, whatever is in the column.

    Duplicated from `manager.tags_from_json` on purpose: `core/` is the
    bottom layer and cannot import `entry/` (see the module docstring), and
    six lines here is cheaper than the import cycle that would buy.
    """
    try:
        parsed = json.loads(entry.tags or "[]")
    except (TypeError, ValueError):
        return []
    return [str(tag) for tag in parsed] if isinstance(parsed, list) else []


def entry_state(entry: Entry) -> dict[str, Any]:
    """The whole of an entry's replayable state, as an event payload wants it.

    `content` is whatever is in the column, which for a private note is its
    ciphertext: the same rule `EntryRevision` follows, and for the same
    reason. A history must never be the one place a private note sits in the
    clear.
    """
    return {
        "content": entry.content,
        "tags": tags_of(entry),
        "category_id": entry.category_id,
        "is_deleted": bool(entry.is_deleted),
        "deleted_at": entry.deleted_at.isoformat() if entry.deleted_at else None,
        "archived_at": entry.archived_at.isoformat() if entry.archived_at else None,
        "is_private": bool(entry.is_private),
    }


def changed(before: dict, after: dict) -> dict:
    """The fields whose whole value differs, as `{"before": ..., "after": ...}`."""
    keys = [key for key in after if before.get(key) != after[key]]
    return {
        "before": {key: before.get(key) for key in keys},
        "after": {key: after[key] for key in keys},
    }


# --- the spec's driver -------------------------------------------------------
#
# `tests/test_events.py` enumerates every public write function in
# `entry/manager.py` by name prefix and asks this module to exercise each one.
# The point is the day someone adds a new write: the enumeration finds it, no
# driver is registered, and the test fails here with a message saying what to
# do. A write that quietly records nothing is exactly what this catches, so
# this table is not test scaffolding that could live in the test file: it is
# the registration that makes "you cannot add a write and forget" true.


def _scratch_entry(session: Session, content: str = "driver note") -> Entry:
    """A throwaway note for a driver to act on, recorded by nobody."""
    manager = importlib.import_module("memorymap.entry.manager")
    with suppressed():
        entry = manager.create_entry(session, content, tags=["driver"])
    return entry


def _drive_archive_entry(session: Session, entry: Entry) -> None:
    manager = importlib.import_module("memorymap.entry.manager")
    manager.archive_entry(session, _scratch_entry(session))


def _drive_create_entry(session: Session, entry: Entry) -> None:
    manager = importlib.import_module("memorymap.entry.manager")
    with suppressed():
        # So the category this note lands in already exists: creating it is
        # part of the same event, but the test counts rows, and a category
        # created here would make the count depend on what ran before.
        manager.get_or_create_category(session, manager.UNCATEGORISED)
    manager.create_entry(session, "a note the driver made", tags=[])


def _drive_create_link(session: Session, entry: Entry) -> None:
    manager = importlib.import_module("memorymap.entry.manager")
    manager.create_link(session, entry, _scratch_entry(session, "link target"))


def _document_for(session: Session):
    from memorymap.core.database import Document

    document = Document(title="driver document", content="")
    session.add(document)
    session.flush()
    return document


def _drive_link_document(session: Session, entry: Entry) -> None:
    manager = importlib.import_module("memorymap.entry.manager")
    manager.link_document(session, _document_for(session).id, entry.id)


def _drive_unlink_document(session: Session, entry: Entry) -> None:
    manager = importlib.import_module("memorymap.entry.manager")
    document = _document_for(session)
    with suppressed():
        manager.link_document(session, document.id, entry.id)
    manager.unlink_document(session, document.id, entry.id)


def _drive_purge_entries(session: Session, entry: Entry) -> None:
    manager = importlib.import_module("memorymap.entry.manager")
    doomed = [_scratch_entry(session, "purge me"), _scratch_entry(session, "purge me too")]
    with suppressed():
        for one in doomed:
            manager.soft_delete_entry(session, one)
    manager.purge_entries(session, doomed)


def _drive_purge_expired_deleted(session: Session, entry: Entry) -> None:
    from datetime import timedelta

    from memorymap.core.database import utcnow

    manager = importlib.import_module("memorymap.entry.manager")
    expired = _scratch_entry(session, "binned long ago")
    with suppressed():
        manager.soft_delete_entry(session, expired)
        expired.deleted_at = utcnow() - timedelta(days=90)
        session.commit()
    manager.purge_expired_deleted(session, days=30)


def _drive_record_dates(session: Session, entry: Entry) -> None:
    manager = importlib.import_module("memorymap.entry.manager")
    manager.record_dates(session, _scratch_entry(session, "the deadline is tomorrow"))


def _drive_record_revision(session: Session, entry: Entry) -> None:
    manager = importlib.import_module("memorymap.entry.manager")
    manager.record_revision(session, _scratch_entry(session, "a version worth keeping"))


def _drive_restore_entry(session: Session, entry: Entry) -> None:
    manager = importlib.import_module("memorymap.entry.manager")
    binned = _scratch_entry(session, "back from the bin")
    with suppressed():
        manager.soft_delete_entry(session, binned)
    manager.restore_entry(session, binned)


def _drive_soft_delete_entry(session: Session, entry: Entry) -> None:
    manager = importlib.import_module("memorymap.entry.manager")
    manager.soft_delete_entry(session, _scratch_entry(session, "into the bin"))


def _drive_unarchive_entry(session: Session, entry: Entry) -> None:
    manager = importlib.import_module("memorymap.entry.manager")
    archived = _scratch_entry(session, "out of the archive")
    with suppressed():
        manager.archive_entry(session, archived)
    manager.unarchive_entry(session, archived)


def _drive_update_entry(session: Session, entry: Entry) -> None:
    manager = importlib.import_module("memorymap.entry.manager")
    manager.update_entry(session, _scratch_entry(session), content="edited by the driver")


_DRIVERS = {
    "archive_entry": _drive_archive_entry,
    "create_entry": _drive_create_entry,
    "create_link": _drive_create_link,
    "link_document": _drive_link_document,
    "purge_entries": _drive_purge_entries,
    "purge_expired_deleted": _drive_purge_expired_deleted,
    "record_dates": _drive_record_dates,
    "record_revision": _drive_record_revision,
    "restore_entry": _drive_restore_entry,
    "soft_delete_entry": _drive_soft_delete_entry,
    "unarchive_entry": _drive_unarchive_entry,
    "unlink_document": _drive_unlink_document,
    "update_entry": _drive_update_entry,
}


def exercise_for_test(session: Session, name: str, entry: Entry) -> None:
    """Call one manager write the way the spec needs it called.

    Each driver sets up whatever that write needs with events suppressed, so
    the one event the test counts is the write's own.
    """
    driver = _DRIVERS.get(name)
    if driver is None:
        raise NotImplementedError(
            f"{name} is a public write in entry/manager.py with no driver in "
            "core/events.py. Make it record exactly one event (wrap it in "
            "@events.writes and give its log_action a whole-field payload), "
            "then register a driver for it in _DRIVERS."
        )
    driver(session, entry)
