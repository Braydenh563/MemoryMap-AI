"""WORLD_CLASS_PLAN row 31, item 99 (d): Paste as note.

The clipboard's text becomes a note in one step, from the command palette. A
browser that will not hand the clipboard over opens Quick note instead, where
pasting is one more keystroke; an empty clipboard says so.
"""

from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
QUICK = (FRONTEND / "js" / "quick-note.js").read_text(encoding="utf-8")
PANES = (FRONTEND / "js" / "settings-panes.js").read_text(encoding="utf-8")
APP = (FRONTEND / "js" / "app.js").read_text(encoding="utf-8")


def test_the_palette_offers_it_and_the_bundle_loads_on_demand():
    assert "ph:clipboard-text Paste as note" in PANES
    row = PANES.split("ph:clipboard-text Paste as note", 1)[1].split("\n", 1)[0]
    assert 'ensureModule("quickNote")' in row and "pasteAsNote()" in row


def test_it_saves_through_the_same_door_as_quick_note():
    body = QUICK.split("async function pasteAsNote()", 1)[1].split("async function saveQuickNote()", 1)[0]
    assert "navigator.clipboard.readText()" in body
    assert "createNoteSafely({ content: text, tags: [] })" in body
    assert "announceNewNote(result.saved)" in body
    # Refused: Quick note. Empty: said, nothing saved.
    assert "openQuickNote()" in body and "no text to save" in body
    # Quick note's own save uses the shared announcement, so both say the same.
    assert "announceNewNote(result.saved)" in QUICK.split("async function saveQuickNote()", 1)[1]
