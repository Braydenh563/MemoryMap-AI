"""Every kind of object can be taken to the other main features (INBOX 393:
"there needs to be more integration between all the main features").

Source-level: each object menu names the shared door, so a menu rebuilt
without it fails here rather than quietly losing the route.
"""

from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
APP = (FRONTEND / "app.js").read_text(encoding="utf-8")
LIBRARY = (FRONTEND / "library.js").read_text(encoding="utf-8")
BOARDS = (FRONTEND / "whiteboard.js").read_text(encoding="utf-8")


def _block(source: str, start: str, end: str) -> str:
    i = source.index(start)
    return source[i : source.index(end, i)]


def test_a_note_card_reaches_the_graph_and_the_chat():
    menu = _block(APP, 'label: "ph:hourglass-medium Forgotten notes like this"', "const addItems = [")
    assert "showNoteInGraph(entry.id)" in menu
    assert "askAtlasAboutNote(entry)" in menu


def test_library_notes_and_documents_reach_the_chat():
    document = _block(LIBRARY, 'if (item.kind === "document") {', 'if (item.kind === "archived") {')
    note = _block(LIBRARY, 'if (item.kind === "note") {', "makeMenuItem(\"ph:archive Archive\", \"Keep it, but out of the way, not the bin\"")
    assert 'askAtlasAboutThing("document"' in document
    assert 'askAtlasAboutThing("note"' in note
    assert "showNoteInGraph(item.id)" in note


def test_a_board_or_map_card_reaches_the_chat():
    assert "askAtlasAboutThing(board.type === \"map\" ? \"map\" : \"board\", board.title)" in BOARDS
