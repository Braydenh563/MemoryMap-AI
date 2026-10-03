"""The board overview costs little per pan frame (INBOX 431).

The owner, 2026-09-28: "the fit drag mini fit map on the whiteboard and
mindmap is reallllly glitchy and laggy." The overview (`#wb-navigator`) is one
widget on both surfaces. Measured before the fix on a 150-card board at a 4x
CPU throttle (`scratchpad/ui-sweeps/minimapdrag.js`): a one-second drag of
its viewport rectangle took 9.7 seconds to deliver, with 9,222 forced layouts
and a p95 frame of 183ms. The drawing half of that, pinned here:

* `wbRenderNavigator` read every card's size (`offsetWidth`) between appends
  to the overview's SVG, so every item forced a fresh layout of the page: 151
  layouts per redraw of 150 items. It reads everything first now and writes
  once.
* That full redraw ran on every pan and zoom frame. A pan frame now moves the
  viewport rectangle (and, when the map rescales, sets one transform on the
  items group); the items are redrawn after a board render.

Static checks, because the suite cannot drive a pointer; the sweep is the
measurement.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WB_JS = (ROOT / "frontend" / "whiteboard.js").read_text(encoding="utf-8")


def function_text(name: str) -> str:
    """The text of a top-level `function name(...) {...}` in whiteboard.js."""
    match = re.search(rf"^function {re.escape(name)}\(", WB_JS, re.M)
    assert match, f"{name} is missing from whiteboard.js"
    end = re.search(r"^\}", WB_JS[match.start():], re.M)
    assert end
    return WB_JS[match.start(): match.start() + end.end()]


def code(text: str) -> str:
    """Strip `//` comments, so prose about a call is not mistaken for one."""
    return "\n".join(line.split("//", 1)[0] for line in text.splitlines())


def test_full_redraw_reads_before_it_writes() -> None:
    body = code(function_text("wbRenderNavigator"))
    # One write of the SVG's children, of a fragment built off the document,
    # never an append per item between the size reads.
    assert "svg.append(" not in body
    assert "createDocumentFragment" in body
    assert body.count("replaceChildren(") == 1
    assert body.index("wbNavigatorSnapshot(") < body.index("replaceChildren(")
    snapshot = code(function_text("wbNavigatorSnapshot"))
    for write in ("append(", "setAttribute(", "classList", "replaceChildren("):
        assert write not in snapshot


def test_pan_frame_moves_the_rectangle_and_does_not_redraw() -> None:
    frame = code(function_text("wbZoomFrameWork"))
    assert "wbNavigatorUpdateViewport(" in frame
    assert "wbRenderNavigator(" not in frame
    handler = code(function_text("handleWbZoom"))
    assert "wbRenderNavigator(" not in handler
    assert "requestAnimationFrame(wbZoomFrameWork)" in handler
    update = code(function_text("wbNavigatorUpdateViewport"))
    # No measurement of the board's items on a pan frame.
    assert "wbContentBounds(" not in update
    assert "wbItemBBox(" not in update
    assert "getBoundingClientRect" not in update


def test_a_render_marks_the_overview_stale() -> None:
    assert "wbNavState.stale = true" in code(function_text("renderWhiteboard"))


def test_frame_reads_the_canvas_size_before_it_writes() -> None:
    frame = code(function_text("wbZoomFrameWork"))
    read = frame.index("clientWidth")
    for write in ("wbSyncGridToTransform(", "wbCullNow(", "wbNavigatorUpdateViewport("):
        assert read < frame.index(write), f"{write} runs before the size read"
    assert "wbCullNow(t, size)" in frame
    assert "wbNavigatorUpdateViewport(t, size)" in frame
