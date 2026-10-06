"""Every menu stays inside the window (INBOX 712).

One rule, `menuSidePlan` in menus.js: below the opener when the whole menu
fits, else above when it fits, else the roomier side with its height capped
and the list scrolling. The document editor's dock menu follows it and is
placed again when the window or its rows change; the generic menu open runs
it as its last step.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MENUS = (ROOT / "frontend/js/menus.js").read_text(encoding="utf-8")
NAV = (ROOT / "frontend/js/navigation.js").read_text(encoding="utf-8")


def test_one_rule_decides_the_side_and_the_cap():
    block = MENUS.split("function menuSidePlan(")[1].split("\n}\n")[0]
    below = block.index("need <= below")
    above = block.index("need <= above")
    capped = block.index("Math.max(120")
    assert below < above < capped


def test_the_dock_menu_uses_it_and_is_placed_again_on_resize_and_row_changes():
    place = NAV.split("function placeDockMenuInWindow(")[1].split("\n}\n")[0]
    assert "menuSidePlan(" in place
    assert "roomBelow < 240" not in place
    watch = NAV.split("function watchDockMenuPlacement(")[1].split("\n}\n")[0]
    assert '"resize"' in watch
    assert "MutationObserver" in watch
    assert "watchDockMenuPlacement(menu, list)" in NAV


def test_a_generic_menu_open_ends_by_fitting_the_window():
    opened = MENUS.split("function openActionMenu(")[1].split("\n}\n")[0]
    assert "fitActionMenuInWindow(menu, opener)" in opened
    assert "menu._fitCap" in opened
