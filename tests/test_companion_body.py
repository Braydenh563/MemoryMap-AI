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


AV = (ROOT / "frontend" / "js" / "avatars.js").read_text(encoding="utf-8")


def test_a_walk_starts_and_stops_from_where_the_body_is() -> None:
    # The owner, 2026-10-11: "make sure no jolts to start or stop various
    # movemements". jolts.js read each part's box just before a class change
    # and just after: a walk's start moved a leg 5.5px and the head 4.8px in
    # one frame (the back leg's step begins half a beat in, the bob's lean
    # turns the body), and a walk cut short by the next moved the body 5.1px.
    # Every start and stop of a walk now goes through the blend, and the
    # blend reads the limbs as well as the body.
    parts = re.search(r'const NMB_BLEND_PARTS = "([^"]+)";', AV).group(1)
    for part in (".nm-buddy-char", ".nm-buddy-head", ".nmb-leg-l", ".nmb-leg-r", ".nmb-arm-l"):
        assert part in parts, part
    # Atlas's rigged arms ease on their own springs; a blend over them would
    # fight the rig.
    assert ":not(.atl-rigged, .atl-arm-probe)" in parts
    blend = _fn(AV, "nameMarkBuddyBlend")
    assert "querySelectorAll(NMB_BLEND_PARTS)" in blend
    walking = [m.start() for m in re.finditer(r'classList\.(add|remove)\("nmb-walking"\)', AV)]
    assert len(walking) == 4
    for at in walking:
        assert AV[at - 60 : at].rstrip().endswith("nameMarkBuddyBlend(buddy, () => buddy."), AV[at - 80 : at + 40]
    move = _fn(AV, "nameMarkBuddyMoveTo")
    assert 'const stop = () => buddy.classList.remove("nmb-poofing", "nmb-walking");' in move
    assert "nameMarkBuddyBlend(buddy, stop);" in move
    # A walk cut short in its landing squash: the next squash starts from it.
    squash = _fn(AV, "nameMarkBuddySquash")
    assert 'const was = nmb.squashAnim && char ? getComputedStyle(char).scale : "none";' in squash
    assert squash.index("const was") < squash.index("nmb.squashAnim?.cancel();")
    assert '{ scale: was === "none" ? "1 1" : was },' in squash


def test_every_act_and_walk_has_three_ways_and_never_the_last() -> None:
    # Brief 88 (d), the owner: "more atlas variations for each gesture,
    # movement, position, emotion and more". variety.js plays each act six
    # times and walks six times: each shows three or more different plays
    # and none is the same as the one before.
    vary = _fn(AV, "nameMarkBuddyVary")
    manners = re.search(r"const NMB_MANNERS = (\[.*\]);", AV).group(1)
    assert manners.count("rate:") >= 3
    assert "nameMarkBuddyPickVariant(NMB_MANNERS.length, nmb.manner?.[act] ?? -1)" in vary
    # The lean and the give are added over the act and run from nothing to
    # nothing, so they cannot jolt; not where they would show wrong.
    assert vary.count('composite: "add"') == 1 and vary.count("char.animate(") == 2
    # Never a rotate: that cancels the body's eased lean (`--nmb-tilt`).
    assert "rotate" not in vary[vary.index("const options") :]
    assert vary.count('[{ translate: "0px 0px" },') == 2 and vary.count('{ translate: "0px 0px" }], options)') == 2
    assert "nameMarkIdleQuiet()" in vary and "NMB_MANNER_STILL.has(act)" in vary
    for act in ("peek", "hide", "dangle", "onehand"):
        assert f'"{act}"' in AV[AV.index("const NMB_MANNER_STILL") :][:200]
    go = _fn(AV, "nameMarkBuddyGo")
    assert "nmb.stride = nameMarkBuddyPickVariant(NMB_STRIDES.length, nmb.stride ?? -1);" in _fn(AV, "nameMarkBuddyStride")
    # A walk and a float (Atlas's way about) each take one; a walk's travel
    # and its legs' beat change together.
    assert go.count("const beat = nameMarkBuddyStride();") == 2
    assert "* pace) / beat);" in go and "anim.playbackRate = beat;" in go
    # A move cut short in a float's lean eases out of it.
    move = _fn(AV, "nameMarkBuddyMoveTo")
    assert "const turn = leaning === null ? 0 : leaning - (Number.parseFloat(getComputedStyle(char).rotate) || 0);" in move
    assert move.index("const leaning") < move.index("nameMarkBuddyGo(") < move.index("const turn")
    assert 'rotate: `${turn}deg` }, { translate: "0px 0px", rotate: "0deg" }]' in move
    assert len(re.search(r"const NMB_STRIDES = \[([^\]]+)\];", AV).group(1).split(",")) >= 3
    # The pacer steps a paused loop at its own rate.
    assert "+ step * (anim.playbackRate || 1);" in _fn(AV, "nameMarkBuddyTempo")


@needs_node
def test_a_pick_is_never_the_last_one() -> None:
    script = _fn(AV, "nameMarkBuddyPickVariant") + """
let last = -1; const counts = [0, 0, 0];
for (let i = 0; i < 300; i += 1) { const v = nameMarkBuddyPickVariant(3, last); if (v === last) throw new Error('repeat'); counts[v] += 1; last = v; }
console.log(JSON.stringify(counts));
"""
    out = subprocess.run(["node", "-e", script], capture_output=True, text=True, timeout=30, check=True)
    assert min(json.loads(out.stdout)) > 60
