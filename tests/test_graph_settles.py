"""The graph at 5,000 notes settles and draws less (audit 2026-10-05, FE-04).

Measured before: 30 s after opening, the layout was still ticking (alpha
0.047 at about 24 s), `drawImage` was 7.8 s of a 32 s profile, and the tab
idled at 44% of the main thread. The browser half is
`scratchpad/ui-sweeps/fe1005-graph.js`; these hold the three changes.
"""

from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path

import pytest

JS = Path(__file__).resolve().parents[1] / "frontend" / "js"
WORKER = (JS / "graph-worker.js").read_text(encoding="utf-8")
CANVAS = (JS / "graph-canvas.js").read_text(encoding="utf-8")


def test_the_layout_ends_within_its_budget():
    loop = WORKER[WORKER.index("function loop()") :]
    loop = loop[: loop.index("\n}\n")]
    assert "Date.now() - settleFrom > SETTLE_BUDGET_MS" in loop
    assert re.search(r"settled = !dragging && \(.*overBudget\)", loop)
    run = WORKER[WORKER.index("function run()") :]
    assert run.index("settleFrom = Date.now()") < run.index("\n}\n")
    budget = int(re.search(r"const SETTLE_BUDGET_MS = (\d+);", WORKER).group(1))
    assert budget <= 20000


@pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")
def test_a_big_map_cools_in_fewer_ticks_and_a_small_one_is_unchanged():
    start = WORKER.index("const SETTLE_FULL_TICKS_UP_TO")
    end = WORKER.index("\n}\n", WORKER.index("function alphaDecayFor")) + 3
    script = (
        "const ALPHA_DECAY = 0.0228;\n"
        + WORKER[start:end]
        + "\nconst ticks = (d) => Math.ceil(Math.log(0.001) / Math.log(1 - d));"
        + "\nconsole.log(JSON.stringify([alphaDecayFor(300), ticks(alphaDecayFor(300)),"
        + " ticks(alphaDecayFor(5000)), ticks(alphaDecayFor(20000))]));"
    )
    out = subprocess.run(["node", "-e", script], capture_output=True, text=True, timeout=30)
    assert out.returncode == 0, out.stderr
    small_decay, small_ticks, big, huge = __import__("json").loads(out.stdout)
    assert small_decay == 0.0228 and small_ticks > 290
    assert big <= 121 and huge <= 121


def test_small_dots_are_batched_not_sprites():
    draw = CANVAS[CANVAS.index("const lodPaths = new Map();") :]
    draw = draw[: draw.index("s.lodNodes = lodNodes;")]
    assert "rWorld * pixelScale < GC_LOD_PX" in draw
    assert "ctx.fill(batch.path)" in draw
    # A sprite only for a node big enough to show its rim.
    assert draw.index("continue;") < draw.index("ctx.drawImage(")
    assert re.search(r"const GC_LOD_PX = \d+;", CANVAS)
