"""INBOX 883 and 884: the graph node panel's action row on a phone.

The owner: the buttons "wrap onto like 3 different rows when on phone", and
"i have no clue what the buttons do as I cant hover over them". The row is one
line of words plus a kebab where a finger is the pointer, and the icons-only
row where a tooltip can be read. DOM behaviour is measured by
`scratchpad/ui-sweeps/graphpopupphone.js`; these pin the source shape."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GRAPH = (ROOT / "frontend" / "js" / "graph.js").read_text(encoding="utf-8")
CSS = (ROOT / "frontend" / "css" / "07-whiteboard-misc.css").read_text(encoding="utf-8")
RESPONSIVE = (ROOT / "frontend" / "css" / "10-responsive.css").read_text(encoding="utf-8")


def _body(name: str) -> str:
    start = GRAPH.index(f"function {name}(")
    return GRAPH[start : GRAPH.index("\nfunction ", start + 10)]


def test_the_compact_row_is_two_worded_buttons_and_a_kebab() -> None:
    body = _body("renderGraphPopupActions")
    assert "GRAPH_POPUP_COMPACT" in GRAPH
    assert re.search(r'GRAPH_POPUP_COMPACT = "\(max-width: 599\.98px\), \(hover: none\)"', GRAPH)
    assert "kebabMenu(" in body, "the overflow is the app's one menu recipe"
    assert 'new Set(["open", "link"])' in body, "one or two actions keep a button"
    assert "ph:${a.icon} ${a.key" in body, "the shown buttons carry their word"


def test_every_action_has_a_word_and_a_title_in_one_list() -> None:
    body = _body("graphPopupActionList")
    keys = re.findall(r'key: "(\w+)"', body)
    assert keys == ["open", "similar", "trace", "grow", "focus", "link", "remind", "favourite", "bin"]
    assert len(re.findall(r"\bword:", body)) == 9 and len(re.findall(r"\btitle:", body)) == 9
    assert "danger: true" in body, "the bin stays the red row"


def test_the_compact_row_never_wraps() -> None:
    rule = re.search(r"\.graph-popup-actions\.is-compact \{([^}]*)\}", CSS)
    assert rule and "flex-wrap: nowrap" in rule.group(1)


def test_the_fab_does_not_float_over_the_panels_kebab() -> None:
    assert re.search(r"\.tab-page:has\(#graph-popup:not\(\.hidden\), #graph-new:not\(\.hidden\)\) > \.dock-fab \{\s*display: none;", RESPONSIVE)
