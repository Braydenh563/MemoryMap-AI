"""A layout switch ends on the fitted view of the new layout.

The owner, 2026-10-10: "I went onto the radial view and it put me on a random
corner" and "same with the tree". Two causes, measured on 60 notes with
`scratchpad/ui-sweeps/graphviewswitch.js`:

1. A race. The switch clears the fit flag and re-renders; while `/graph` is
   fetched, the force simulation being replaced is still cooling, and its tick
   under alpha 0.08 spent the cleared flag on its own settle fit. The radial
   arrived with the flag set and skipped `frameTree`: its centre 541px left
   and 247px up of the view's, at the force's zoom. `renderGraphCanvas` now
   decides whether it frames before its first await.
2. The radial's box was padded 40px left and 160px right (a tree's labels sit
   to the right of its dots; a radial's are centred under them), so the ring
   sat 60px left of centre. Symmetric now.
"""

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
JS = ROOT / "frontend" / "js"
GRAPH = (JS / "graph.js").read_text(encoding="utf-8")
CANVAS = (JS / "graph-canvas.js").read_text(encoding="utf-8")


def _function(text: str, name: str) -> str:
    start = re.search(rf"\n(async )?function {name}\(", text).start() + 1
    return text[start : text.index("\n}\n", start) + 2]


def test_the_render_decides_to_frame_before_its_first_await():
    body = _function(CANVAS, "renderGraphCanvas")
    first_await = body.index("await ")
    decided = body.index("const reframe = !gcAutoFitDone(s)")
    assert decided < first_await
    # And the decision, not the flag a stale tick can spend, is what frames
    # both kinds of layout.
    assert "if (reframe || !gcAutoFitDone(s))" in body
    assert "if (reframe) gcSetAutoFitDone(s, false);\n    gcStartWorker(" in body


SCRIPT = "\n".join(
    [
        _function(GRAPH, "graphMinimapFinite"),
        _function(GRAPH, "frameTree"),
        """
let got = null;
const d3 = { zoomIdentity: { translate(x, y) { return { scale(k) { return { x, y, k }; } }; } } };
const svg = { transition() { return { duration() { return { call(_f, t) { got = t; } }; } }; } };
// A ring of twelve notes round (600, 400), every one at radius 150.
const ring = Array.from({ length: 12 }, (_, i) => ({
  x: 600 + 150 * Math.cos((i / 12) * 2 * Math.PI),
  y: 400 + 150 * Math.sin((i / 12) * 2 * Math.PI),
  depth: 1,
}));
frameTree(svg, { transform: null }, null, ring, 1400, 800, true, false);
const mid = { x: got.x + got.k * 600, y: got.y + got.k * 400 };
console.log(JSON.stringify({ k: got.k, mid }));
""",
    ]
)


@pytest.fixture(scope="module")
def framed():
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    run = subprocess.run([node, "-e", SCRIPT], capture_output=True, text=True, timeout=60)
    assert run.returncode == 0, run.stderr
    return json.loads(run.stdout)


def test_a_radial_is_centred_in_the_view(framed):
    assert abs(framed["mid"]["x"] - 700) < 1
    assert abs(framed["mid"]["y"] - 400) < 1
