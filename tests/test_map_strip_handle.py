"""The topic strip keeps off the handle of the line into its own topic.

MINDMAP_PLAN §13b's remainder: measured by `scratchpad/ui-sweeps/
mapstripcover.js`, 4 of 48 handles were under the strip at 1440 before this
(a radial map's inner rings, a tree's last branch), 0 of 192 after at 1440,
1024, 820 and 390. The sweep is the measurement; this pins the shape, so the
placement cannot quietly lose its last step.
"""

from __future__ import annotations

import re

from tests._app_js import frontend_text


def _body(name: str) -> str:
    text = frontend_text("whiteboard.js")
    start = text.index(f"function {name}(")
    nxt = re.search(r"\n(?:async )?function ", text[start + 10 :])
    return text[start : start + 10 + (nxt.start() if nxt else len(text))]


def test_the_strip_placement_asks_where_the_handle_is():
    body = _body("wbUpdateSelectionBar")
    assert "wbMapStripClearOfHandle(" in body
    # Only for the map's strip, and not during a drag, where nothing about the
    # line moves against the bar and every frame's read would be waste.
    assert re.search(r"active === strip && !held\)\s*\{\s*\[left, y\] = wbMapStripClearOfHandle", body)


def test_it_reads_the_handle_of_the_line_into_the_topic():
    body = _body("wbMapStripClearOfHandle")
    assert '.wb-map-edge-handle[data-child="${node.id}"]' in body
    # Slides clear to either side, then under the topic, keeping the first
    # place when nothing fits.
    assert body.count("[hx0 - w, y]") == 1 and body.count("[hx1, y]") == 1
    assert "[left, under]" in body
