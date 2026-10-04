"""INBOX 475: "there isnt much vertical spacing or gap between the popup agent
title and avatar and the input text box".

Two causes, measured at 1440x900 (scratchpad/ui-sweeps/palettegap.js): the
head had no bottom padding (the Find anything head, the other palette, has
`--space-4`), and it was a flex item of the card's height-capped column with
the default `flex-shrink: 1`, so the starters squeezed it and its 28px avatar
overflowed it. The avatar stood 5.4px above the field; it stands 21.2px now."""

import re
from pathlib import Path

CSS = Path(__file__).resolve().parent.parent / "frontend" / "css" / "07-whiteboard-misc.css"


def _rule(selector):
    text = CSS.read_text(encoding="utf-8")
    start = text.index(f"\n{selector} {{") + 1
    return text[start : text.index("\n}\n", start)]


def test_the_head_has_the_find_anything_bottom_padding():
    head = _rule(".command-palette-head")
    assert "padding: var(--space-3) var(--card-pad-x) var(--space-4);" in head
    finder = _rule(".finder-head")
    assert re.search(r"padding: var\(--space-4\) var\(--card-pad-x\);", finder)


def test_the_head_and_the_input_bar_never_shrink():
    assert "flex: 0 0 auto;" in _rule(".command-palette-head")
    assert "flex: 0 0 auto;" in _rule(".command-palette-bar")
