"""The overnight quality pass's fixes (qa-1005), each pinned where it lives.

The numbers are measured in the browser by
`scratchpad/ui-sweeps/qa1005-polish.js` (one check per fix) and
`scratchpad/ui-sweeps/search1005-lazy.js` FIRST=1; these tests keep the
shapes those fixes depend on from being undone by a later edit.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend" / "js"
CSS = ROOT / "frontend" / "css"


def _rule(css: str, selector: str) -> str:
    start = css.index(selector + " {")
    return css[start : css.index("}", start)]


def test_a_note_cards_task_line_is_a_box_not_brackets():
    """'- [x] Beta invite list' was the card's own text, dash and brackets
    included (qa1005-polish.js `tasks`: 1 card, then 0, with 4 boxes)."""
    src = (JS / "notes-list.js").read_text(encoding="utf-8")
    body = src[src.index("function renderNoteText") : src.index("// The inline half")]
    assert r"/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/" in body
    assert 'item.className = "entry-task"' in body and "box.disabled = true" in body
    #: The break after the task stays in the text the next flush renders.
    assert 'buffer.push("");' in body
    css = (CSS / "01-forms-settings.css").read_text(encoding="utf-8")
    assert "min-height: 0" in _rule(css, ".entry-task > input:disabled")
    assert "line-through" in _rule(css, ".entry-task:has(> input:checked)")


def test_the_empty_states_atlas_offer_has_no_floating_rule():
    """Chat's, Notes' and Library's empty states drew `.help-atlas`'s popover
    rule as a short centred hairline (qa1005-polish.js `emptyrule`: 3 to 0)."""
    css = (CSS / "08-consistency.css").read_text(encoding="utf-8")
    rule = _rule(css, ":is(.chat-empty, #empty-message, #library-empty) > .help-atlas")
    assert "border-top: 0" in rule and "padding-top: 0" in rule


def test_a_reminders_actions_are_centred_on_its_first_line():
    """Centred on the whole row, the strip sat 11px low on a reminder with a
    linked note and the top of the time showed (qa1005-polish.js
    `reminders`: 6 rows to 0)."""
    css = (CSS / "08-consistency.css").read_text(encoding="utf-8")
    block = css[css.index("@media (hover: hover) and (min-width: 600px) {\n  /* The strip is centred") :]
    block = block[: block.index("\n}\n")]
    assert re.search(r"#reminder-groups li \.entry-meta \{\s*position: relative;", block)
    assert "right: 0;" in _rule(block, "  #reminder-groups li .entry-meta > .entry-actions")


def test_the_library_draws_its_view_switch_and_board_placeholders_before_data():
    """With `/library` and the boards' bundle held 3s, the Cards/Rows well had
    neither pressed and Boards & maps was blank (qa1005-polish.js `library`:
    0 and 0, then 1 pressed and 4 placeholders; dockgrammar621.js had read
    the unpressed well as a second segment style, skeletons.js the sub-tab as
    BLANK at 390)."""
    src = (JS / "library.js").read_text(encoding="utf-8")
    load = src[src.index("async function loadLibrary()") :]
    assert load.index("renderLibraryView();") < load.index('apiJson("/library")')
    assert 'if (typeof wbLeaveFullscreen !== "function") showSkeletons($("library-boards-grid"), 4);' in src


def test_the_notes_find_zone_is_never_narrower_than_its_controls():
    """Its 8rem basis let the zone shrink to 133px round 188px of controls:
    between 1100 and 1170 wide the Filter menu lay 40px under the sort select
    (qa1005-polish.js `dockoverlap`: 1 to 0; one row still at 1184 and 1200,
    the packaged window)."""
    css = (CSS / "08-consistency.css").read_text(encoding="utf-8")
    rule = _rule(css, '[data-dock-name="notes"] .dock-find')
    assert "flex: 1 1 8rem" in rule and "min-width: min-content" in rule
