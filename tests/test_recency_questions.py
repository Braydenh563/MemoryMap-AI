"""Carry-over wrapup-0927 10 (n), the owner at release: "Show me my last
entry" answered with an older note. A recency question lists the newest
notes, and every note in the prompt carries the day it was written (and
edited)."""

import time

from memorymap.search import search_manager


def test_a_recency_question_is_read_as_an_order():
    for q in (
        "show me my last entry",
        "what was my latest note?",
        "my most recent notes",
        "what did I write last?",
        "newest note about the garden",
    ):
        assert search_manager._RECENCY_ASK.search(q), q
    for q in ("the last time I went running", "notes about my entry visa", "what did I write about bread"):
        assert not search_manager._RECENCY_ASK.search(q), q


def test_the_newest_note_is_first(client, session):
    for text in ("an older note about entries and logs", "the middle one", "the newest thought"):
        client.post("/entries", json={"content": text, "category": "Misc"})
        time.sleep(0.01)
    entries, mode = search_manager.retrieve(session, "show me my last entry", None, 5)
    assert mode == "recent"
    assert "newest thought" in entries[0].content


def test_the_prompt_dates_each_note():
    from datetime import datetime, timezone
    from types import SimpleNamespace

    from memorymap.api import routes_chat

    entry = SimpleNamespace(
        created_at=datetime(2026, 9, 3, 10, tzinfo=timezone.utc),
        edited_at=datetime(2026, 9, 25, 10, tzinfo=timezone.utc),
    )
    text = routes_chat._note_dates(entry, timezone.utc)
    assert text == "Thursday 3 September 2026, 10:00, edited Friday 25 September 2026, 10:00"
    entry.edited_at = None
    assert routes_chat._note_dates(entry, timezone.utc) == "Thursday 3 September 2026, 10:00"


def test_the_newest_is_marked_in_the_prompt():
    from memorymap.ai import librarian

    notes = [
        {"content": "the newest", "category": "Misc", "written": "Saturday 3 October 2026, 09:56", "newest": True},
        {"content": "older", "category": "Misc", "written": "Friday 2 October 2026, 18:00"},
    ]
    messages = librarian.build_messages("show me my last entry", notes)
    user = messages[-1]["content"]
    assert "(written Saturday 3 October 2026, 09:56) (my newest note)" in user
    assert user.index("the newest") < user.index("older")
