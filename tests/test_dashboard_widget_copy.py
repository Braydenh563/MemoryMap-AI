"""A widget's line in the picker says what the widget draws.

Found by the WORLD_CLASS_PLAN row check, 2026-09-24 (section 17, row 5,
"Most opened"): the "Most used" widget renders the notes
`/entries/most-accessed` returns, the ones opened or matched by a question
most often, while its picker line promised "the categories and tags you reach
for most often". Tags already have their own widget ("Top tags"), so a
person choosing between the two was told the same thing twice and got a list
of notes from one of them.
"""

from __future__ import annotations

import re
from pathlib import Path

DASHBOARD = Path(__file__).resolve().parent.parent / "frontend" / "dashboard.js"


def _description(key: str) -> str:
    text = DASHBOARD.read_text(encoding="utf-8")
    match = re.search(rf'"?{re.escape(key)}"?: \{{ title: "[^"]*", description: "([^"]*)"', text)
    assert match, f"the {key!r} widget is no longer in the widget table"
    return match.group(1)


def test_the_most_used_widget_says_it_lists_notes() -> None:
    line = _description("most-used")
    assert "notes" in line, line
    assert "categories" not in line and "tags" not in line, line
