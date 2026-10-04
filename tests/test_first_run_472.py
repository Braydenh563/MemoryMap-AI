"""INBOX 472, the first-run walk: what a new person meets on a fresh notebook
with no AI, each item pinned as measured (scratchpad/first-run-472.md, the
sweeps `scratchpad/ui-sweeps/firstrun.js` and `firstrun2.js`).

The suite cannot open a browser, so these hold the shapes as text.
"""

from __future__ import annotations

from pathlib import Path

from tests._app_js import frontend_text

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / "frontend" / "css"


def _state_branch(js: str, title: str) -> str:
    at = js.index(f'title: "{title}"')
    start = js.rindex("return {", 0, at)
    return js[start : js.index("};", at)]


def test_no_ai_is_a_calm_off_state_not_a_warning():
    """The supported no-AI state drew an amber "!" (a 44px amber circle in
    the phone's top bar, the loudest thing on the first screen). It is
    level "off" now: the neutral chip colours and a drawn ring, the same
    "not running" mark Settings > Models uses, and the popup names where a
    model is connected."""
    js = frontend_text("status.js")
    for title in ("Everything works · AI off", "Everything works · chat AI off"):
        branch = _state_branch(js, title)
        assert 'level: "off"' in branch, title
        assert "Settings, Models" in branch, title
    glyphs = js[js.index("const AI_STATUS_GLYPH") :].split(";")[0]
    assert 'off: ""' in glyphs
    shell = (CSS / "00-tokens-shell.css").read_text(encoding="utf-8")
    rule = shell[shell.index('.ai-status[data-level="off"] {') :]
    rule = rule[: rule.index("}")]
    assert "var(--chip-bg)" in rule and "var(--muted)" in rule
    assert '.ai-status[data-level="off"] .ai-status-dot {' in shell


def test_the_start_tiles_draw_the_quick_access_tile_recipe():
    """The empty dashboard's start tiles drew their description at 600 and
    their label at 900 (a `strong` inside a 600 button), against 400 and
    600 on the Quick access tiles one row above."""
    css = (CSS / "05-sidebars-themes.css").read_text(encoding="utf-8")
    label = css[css.index(".start-step strong {") :].split("}")[0]
    note = css[css.index(".start-step .muted {") :].split("}")[0]
    assert "font-weight: 600;" in label
    assert "font-weight: 400;" in note and "var(--text-sm)" in note


def test_the_empty_dashboard_says_empty_once_and_in_sentences():
    """The hero said "Your notebook is empty, capture a thought to begin" and
    the card under it "Your notebook is empty, here's the whole idea": the
    same fact twice, each a comma splice."""
    js = frontend_text("dashboard.js")
    assert "Your notebook is empty," not in js
    assert '"How MemoryMap works"' in js


def test_every_library_empty_state_has_a_title_and_one_sentence():
    """Library, All on a new notebook put two bold sentences in the title;
    Bookmarks had a title and a button with no sentence between."""
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    assert 'id="library-empty-text"' in html
    bookmark = html.split('id="bookmark-empty"')[1].split("</div>")[0]
    assert bookmark.count("<p") == 2, bookmark
    js = frontend_text("library.js")
    assert "Nothing here yet. Make" not in js
    assert '"Nothing here yet"' in js


def test_the_setup_slide_is_short_and_offers_the_ai_setup():
    """The welcome's setup card stacked two marks, repeated the first card's
    privacy sentence, said "0.0 MB so far", and had no way from "Ollama
    isn't running" to where a model is connected."""
    js = frontend_text("settings-wiring.js")
    diag = js.split("async function loadOnboardingDiagnostics(")[1].split("\nfunction ")[0]
    assert "nothing here leaves this machine" not in diag
    assert "MB so far" not in diag
    offers = js.split("function renderOnboardingActions(")[1].split("\nfunction ")[0]
    assert 'openSettingsModal("models")' in offers and "!models.ollama_running" in offers
    slide = js.split("function renderOnboardingSlide(")[1].split("\nfunction ")[0]
    assert '$("onboarding-icon").classList.add("hidden")' in slide

