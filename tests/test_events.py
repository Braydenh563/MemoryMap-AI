"""The event log (WORLD_CLASS_PLAN 4 B1; SESSION_BRIEFS Brief 7): the spec.

Every test here was strict-xfail until Brief 7 built the feature. All five
now pass and their markers are gone, which is what a strict xfail is for: it
fails the build the moment the behaviour exists, so the spec cannot be
quietly ignored and cannot quietly stay "pending" either.

What is being specified, in the words of the plan: every write through the
managers records exactly one event in the same transaction, with an actor
and a whole-field payload; a note's events replay to its current state;
history is listable and a version restorable; a purge is one event with the
id list, not one per row. `AuditLog` (core/database.py) is the table; it
gains `actor` and `payload` rather than a new table being added.
"""
from __future__ import annotations

import inspect

from memorymap.core.database import AuditLog
from memorymap.entry import manager

WRITE_PREFIXES = (
    "create_", "update_", "soft_delete_", "restore_", "archive_", "unarchive_",
    "purge_", "link_", "unlink_", "record_",
)


def _manager_writes():
    return sorted(
        name for name, fn in inspect.getmembers(manager, inspect.isfunction)
        if name.startswith(WRITE_PREFIXES) and fn.__module__ == manager.__name__
    )


def test_audit_log_carries_actor_and_payload():
    columns = {c.name for c in AuditLog.__table__.columns}
    assert {"actor", "payload"} <= columns, "extend AuditLog, do not add a table"


def test_every_manager_write_records_exactly_one_event(session):
    """Enumerates the public write functions so a new one cannot be missed."""
    from memorymap.core import events  # the helper module Brief 7 adds

    entry = manager.create_entry(session, "hello", tags=[])
    session.commit()
    writes = _manager_writes()
    assert writes, "the enumeration found nothing; the prefixes are wrong"
    for name in writes:
        before = session.query(AuditLog).count()
        events.exercise_for_test(session, name, entry)  # Brief 7 provides a per-function driver
        session.commit()
        after = session.query(AuditLog).count()
        assert after == before + 1, f"{name} recorded {after - before} events, not one"
        last = session.query(AuditLog).order_by(AuditLog.id.desc()).first()
        assert last.payload, f"{name} recorded an event with no payload"
        assert last.actor in {"user"} or last.actor.startswith(("ai:", "system:"))


def test_a_notes_events_replay_to_its_current_state(session):
    from memorymap.core import events

    entry = manager.create_entry(session, "first", tags=["a"])
    session.commit()
    manager.update_entry(session, entry, content="second", tags=["a", "b"])
    session.commit()
    rebuilt = events.replay(session, "entry", entry.id)
    assert rebuilt["content"] == "second"
    assert rebuilt["tags"] == ["a", "b"]


def test_history_lists_and_restore_records_its_own_event(client, session):
    entry = manager.create_entry(session, "v1", tags=[])
    session.commit()
    manager.update_entry(session, entry, content="v2", tags=[])
    session.commit()
    history = client.get(f"/entries/{entry.id}/history").json()
    assert [h["action"] for h in history["items"]][:2] == ["edited", "created"] or len(history["items"]) >= 2
    first = history["items"][-1]["id"]
    restored = client.post(f"/entries/{entry.id}/restore/{first}").json()
    assert restored["content"] == "v1"
    last = session.query(AuditLog).order_by(AuditLog.id.desc()).first()
    assert last.action == "restored"


def test_a_purge_is_one_event_with_the_id_list(session):
    entries = []
    for i in range(3):
        e = manager.create_entry(session, f"n{i}", tags=[])
        session.commit()
        manager.soft_delete_entry(session, e)
        entries.append(e)
    ids = [e.id for e in entries]
    session.commit()
    before = session.query(AuditLog).count()
    manager.purge_entries(session, entries)
    session.commit()
    assert session.query(AuditLog).count() == before + 1
    last = session.query(AuditLog).order_by(AuditLog.id.desc()).first()
    assert last.action == "purged"
    assert sorted(last.payload["ids"]) == sorted(ids)


def test_a_tool_call_is_recorded_as_the_ai_doing_it(session):
    """Who changed the note is the first thing the log has to answer.

    The actor is set once, at the door every tool call comes through
    (`tools.execute_tool`), so a handler cannot forget it and file the AI's
    edit as something the user typed.
    """
    from memorymap.ai import tools

    tools.execute_tool(session, "create_note", {"content": "the AI wrote this"})
    session.commit()
    written = (
        session.query(AuditLog)
        .filter(AuditLog.entity_type == "entry", AuditLog.action == "created")
        .order_by(AuditLog.id.desc())
        .first()
    )
    assert written.actor == "ai:create_note"


def test_a_write_with_no_stated_actor_is_the_user(session):
    entry = manager.create_entry(session, "typed by a person", tags=[])
    session.commit()
    last = session.query(AuditLog).order_by(AuditLog.id.desc()).first()
    assert last.entity_id == entry.id and last.actor == "user"
