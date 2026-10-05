"""WORLD_CLASS_PLAN row 34 (D8): the ten-minute snooze.

D8's target was a snooze of 10 minutes, 1 hour and tomorrow in the row menu.
The row carries +1h and tomorrow as buttons; ten minutes is the one a person
reaches for when a reminder fires and they are mid-sentence, so it is in the
row's menu, for a reminder that is not done.
"""

from __future__ import annotations

from pathlib import Path

SOURCE = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "shell-reminders.js").read_text(encoding="utf-8")


def test_the_row_menu_has_a_ten_minute_snooze():
    menu = SOURCE.split("const menuItems = [];", 1)[1].split("actions.appendChild(kebabMenu(menuItems", 1)[0]
    assert "Snooze 10 minutes" in menu
    assert "10 * 60 * 1000" in menu
    # Only for a reminder that can still be snoozed.
    assert "if (!reminder.done) {" in menu.split("Snooze 10 minutes", 1)[0][-120:]


def test_a_snooze_has_an_undo_that_may_restore_a_past_time(client):
    """Undo of a snooze puts back the old time, usually already past (an
    overdue reminder is the one snoozed), so `restore` skips the past-date rule."""
    from datetime import datetime, timedelta, timezone

    soon = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    made = client.post("/reminders", json={"text": "x", "due_at": soon}).json()
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    assert client.put(f"/reminders/{made['id']}", json={"due_at": past}).status_code == 422
    restored = client.put(f"/reminders/{made['id']}", json={"due_at": past, "restore": True})
    assert restored.status_code == 200 and restored.json()["due_at"][:10] == past[:10]


def test_the_snooze_function_pushes_an_undo():
    body = SOURCE.split("async function snoozeReminderTo(", 1)[1].split("\n}\n", 1)[0]
    assert "pushUndo(" in body and "restore: true" in body and '"Undo"' in body
