"""The quick sketch, a little more modern (INBOX 620).

The owner: "can you also improve and modernise the quick sketch a little more
as well?? it is already mostly fine, maybe a bit more of a gap below the top
row title and close button". Measured with `scratchpad/ui-sweeps/sketch620.js`
at 1440, before: the toolbar 0px under the head row, a bordered card-white
panel with four drawn rules between its five groups, and the white ink dot
invisible on a white card. After: a step of space under the head, the toolbar
a borderless tint whose groups are told apart by space, and the white dot
ringed.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / "frontend" / "css" / "02-chat-graph.css").read_text(encoding="utf-8")


def _rule(selector: str) -> str:
    match = re.search(r"(?m)^" + re.escape(selector) + r" \{([^}]*)\}", CSS)
    assert match, selector
    return match.group(1)


def test_the_toolbar_has_room_under_the_head():
    assert "margin-top: var(--space-6);" in _rule(".sketch-toolbar")


def test_the_toolbar_is_a_borderless_tint():
    body = _rule(".sketch-toolbar")
    assert "border: 0;" in body
    assert "background: var(--field-inset);" in body


def test_the_groups_are_told_apart_by_space_not_rules():
    assert "border-left: 0;" in _rule(".sketch-toolbar .wb-tool-section + .wb-tool-section")


def test_the_white_and_black_ink_dots_are_ringed():
    match = re.search(r'\.sketch-color\[data-color="#f9fafb"\]:not\(\.active\),\n:root\[data-mode="dark"\] \.sketch-color\[data-color="#111827"\]:not\(\.active\) \{([^}]*)\}', CSS)
    assert match and "box-shadow: inset 0 0 0 1px var(--control-edge);" in match.group(1)
