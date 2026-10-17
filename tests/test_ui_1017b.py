"""INBOX 904 (the owner's 2026-10-17 bug list), the UI rows: B01, B05, B76, B81.

The suite cannot open a browser, so these hold the shapes as text; the
measurements are in `scratchpad/ui-sweeps/ui1017-*.js`.
"""

from __future__ import annotations

from pathlib import Path

from tests._app_js import frontend_text

ROOT = Path(__file__).resolve().parent.parent
INDEX = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")


def test_b01_first_steps_stay_reachable_in_a_menu_and_the_bell():
    """A setup popup was closed by accident with no way back. The dashboard dock
    has a Get started menu and the bell's first row is the same checklist."""
    first = frontend_text("first-run.js")
    assert "function getStartedSteps(" in first
    assert "function getStartedItems(" in first
    assert "function firstStepsBellRow(" in first
    assert "async function renderGetStarted(" in first
    steps = first[first.index("async function renderFirstSteps(") :]
    assert steps.index("renderGetStarted();") < steps.index("firstStepsState()"), "drawn whether or not the card is"
    assert "renderFirstSteps(host, skip)" in frontend_text("dashboard.js")
    assert 'id="dash-start"' in INDEX
    assert INDEX.index('id="dash-start"') < INDEX.index('id="dash-customise"')
    notif = frontend_text("notifications.js")
    assert "firstStepsBellRow" in notif


def test_b05_connect_a_model_is_a_split_button_with_a_hide_row():
    """The caret half holds Hide these popups, the Settings preference, so the
    switch need not be found in Settings, Models."""
    status = frontend_text("status.js")
    body = status[status.index("function renderAiOfflineNotice(") :].split("\n}\n")[0]
    assert "aiOfflineSplit(link)" in body
    js = (ROOT / "frontend" / "js" / "offline-split.js").read_text(encoding="utf-8")
    split = js[js.index("function aiOfflineSplit(") :]
    assert "split-button-main" in split and "split-button-caret" in split
    assert "kebabMenu(" in split and "Hide these popups" in split
    hide = js[js.index("function hideAiOfflineNotices(") :].split("\n}\n")[0]
    assert '"hideOfflineNotice"' in hide and "Show them again" in hide
    css = (ROOT / "frontend" / "css" / "offline-split-lazy.css").read_text(encoding="utf-8")
    assert ".ai-offline-split" in css
