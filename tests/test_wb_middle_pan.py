"""The middle button pans the board from anywhere, and only the drag moves it.

The owner (2026-09-24, from the desktop window): the middle-button pan
"jerks repeatedly to the left side of the screen until i let go". Two causes,
both measured by `scratchpad/ui-sweeps/midpanwheel.js`:

- a pressed wheel still sends wheel events (a rocked wheel is a horizontal
  tilt, repeated while held), and the board's plain-wheel pan moved the board
  for each one on top of d3-zoom's drag: 3300 to 3600px sideways over a 300px
  drag, whichever way the hand went;
- the item drags wrote their own d3-drag filter, which replaces d3's default
  `!event.button` rather than adding to it, so a middle press on a topic or a
  card dragged the item and the board never panned (0px of 200).

The browser half is the sweep; this pins the two guards in the source so a
later edit cannot drop either without a failing test.
"""

import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "frontend" / "whiteboard.js").read_text(encoding="utf-8")


def _function(name: str) -> str:
    start = SOURCE.index(f"function {name}(")
    return SOURCE[start : SOURCE.index("\n}\n", start) + 3]


def test_the_plain_wheel_stands_aside_while_the_middle_button_is_down() -> None:
    start = SOURCE.index('container.node().addEventListener("wheel"')
    body = SOURCE[start : SOURCE.index("{ passive: false }", start)]
    guard = body.find("(e.buttons & 4) === 4 || wbMidPanHeld")
    assert guard != -1, "the plain-wheel pan must ignore wheel events while the middle button pans"
    assert guard < body.index("translateBy"), "the guard must run before the wheel moves the board"


def test_the_middle_press_flag_is_set_by_the_autoscroll_guard() -> None:
    assert "let wbMidPanHeld = false;" in SOURCE
    toggle = SOURCE[SOURCE.index("const midPanClass = (on) =>") :][:200]
    assert "wbMidPanHeld = on;" in toggle, "the press and its release must drive the flag the wheel reads"


@pytest.mark.parametrize(
    ("event", "want"),
    [
        ({"type": "wheel", "ctrlKey": True, "buttons": 0}, True),
        ({"type": "wheel", "ctrlKey": True, "buttons": 4}, False),
        ({"type": "wheel", "ctrlKey": False, "buttons": 0}, False),
        ({"type": "mousedown", "button": 1, "buttons": 4}, True),
    ],
)
def test_the_zoom_filter_never_zooms_mid_pan(event: dict, want: bool) -> None:
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    import json

    script = (
        "let wbSpaceHeld = false; let wbMidPanHeld = false; globalThis.window = { currentTool: 'select' };\n"
        + _function("wbZoomFilter")
        + f"\nconsole.log(JSON.stringify(Boolean(wbZoomFilter({json.dumps(event)}))));\n"
    )
    out = subprocess.run([node, "-e", script], capture_output=True, text=True, check=True)
    assert json.loads(out.stdout.strip()) is want


def test_every_item_drag_takes_the_primary_button_only() -> None:
    """A d3-drag filter written here replaces d3's `!event.button`."""
    offenders = []
    for match in re.finditer(r"d3\.drag\(\)", SOURCE):
        chain = SOURCE[match.end() : match.end() + 4000]
        # The behaviour's own chain ends at its first `.on("start"`.
        chain = chain[: chain.find('.on("start"')] if '.on("start"' in chain else chain[:600]
        if ".filter(" not in chain:
            continue  # d3's default filter already refuses the middle button
        if "event.button" not in chain:
            line = SOURCE.count("\n", 0, match.start()) + 1
            offenders.append(line)
    assert offenders == [], f"d3.drag() filters without a button check at whiteboard.js lines {offenders}"
