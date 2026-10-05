"""WORLD_CLASS_PLAN row 31, item 99 (c): the AI dot's popup says what the last
answer cost: how long it took, which model, and how much of its context window
the prompt used. The line is built by one pure function, run here in node."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
STATUS = (FRONTEND / "js" / "status.js").read_text(encoding="utf-8")
CHAT = (FRONTEND / "js" / "chat-attach.js").read_text(encoding="utf-8")


def _function(source: str, name: str) -> str:
    start = source.index(f"function {name}(")
    depth, i = 0, source.index("{", start)
    while True:
        depth += 1 if source[i] == "{" else -1 if source[i] == "}" else 0
        i += 1
        if depth == 0:
            return source[start:i]


def test_the_line_names_time_model_and_context():
    node = shutil.which("node")
    if node is None:
        pytest.skip("node is not installed")
    code = _function(STATUS, "aiTurnLine") + """
console.log(JSON.stringify([
  aiTurnLine(null),
  aiTurnLine({ model: "llama3.2", elapsedMs: 2410, prompt: 3100, context: 8192 }),
  aiTurnLine({ model: "", elapsedMs: 900, prompt: 0, context: 0 }),
  aiTurnLine({ model: "qwen2.5:3b", elapsedMs: 61500, prompt: 500, context: 0 }),
]));"""
    out = subprocess.run([node, "-e", code], capture_output=True, text=True, timeout=30, check=True)
    none, full, bare, nocontext = json.loads(out.stdout)
    assert none == ""
    assert full == "Last answer: 2.4 s on llama3.2, using 3,100 of 8,192 tokens of context (38%)."
    assert bare == "Last answer: 0.9 s."
    assert nocontext == "Last answer: 61.5 s on qwen2.5:3b."


def test_the_popup_shows_it_and_a_finished_chat_turn_feeds_it():
    pill = _function(STATUS, "renderAiPill")
    assert "aiTurnLine(lastAiTurn)" in pill
    assert "function noteAiTurn(" in STATUS
    # The Chat tab reports each finished turn.
    assert "noteAiTurn({" in CHAT
