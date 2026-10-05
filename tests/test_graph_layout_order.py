"""The hierarchy layouts take notes in any order (INBOX 579).

The owner's log: `TypeError: Cannot read properties of undefined (reading
'push') at layoutHierarchy`, on every switch to tree, radial or arc. A reply
listed ahead of the note it answers looked up its parent's child list before
that note's own turn had created it. Driven in a browser by
`scratchpad/ui-sweeps/graphlayoutorder.js` (3/3, and 0/3 on the old code);
this pins the shape so the lists cannot go back to being made lazily.
"""

from __future__ import annotations

from pathlib import Path

GRAPH = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "graph.js").read_text(encoding="utf-8")


def _layout() -> str:
    start = GRAPH.index("function layoutHierarchy(")
    return GRAPH[start : GRAPH.index("d3.hierarchy(", start)]


def test_every_child_list_exists_before_any_is_filled():
    body = _layout()
    seed = body.index("for (const node of nodes) children.set(node.id, []);")
    assert seed < body.index("children.get(parent.id).push(node)")


def test_a_reply_loop_hangs_off_its_category():
    assert "!replyLoops(node, byId)" in _layout()
