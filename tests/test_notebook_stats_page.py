"""`GET /statistics`: the Statistics page's counts in one call
(UI_MODERNISATION statistics rows 1 and 2, Brief 89).

Exact, like the chat's statistics: every figure is a count of rows, so a test
that accepted "about right" would test nothing.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from memorymap.ai import notebook_stats
from memorymap.core import deps
from memorymap.core.database import Category, Entry, EntryLink, Reminder


def _session():
    return deps.get_db().session()


def _note(session, content, tags=(), created=None):
    entry = Entry(content=content, tags=json.dumps(list(tags)))
    if created is not None:
        entry.created_at = created
    session.add(entry)
    session.flush()
    return entry


#: A Wednesday, so this week has two days before it and last week is whole.
NOW = datetime(2026, 10, 14, 15, 0, tzinfo=timezone.utc)


def test_the_page_counts_the_notebook(client):
    with _session() as session:
        a = _note(session, "one two three", ["work", "idea"])
        b = _note(session, "four five", ["work"])
        _note(session, "six", [])
        session.add(EntryLink(source_entry_id=a.id, target_entry_id=b.id))
        session.add(Category(name="Projects"))
        session.commit()
        page = notebook_stats.page(session, datetime.now(timezone.utc), {"features": [], "unused_days": 90})
    book = page["notebook"]
    assert (book["notes"], book["words"], book["tags"], book["links"], book["orphans"]) == (3, 6, 2, 1, 1)
    assert book["categories"] >= 1
    assert len(book["growth"]) == notebook_stats.GROWTH_MONTHS
    assert book["growth"][-1]["value"] == 3


def test_growth_is_per_month_and_bounded(client):
    with _session() as session:
        _note(session, "old", created=NOW - timedelta(days=400))
        _note(session, "march", created=datetime(2026, 3, 9, tzinfo=timezone.utc))
        _note(session, "october", created=datetime(2026, 10, 2, tzinfo=timezone.utc))
        session.commit()
        growth = notebook_stats.page(session, NOW, {})["notebook"]["growth"]
    labels = [row["label"] for row in growth]
    assert labels[0] == "2025-11" and labels[-1] == "2026-10"
    assert {row["label"]: row["value"] for row in growth}["2026-03"] == 1
    assert sum(row["value"] for row in growth) == 2


def test_reminders_made_done_late_and_open(client):
    with _session() as session:
        session.add_all([
            Reminder(text="late", due_at=NOW - timedelta(days=1)),
            Reminder(text="soon", due_at=NOW + timedelta(days=1)),
            Reminder(text="done", due_at=NOW - timedelta(days=2), done=True),
        ])
        session.commit()
        block = notebook_stats.page(session, NOW, {})["reminders"]
    assert block == {"made": 3, "done": 1, "late": 1, "open": 2}


def test_ticking_a_reminder_stamps_when_and_unticking_clears_it(client):
    with _session() as session:
        reminder = Reminder(text="x", due_at=NOW)
        session.add(reminder)
        session.commit()
        assert reminder.done_at is None
        reminder.done = True
        assert reminder.done_at is not None
        reminder.done = False
        assert reminder.done_at is None


def test_the_week_review_is_this_week_against_last(client):
    monday = datetime(2026, 10, 12, 9, 0, tzinfo=timezone.utc)
    with _session() as session:
        _note(session, "a b c", created=monday)
        _note(session, "d e", created=monday - timedelta(days=3))
        _note(session, "f", created=monday - timedelta(days=6))
        _note(session, "too old", created=monday - timedelta(days=9))
        session.add(Reminder(text="r", due_at=NOW, done=False))
        session.commit()
        ticked = Reminder(text="t", due_at=NOW)
        session.add(ticked)
        session.flush()
        ticked.done_at = monday - timedelta(days=2)
        session.commit()
        week = notebook_stats.page(session, NOW, {})["week"]
    assert week["this"]["start"] == "2026-10-12" and week["this"]["end"] == "2026-10-14"
    assert week["last"]["start"] == "2026-10-05" and week["last"]["end"] == "2026-10-11"
    assert (week["this"]["notes"], week["this"]["words"], week["this"]["reminders_done"]) == (1, 3, 0)
    assert (week["last"]["notes"], week["last"]["words"], week["last"]["reminders_done"]) == (2, 3, 1)


def test_private_and_binned_notes_are_not_counted(client):
    with _session() as session:
        _note(session, "seen")
        hidden = _note(session, "private words here")
        hidden.is_private = True
        gone = _note(session, "binned")
        gone.deleted_at = NOW
        session.commit()
        book = notebook_stats.page(session, NOW, {})["notebook"]
    assert (book["notes"], book["words"]) == (1, 1)


def test_the_route_answers_in_one_call_with_the_usage_rows(client):
    client.post("/usage", json={"features": ["tab:chat", "tab:chat", "palette:undo"]})
    client.post("/entries", json={"content": "hello there"})
    body = client.get("/statistics").json()
    assert set(body) == {"as_of", "notebook", "reminders", "week", "usage"}
    assert body["notebook"]["notes"] >= 1
    assert {f["name"]: f["count"] for f in body["usage"]["features"]}["tab:chat"] == 2
    assert body["usage"]["uses"] == 3
    assert body["usage"]["unused_days"] == 90

