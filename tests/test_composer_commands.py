"""The composer acts: commands read from a Chat message with no model
(CHAT_PLAN Phase 5 (f)).

`ai/commands.parse` turns a sentence into an intent and its arguments with
rules, no model. The table below is the measurement the plan asks for: each
row is a phrasing, the intent it should read as, and the arguments it should
carry; `test_the_table_accuracy` reports the share read exactly, and every
row is also its own test so a regression names its sentence.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from memorymap.ai import commands

#: Tuesday 6 October 2026, 10:00 at UTC+10.
NOW = datetime(2026, 10, 6, 10, 0, tzinfo=timezone(timedelta(hours=10)))


def _at(day: int, hour: int, minute: int = 0) -> str:
    return datetime(2026, 10, day, hour, minute, tzinfo=NOW.tzinfo).strftime("%Y-%m-%d %H:%M")


#: (phrasing, intent or None, the arguments that must match)
TABLE: list[tuple[str, str | None, dict]] = [
    # Reminders: the time read by `ai/when`, the words left as the reminder.
    ("remind me to call mum on Friday", "reminder", {"text": "Call mum", "due": _at(9, 9)}),
    ("Remind me to renew my passport tomorrow at 5pm", "reminder", {"text": "Renew my passport", "due": _at(7, 17)}),
    ("remind me in 20 minutes to check the oven", "reminder", {"text": "Check the oven", "due": _at(6, 10, 20)}),
    ("set a reminder to pay rent next Monday", "reminder", {"text": "Pay rent", "due": _at(12, 9)}),
    ("make a reminder for the dentist on Friday at 3pm", "reminder", {"text": "The dentist", "due": _at(9, 15)}),
    ("add a reminder: water the plants tonight", "reminder", {"text": "Water the plants", "due": _at(6, 20)}),
    ("remind me about the passport renewal tomorrow morning", "reminder", {"text": "The passport renewal", "due": _at(7, 9)}),
    ("please remind me to email Priya", "reminder", {"text": "Email Priya", "due": _at(7, 9), "time_given": False}),
    ("can you remind me to book flights on 14 October?", "reminder", {"text": "Book flights", "due": _at(14, 9)}),
    ("reminder: submit the tax return in 3 days", "reminder", {"text": "Submit the tax return", "due": _at(9, 10)}),
    ("set a reminder for Friday to collect the parcel", "reminder", {"text": "Collect the parcel", "due": _at(9, 9)}),
    ("remind me what I wrote about Friday", None, {}),
    ("remind me about my trip", None, {}),
    ("what reminders do I have tomorrow?", None, {}),
    # Tags: "these" is the notes attached to the message; "about Z" is a search.
    ("tag these notes trip", "tag", {"these": True, "tags": ["trip"]}),
    ("tag my notes about Japan with travel", "tag", {"about": "Japan", "tags": ["travel"]}),
    ("tag notes about the kitchen renovation as #home", "tag", {"about": "kitchen renovation", "tags": ["home"]}),
    ("add the tag urgent to this note", "tag", {"these": True, "tags": ["urgent"]}),
    ("tag everything about Priya with work, followup", "tag", {"about": "Priya", "tags": ["work", "followup"]}),
    ("label these #trip #japan", "tag", {"these": True, "tags": ["trip", "japan"]}),
    ("tag the note about the plumber with home", "tag", {"about": "plumber", "single": True, "tags": ["home"]}),
    ("can you tag my japan notes with travel please", "tag", {"about": "japan", "tags": ["travel"]}),
    # Moves: a category by name, matched to an existing one when it plans.
    ("move these notes to Work", "move", {"these": True, "category": "Work"}),
    ("move my notes about the plumber to Home", "move", {"about": "plumber", "category": "Home"}),
    ("file the note about taxes under Finance", "move", {"about": "taxes", "single": True, "category": "Finance"}),
    ("put this note in Projects", "move", {"these": True, "category": "Projects"}),
    ("move my recipe notes into the Cooking category", "move", {"about": "recipe", "category": "Cooking"}),
    ("move the meeting to Friday", None, {}),
    # New notes: the words after the verb, as said.
    ("note: buy milk and eggs", "new_note", {"content": "Buy milk and eggs"}),
    ("new note: Ideas for the garden", "new_note", {"content": "Ideas for the garden"}),
    ("make a note that the boiler code is 4471", "new_note", {"content": "The boiler code is 4471"}),
    ("jot down call the bank about the card", "new_note", {"content": "Call the bank about the card"}),
    ("save a note saying Priya prefers Thursdays", "new_note", {"content": "Priya prefers Thursdays"}),
    ("take a note: flight lands at 6am", "new_note", {"content": "Flight lands at 6am"}),
    ("note to self: renew the car insurance", "new_note", {"content": "Renew the car insurance"}),
    # Find and open: read only, nothing to confirm.
    ("find my note about the passport", "find", {"about": "passport"}),
    ("show me my notes about Japan", "find", {"about": "Japan"}),
    ("search for tax receipts", "find", {"about": "tax receipts"}),
    ("where is my wifi password note?", "find", {"about": "wifi password"}),
    ("look up notes on gardening", "find", {"about": "gardening"}),
    ("open the note about the boiler", "open", {"about": "boiler"}),
    ("open my passport note", "open", {"about": "passport"}),
    ("open note 12", "open", {"note_id": 12}),
    ("find out why my tests fail", None, {}),
    # Meetings: a title when one is said.
    ("start a meeting", "meeting", {"title": ""}),
    ("start a meeting about the budget", "meeting", {"title": "Budget"}),
    ("begin a new meeting called Weekly sync", "meeting", {"title": "Weekly sync"}),
    ("start the weekly sync meeting", "meeting", {"title": "Weekly sync"}),
    ("let's start a meeting with Priya", "meeting", {"title": "Meeting with Priya"}),
    ("record a meeting", "meeting", {"title": ""}),
    # Not commands: questions and chat go to the composer as before.
    ("what did I write about Japan?", None, {}),
    ("how many notes do I have", None, {}),
    ("hello", None, {}),
    ("move on", None, {}),
    ("I need to call mum tomorrow", None, {}),
    ("can you tag notes?", None, {}),
]


def _read(phrase: str) -> dict | None:
    parsed = commands.parse(phrase, NOW)
    if parsed is None:
        return None
    out = dict(parsed)
    if "due_at" in out:
        out["due"] = out.pop("due_at").strftime("%Y-%m-%d %H:%M")
    return out


def _matches(phrase: str, intent: str | None, want: dict) -> bool:
    got = _read(phrase)
    if intent is None:
        return got is None
    return got is not None and got["intent"] == intent and all(got.get(k) == v for k, v in want.items())


@pytest.mark.parametrize(("phrase", "intent", "want"), TABLE, ids=[row[0] for row in TABLE])
def test_each_phrasing(phrase, intent, want):
    got = _read(phrase)
    if intent is None:
        assert got is None, got
        return
    assert got is not None, phrase
    assert got["intent"] == intent, got
    for key, value in want.items():
        assert got.get(key) == value, (key, got)


def test_the_table_accuracy():
    """At least 40 phrasings, every one read exactly (the measured number)."""
    assert len(TABLE) >= 40
    right = sum(_matches(*row) for row in TABLE)
    assert right == len(TABLE), f"{right} of {len(TABLE)}"


def test_every_write_intent_is_in_the_capability_line():
    line = commands.CAPABILITY_LINE
    for words in ("set a reminder", "tag notes", "move notes", "make a new note", "find or open a note", "start a meeting"):
        assert words in line
    assert "—" not in line and "!" not in line
