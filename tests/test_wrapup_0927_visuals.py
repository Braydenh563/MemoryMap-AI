"""The small visual carry-overs in wrapup-0927.md (10c, 10, 8), measured in Chromium.

Each test pins the shape of the fix; the numbers are in the ledger entry.

* 10c(1): an escaped select list is at least its trigger's width. Before,
  ten of thirteen were narrower (Library "Items per page" 131.5px under a
  215.6px trigger); after, every list measured is its trigger's width or
  wider.
* 10c(2): a chip's leading icon sat 1.5px above the chip's centre (a flex
  child ignores `vertical-align`); nudged 0.1em down.
* 10c(3): the Web panel's "..." waited for the engine status call.
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


def test_a_chip_leading_icon_is_dropped_onto_its_words():
    """10c(2): icon ink centre minus the words' ink centre, Ask again chips:
    -1.84, -2.00, -0.84px before; -0.50, -0.66, +0.50 after (dark within 0.67)."""
    css = _read("css/08-consistency.css")
    assert ".chip > .ph-lead {\n  translate: 0 0.1em;\n}" in css


def test_the_web_panel_draws_its_menu_before_the_status_call():
    """10c(3): the "..." was built only after /websearch/searxng/status
    answered (44 to 108ms here, seconds while Docker answers); now it is
    built in the same task that opens the panel (visible in 5ms)."""
    chat = _read("chat.js")
    body = chat[chat.index("function toggleWebPanel") :]
    body = body[: body.index("\n}\n")]
    assert body.index("renderWebPanelMenu(webEngineInfo);") < body.index("refreshWebSearxngStrip();")
