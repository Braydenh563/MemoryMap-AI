"""A fitted graph is centred on what it draws, with even margins.

The owner, 2026-10-10, two screenshots: "this is my graph's fitted view and it
is a bit off" and "thats more fitted". `fitGraphToView` pads every dot by one
guess at a label, under or not; on 60 notes at 1440x900 the fitted drawing's
margins were left 318, right 351, top 96, bottom 80
(scratchpad/ui-sweeps/graphfitmargins.js). `gcBalanceFit` measures the drawn
dots, names and topic plates after a fit and sets the camera once so the
drawing is centred, at the fit's own margin on the axis that limits it:
after, 329 / 326 / 69 / 69 with a 69px target.
"""

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
JS = ROOT / "frontend" / "js"
CANVAS = (JS / "graph-canvas.js").read_text(encoding="utf-8")
GRAPH = (JS / "graph.js").read_text(encoding="utf-8")


def _function(text: str, name: str) -> str:
    start = re.search(rf"\nfunction {name}\(", text).start() + 1
    return text[start : text.index("\n}\n", start) + 2]


SCRIPT = "\n".join(
    [
        _function(GRAPH, "graphMinimapFinite"),
        _function(CANVAS, "gcBalanceFit"),
        """
const window = { matchMedia: () => ({ matches: false }) };
const gcVisibleAtTime = () => true;
let got = null;
const d3 = { zoomIdentity: { translate(x, y) { return { scale(k) { return { x, y, k }; } }; } } };
const run = (W, H, labels) => {
  // Dots from (0, 0) to (800, 400), r 6, at a camera off to one side.
  const nodes = [[0, 0], [800, 0], [0, 400], [800, 400], [400, 200]].map(([x, y]) => ({ x, y, r: 6 }));
  const t = { k: 1, x: 37, y: 11 };
  const svg = { interrupt() { return this; }, transition() { return this; }, duration() { return this; }, call(_f, v) { got = v; return this; } };
  const s = { size: "full", userZoomed: true, nodes, svg, zoom: { transform: null }, transform: t, dims: { w: W, h: H }, canvas: { style: { opacity: "0" } }, topicPlates: [] };
  got = null;
  gcBalanceFit(s, labels);
  const box = [-6, 806, -6, 406];
  for (const b of labels) { box[0] = Math.min(box[0], b.left); box[1] = Math.max(box[1], b.right); box[2] = Math.min(box[2], b.top); box[3] = Math.max(box[3], b.bottom); }
  // Names keep their screen size: their overhang in screen px is fixed.
  const oL = (-6 - box[0]) * t.k, oR = (box[1] - 806) * t.k, oT = (-6 - box[2]) * t.k, oB = (box[3] - 406) * t.k;
  const sx = (v) => v * got.k + got.x, sy = (v) => v * got.k + got.y;
  return { k: got.k, left: sx(-6) - oL, right: W - (sx(806) + oR), top: sy(-6) - oT, bottom: H - (sy(406) + oB), target: Math.min(W, H) * 0.09 };
};
// A name hanging 30px under the bottom-right dot and one 60px wide off the left.
const labels = [{ left: 760, right: 840, top: 412, bottom: 436 }, { left: -70, right: 10, top: 190, bottom: 210 }];
console.log(JSON.stringify({ wide: run(1400, 700, labels), tall: run(600, 1000, labels) }));
""",
    ]
)


@pytest.fixture(scope="module")
def balanced():
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    run = subprocess.run([node, "-e", SCRIPT], capture_output=True, text=True, timeout=60)
    assert run.returncode == 0, run.stderr
    return json.loads(run.stdout)


@pytest.mark.parametrize("shape", ["wide", "tall"])
def test_the_margins_are_even_on_both_axes(balanced, shape):
    m = balanced[shape]
    assert abs(m["left"] - m["right"]) < 1, m
    assert abs(m["top"] - m["bottom"]) < 1, m


@pytest.mark.parametrize("shape", ["wide", "tall"])
def test_the_limiting_axis_sits_at_the_fit_margin(balanced, shape):
    m = balanced[shape]
    limiting = min(m["left"], m["top"])
    assert abs(limiting - m["target"]) < 1, m


def test_every_fit_of_the_tab_arms_the_balance():
    body = GRAPH[GRAPH.index("\nfunction fitGraphToView(") : GRAPH.index("\nfunction applyGraphHighlight(")]
    assert "gcTab.fitCheck = 2;" in body
    assert '.on("end", balance)' in body
    assert "gcBalanceFit(s, placedLabels, left);" in CANVAS
