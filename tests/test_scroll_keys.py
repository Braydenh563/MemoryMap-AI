"""The reading keys scroll the page that was just opened, and Settings
scrolls without redrawing two window-sized blurs (INBOX 426 u).

The owner: "keeps scroll jumping me between sections", "scrolling up and down
on the settings page is slow and laggy", "a lot of pages keep auto scrolling
or jumping". Measured (`scratchpad/ui-sweeps/keyscroll.js`): a Settings
section picked with the pointer left the focus on the nav, whose arrow keys
walk the sections, so three ArrowDowns from Appearance landed on Import &
export with the pane never moved; a tab picked with the pointer left the
focus on the tab strip, where ArrowDown and PageDown did nothing and Home and
End switched tabs. And with glass on, wheeling Settings drew 83 to 100ms
frames against 16.7 with its two blur passes gone
(`scratchpad/ui-sweeps/scrolljump.js`).

These hold the shapes; the sweeps measure them.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"


def _css() -> str:
    return "".join(
        re.sub(r"/\*.*?\*/", "", p.read_text(encoding="utf-8"), flags=re.S)
        for p in sorted((FRONTEND / "css").glob("*.css"))
    )


def test_a_pointer_picked_settings_section_hands_the_keys_to_the_pane() -> None:
    settings = (FRONTEND / "settings.js").read_text(encoding="utf-8")
    wiring = settings[settings.index("function focusSettingsPane"):]
    wiring = wiring[: wiring.index("\n}\n", wiring.index("for (const button"))]
    assert "focus({ preventScroll: true })" in wiring
    assert "if (event.detail > 0) focusSettingsPane();" in wiring
    html = (FRONTEND / "index.html").read_text(encoding="utf-8")
    assert '<div class="modal-content" tabindex="-1">' in html


def test_a_pointer_picked_tab_hands_the_keys_to_its_page() -> None:
    app = (FRONTEND / "app.js").read_text(encoding="utf-8")
    assert "if (event.detail > 0) focusTabPage(button);" in app
    body = app[app.index("function focusTabPage"):]
    body = body[: body.index("\n}\n")]
    # Only when the switch left the focus on the button: a tab that focuses
    # its own field on arrival keeps it.
    assert "if (document.activeElement !== button) return;" in body
    assert "focus({ preventScroll: true })" in body


def test_settings_draws_no_blur_behind_its_scrolling_pane() -> None:
    css = _css()
    for selector in (r"#settings-modal\.modal-overlay", r"#settings-modal > \.modal-card"):
        block = re.search(selector + r"\s*\{([^}]*)\}", css)
        assert block and re.search(r"(?<!-)backdrop-filter:\s*none", block.group(1)), selector
    card = re.search(r"#settings-modal > \.modal-card\s*\{([^}]*)\}", css).group(1)
    assert "var(--modal-bg-opaque)" in card
