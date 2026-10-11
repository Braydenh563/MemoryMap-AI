"""Task requests reach their act with no model, in people's words and the
owner's typos (the composer ledger's "tasks and routing, 30 gold"). The gold
is `fixtures/composer/tasks_1011.json`: before `commands.read_typed`, 18 of
30 reached their act as typed; after, 30 of 30, and no control writes."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from memorymap.ai import commands

GOLD = json.loads((Path(__file__).parent / "fixtures" / "composer" / "tasks_1011.json").read_text(encoding="utf-8"))
NOW = datetime.fromisoformat(GOLD["now"])
#: Measured 2026-10-11: 18 of 30 before, 30 of 30 after.
FLOOR = 1.0


def _intent(typed: str) -> str | None:
    found = commands.read_typed(typed, NOW)
    return found["intent"] if found else None


def test_the_gold_tasks_reach_their_act():
    misses = [(typed, want, _intent(typed)) for typed, want in GOLD["tasks"] if _intent(typed) != want]
    assert len(GOLD["tasks"]) >= 30
    assert 1 - len(misses) / len(GOLD["tasks"]) >= FLOOR, misses


def test_a_question_that_looks_like_a_task_writes_nothing():
    wrong = [(typed, _intent(typed)) for typed in GOLD["not_acts"] if _intent(typed) in commands.WRITE_INTENTS]
    assert not wrong, wrong


def test_the_reminder_says_what_was_typed_put_right():
    found = commands.read_typed("pls remind me 2 buy milk tonight", NOW)
    assert found["said"] == "buy milk" and found["time_given"]
    found = commands.read_typed("remind me to call mum tmrw", NOW)
    assert found["said"] == "call mum" and found["due_at"].date().isoformat() == "2026-10-12"


def test_a_tag_said_after_the_note_tags_that_note():
    assert commands.read("tag the dentist note health", NOW) == {"intent": "tag", "about": "dentist", "single": True, "tags": ["health"]}


def test_through_the_route_a_typed_task_is_an_act(client, session):
    from memorymap.entry import manager

    manager.create_entry(session, "# Old wifi\n\nPassword 1234.")
    session.commit()
    with client.stream("POST", "/chat/stream", json={"question": "delte my old wifi note", "use_tools": True}) as response:
        events = [json.loads(line) for line in response.iter_lines() if line.strip()]
    assert any(e["type"] == "act" for e in events), events


def _stream(client, question: str, history: list | None = None) -> list[dict]:
    body = {"question": question, "use_tools": True, "history": history or []}
    with client.stream("POST", "/chat/stream", json=body) as response:
        return [json.loads(line) for line in response.iter_lines() if line.strip()]


def test_a_reminder_with_no_time_is_asked_once_and_the_answer_sets_it(client, session, monkeypatch):
    """OPEN-ledger row 461 (decisions 48 and 50): no time said is asked,
    never guessed as tomorrow at 9; the next turn's time fills it."""
    from memorymap.api import routes_chat
    from memorymap.core.database import Reminder

    monkeypatch.setattr("memorymap.core.config.user_now", lambda _config: NOW)
    monkeypatch.setattr(routes_chat, "user_now", lambda _config: NOW)

    asked = _stream(client, "remind me to call the dentist")
    text = "".join(e.get("delta", "") for e in asked if e["type"] == "answer")
    assert "call the dentist" in text and text.rstrip().endswith("?"), text
    assert not any(e["type"] == "act" for e in asked) and session.query(Reminder).count() == 0
    history = [{"question": "remind me to call the dentist", "answer": text}]
    done = _stream(client, "friday at 3", history)
    card = next(e for e in done if e["type"] == "act")
    assert card["label"].startswith("Remind you on Friday at 3") and card["label"].endswith("call the dentist"), card


def test_a_time_alone_fills_only_a_reminder_left_waiting():
    from memorymap.ai import reading

    turns = [{"text": "remind me to call the dentist", "objects": []}]
    assert reading.follow("friday at 3", turns, NOW) == ("remind me to call the dentist friday at 3", "slot")
    assert reading.follow("tmrw", turns, NOW)[1] == "slot"
    assert reading.follow("friday at 3", [{"text": "remind me to call the dentist at 5pm", "objects": []}], NOW) is None
    assert reading.follow("friday at 3 call Sam", turns, NOW) is None
