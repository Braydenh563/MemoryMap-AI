"""A Settings pane's own description is one line (standing order 6).

The pane's description is a `p.muted` standing directly in its section,
capped at 68ch by `.settings-section > p.muted` (07-whiteboard-misc.css),
which holds about 85 characters of prose (68 widths of a "0", wider than
the average letter), so "one line" is a character count a lint can hold.
INBOX 464 measured three panes over it at 1440 (scratchpad/ui-sweeps/paneintro.js): Tools at three
lines, Personas and Help at two. More than one line goes behind the pane's
'?' or into the group it is about.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "frontend" / "index.html"
#: Measured at 1440: the longest one-line description is 84 characters
#: (Templates'); the shortest that wrapped was Personas' 101.
LIMIT = 88
#: An empty state's sentence is not the pane's description.
EMPTY_STATES = {"memory-empty"}


def _pane_descriptions():
    html = re.sub(r"<!--.*?-->", "", HTML.read_text(encoding="utf-8"), flags=re.S)
    for section in re.finditer(r'<section class="settings-section[^"]*" id="([^"]+)">(.*?)</section>', html, re.S):
        body = section.group(2)
        depth = 0
        # Only a <p class="muted"> at the section's own level: track <div>
        # and <details> depth so a group's line is not read as the pane's.
        for tag in re.finditer(r'<(/?)(div|details|p)\b([^>]*)>', body):
            closing, name, attrs = tag.groups()
            if name in ("div", "details"):
                depth += -1 if closing else 1
                continue
            if closing or depth != 0 or 'class="muted"' not in attrs:
                continue
            ident = re.search(r'id="([^"]+)"', attrs)
            if ident and ident.group(1) in EMPTY_STATES:
                continue
            end = body.index("</p>", tag.end())
            text = " ".join(re.sub(r"<[^>]+>", "", body[tag.end():end]).split())
            yield section.group(1), text


def test_a_pane_description_is_one_line():
    long = {f"{sid}: {text}": len(text) for sid, text in _pane_descriptions() if len(text) > LIMIT}
    assert not long, f"a Settings pane's description over {LIMIT} characters (one line; the rest behind its '?'): {long}"


def test_the_lint_finds_the_descriptions():
    found = dict(_pane_descriptions())
    assert "settings-tools" in found and "settings-personas" in found, found
