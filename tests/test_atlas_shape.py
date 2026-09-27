"""Atlas's round 6 shape, held (the owner's batch, 2026-09-27).

"the feminine atlas ... still has feet and legs. it shouldnt and its lower
body should be the feminie flowing whispy ribbons"; "the atlas character
chest stars ... should be faded constelations"; "fix and improve the arms";
"improve the nebular flow around the characters". Each is a small edit
away from coming back, and nothing else in the suite draws Atlas.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ATLAS = (ROOT / "frontend" / "atlas.js").read_text(encoding="utf-8")
CSS = (ROOT / "frontend" / "css" / "08-consistency.css").read_text(encoding="utf-8")


def _look(name: str) -> str:
    start = ATLAS.index(f"  {name}: {{", ATLAS.index("const ATLAS_LOOKS = {"))
    return ATLAS[start : ATLAS.index("\n  },\n", start)]


def test_the_feminine_look_has_no_legs_and_a_skirt_of_ribbons():
    feminine = _look("feminine")
    assert "legs: false," in feminine
    assert "skirt: \"M" in feminine
    assert feminine.count("{ seg: [[") >= 5 + 7  # five ribbons, and the hair's locks
    # No leg layers are built for a look without legs, and none is drawn.
    assert 'const legs = spec.legs !== false;' in ATLAS
    assert '...(legs ? ["leg-l", "leg-r"] : [])' in ATLAS
    assert "if (spec.legs === false) spec.legPaths = [];" in ATLAS
    # The ribbons end in soft points, not round caps.
    assert "fill: atlasStem(seg, ribbon(w), { samples: 14, cap: false })" in ATLAS


def test_the_skirt_sways_on_its_layer_root_only():
    # A transform animated inside an svg repaints it every frame; on the
    # layer's root it is the compositor's.
    for name in ("atl-skirt-idle", "atl-lower-sway", "atl-lower-flick"):
        assert f"@keyframes {name}" in CSS
        for rule in re.findall(r"([^{}\n]+)\{[^{}]*animation:[^;{}]*\b" + name + r"\b", CSS):
            assert ".atl-layer-lower" in rule, rule
    # The pose shapes the group inside, statically.
    assert '#nm-buddy[data-pose="sit"] .atl-figure .atl-lower { transform:' in CSS


def test_the_chest_is_a_faded_constellation_with_no_four_point_star():
    assert "atl-chest-star" not in ATLAS and "atl-chest-star" not in CSS
    assert "atl-core-rays" not in ATLAS and "atl-core-rays" not in CSS
    assert "constellationLines:" in ATLAS
    line = re.search(r"\.atl-const-line \{[^}]*opacity: ([0-9.]+)", CSS)
    assert line and float(line.group(1)) <= 0.2
    # Every star dimmer than full white.
    stars = re.search(r"constellation: \[(.*?)\],\n", ATLAS).group(1)
    for brightness in re.findall(r"\[[0-9.]+, [0-9.]+, [0-9.]+, ([0-9.]+)\]", stars):
        assert float(brightness) < 0.9


def test_the_arms_grow_from_inside_the_chest_and_end_in_a_mitten():
    arm = re.search(r"const ATLAS_ARM_R = atlasStem\(\[\[([0-9.]+), ([0-9.]+),", ATLAS)
    # Inside the torso's edge at the shoulder (the torso is 25.4 to 36.6 wide there).
    assert arm and float(arm.group(1)) < 36.6
    # Round 7: fuller at the shoulder, a forearm's swell, a slimmer wrist.
    assert "atlasLimbShaped(6.6, 2.3, 0.62, 0.4)" in ATLAS
    hand = ATLAS[ATLAS.index("const ATLAS_HAND_POINTS = [") :][:400]
    # No notch at the fingertips: the side values run one way round the end.
    tips = [float(v) for v in re.findall(r"\[4\.[0-9]+, (-?[0-9.]+)\]", hand)]
    assert tips == sorted(tips, reverse=True)


def test_the_nebula_is_one_orbit_split_into_a_far_and_a_near_half_that_drift_together():
    # Round 9 (the owner: "go around the whole figure including the hair and
    # not be mostly hidden by the hair and cosmic rings"): one helix, its far
    # span under everything, its near spans over the mane and the rings.
    assert "ATLAS_BAND_FRONT" not in ATLAS
    assert "const ATLAS_BAND = atlasBandPaths();" in ATLAS
    assert 'const names = ["neb", "back",' in ATLAS
    assert '"front", "neb-front", "fx-1"' in ATLAS
    assert 'atlasBand(layers["neb-front"].rig, id, "front");' in ATLAS
    # The single drawing puts the near half after the rings' near halves.
    single = ATLAS[ATLAS.index("function atlasDraw(size") :]
    assert single.index("atlasRing(rig, id, ring, k, true)") < single.index('atlasBand(rig, id, "front")')
    # Both halves on the one drift, so the ribbon never parts at a seam.
    drift = re.findall(r"([^{}\n]+)\{[^{}]*animation: atl-neb-drift", CSS)
    assert drift and all(".atl-layer-neb, .atl-layer-neb-front" in rule for rule in drift)
    # Held still under reduced motion.
    assert "&:is(.atl-layer-neb, .atl-layer-neb-front) { animation: none !important; }" in CSS
    # The halves meet where the ribbon turns edge-on (the pinch).
    assert "ATLAS_HELIX.near.reduce(" in ATLAS


def test_the_skirt_and_the_nebula_move_in_the_large_view_too():
    # The large view draws the layered figure (atlasFigure), so the loops
    # are written for every layered figure, not for #nm-buddy alone.
    for loop in ("&.atl-layer-lower { animation: atl-skirt-idle", "&:is(.atl-layer-neb, .atl-layer-neb-front) { animation: atl-neb-drift"):
        assert loop in CSS
    assert "#nm-buddy .atl-layer-neb" not in CSS


def test_round_8_hands_feet_hair_waist_and_nebula():
    # The owner's close-ups: shaped hands with a thumb and a finger split,
    # feet with a heel and a toe, no heavy outline ring, the feminine hair
    # growing out of the scalp, the torso flowing into the skirt, fuller and
    # longer middle wisps, a wider nebula.
    hand = ATLAS[ATLAS.index("const ATLAS_HAND_POINTS = [") :][:400]
    fwd = [float(v) for v in re.findall(r"\[([0-9.]+), -?[0-9.]+\]", hand)]
    assert max(fwd) <= 4.0  # no paddle: 4.45 long before
    assert "[3.55, 0.02]" in hand  # the split between the two finger lobes
    foot = ATLAS[ATLAS.index("const ATLAS_FOOT_POINTS = [") :][:300]
    assert "[2.35, -1.5]" in foot and "[3.0, 2.5]" in foot  # heel and toe, forward and a little out
    assert "pts.map(([fwd, side]) => [fwd, -side]).reverse()" in ATLAS  # the other foot joins its leg
    assert "ATLAS_SCALP_PARTS" not in ATLAS  # no fringe
    assert "stroke-width: 1.3; stroke-linejoin: round; stroke-linecap: round; opacity: 0.26;" in CSS
    assert 'if (spec.scalp && !tiny) atlasScalp(sway, id);' in ATLAS
    assert 'if (spec.lowers) torso.setAttribute("mask", `url(#${id}-waist)`);' in ATLAS
    feminine = _look("feminine")
    widths = [float(w) for w in re.findall(r"\]\], w: ([0-9.]+), specks", feminine)[:5]]
    assert widths[0] == widths[4] == 6.4 and min(widths[1:4]) >= 7.2, widths
    # Round 8's wider ribbon (8.8 across), kept by round 9's orbit.
    assert "const base = 0.5 + 8.4 * Math.sin(" in ATLAS


def _keyframes(name: str) -> str:
    start = CSS.index(f"@keyframes {name} {{")
    depth, i = 0, CSS.index("{", start)
    while True:
        depth += {"{": 1, "}": -1}.get(CSS[i], 0)
        if depth == 0:
            return CSS[start : i + 1]
        i += 1


def test_the_planets_orbit_on_the_compositor():
    # Round 7 (INBOX 430): "tilt the celestial rings a little; the bodies on
    # them slowly orbit, cheaply". A planet inside a layer's svg could only
    # move by repainting it; each is its own element over the figure, and
    # nothing its animations touch lays anything out.
    assert "ringFrame: { cx: 31, cy: 31, flat: 0.34, tilt: -11 }" in ATLAS
    assert "frag.appendChild(atlasOrbits());" in ATLAS
    assert "atlasRing(layers.front.rig, id, ring, k, true, true)" in ATLAS
    assert "if (orbit) return;" in ATLAS
    for name in ("atl-orbit", "atl-orbit-back", "atl-orbit-depth"):
        body = _keyframes(name).split("{", 1)[1]
        props = set(re.findall(r"([a-z-]+)\s*:", body))
        assert props <= {"rotate", "opacity"}, (name, props)
    # Off screen, on a hidden tab and under Reduce motion they stop.
    assert ":root[data-atlas-hidden] .atl-orbits *" in CSS
    assert ".nm-live > .atl-orbits :is(.atl-orbit-arm, .atl-orbiter) { animation: none !important; }" in CSS


def test_the_nebula_rises_above_the_crown():
    # Round 7: "a taller nebula stream"; round 9: from under the feet (92)
    # to over the crown (-12), a turn and a third round the axis.
    heights = re.search(r"const ATLAS_HELIX_Y = \[([^\]]+)\]", ATLAS)
    ys = [float(v) for v in heights.group(1).split(",")]
    assert ys[0] > 90 and ys[-1] < -8 and ys == sorted(ys, reverse=True)
    span = re.search(r"const ATLAS_HELIX = \{ from: ([0-9]+), to: ([0-9]+),", ATLAS)
    assert int(span.group(2)) - int(span.group(1)) >= 450


def test_the_body_and_its_limbs_read_as_one_figure():
    # Round 7 (INBOX 430): "less obviously built from separate shapes";
    # "redesign the masculine limbs". The legs root deep in the torso with a
    # calf, the body and every limb share one shade in the drawing's space,
    # and the torso's glow edge leaves out the hem the legs cover.
    for side in ("L", "R"):
        leg = re.search(rf"const ATLAS_LEG_{side} = atlasStem\(\[\[[0-9.]+, ([0-9.]+),.*?atlasLimbShaped\(([0-9.]+),", ATLAS)
        assert leg and float(leg.group(1)) <= 54 and float(leg.group(2)) >= 7
    assert ATLAS.count('class: "atl-overlay atl-rim-body", d }') == 3
    assert 'gradientTransform: "translate(30.5 50) scale(1 2.6) translate(-30.5 -50)"' in ATLAS
    assert "spec.torsoEdgeNow || torsoPath" in ATLAS


def test_the_feminine_ears_are_small_wings_and_her_icon_has_hair():
    # Round 9 (the owner: "make them angelic and fluffy"; "make the mini
    # atlas avatar on the atlas feminine version look better"): feathered
    # wings with a glow where thin fins read as horns, and at icon size a
    # silhouette of hair and a fringe where the mane is not drawn.
    feminine = _look("feminine")
    assert "earFeathers:" in feminine and "earGlow:" in feminine
    assert "tinyHair:" in feminine and "tinyFringe:" in feminine
    masculine = _look("masculine")
    assert "earFeathers" not in masculine and "tinyHair" not in masculine
    assert 'if (!spec.tinyHair) return null;' in ATLAS
    assert ".nm-atlas .atl-ear-feather {" in CSS and ".nm-atlas .atl-tiny-lock {" in CSS
