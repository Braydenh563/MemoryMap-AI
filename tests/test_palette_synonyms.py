"""The command palette finds a feature by the words people use for it.

Audit 2026-10-05, UX-08: Ctrl+K "questions", "backup", "undo", "bin" and
"trash" each said "No matching command, note or document.", and "theme" found
nothing (only "dark" found "Toggle light/dark"). The recycle bin's only door
was Library, Filter, "Include the bin"; Questions was a Notes sub-tab. A row
now carries `keywords`, matched with its label, and the places that had no
row have one.
"""

from __future__ import annotations

import re
from pathlib import Path

SOURCE = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "settings-panes.js").read_text(
    encoding="utf-8"
)


def _commands_body() -> str:
    start = SOURCE.index("function paletteCommands()")
    return SOURCE[start : SOURCE.index("\n}\n", start)]


def _searchable_rows() -> list[str]:
    """Each row's label and keywords, lower-cased, as the palette matches them."""
    rows = []
    for row in re.findall(r"\{[^{}]*label:[^{}]*\}", _commands_body()):
        label = re.search(r'label:\s*"([^"]*)"', row)
        keywords = re.search(r'keywords:\s*"([^"]*)"', row)
        rows.append(f"{label.group(1) if label else ''} {keywords.group(1) if keywords else ''}".lower())
    return rows


def test_the_palette_matches_keywords_as_well_as_the_label():
    matches = SOURCE[SOURCE.index("function paletteMatches(") :]
    matches = matches[: matches.index("\n}\n")]
    assert "c.keywords" in matches, "a row's keywords must be searched with its label"


def test_the_words_the_audit_typed_each_find_a_row():
    rows = _searchable_rows()
    for word in ("questions", "backup", "restore", "undo", "redo", "bin", "trash", "deleted", "theme"):
        assert any(word in row for row in rows), f"Ctrl+K {word!r} finds no command"
