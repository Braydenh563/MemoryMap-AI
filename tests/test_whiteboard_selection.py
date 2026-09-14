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
