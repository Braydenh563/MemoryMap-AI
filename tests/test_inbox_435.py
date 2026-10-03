"""INBOX 435, the owner's mid-work reports, each pinned as measured.

* The AI status dot's "checking" glyph sat 3px off its centre (an ellipsis
  rides the baseline; a font-tuned translate missed on Windows): drawn by CSS
  now, 0.5px from the centre measured from pixels.
* The companion, perched on the status bar, drew over the AI status popup:
  a bar with an open popup steps above the companion's band (z 50).
* Settings, Models said "Can't reach the MemoryMap server" while the app ran:
  shown on a first open before the status answered and on a slow poll.
* A note nothing could file offers its likely categories as one-tap chips.
"""

from __future__ import annotations

from pathlib import Path

from tests._app_js import app_js_text

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / "frontend" / "css"


def test_the_checking_dot_is_drawn_and_centred_by_the_grid():
    shell = (CSS / "00-tokens-shell.css").read_text(encoding="utf-8")
    rule = shell[shell.index('.ai-status[data-level="idle"] .ai-status-dot {'):]
    rule = rule[: rule.index("}")]
    assert "radial-gradient(" in rule and "transform" not in rule
    assert 'translateY(-0.16em)' not in shell
    code = app_js_text()
    assert 'textContent = state.level === "idle" ? "" : AI_STATUS_GLYPH[state.level]' in code


def test_a_bar_with_an_open_popup_stands_above_the_companion():
    css = (CSS / "08-consistency.css").read_text(encoding="utf-8")
    at = css.index("#status-bar:has(.ai-status-wrap:hover")
    rule = css[at:css.index("}", at)]
    assert "header#top-bar:has(" in rule and "z-index: 51;" in rule
    assert "#nm-buddy-band {" in css and "z-index: 50;" in css[css.index("#nm-buddy-band {"):][:200]


def test_models_says_cannot_reach_only_when_the_server_is_down():
    code = app_js_text()
    render = code[code.index("function renderSettings() {"):]
    render = render[: render.index("\n}\n")]
    assert '"Checking the models…"' in render
    assert 'down: "Can\'t reach the MemoryMap server."' in render
    assert 'slow: "The model server is slow to answer. Checking again…"' in render
    poll = code[code.index("async function refreshModelStatus() {"):]
    poll = poll[: poll.index("\n}\n")]
    assert 'modelStatusProblem = up ? "error" : "down";' in poll
    assert '"TimeoutError"' in poll


def test_an_unfiled_note_offers_one_tap_categories():
    code = app_js_text()
    settle = code[code.index("function settleCaptureStatus(status) {"):]
    settle = settle[: settle.index("\n}\n")]
    assert "status.suggestions" in settle and "moveNotesToCategory([status.id], name)" in settle
    assert 'status.filed_by === "words"' in code


def test_the_needle_caveat_says_it_is_offline_and_nothing_is_asked():
    extras = (ROOT / "src" / "memorymap" / "core" / "extras.py").read_text(encoding="utf-8")
    assert "Runs offline, inside the app." in extras and "Nothing for you to do." in extras
