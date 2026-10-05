"""CHAT_PLAN, INBOX 63's open lines: the Capture foot counts words and
reading time, each Write with Atlas pane counts its words, the draft is set
in the body font, and Escape clears the Ask question. The browser half is
`scratchpad/ui-sweeps/ai1005-desk63.js`; this holds the wiring in place."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def test_the_capture_foot_counts_words_and_reading_time():
    js = _read("frontend/js/settings-wiring.js")
    assert "function captureCountText" in js and "min read" in js
    assert "character${" not in js
    assert ">0 words</div>" in _read("frontend/index.html")


def test_each_write_pane_has_its_own_count():
    html = _read("frontend/index.html")
    assert 'id="draft-thoughts-count"' in html and 'id="draft-count"' in html
    wiring = _read("frontend/js/wiring.js")
    listener = wiring[wiring.index('$("draft-thoughts").addEventListener("input"') :][:200]
    assert "updateDraftCount()" in listener


def test_the_draft_is_not_set_in_mono():
    css = _read("frontend/css/04-chat-dock-appearance.css")
    rule = re.search(r"#draft-text\s*\{([^}]*)\}", css).group(1)
    assert "mono" not in rule


def test_the_selection_menu_leaves_the_ask_question_alone():
    """An answer selects its question so typing replaces it; the selection
    menu read that as writing and opened over the sources (1 of 1 before)."""
    assert re.search(r'<input id="question"[^>]*\bdata-no-selection-popup\b', _read("frontend/index.html"))
    js = _read("frontend/js/selection.js")
    body = js[js.index("function fieldSelection()") :][:1400]
    assert "[data-no-selection-popup]" in body


def test_escape_clears_the_ask_question():
    js = _read("frontend/js/settings-wiring.js")
    handler = js[js.index('$("question").addEventListener("keydown"') :][:600]
    assert 'e.key === "Escape"' in handler and 'e.target.value = ""' in handler
