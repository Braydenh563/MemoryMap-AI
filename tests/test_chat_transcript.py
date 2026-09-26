"""The chat transcript: what it costs to draw, and what a reply looks like
(the 2026-09-26 chat pass, `scratchpad/ui-sweeps/chataudit.js`).

The numbers live in the sweep, which needs a browser; what these hold is the
shape that produced them, so a later change cannot quietly undo it.
"""

from __future__ import annotations

import re
from pathlib import Path

from tests._app_js import app_js_text

ROOT = Path(__file__).resolve().parents[1]
CSS = "\n".join(p.read_text(encoding="utf-8") for p in sorted((ROOT / "frontend" / "css").glob("*.css")))


def _function(source: str, name: str) -> str:
    start = source.index(f"function {name}(")
    return source[start : source.index("\n}\n", start)]


def test_a_reply_label_copies_the_emblem_rather_than_starting_a_sketch() -> None:
    """Opening a 150-turn chat took 939ms, 763ms of it in `renderEmblem`: a
    p5 instance per reply for the same pixels. Only the first reply of a key
    draws with p5; the rest copy its canvas (939 to 409ms measured)."""
    app = app_js_text()
    paint = _function(app, "paintPersonaAvatar")
    assert "paintChatEmblem(holder, size)" in paint
    assert "renderEmblem" not in paint, "the reply label builds a p5 sketch per bubble again"
    emblem = _function(app, "paintChatEmblem")
    assert emblem.count("renderEmblem(") == 1, "only the first of a key may draw with p5"
    assert "drawImage(source, 0, 0)" in emblem
    key = _function(app, "chatEmblemKey")
    for part in ("size", "currentAccentHex", 'appearancePref("motion")'):
        assert part in key, f"the copy is not keyed on {part}: a stale mark would be copied"


def test_a_code_block_in_an_answer_is_not_a_run_of_inline_chips() -> None:
    """`.msg.assistant .bubble-answer code` matched a fenced block's `code`
    too and out-ranked its reset, so every line wore an inline chip."""
    rules = re.findall(r"\.msg\.assistant \.bubble-answer ([^{]*)code \{", CSS)
    assert rules, "the answer's inline code rule is gone"
    for prefix in rules:
        assert ":not(pre) >" in prefix, "inline code styling reaches the code inside a <pre> again"
