"""The whiteboard's selection affordances, as text.

The suite cannot open a board, so these hold the two facts the owner reported
missing: a sweep that catches one shape selects it the way a click does (which
is what draws its box and its eight anchors), and an anchor answers a double
click by fitting the box to its text.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WB = (ROOT / "frontend" / "whiteboard.js").read_text(encoding="utf-8")
CSS = (ROOT / "frontend" / "css" / "07-whiteboard-misc.css").read_text(encoding="utf-8")


def test_a_one_item_sweep_becomes_the_single_selection() -> None:
    """Reported: "shapes like circles and lines dont visibly select and show
    anchor points when I highlight select over them". The anchors are drawn by
    `wbRenderSketchHandles`, which only runs for the single selection, and a
    marquee put everything in the multi set. Both sweeps (marquee and lasso)
    promote a lone item now, so there are two copies of this."""
    assert WB.count("if (wbMultiSelection.size === 1) {") == 2


def test_a_swept_shape_has_a_style_of_its_own() -> None:
    """A sweep that caught several has no one box to hang anchors off, so the
    class itself has to say something."""
    assert ".sketch-group.wb-selected .sketch-hitbox {" in CSS


def test_an_anchor_answers_a_double_click_by_fitting_the_text() -> None:
    assert "async function wbFitToText(el)" in WB
    assert '.closest?.(".wb-resize-handle, .wb-map-resize-grip")' in WB
    #: Measured from the element's own layout, never estimated from the text.
    assert 'el.style.height = "auto";' in WB
    assert "el.scrollHeight" in WB


def test_a_multi_selection_gets_one_box_with_working_anchors() -> None:
    """Reported with two screenshots: "the highlight select only highlights the
    shapes, it doesnt show the box and enchor points as it should like when I
    individually select them". The group box scales its items through the same
    transform a single shape's handles use, so the two cannot drift apart."""
    assert "function wbRenderMultiSelectionHandles()" in WB
    assert "wbRenderMultiSelectionHandles();" in WB
    body = WB[WB.index("function wbRenderMultiSelectionHandles()") :]
    body = body[: body.index("\nfunction wbRenderSketchHandles()")]
    assert "wbSketchResizeTransform(bbox, handle, rawDX, rawDY" in body
    #: A render mid-drag would replace the handle the gesture is bound to.
    assert "wbScheduleRender();" not in body.split('.on("end"')[0].split('.on("drag"')[1]


def test_a_swept_shape_gets_its_own_box_and_anchors() -> None:
    """The owner, with a screenshot of a selected face beside two selected
    notes: "when I drag select shapes, the individual anchor/rotate boxes dont
    appear ... its fine for the notes but the shapes and lines arent selected
    visually and individually". A card keeps its handles as children, so the
    class alone reveals them; a shape is a path with nowhere to keep any, and
    only this function draws them."""
    assert "function wbDrawSketchHandles(sketch)" in WB
    assert "if (row.entry.kind === \"sketch\") wbDrawSketchHandles(row.entry.item);" in WB


def test_the_group_box_has_a_rotate_point() -> None:
    """Asked for in the same message: "the group boxes dont have a rotate point
    at the top". Every item turns about the group centre, which for a card is a
    move and a rotation, and for a shape is baked into its path."""
    body = WB[WB.index("function wbRenderMultiSelectionHandles()") :]
    body = body[: body.index("\nfunction wbRenderSketchHandles()")]
    assert 'attr("class", "wb-sketch-rotate-handle")' in body
    assert "wbSketchAngleFromCenterDeg(" in body
    assert "item.rotation = (row.rotation + angle) % 360;" in body


def test_a_group_corner_scales_proportionally() -> None:
    """Reported: "when I try to resizr the multiple selected objects with the
    group box, the items all go out of proportion and funky". One shape
    stretching on one axis is a reshape you asked for; a set doing it turns
    every circle into a different ellipse."""
    assert "const corner = handle.length === 2;" in WB
    assert "const t = corner && !free ? { ...raw, sx: k, sy: k } : raw;" in WB


def test_a_drag_snaps_the_movement_not_the_position() -> None:
    """Reported: dragging "doesnt stay on the mouse and goes off to the side of
    where my mouse was on the object". Rounding the absolute position moves an
    off-grid item up to half a cell the instant the drag starts, and it stays
    that far from the cursor; rounding the delta keeps the grab point."""
    assert WB.count("d.x = d._dragOriginX + wbSnap(d._rawX - d._dragOriginX, bypassSnap);") == 2


def test_the_board_owns_undo_while_it_is_open() -> None:
    """Reported: "ctrl z undo and redo cont trigger in the whiteboard/mind
    map". Two listeners matched the chord and whichever stack was non-empty
    answered. The board's own binding is gone and app.js hands it over."""
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    assert "await window.wbUndo();" in app
    assert "window.wbUndo = wbUndo;" in WB
    assert "wbUndo();\n      return;" not in WB


def test_every_undo_door_leads_to_the_board_while_one_is_open() -> None:
    """Asked for directly: "make sure redo is handled too. the undo and redo
    buttons in the bottom bar should work across the whole application". The
    status bar's buttons, the Ctrl+Z chord and the palette all go through
    performUndo/performRedo, which is where the handoff lives."""
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    assert "function boardHistoryActive()" in app
    assert app.count("if (boardHistoryActive()) {") >= 2
    assert "window.wbCanUndo?.()" in app and "window.wbCanRedo?.()" in app
    assert "window.wbCanUndo = () => wbUndoStack.length > 0;" in WB
