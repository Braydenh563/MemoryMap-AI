"""The answer, kept (CHAT_PLAN B12): the ⋯ beside Ask's Copy offers a
note, a document, or a mind map of the notes the answer cites, each on the
undo stack, built from `kebabMenu` (DESIGN.md: a menu behind a button).
`scratchpad/ui-sweeps/keepanswer.js` drives it in the app."""

from __future__ import annotations

from _app_js import app_js_text


def _body(name: str) -> str:
    from pathlib import Path

    lazy = Path(__file__).resolve().parents[1] / "frontend" / "js" / "ask-compose.js"
    js = app_js_text() + lazy.read_text(encoding="utf-8")
    start = js.index(f"function {name}(")
    return js[start : js.index("\n}\n", start)]


def test_the_menu_holds_the_three_ways_to_keep():
    menu = _body("askAnswerMenu")
    assert "kebabMenu(" in menu
    for label in ("Save as a note", "Save as a document", "Make a mind map of its notes"):
        assert label in menu


def test_each_keep_is_undoable():
    for name in ("askKeepAsDocument", "askKeepAsMap"):
        assert "pushUndo(" in _body(name), name


def test_the_map_is_made_from_the_cited_notes_on_a_route_that_exists():
    """The same call the graph's Make a mind map has made since it shipped."""
    from pathlib import Path

    graph = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "graph-canvas.js").read_text(encoding="utf-8")
    assert "/whiteboard/maps/from-notes" in _body("askKeepAsMap")
    assert '"/whiteboard/maps/from-notes"' in graph
