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
