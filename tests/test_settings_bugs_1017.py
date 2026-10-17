"""The owner's 2026-10-17 settings bugs (INBOX 904), one test per bug.

Source-level, in the style of the neighbouring `test_settings_*.py`: the suite
cannot see the DOM, so each test pins the cause the browser measurement found.
The measurement itself is named in the comment above each test.
"""

from __future__ import annotations

import re
from pathlib import Path

from _css_paths import CSS_FILES

ROOT = Path(__file__).resolve().parents[1]


def _css() -> str:
    text = "\n".join(p.read_text(encoding="utf-8") for p in CSS_FILES)
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)


def _rules(css: str):
    for match in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
        yield [s.strip() for s in match.group(1).split(",")], match.group(2)


# B60: Settings, Packages, the OCR row. `.settings-section label` sets
# `align-items: flex-start` for a wrapped caption; the language picker is a
# <label> too, so its "Reads in" caption sat 7px above the select's centre
# line (label centre y 2186, select centre y 2193 at 1440).
def test_b60_ocr_language_picker_centres_its_caption_in_settings():
    hits = [
        body
        for selectors, body in _rules(_css())
        if any(
            ".settings-section" in s and "ocr-engine-lang-wrap" in s and ":" not in s
            for s in selectors
        )
    ]
    assert hits, "no .settings-section .ocr-engine-lang-wrap rule"
    assert any("align-items: center" in body for body in hits)


def _fn(js_name: str, name: str) -> str:
    text = (ROOT / "frontend" / "js" / js_name).read_text(encoding="utf-8")
    start = text.index(f"function {name}(")
    end = text.index("\n}\n", start)
    return text[start:end]


# B65: with the backend up and no model chosen (0 options) or nothing in
# memory, "Use this model" and "Stop the model" were both enabled (probe:
# MODE=empty, apply.disabled false with 0 options; stop.disabled false with
# loaded null).
def test_b65_chat_model_buttons_follow_what_there_is_to_act_on():
    body = _fn("ai-tools.js", "renderChatModelPicker")
    assert re.search(r'chat-model-apply"\)\.disabled\s*=', body), "Use this model is never disabled"
    assert re.search(r'\bstop\.disabled\s*=', body) and '"chat-model-stop"' in body, "Stop the model is never disabled"
