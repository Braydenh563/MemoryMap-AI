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


# B56: Settings, Appearance, every "Auto" showed only the word. The closed face
# must say what Auto resolved to (probe p/b56.js: density-seg shown "Auto" at
# 900px and at 600px tall).
def test_b56_every_auto_choice_says_what_it_resolved_to():
    text = (ROOT / "frontend" / "js" / "settings.js").read_text(encoding="utf-8")
    # In the lazy settings-controls.js: the boot budget has no room for it.
    body = _fn("settings-controls.js", "renderAutoChoices")
    for select in ("density-seg", "perf-mode", "progress-motion", "bg-motion", "atlas-look"):
        assert f'"{select}"' in body, select
    # drawn with the rest of Appearance, and again when the window is resized
    assert "renderAutoChoices()" in text.split("function renderAppearance", 1)[1]
    assert "renderAutoChoices" in text.split("DENSITY_SHORT.addEventListener", 1)[1][:400]


def test_b56_status_says_whether_the_chat_model_reads_as_small(client):
    body = client.get("/models/status").json()
    assert "chat_model_small" in body


def _run_node(script: str) -> str:
    import shutil
    import subprocess

    import pytest

    node = shutil.which("node")
    if node is None:
        pytest.skip("node is not installed")
    done = subprocess.run([node, "-e", script], capture_output=True, text=True, timeout=60, check=True)
    return done.stdout.strip()


def _js_function(path: str, name: str) -> str:
    src = (ROOT / "frontend" / "js" / path).read_text(encoding="utf-8")
    start = src.index(f"function {name}(")
    return src[start : src.index("\n}\n", start) + 3]


# B63: the dashboard hero's logo (#dash-hero-emblem) is not an EMBLEM_SLOTS
# slot, so a theme or colour change left its gradient on the old colours until
# a reload (probe p/b63.js: after applyAccent('crimson') the span's gradient
# stayed rgb(91, 124, 255)/rgb(79, 109, 245)/rgb(169, 39, 216)).
def test_b63_recolouring_the_brand_logo_redraws_the_dashboard_hero_mark():
    body = _js_function("phone-shell.js", "renderBrandLogo")
    assert "paintDashEmblem()" in body


# B57: pick an accent, then "Default": the app wore #4664f0 (the swatch's
# fallback hex) as an inline --accent instead of the palette's own (#2f5bd3 on
# the sandbox's palette, probe p/b57.js). "indigo" is the stored name of
# "Default", which means no accent at all, so nothing may be set inline.
def test_b57_default_accent_sets_no_inline_colour():
    import json

    src = (ROOT / "frontend" / "js" / "settings.js").read_text(encoding="utf-8")
    accents = src[src.index("const ACCENTS = [") : src.index("];", src.index("const ACCENTS = [")) + 2]
    script = (
        accents
        + "\nconst store = { accent: 'indigo' };"
        + "\nconst prefs = { get: (k, d) => (k in store ? store[k] : d) };"
        + "\nconst calls = [];"
        + "\nfunction applyCustomAccent(hex) { calls.push(hex); }"
        + "\nconst document = { documentElement: { dataset: {} } };\n"
        + _js_function("settings.js", "applyEffectiveAccent")
        + "\napplyEffectiveAccent();"
        + "\nconsole.log(JSON.stringify({ calls, data: document.documentElement.dataset.accent || null }));\n"
    )
    assert json.loads(_run_node(script)) == {"calls": [None], "data": None}


# B14: "Each settings page should have an expand and collapse all sections
# button at the top". Panes with two or more folds (Skills 2, Appearance 8,
# Shortcuts 3, Help 168 at probe p/b14.js) get one in their dock; a pane with
# one fold or none has nothing to expand all of.
def test_b14_a_pane_with_folds_gets_an_expand_all_button_in_its_dock():
    body = _js_function("settings-controls.js", "ensureSettingsFoldAll")
    assert "data-fold-all" in body or "foldAll" in body
    assert ".dock-actions" in body and "Expand all" in body and "Collapse all" in body
    shown = _js_function("settings.js", "showSettingsSection")
    assert "ensureSettingsFoldAll(" in shown


# B68: "Gemma4 26b is a4b". The pull tag stays gemma4:26b (a plain
# gemma4:26b-a4b would 404, model_manager.py's note), so the card's label and
# its purpose say what the model is: 26B of weights, about 4B active.
def test_b68_the_gemma4_26b_card_says_it_is_a4b():
    from tessellate.ai.model_manager import SUGGESTED_MODELS

    entry = next(m for m in SUGGESTED_MODELS["moe"] if m["name"] == "gemma4:26b")
    assert entry["label"] == "gemma4:26b (a4b)"
    assert "a4b" in entry["purpose"] and "12B-class" not in entry["purpose"]
    cards = (ROOT / "frontend" / "js" / "settings-models.js").read_text(encoding="utf-8")
    assert "model.label ||" in cards
