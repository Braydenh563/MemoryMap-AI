"""A mind-map topic's controls: on the topic and on its bar, two presses at most.

INBOX 610 (the owner: resizing a topic, resizing its text and changing its
other features "with the individual nodes themselves and the popup tool
menus" was "unintuitive"). Measured by `scratchpad/ui-sweeps/
bm1005-nodetasks.js` on the base: 8 of 11 topic properties could not be set
in two presses (each was a select inside a door), the two grips floated above
the topic's top left and dragging "Aa" upwards made the text smaller. After:
every task in at most 2 (the text size in 1), one grip on the topic's bottom
right corner, 24px at 1440 and 390, Shift scales the text. The sweep is the
measurement; this pins the shape.
"""

from __future__ import annotations

import re
from pathlib import Path

from tests._app_js import frontend_text

ROOT = Path(__file__).resolve().parents[1] / "frontend"


def _html() -> str:
    return (ROOT / "index.html").read_text(encoding="utf-8")


def _css() -> str:
    return (ROOT / "css" / "07-whiteboard-misc.css").read_text(encoding="utf-8")


def _body(file: str, name: str) -> str:
    text = frontend_text(file)
    start = text.index(f"function {name}(")
    nxt = re.search(r"\n(?:async )?function ", text[start + 10 :])
    return text[start : start + 10 + (nxt.start() if nxt else len(text))]


def test_the_text_size_is_on_the_bar_not_behind_the_text_door():
    html = _html()
    size = html.index('id="wb-map-text-size"')
    door = html.index('id="wb-map-text-menu"')
    strip = html.index('id="wb-map-strip"')
    assert strip < size < door, "the size select sits on the bar, before the Text door"
    assert '<span class="wb-map-bar-size">' in html[strip:size]


def test_every_select_on_the_bar_is_drawn_as_a_row_of_presses():
    wire = _body("whiteboard-map.js", "wbWireMapChoices")
    assert 'querySelectorAll("#wb-map-strip select")' in wire
    assert "wbMapSizeStepper(select)" in wire and "wbMapPickRow(select)" in wire
    row = _body("whiteboard-map.js", "wbMapPickRow")
    # INBOX 665: previews, never a pill well, and the select stays the
    # control: a press sets it and fires its change, so no listener has to know.
    assert '"seg' not in row and '"wb-map-picks"' in row and 'setAttribute("role", "group")' in row
    assert 'select.dispatchEvent(new Event("change", { bubbles: true }))' in row
    assert "aria-pressed" in row and "wbMapPickGlyph(select.id, option.value)" in row
    # "Follow the map" is the trailing reset, not a peer.
    assert "wb-map-pick-follow" in row and "wbMapIsFollow" in row
    stepper = _body("whiteboard-map.js", "wbMapSizeStepper")
    assert '"stepper wb-map-size-stepper"' in stepper and "stepper-unit" in stepper
    assert 'select.dispatchEvent(new Event("change", { bubbles: true }))' in stepper
    assert "wbWireMapChoices();" in _body("whiteboard.js", "initWhiteboard")
    # Redrawn whenever the strip syncs to a new topic.
    assert "for (const draw of WB_MAP_CHOICE_REDRAWS) draw();" in _body("whiteboard-map.js", "wbSyncMapStrip")
    # The follow rows are marked where they are named.
    assert "blank.dataset.follow" in _body("whiteboard-map.js", "wbSyncMapStrip")
    assert "blank.dataset.follow" in _body("whiteboard-map.js", "wbSyncMapFill")
    css = _css()
    assert ".wb-map-choices" not in css
    picks = css[css.index(".wb-map-picks {"):]
    assert "flex-wrap: nowrap;" in picks[: picks.index("}")]


def test_one_resize_grip_on_the_corner_and_shift_scales_the_text():
    js = frontend_text("whiteboard-map.js")
    assert "wb-map-size-grip" not in js and "wbMapStartSizeDrag" not in js
    assert "wb-map-grips" not in _css()
    drag = _body("whiteboard-map.js", "wbMapStartResizeDrag")
    assert "moveEvent.shiftKey" in drag and "font_size: font" in drag
    css = _css()
    rule = css[css.index(".wb-map-resize-grip {") :]
    rule = rule[: rule.index("}")]
    assert "inset: auto -12px -12px auto" in rule
    # One size to the hand at every zoom: the sheet writes the inverse zoom
    # onto it (tests/test_wb_navigator_cost.py keeps the list whole).
    assert "scale(var(--wb-inv-zoom))" in rule
