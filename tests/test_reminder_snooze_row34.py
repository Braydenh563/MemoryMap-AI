"""WORLD_CLASS_PLAN D8 (section 8, row 34): snooze 10m, 1h and tomorrow, and the
reminder row on the notes' row recipe."""

from __future__ import annotations

from pathlib import Path

JS = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "shell-reminders.js").read_text(encoding="utf-8")


def test_a_reminder_snoozes_ten_minutes_an_hour_and_to_tomorrow():
    row = JS[JS.index("function reminderItem(") : JS.index("function reminderTarget(")]
    assert "Snooze 10 minutes" in row and "10 * 60 * 1000" in row
    assert '"Snooze one hour"' in row and 'presetDate("tomorrow")' in row


def test_the_reminder_row_is_the_notes_row_recipe():
    groups = JS[JS.index('const groupsBox = $("reminder-groups");') :]
    assert 'ul.className = "entry-list";' in groups
    row = JS[JS.index("function reminderItem(") :]
    assert 'row.className = "entry-meta";' in row
