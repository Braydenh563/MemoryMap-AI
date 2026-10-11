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


def test_a_job_run_writes_its_lines_to_the_app_log_under_its_run_id(caplog):
    """The history row's Logs button filters on "[run-N]" (owner 2026-10-11)."""
    import logging

    from memorymap.core import jobruns

    with caplog.at_level(logging.INFO, logger="memorymap.jobruns"):
        with jobruns.job_run("reindex", origin="you") as run:
            run.say("Reading notes")
    lines = [r.getMessage() for r in caplog.records]
    assert any(m.startswith(f"[{run.id}] ") and "Reading notes" in m for m in lines), lines
    assert any(m.startswith(f"[{run.id}] ") and "finished" in m for m in lines), lines


def test_the_logs_button_filters_on_the_run_and_an_empty_log_is_the_empty_state():
    js = frontend_text("settings.js")
    assert "`[${item.run_id}]`" in frontend_text("settings-controls.js")
    shared = _fn(js, "renderLogSharedUI")
    assert "This job wrote no log lines" in shared and '"log-none"' in shared
    html = (ROOT / "frontend/index.html").read_text(encoding="utf-8")
    assert re.search(r'id="logs-empty" class="empty-state hidden"', html)
