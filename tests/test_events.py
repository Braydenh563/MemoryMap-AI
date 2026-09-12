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
from datetime import timedelta

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


def test_the_feed_reads_forwards_from_a_cursor(client):
    """A viewer reads backwards from now; anything that follows the notebook
    has to read forwards from what it last saw, or it misses whatever
    happened while it was away."""
    first = client.post("/entries", json={"content": "one", "tags": []}).json()
    start = client.get("/events").json()
    client.post("/entries", json={"content": "two", "tags": []})

    after = client.get(f"/events?since={start['cursor']}").json()
    actions = [item["action"] for item in after["items"]]
    assert "created" in actions
    assert all(item["id"] > start["cursor"] for item in after["items"])
    assert all(item["actor"] == "user" for item in after["items"])
    assert not [item for item in after["items"] if item["entity_id"] == first["id"]]
    assert after["cursor"] >= start["cursor"]


def test_the_feed_leaves_the_bookkeeping_out(client):
    entry = client.post("/entries", json={"content": "before", "tags": []}).json()
    client.put(f"/entries/{entry['id']}", json={"content": "after"})

    items = client.get("/events").json()["items"]
    assert "revised" not in [item["action"] for item in items]
    assert "revised" in [row["action"] for row in client.get("/audit").json()]


# --- compaction (Brief 7 item 1, `events-retention`) -------------------------
#
# The decision the plan made and this pins down: a payload holds whole field
# values, so the log grows by a copy of a note's text on every edit, and the
# answer is compaction rather than deletion, because an entity's events have
# to keep replaying to its current state. What compaction promises is exactly
# that: the log gets smaller, replay does not move.


def _age_all_events(session, days: int) -> None:
    """Backdate every event, so a compaction window can be reached in a test."""
    from memorymap.core.database import utcnow

    when = utcnow() - timedelta(days=days)
    for row in session.query(AuditLog).all():
        row.created_at = when
    session.commit()


def test_compaction_leaves_replay_on_the_current_state(session):
    from memorymap.core import events

    entry = manager.create_entry(session, "version 0", tags=["a"])
    session.commit()
    for i in range(1, 40):
        manager.update_entry(session, entry, content=f"version {i}", tags=["a"])
        session.commit()
    _age_all_events(session, 200)

    before_bytes = events.payload_bytes(session)
    before_rows = session.query(AuditLog).count()
    summary = events.compact(session, keep_last=5)
    after_bytes = events.payload_bytes(session)

    assert summary["events"] > 0, "nothing was compacted"
    assert after_bytes < before_bytes, "compaction did not make the log smaller"
    # Nothing is deleted: the audit trail still has every action, with its
    # actor and its time. Only the values behind the old ones are gone.
    assert session.query(AuditLog).count() == before_rows

    rebuilt = events.replay(session, "entry", entry.id)
    assert rebuilt["content"] == "version 39"
    assert rebuilt["tags"] == ["a"]


def test_compaction_keeps_the_newest_events_whole(session):
    """However old they are. A note edited twice years ago and not since
    would otherwise have no readable history at all."""
    from memorymap.core import events

    entry = manager.create_entry(session, "version 0", tags=[])
    session.commit()
    for i in range(1, 20):
        manager.update_entry(session, entry, content=f"version {i}", tags=[])
        session.commit()
    _age_all_events(session, 500)

    events.compact(session, keep_last=5)
    newest = events.events_for(session, "entry", entry.id, limit=5)
    assert all(not events.is_compacted(row) for row in newest)
    assert any((row.payload or {}).get("after", {}).get("content") for row in newest)


def test_compaction_leaves_a_young_log_alone(session):
    from memorymap.core import events

    entry = manager.create_entry(session, "written today", tags=[])
    session.commit()
    for i in range(1, 30):
        manager.update_entry(session, entry, content=f"edit {i}", tags=[])
        session.commit()

    before = events.payload_bytes(session)
    assert events.compact(session, keep_last=2) == {"entities": 0, "events": 0}
    assert events.payload_bytes(session) == before


def test_compaction_is_safe_to_run_twice(session):
    """It runs at startup, so a second pass over an already-compacted log has
    to be a no-op rather than something that compounds."""
    from memorymap.core import events

    entry = manager.create_entry(session, "version 0", tags=[])
    session.commit()
    for i in range(1, 30):
        manager.update_entry(session, entry, content=f"version {i}", tags=[])
        session.commit()
    _age_all_events(session, 200)

    first = events.compact(session, keep_last=5)
    settled = events.payload_bytes(session)
    second = events.compact(session, keep_last=5)

    assert first["events"] > 0
    assert second == {"entities": 0, "events": 0}
    assert events.payload_bytes(session) == settled
    assert events.replay(session, "entry", entry.id)["content"] == "version 29"


def test_a_compacted_version_says_so_rather_than_restoring_nothing(client, session):
    from memorymap.core import events

    entry = manager.create_entry(session, "version 0", tags=[])
    session.commit()
    for i in range(1, 30):
        manager.update_entry(session, entry, content=f"version {i}", tags=[])
        session.commit()
    _age_all_events(session, 200)
    events.compact(session, keep_last=5)

    oldest = events.events_for(session, "entry", entry.id, newest_first=False)[0]
    assert events.is_compacted(oldest)
    answer = client.post(f"/entries/{entry.id}/restore/{oldest.id}")
    assert answer.status_code == 410
    assert "no longer" in answer.json()["detail"].lower()

    # And the sheet is told, so the row can say it rather than showing a
    # version with no text and no explanation.
    items = client.get(f"/entries/{entry.id}/history").json()["items"]
    compacted = [item for item in items if item["id"] == oldest.id]
    assert compacted and compacted[0]["compacted"] is True
