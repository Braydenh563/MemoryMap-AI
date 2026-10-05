"""Highlights are text, not rows (BACKLOG section 109.4).

A highlight is `==words==` or `==colour|words==` inside a note or a document
(the Notes toolbar and the editor write both; `tests/test_highlight_colours.py`
pins the colour words). There is no table of them: the marks live in
`content`, so everything that wants them reads the text. This is the one
reader, shared by the search operator `has:highlight` and the Library's
Highlights chip, so the two cannot disagree about what a highlight is.
"""

from __future__ import annotations

import re

#: The colour words the toolbars write (`MD_COLOURS` in documents.js, pinned
#: against this list by `tests/test_highlights_collection.py`).
COLOURS = ("yellow", "green", "blue", "pink", "purple", "orange", "red", "grey")

#: One line, no space just inside either pair, so a stray `a == b` or a line of
#: `=====` is not one. A passage never holds `=`, which is what lets two marks
#: on one line be told apart.
HIGHLIGHT = re.compile(r"==(?!\s)[^\n=]+?(?<!\s)==")


def has_highlight(text: str | None) -> bool:
    return bool(HIGHLIGHT.search(text or ""))


def passages(text: str | None) -> list[str]:
    """The highlighted passages in a text, in order, without the colour word."""
    found = []
    for match in HIGHLIGHT.finditer(text or ""):
        words = match.group(0)[2:-2]
        head, bar, rest = words.partition("|")
        # `==red|text==`: a colour word, then the passage. A bar in a passage
        # with no colour word before it ("a|b") is the passage itself.
        found.append((rest if bar and head in COLOURS else words).strip())
    return [words for words in found if words]
