"""The Board menu's action rows close the menu when they are pressed.

Its `wb-menu-item` rows close it through the delegated listener in
`whiteboard.js`; the six action rows drawn as `ghost small` buttons inside a
`.wb-menu-row` (Export, Clear, Add to a note, Map to document, Copy app link,
Delete) did not, so the menu stood open over what they opened. At 390 wide the
menu (z-index 1020, fixed) covers the middle of the dialog or the note picker
(z-index 1010) the row had just opened, and the picker's first row could not be
pressed: Playwright reported the menu "intercepts pointer events"
(`scratchpad/ui-sweeps/noteobject.js`, W=390 PHONE=1). Rename and New board were
fixed the same way by taking the `wb-menu-item` class (see the listener's own
comment); these rows are a label and a button, so they carry `data-wb-closes`.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
WHITEBOARD = (ROOT / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")

#: Rows that do something once and are done with the menu. A switch or a
#: stepper in the same menu (grid size, the panels) must stay open, so this is
#: a list and not "every button in a row".
ACTION_ROWS = (
    "wb-export",
    "wb-clear-board",
    "wb-add-to-note",
    "wb-map-to-doc",
    "wb-copy-link",
    "wb-delete-board",
)


def _button(button_id: str) -> str:
    match = re.search(rf'<button[^>]*\bid="{button_id}"[^>]*>', INDEX)
    assert match, f"#{button_id} is not in index.html"
    return match.group(0)


def test_every_action_row_in_the_board_menu_says_it_closes_the_menu():
    for button_id in ACTION_ROWS:
        assert "data-wb-closes" in _button(button_id), f"#{button_id} leaves the Board menu open behind what it opens"


def test_the_delegated_listener_closes_the_menu_for_those_rows():
    listener = re.search(r'const item = e\.target\.closest\("([^"]+)"\)', WHITEBOARD)
    assert listener, "the Board menu's delegated click listener moved"
    assert ".wb-board-menu [data-wb-closes]" in listener.group(1)
