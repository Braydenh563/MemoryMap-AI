"""`ai/when.py`: a reminder's time in the user's words, resolved by the app
(AGENT_SKILLS_REFORM, decided 2026-09-21; built for INBOX 527).

The gate the plan set: the shapes people use, resolved with no model at all.
The clock is the owner's transcript: Monday 21 September 2026, 15:55, UTC+10,
where a model put "two hours before midnight" on the 22nd.
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from memorymap.ai import when

NOW = datetime(2026, 9, 21, 15, 55, tzinfo=ZoneInfo("Australia/Brisbane"))


@pytest.mark.parametrize(
    ("phrase", "expected"),
    [
        ("two hours before midnight", "2026-09-21 22:00"),
        ("midnight", "2026-09-22 00:00"),
        ("tomorrow at midnight", "2026-09-23 00:00"),
        ("in 10 minutes", "2026-09-21 16:05"),
        ("in half an hour", "2026-09-21 16:25"),
        ("tomorrow at 9am", "2026-09-22 09:00"),
        ("tomorrow at 9", "2026-09-22 09:00"),
        ("tomorrow at 3", "2026-09-22 15:00"),
        ("tomorrow morning", "2026-09-22 09:00"),
        ("tomorrow", "2026-09-22 09:00"),
        ("tonight", "2026-09-21 20:00"),
        ("tonight at 9", "2026-09-21 21:00"),
        ("this evening", "2026-09-21 18:00"),
        ("at 8pm", "2026-09-21 20:00"),
        ("8:30 pm", "2026-09-21 20:30"),
        ("21:15", "2026-09-21 21:15"),
        ("at 9", "2026-09-21 21:00"),
        ("at 10am", "2026-09-22 10:00"),
        ("noon", "2026-09-22 12:00"),
        ("Friday night", "2026-09-25 20:00"),
        ("on Friday at 3pm", "2026-09-25 15:00"),
        ("next Friday", "2026-10-02 09:00"),
        ("Monday at 9am", "2026-09-28 09:00"),
        ("next week", "2026-09-28 09:00"),
        ("the day after tomorrow at 7:30am", "2026-09-23 07:30"),
        ("5 October at 2pm", "2026-10-05 14:00"),
        ("October 5th", "2026-10-05 09:00"),
        ("30 minutes before 6pm", "2026-09-21 17:30"),
        ("2026-09-30T09:00", "2026-09-30 09:00"),
        ("2026-09-30", "2026-09-30 09:00"),
    ],
)
def test_the_shapes_people_use(phrase, expected):
    got = when.resolve(phrase, NOW)
    assert got is not None, phrase
    assert got.tzinfo is not None, "always an aware instant"
    assert got.astimezone(NOW.tzinfo).strftime("%Y-%m-%d %H:%M") == expected, phrase


def test_an_iso_time_without_an_offset_is_the_users_clock_not_utc():
    got = when.resolve("2026-09-30T09:00", NOW)
    assert got.utcoffset().total_seconds() == 10 * 3600


@pytest.mark.parametrize("phrase", ["", "whenever", "soon-ish", "the plumber"])
def test_what_it_does_not_read_is_none_never_a_guess(phrase):
    assert when.resolve(phrase, NOW) is None


# --- set_reminder, the tool that takes the words --------------------------------


def _tool(session, **args):
    from memorymap.ai import tools

    return tools.execute_tool(session, "set_reminder", {"text": "call the dentist", **args})


def test_the_tool_takes_the_users_words_with_no_model(app_state, session, monkeypatch):
    """The plan's gate: a fake model that passes only the phrase, no model
    reachable, and the instant is right."""
    from memorymap.ai import tools
    from memorymap.core.database import Reminder

    monkeypatch.setattr("memorymap.core.config.user_now", lambda config: NOW)
    result = _tool(session, when="two hours before midnight")
    assert "error" not in result, result
    stored = session.get(Reminder, result["id"]).due_at
    assert stored.astimezone(NOW.tzinfo).strftime("%Y-%m-%d %H:%M") == "2026-09-21 22:00"
    assert result["due"] == "Monday 21 September 2026, 22:00"
    assert "when" in tools.TOOLS["set_reminder"].parameters["properties"]


def test_an_iso_time_without_an_offset_is_stored_as_the_users_time(app_state, session, monkeypatch):
    """Measured before: "2026-10-05T09:00" was stored as 09:00 UTC, which is
    19:00 for a user at UTC+10."""
    from memorymap.core.database import Reminder

    monkeypatch.setattr("memorymap.core.config.user_now", lambda config: NOW)
    result = _tool(session, due_at="2026-10-05T09:00")
    stored = session.get(Reminder, result["id"]).due_at
    assert stored.astimezone(NOW.tzinfo).strftime("%Y-%m-%d %H:%M") == "2026-10-05 09:00"


def test_a_time_already_past_or_unreadable_is_refused_with_a_reason(app_state, session, monkeypatch):
    monkeypatch.setattr("memorymap.core.config.user_now", lambda config: NOW)
    assert "already passed" in _tool(session, due_at="2026-09-20T09:00")["error"]
    assert "Couldn't read 'whenever'" in _tool(session, when="whenever")["error"]
    assert "`when`" in _tool(session)["error"]
