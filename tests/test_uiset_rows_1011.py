"""Settings, themes and UI system rows built by uiset (OPEN ledger 1387 to
1490; docs/roadmap/agent-remaining/uiset-1011.md has each row's evidence).
Each is a one-line change; these hold them."""

from __future__ import annotations

import re
from pathlib import Path

from tests._app_js import frontend_text

ROOT = Path(__file__).resolve().parents[1]


def _css(name: str) -> str:
    return (ROOT / "frontend/css" / name).read_text(encoding="utf-8")


def _fn(text: str, name: str) -> str:
    start = text.index(f"function {name}(")
    return text[start : text.index("\n}\n", start)]


def test_1400_a_worded_small_button_is_named_by_its_words():
    body = _fn(frontend_text("app.js"), "smallButton")
    assert 'if (title && button.classList.contains("icon-only")) button.setAttribute("aria-label", title);' in body
    assert 'if (title) button.setAttribute("aria-label", title);' not in body


def test_1401_most_used_follows_a_write():
    body = _fn(frontend_text("notes-list.js"), "refreshEntries")
    assert 'if (typeof loadMostUsed === "function") loadMostUsed().catch(() => {});' in body


def test_1407_a_found_setting_lands_on_its_control():
    body = _fn(frontend_text("settings-find.js"), "openSettingRow")
    assert 'pick(el.closest(".setting-row"))' in body
    assert '[aria-checked="true"], [aria-pressed="true"], button:not([disabled])' in body


def test_1408_the_palette_learns_prefixes_at_half_weight():
    js = frontend_text("app-palette.js")
    assert "const picks = palettePrefixPicks(lowered);" in js
    body = _fn(js, "palettePrefixPicks")
    assert "typed.length < 2" in body and "n / 2" in body


def test_1419_a_help_popover_fades_out_before_it_goes_home():
    body = _fn(frontend_text("menus.js"), "wireHelpPopover")
    assert "afterMenuExit(panel, () => {" in body
    assert "clearTimeout(panel._exitTimer);" in body
    assert re.search(r"\.help-popover\.hidden,\s*\.action-menu\.hidden \{", _css("10-responsive.css"))


def test_1423_library_sections_keep_the_focus_ring_room():
    assert re.search(r"\.dash-body,\s*\.library-view-section \{\s*scroll-padding-block: var\(--ring-room\);", _css("08-consistency.css"))


def test_1424_the_jobs_poll_stops_when_signed_out():
    body = _fn(frontend_text("settings.js"), "refreshJobRuns")
    assert "if (!authToken()) {\n    clearTimeout(jobRunsTimer);\n    return;\n  }" in body
    assert "if (running && authToken()) jobRunsTimer = setTimeout(refreshJobRuns, 2000);" in body


def test_1461_an_empty_notebook_is_offered_its_notes_from_elsewhere():
    body = _fn(frontend_text("onboarding.js"), "renderOnboardingActions")
    assert '"ph:file-arrow-up Bring in your notes"' in body
    assert 'closeOnboarding(false);\n        openSettingsModal("data", "import-md");' in body
