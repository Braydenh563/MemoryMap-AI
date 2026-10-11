"""Brief 100, the graph's feel (INBOX 802, 864, 865, and the owner
2026-10-11: "there is still no smooth transition loading up the app nd
viewing the graph, it kinda just appears after the page loads").

Measured with `scratchpad/ui-sweeps/graph100.js` (200 and 2,000 notes); these
tests hold the pure pieces by running them in node, and read the source for
the wiring a canvas hides from the lints."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
CANVAS = (ROOT / "frontend" / "js" / "graph-canvas.js").read_text(encoding="utf-8")

needs_node = pytest.mark.skipif(not shutil.which("node"), reason="needs node")


def _fn(name: str) -> str:
    found = re.search(rf"^(?:async )?function {name}\(.*?^\}}", CANVAS, re.S | re.M)
    assert found, name
    return found.group(0)


def _const(name: str) -> str:
    found = re.search(rf"^const {name} = .*?;$", CANVAS, re.M)
    assert found, name
    return found.group(0)


def _node(script: str) -> dict:
    out = subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True, timeout=30).stdout
    return json.loads(out)


@needs_node
def test_the_settled_map_is_kept_and_a_fresh_page_starts_from_it():
    script = "\n".join(
        [
            _const("GC_POS_KEY"),
            _const("GC_POS_MAX"),
            _fn("gcPositionsSig"),
            _fn("gcSavePositions"),
            _fn("gcCachedPositions"),
            """
let graphFocusModeId = null;
let shape = "organic";
const gcWorkerParams = () => ({ shape });
const store = new Map();
let blocked = false;
const localStorage = {
  getItem(k) { if (blocked) throw new Error("blocked"); return store.has(k) ? store.get(k) : null; },
  setItem(k, v) { if (blocked) throw new Error("blocked"); store.set(k, v); },
};
const s = { size: "full", tree: null, layoutSeed: 0, nodes: [{ id: 7, x: 10.4, y: -3.6 }, { id: 9, x: NaN, y: 1 }] };
gcSavePositions(s);
const back = gcCachedPositions(s);
shape = "clusters";
const otherShape = gcCachedPositions(s);
shape = "organic";
const pane = gcCachedPositions({ ...s, size: "pane" });
graphFocusModeId = 7;
const focused = gcCachedPositions(s);
graphFocusModeId = null;
blocked = true;
let threw = false;
try { gcSavePositions(s); gcCachedPositions(s); } catch (e) { threw = true; }
console.log(JSON.stringify({ back, otherShape, pane, focused, threw, blockedRead: gcCachedPositions(s) }));
""",
        ]
    )
    out = _node(script)
    assert out["back"] == {"7": {"x": 10, "y": -4}}, "a settled note is kept, a note with no place is not"
    assert out["otherShape"] is None, "positions settled under other forces are not reused"
    assert out["pane"] is None and out["focused"] is None, "only the tab's whole map is kept"
    assert out["threw"] is False and out["blockedRead"] is None, "a blocked store costs the head start, nothing else"


def test_the_cache_is_read_on_a_first_draw_and_written_at_rest():
    render = _fn("renderGraphCanvas")
    assert (
        'graphPendingViewPositions || (s.layoutKind === "force" && !prior.size ? gcCachedPositions(s) : null);'
        in render
    ), "a page's first force draw starts from the kept positions, through the saved-view path"
    end = CANVAS[CANVAS.index('} else if (message.type === "end") {') :]
    assert "gcSavePositions(s);" in end[:600], "the positions are kept when the layout comes to rest"


def test_the_map_arrives_over_a_fade_the_reader_can_see():
    reveal = _fn("gcReveal")
    assert 'opacity calc(var(--ui-slow) * 2) var(--ease-out)' in reveal
