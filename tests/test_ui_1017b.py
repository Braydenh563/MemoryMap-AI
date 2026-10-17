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
    dash = frontend_text("dashboard.js")
    assert "async function renderGetStarted(" in dash
    assert 'id="dash-start"' in INDEX
    assert INDEX.index('id="dash-start"') < INDEX.index('id="dash-customise"')
    notif = frontend_text("notifications.js")
    assert "firstStepsBellRow" in notif
