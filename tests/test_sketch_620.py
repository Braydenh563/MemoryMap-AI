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


def test_the_bar_is_a_dock_with_no_group_labels_and_one_ink_chip():
    """INBOX 839: "improve and modernise/professionalise and make consistent the
    design of the quick sketch panel". The bar is the dock grammar: one
    `.dock-arrange` run of tools and a `.dock-actions` run, every name in a
    tooltip (no `.wb-tool-section-label`), the seven colours behind one chip.
    Measured at 1440: one row of 32px controls (21 controls at 28px and five
    labels before); at 390: 162px tall, 3 rows (326px, 5 rows before)."""
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    bar = html[html.index('<div id="sketch-toolbar"') : html.index('<input id="sketch-image-input"')]
    assert 'class="dock sketch-toolbar" data-dock-name="sketch"' in bar
    assert "wb-tool-section" not in bar
    assert 'class="dock-arrange sketch-tools"' in bar and 'class="dock-actions"' in bar
    chip = bar[bar.index('id="sketch-ink-chip"') :]
    assert chip.index('id="sketch-palette"') < chip.index('data-color="#3b82f6"')
    assert bar.count('class="sketch-color') == 7
    assert "min-height: 0;" in _rule("#sketch-overlay #sketch-palette .sketch-color")


def test_the_white_and_black_ink_dots_are_ringed():
    match = re.search(r'\.sketch-color\[data-color="#f9fafb"\]:not\(\.active\),\n:root\[data-mode="dark"\] \.sketch-color\[data-color="#111827"\]:not\(\.active\) \{([^}]*)\}', CSS)
    assert match and "box-shadow: inset 0 0 0 1px var(--control-edge);" in match.group(1)
