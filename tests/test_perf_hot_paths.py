"""The hot paths INBOX 424's audit measured, held to the shape that fixed them.

The measurement itself lives outside the suite: a CDP CPU profile at 4x
throttle on a 400-note, 1,200-link, 250-object-board, 120-topic-map fixture,
one gesture per row (the perf harness the 424 audit wrote). The suite cannot
drive a pointer through a real layout, so what it holds here is the *shape*
each number came from: every rule below is one cost that reads as ordinary
code and only shows up under a profiler. If one fails, the question is "what
does this do per frame now", not "how do I word the rule differently".

    gesture at 4x CPU            the cost                      before   after
    graph node drag, 40 moves    graphMinimapPaint             1,502ms  514ms
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"


def _source(name: str) -> str:
    return (FRONTEND / name).read_text(encoding="utf-8")


def _body(source: str, name: str) -> str:
    """One top-level function's text, comment lines dropped.

    Crude on purpose: every function asked about is declared at the left
    margin, and the next left-margin `function` is where it ends. Comments go
    because they quote the very shapes the rules forbid, to say why.
    """
    match = re.search(rf"^(?:async )?function {re.escape(name)}\(", source, re.MULTILINE)
    assert match, f"{name} is gone; this lint is about its body"
    rest = source[match.end() :]
    end = re.search(r"^(?:async )?function \w+\(", rest, re.MULTILINE)
    body = rest[: end.start()] if end else rest
    return "\n".join(line for line in body.splitlines() if not line.lstrip().startswith("//"))


# --- 424b: the graph minimap during a layout ---------------------------------


def test_layout_ticks_queue_the_minimap_rather_than_paint_it() -> None:
    """A tick asks for a paint; the frame runs at most one."""
    canvas = _source("graph-canvas.js")
    graph = _source("graph.js")
    assert "graphMinimapTick % 8 === 0) graphMinimapQueuePaint();" in canvas
    assert 'if (s.size === "full") graphMinimapQueuePaint();' in canvas
    assert "graphMinimapTick++ % 8 === 0) graphMinimapQueuePaint();" in graph
    queue = _body(graph, "graphMinimapQueuePaint")
    assert "requestAnimationFrame(" in queue
    assert "graphMinimapCanShow()" in queue


def test_a_hidden_minimap_is_not_painted() -> None:
    """Switched off, on a hidden tab or in a hidden window: marked stale, not
    painted, and painted when the window comes back."""
    graph = _source("graph.js")
    can_show = _body(graph, "graphMinimapCanShow")
    assert "document.hidden" in can_show
    assert "GRAPH_MINIMAP_CORNER_KEY" in can_show and '"off"' in can_show
    assert 'getElementById("tab-graph")' in can_show
    assert "graphMinimapStale = true;" in _body(graph, "graphMinimapQueuePaint")
    assert 'addEventListener("visibilitychange"' in graph


def test_a_paint_moves_the_dots_it_has() -> None:
    """No fresh elements per paint once the count is right: the dots and lines
    are reused and an unchanged attribute is not written again."""
    paint = _body(_source("graph.js"), "graphMinimapPaint")
    assert "dots.replaceChildren(" not in paint
    assert "edgesGroup.replaceChildren(" not in paint
    assert 'graphMinimapChildren(dots,' in paint
    assert 'graphMinimapChildren(edgesGroup,' in paint
    assert "createElementNS" not in paint.split("const here")[0]
    assert "el[key] === value" in _body(_source("graph.js"), "graphMinimapSet")
