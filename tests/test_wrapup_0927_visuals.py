"""The small visual carry-overs in wrapup-0927.md (10c, 10, 8), measured in Chromium.

Each test pins the shape of the fix; the numbers are in the ledger entry.

* 10c(1): an escaped select list is at least its trigger's width. Before,
  ten of thirteen were narrower (Library "Items per page" 131.5px under a
  215.6px trigger); after, every list measured is its trigger's width or
  wider.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"


def _read(name: str) -> str:
    return (FRONTEND / name).read_text(encoding="utf-8")


def test_an_escaped_select_list_is_floored_at_its_trigger_width():
    menus = _read("menus.js")
    place = menus[menus.index("function wireEscapedActionMenu") :]
    floor = place.index('menu.classList.contains("select-menu")')
    # Written before the menu is measured, so the placement uses the floored width.
    assert floor < place.index("const box = menu.getBoundingClientRect();")
    assert "menu.style.minWidth = `${Math.min(anchor.width, innerWidth" in place
