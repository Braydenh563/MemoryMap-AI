"""The nav history records arrivals, not a hidden tab's default section.

The owner, 2026-09-21 (INBOX 311): "when I load up the application, the
bottom nav history dropdown shows me being in the notes tab and having been
to the notes tab even when I havent moved from the dashboard".

Measured on a fresh load that never left the Dashboard
(`scratchpad/ui-sweeps/navhistory.js`): the stack was
`["notes:browse", "dashboard", "notes:browse"]` with the pin on the last
entry, because two boot steps set the Notes tab's default section while the
Dashboard was the tab on screen, and `showNotesSection` recorded each of them
as a visit. Back then walked to a place nobody had been.

The suite cannot see the DOM, so this file holds the shape instead: the
recording is guarded by the tab actually being on screen. The behaviour is
the sweep, 10 of 10.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")


def _show_notes_section() -> str:
    match = re.search(
        r"function showNotesSection\(.*?\n\}\n", SOURCE, re.S
    )
    assert match, "showNotesSection not found in app.js"
    return match.group(0)


def test_a_hidden_tabs_default_section_is_not_a_visit():
    body = _show_notes_section()
    assert "recordTabVisit(" in body, "showNotesSection should still record a real arrival"
    guard = re.search(
        r'if \(\(localStorage\.getItem\("activeTab"\)[^\n]*\) === "notes"\) \{\s*\n\s*recordTabVisit\(',
        body,
    )
    assert guard, (
        "showNotesSection must only record a visit when Notes is the tab on "
        "screen. Without the guard, initNotesSubtabs and the first loadEntries "
        "each push a Notes entry during boot, and the history claims you were "
        "somewhere you have never been."
    )


def test_the_stack_is_still_seeded_with_where_the_app_opened():
    assert re.search(
        r'recordTabVisit\(localStorage\.getItem\("activeTab"\) \|\| "dashboard", null\)',
        SOURCE,
    ), (
        "The boot seed must stay: without it the first tab clicked has nothing "
        "behind it and Back stays dead, which reads as a broken button."
    )
