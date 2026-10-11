"""The companion's body: how its limbs and poses read (Brief 88).

The owner, 2026-10-11: "sometimes when I click on it, its arms which were
hanging at its side with a bit of an inner bend, just start rising (or the
one on its right does so its left arm) and it stays bent downwards, then
falls again." Measured in a browser by `scratchpad/ui-sweeps/clickarm.js`.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess

from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MOTION = (ROOT / "frontend" / "js" / "atlas-motion.js").read_text(encoding="utf-8")

needs_node = pytest.mark.skipif(not shutil.which("node"), reason="needs node")


def _fn(src: str, name: str) -> str:
    start = src.index(f"function {name}(")
    return src[start : src.index("\n}\n", start) + 2]


@needs_node
def test_a_raised_forearm_lifts_and_a_wave_holds_it_upright() -> None:
    up = re.search(r"^const ATLAS_EL_UP = .*;$", MOTION, re.M).group(0)
    script = up + "\n" + _fn(MOTION, "atlasRigGesture") + """
const arm = { side: "r" };
const waving = { classList: { contains: (c) => c === "nmb-act-wave" } };
const raises = []; for (let r = 0; r <= 180; r += 5) raises.push(r);
console.log(JSON.stringify({
  rest: atlasRigGesture(arm, 16, null)[0],
  level: atlasRigGesture(arm, 90, null)[0],
  steps: raises.map((r) => atlasRigGesture(arm, r, null)[0]),
  wave: [90, 102, 120, 146].map((r) => atlasRigGesture(arm, r, waving)[0]),
}));
"""
    got = json.loads(subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True).stdout)
    # Hanging, the small inward bend it rests with.
    assert 2 < got["rest"] < 6
    # Out level, the forearm turns up (negative), never down.
    assert got["level"] < -10
    # On the way up the bend never jumps: at most 4 degrees per 5 of raise.
    steps = got["steps"]
    assert max(abs(a - b) for a, b in zip(steps, steps[1:])) <= 4
    # A wave: the forearm about upright (raise minus bend near 175), never past it.
    for raise_, el in zip([90, 102, 120, 146], got["wave"]):
        assert el < 0 and 140 <= raise_ - el <= 176, (raise_, el)


AV = (ROOT / "frontend" / "js" / "avatars.js").read_text(encoding="utf-8")


def test_the_large_view_opens_on_its_resting_limbs() -> None:
    # The owner: "if it is hanging, the expanded companion kinda looks
    # awkward with both it's arms up". Measured (viewerpose.js): the arms
    # were still at 150 degrees 300 ms in; now at their float's places.
    visit = _fn(AV, "nameMarkBuddyVisit")
    cut = visit[visit.index("if (nmb.visit.pose !== nmb.pose) {") :]
    assert visit.index("host.appendChild(buddy);") < visit.index("if (nmb.visit.pose !== nmb.pose) {")
    assert "anim instanceof CSSTransition) anim.finish();" in cut
    assert "box.atlasRig.fresh = true;" in cut and "atlasRigWake(box);" in cut
