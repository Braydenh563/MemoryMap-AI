"""A table on the board (INBOX 797, canvasdepth2; WHITEBOARD_PLAN section 12
and "canvasdepth, ranked" row 8, draw.io's). An object of kind `table`:
`data.cells`, a rectangle of text, and `data.header`. The browser half
(typing, Tab, rows and columns at the pressed cell, resize, reopen, Undo) is
`scratchpad/ui-sweeps/wbdepth2.js wbtable`."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FMT = (ROOT / "frontend" / "js" / "whiteboard-format.js").read_text(encoding="utf-8")
WB = (ROOT / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")
HTML = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")


def _body(src: str, name: str) -> str:
    start = src.index(name)
    return src[start : src.index("\n}\n", start)]


def _post(client, cells, **extra):
    return client.post("/whiteboard/objects", json={"kind": "table", "data": {"cells": cells, **extra}, "x": 0, "y": 0, "width": 360, "height": 120})


def test_a_table_is_a_rectangle_of_cells(ai_client):
    made = _post(ai_client, [["Name", "Owner"], ["Plan", "Ann"]], header=True)
    assert made.status_code in (200, 201), made.text
    assert made.json()["data"]["cells"] == [["Name", "Owner"], ["Plan", "Ann"]] and made.json()["data"]["header"] is True
    for bad in ([], [["a", "b"], ["c"]], [["x"] * 21], [["x"]] * 51, [["y" * 501]]):
        refused = _post(ai_client, bad)
        assert refused.status_code == 422, bad
    obj = made.json()
    moved = ai_client.put(f"/whiteboard/objects/{obj['id']}", json={"kind": "table", "data": {**obj["data"], "cells": [["a", "b", "c"]]}, "x": 0, "y": 0, "width": 360, "height": 40})
    assert moved.status_code == 200 and moved.json()["data"]["cells"] == [["a", "b", "c"]]
    ragged = ai_client.put(f"/whiteboard/objects/{obj['id']}", json={"kind": "table", "data": {"cells": [["a"], ["b", "c"]]}, "x": 0, "y": 0, "width": 360, "height": 40})
    assert ragged.status_code == 422


def test_the_grid_is_built_painted_and_edited_in_place():
    assert "wbBuildTable(el, d);" in WB and "wbPaintTable(this, d);" in WB
    paint = _body(FMT, "function wbPaintTable(")
    assert "[contenteditable='true']" in paint, "a cell being typed in is never redrawn under it"
    assert "grid.dataset.key === key" in paint
    edit = _body(FMT, "function wbEditTableCell(")
    for key in ('"Escape"', '"Enter"', '"Tab"'):
        assert key in edit
    #: The next cell takes the keyboard before this one is saved.
    done = edit[edit.index("const done = ") :]
    assert done.index("wbEditTableCell(id, moveTo[0], moveTo[1])") < done.index("wbSetTable(d, cells)")


def test_rows_and_columns_go_in_at_the_pressed_cell_and_the_box_follows():
    reshape = _body(FMT, "function wbTableReshape(")
    assert "d.height / rows" in reshape and "d.width / cols" in reshape
    rows = _body(FMT, "function wbTableMenuRows(")
    for words in ("Add a row below", "Add a column to the right", "Delete this row", "First row as a header"):
        assert words in rows
    assert "wbTableMenuRows(table)" in WB
    assert 'data-wb-cmd="insert-table"' in HTML
