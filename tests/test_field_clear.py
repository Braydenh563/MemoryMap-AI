"""A Clear control on the boxes people type into (INBOX 466).

Capture (the note, its title and tags, staged files), Quick note, Ask, Chat's
composer and the popup agent's box each carry a quiet icon button, shown only
while the box holds something, whose Undo puts the words back. The logic is a
lazy piece (the boot scripts are at their gzip cap); the buttons are markup.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
JS = (ROOT / "frontend" / "js" / "field-clear.js").read_text(encoding="utf-8")
APP = (ROOT / "frontend" / "js" / "app.js").read_text(encoding="utf-8")

BUTTONS = {
    "capture-clear": "entry-content",
    "quick-note-clear": "quick-note-text",
    "ask-clear": "question",
    "chat-clear": "chat-input",
    "command-palette-clear": "command-palette-input",
}


def _button(ident: str) -> str:
    match = re.search(rf'<button[^>]*id="{ident}"[^>]*>.*?</button>', HTML, re.S)
    assert match, f"{ident} is missing from index.html"
    return match.group(0)


def test_every_box_has_a_quiet_labelled_icon_button_that_starts_hidden() -> None:
    for ident in BUTTONS:
        tag = _button(ident)
        assert 'aria-label="Clear"' in tag and 'title="Clear"' in tag
        classes = re.search(r'class="([^"]*)"', tag).group(1).split()
        assert {"ghost", "icon-only", "small", "field-clear", "hidden"} <= set(classes), ident
        assert "ph-eraser" in tag


def test_the_table_names_each_button_and_its_box() -> None:
    for ident, box in BUTTONS.items():
        assert f'button: "{ident}"' in JS
        assert f'"{box}"' in JS


def test_capture_clears_the_title_the_tags_and_the_staged_files_and_undo_returns_them() -> None:
    assert '["entry-content", "entry-title", "entry-tags"]' in JS
    assert "captureStagedFiles = []" in JS and "captureStagedFiles = [...files, ...captureStagedFiles]" in JS


def test_undo_is_the_toast_recipe_or_the_status_line_under_a_dialog() -> None:
    assert 'toastAction("Cleared.", "Undo", undo)' in JS
    # A modal dialog and the agent's overlay are drawn above the toasts.
    assert 'status: "quick-note-status"' in JS and 'status: "command-palette-status"' in JS


def test_undo_never_writes_over_what_was_typed_since() -> None:
    assert '"\\n\\n"' in JS and "Typed since" in JS


def test_escape_is_not_touched_and_the_piece_is_lazy() -> None:
    assert "Escape" not in JS.replace("Escape is not touched", "")
    assert re.search(r'fieldClear:\s*\["/js/field-clear\.js"\]', APP)
    assert '<script src="/js/field-clear.js' not in HTML, "it loads after boot, not as a boot script"


def test_the_capture_button_sits_in_the_boxs_own_foot() -> None:
    foot = re.search(r'<div class="note-composer-foot">(.*?)\n            </div>', HTML, re.S).group(1)
    assert 'id="capture-clear"' in foot and 'id="entry-count"' in foot
