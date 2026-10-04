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
