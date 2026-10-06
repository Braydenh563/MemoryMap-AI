"""A "?" inside a modal dialog opens its popover inside that dialog (INBOX 667).

The owner: "the quick note popup tooltip button doesnt work or show a popup".
`wireHelpPopover` moved every panel to `<body>`, and a `showModal()` dialog is
in the browser's top layer, above the whole document and inert outside, so a
"?" in the Quick note opened its help underneath the dialog. Measured by
`scratchpad/ui-sweeps/quicknotehelp.js`: topmost-at-centre false before, true
after; the first Escape now closes only the help.
"""

import re
from pathlib import Path

from tests._app_js import app_js_text

ROOT = Path(__file__).resolve().parent.parent


def _open_body() -> str:
    text = app_js_text()
    start = text.index("function wireHelpPopover(")
    return text[start : text.index("placeHelpPopover(panel, trigger);", start)]


def test_the_popover_escapes_into_the_open_dialog_not_body():
    body = _open_body()
    assert 'trigger.closest("dialog[open]") || document.body' in body
    assert not re.search(r"^\s*document\.body\.appendChild\(panel\)", body, re.M)


def test_the_first_escape_in_a_dialog_closes_only_the_help():
    text = app_js_text()
    handler = text[text.index("event.helpPopoverSpent = true") :][:600]
    assert 'closest("dialog[open]")' in handler and "event.preventDefault()" in handler


def test_the_dialogs_with_a_help_button_exist():
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    dialogs = [
        m.group(1)
        for m in re.finditer(r'<dialog\b[^>]*id="([^"]+)"(.*?)</dialog>', html, re.S)
        if "data-help-for" in m.group(2)
    ]
    assert "quick-note" in dialogs
