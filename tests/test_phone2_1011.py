"""INBOX 887 to 889 (the owner, on an iPhone in Safari): the keyboard covering the
chat input, the no-model notice, a pinch on the whiteboard that moved a note, and
the OCR workspace on a phone. Source ratchets; the measured numbers are in the
sweeps named in each docstring (`scratchpad/ui-sweeps/`)."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONT = ROOT / "frontend"


def _read(rel: str) -> str:
    return (FRONT / rel).read_text(encoding="utf-8")


def test_viewport_meta_asks_for_resizes_content_as_an_addition():
    """Chrome on Android resizes the layout with the keyboard; Safari ignores it, so
    the visualViewport code stays the mechanism that serves the iPhone."""
    html = _read("index.html")
    meta = re.search(r'<meta name="viewport" content="([^"]*)"', html)
    assert meta
    assert "width=device-width" in meta.group(1)
    assert "interactive-widget=resizes-content" in meta.group(1)
    assert "visualViewport" in _read("js/phone-shell.js")


def test_keyboard_inset_is_reread_on_focus_and_ignores_pinch_zoom():
    """kbinset.js: a keyboard that arrives with no resize event left the inset at 0
    (input 706 against 508 visible); a 2x pinch zoom wrote 422px as a keyboard."""
    js = _read("js/phone-shell.js")
    body = js[js.index("function initKeyboardInset()"):js.index("initKeyboardInset();\n")]
    assert "focusin" in body and "focusout" in body
    assert "viewport.scale" in body
    assert 'classList.toggle("keyboard-open"' in body


def test_no_model_notice_steps_aside_for_the_keyboard_and_aligns_its_action():
    css = _read("css/03-dashboard-widgets.css")
    block = css[css.index("/* A phone: the words and the close"):]
    block = block[:block.index("/* The Ask tab's answer foot")]
    assert "html.keyboard-open .chat-dock .ai-offline-note" in block
    assert "grid-area: 1 / 3 / 3 / 4" in block
    assert "margin-inline-start" in block
