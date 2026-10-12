"""Brief 86 (b): Settings, Data, "Clear and forget".

Four rows, each saying what it removes and how much, each undoable from its
toast. The counts and the clears are driven in a real page by
`scratchpad/ui-sweeps/settingsclear86.js` (1440 and 390); here the source is
held to the contract the sweep cannot see. The server half (what a dismissal
is and how it is revived) is `tests/test_dismissed_suggestions_1011.py`.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend" / "js"
INDEX = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
DATA = (JS / "settings-data.js").read_text(encoding="utf-8")
SETTINGS = (JS / "settings.js").read_text(encoding="utf-8")

ROWS = {
    "clear-recents": "clear-recents-what",
    "clear-previews": "clear-previews-what",
    "clear-guide": "clear-guide-what",
    "clear-dismissed": "clear-dismissed-what",
}


def test_each_clear_names_its_button_and_the_line_that_says_how_much() -> None:
    for button, line in ROWS.items():
        assert f'id="{button}"' in INDEX and f'id="{line}"' in INDEX, button
        assert f'$("{button}")' in DATA and f'"{line}"' in DATA, f"{button} is not wired or painted"
    assert 'id="clear-help"' in INDEX and 'data-help-for="clear-help"' in INDEX, "help is data-help-for"


def test_the_counts_are_painted_when_the_data_pane_opens() -> None:
    assert re.search(r'name === "data"[\s\S]{0,500}ensureModule\("settingsData"\)\.then\(\(\) => \{\s*renderSettingsClear\(\);', SETTINGS)


def test_a_clear_that_removes_something_offers_the_way_back_for_ten_seconds() -> None:
    assert "offerUndo(" in DATA and "ms: 10000" in DATA
    assert "settingsHistoryAdd(change)" in DATA, "a clear is kept in Recent changes too"
    assert DATA.count("settingsClearDone(") >= 4, "recents, guide and dismissed go through the one shape (previews say why not)"
    # The previews are not a stored thing: the row says there is nothing to undo.
    assert "there is nothing to undo" in DATA


def test_no_row_is_a_button_that_does_nothing_when_nothing_is_there() -> None:
    assert "button.disabled = count === 0" in DATA
