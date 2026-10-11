"""A closed dock menu's list is `hidden` (TIMELINE_PLAN 10 row 1, 11 row 2).

A closed `<details>` still lays its content out, so the rows of a closed
menu sat over the controls under it for every probe: the timeline's folded
view segment past the right edge at 390, the reminder presets over the
Open, All and Done chips at 1440. navigation.js's one toggle handler keeps
`hidden` in step with `open`, and a pass at load hides the lists the markup
ships closed.
"""

from pathlib import Path

NAV = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "navigation.js").read_text(encoding="utf-8")


def test_the_toggle_handler_keeps_hidden_in_step_with_open():
    handler = NAV.split('document.addEventListener(\n  "toggle"', 1)[1].split("\n);", 1)[0]
    assert "list.hidden = !menu.open;" in handler
    # Shown before the placement code measures it.
    assert handler.index("list.hidden = !menu.open;") < handler.index("placeDockMenuInWindow")


def test_the_lists_the_markup_ships_closed_start_hidden():
    assert 'details.dock-menu:not([open]) > .dock-menu-list' in NAV
    assert "list.hidden = true;" in NAV
