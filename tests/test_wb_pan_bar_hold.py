"""A pan holds the selection bar's measurements (owner, 2026-10-12, third
report of a laggy mind map with a node selected). Measured on a 40-topic map:
placing the topic strip cost 30 ms a frame (rects, offsets and the strip's
controls refilled); held, 0.15 ms (a Playwright page.evaluate loop over
`wbUpdateSelectionBar(panning)` with one topic selected)."""

import re
from pathlib import Path

JS = (Path(__file__).resolve().parent.parent / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")


def test_the_pan_frame_places_the_bar_from_held_measurements():
    frame = JS[JS.index("function wbZoomFrameWork"):]
    assert "wbUpdateSelectionBar(true)" in frame[:3000]


def test_the_hold_is_cleared_by_any_other_placement_and_by_the_pans_end():
    body = JS[JS.index("function wbUpdateSelectionBar("):]
    assert re.search(r"if \(!panning\) wbAddGate\.panBarHold = null", body[:600])
    end = JS[JS.index("function wbEndPanShield"):]
    assert "wbAddGate.panBarHold" in end[:500] and "wbUpdateSelectionBar()" in end[:500]


def test_a_held_pan_does_not_refill_the_strip_or_walk_the_board():
    body = JS[JS.index("function wbUpdateSelectionBar("):]
    assert "mapNode && !panHeld) wbSyncMapStrip" in body
    assert "!panHeld && container.querySelector" in body
