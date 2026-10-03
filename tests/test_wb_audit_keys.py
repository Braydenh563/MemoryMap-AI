"""The board's and the map's keys, as the INBOX 445 audit found them.

Four keys did two things or the wrong thing, each measured by driving the
real UI (`scratchpad/ui-sweeps/wbaudit.js`):

* M picked the highlighter *and* armed the app's "m" quick-nav chord, so the
  chord guide opened over the canvas, took the stroke's pointerup (the stroke
  was never saved), and the next tool letter was read as a destination.
* On a map, the letters of the board-only tools (R, P, M, T...) still picked
  those hidden tools, and I still pressed the hidden picture button.
* Escape inside a text box or sticky was stopped with every other key, so
  the caret stayed in the box and the next tool letter was typed into it.

These read the source because the behaviour lives in two listeners on
`document` in two files, and what has to hold is the handoff between them.
"""

from __future__ import annotations

import re
from pathlib import Path

JS = Path(__file__).resolve().parents[1] / "frontend" / "js"
WB = (JS / "whiteboard.js").read_text(encoding="utf-8")
WIRING = (JS / "settings-wiring.js").read_text(encoding="utf-8")


def _function_body(src: str, name: str) -> str:
    start = src.index(f"function {name}(")
    depth = 0
    for i in range(src.index("{", start), len(src)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                return src[start : i + 1]
    raise AssertionError(f"{name} has no closing brace")


def test_board_owns_bare_m_but_a_map_does_not():
    body = _function_body(WB, "wbOwnsChord")
    assert '=== "m"' in body
    assert "wbIsMap()" in body


def test_the_m_chord_steps_aside_for_the_board():
    arm = WIRING[WIRING.index('singleKeys && e.key === "m"') - 200 :]
    arm = arm[: arm.index("showTabJumpHint()")]
    assert "wbOwnsChord(e)" in arm


def test_a_map_never_picks_a_board_only_tool_by_key():
    dispatch = WB[WB.index("const mapped = (e.shiftKey && WB_TOOL_SHIFT_KEYS[letter])") :]
    dispatch = dispatch[: dispatch.index("selectWbTool(mapped)")]
    assert re.search(r"wbIsMap\(\)\s*&&\s*WB_BOARD_ONLY_TOOLS\.has\(mapped\)", dispatch)


def test_a_map_never_presses_a_board_only_action_key():
    block = WB[WB.index("if (WB_ACTION_KEYS[letter]) {") :][:600]
    assert 'data-wb-surface="board"' in block and "wbIsMap()" in block


def test_escape_leaves_a_text_box_selected_rather_than_typing_on():
    start = WB.index('content.on("keydown", function (event) {')
    handler = WB[start : WB.index('content.on("pointerdown"', start)]
    esc = handler[handler.index('event.key === "Escape"') :]
    assert esc.index("this.blur()") < esc.index("return;")
    assert 'selectWbItem("object", d.id)' in esc
