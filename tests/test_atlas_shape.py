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
ATLAS = (ROOT / "frontend" / "js" / "atlas.js").read_text(encoding="utf-8")
CSS = (ROOT / "frontend" / "css" / "08-consistency.css").read_text(encoding="utf-8")
AVATARS = (ROOT / "frontend" / "js" / "avatars.js").read_text(encoding="utf-8")


def _look(name: str) -> str:
    start = ATLAS.index(f"  {name}: {{", ATLAS.index("const ATLAS_LOOKS = {"))
    return ATLAS[start : ATLAS.index("\n  },\n", start)]


def test_the_feminine_look_has_no_legs_and_one_spectral_tail():
    feminine = _look("feminine")
    assert "legs: false," in feminine
    # INBOX 535 (the Galaxy Seed Sower): no gown, no ribbons, one tail.
    assert 'lowerTaper: "sower",' in feminine and "skirt" not in feminine
    assert feminine.count("seg: [[") == 1 + 7 + 6 + 3  # the tail, the mane's locks, the head's locks, the astral wisps
    # No leg layers are built for a look without legs, and none is drawn.
    assert 'const legs = spec.legs !== false;' in ATLAS
    assert '...(legs ? ["leg-l", "leg-r"] : [])' in ATLAS
    assert "if (spec.legs === false) spec.legPaths = [];" in ATLAS
    # The tail is the hips down to their widest, then eases to a round end.
    assert "tip + (w - tip) * ((1 - t) / (1 - tHip)) ** 1.15" in ATLAS
    assert "fill: atlasStem(seg, width, { samples: 18, cap: true })," in ATLAS


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
    assert '"front", "neb-front", ...(spec.wisps ? ["wisps"] : []), "fx-1"' in ATLAS
    assert 'atlasBand(layers["neb-front"].rig, id, "front");' in ATLAS
    # The single drawing puts the near half after the rings' near halves.
    single = ATLAS[ATLAS.index("function atlasDraw(size") :]
    assert single.index("atlasRing(rig, id, ring, k, true)") < single.index('atlasBand(rig, id, "front")')
    # Both halves on the one drift, so the ribbon never parts at a seam.
    drift = re.findall(r"([^{}\n]+)\{[^{}]*animation: atl-neb-drift", CSS)
    assert drift and all(".atl-layer-neb, .atl-layer-neb-front" in rule for rule in drift)
    # Held still under reduced motion.
    assert "&:is(.atl-layer-neb, .atl-layer-neb-front), & .atl-mane, " in CSS
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
    # Round 9: the scalp became the hair's cap, drawn for both looks.
    assert 'if (!tiny && spec.cap) atlasHairCap(sway, spec);' in ATLAS
    assert 'if (spec.lowers) torso.setAttribute("mask", `url(#${id}-waist)`);' in ATLAS
    # INBOX 535: the tail is the hips (its width read off the torso's flank).
    assert 'lowerTaper: "sower",' in _look("feminine")
    assert "const torso = spec.torsoNow.match(" in ATLAS and "hipAt(atlasSegsAt(seg, t)[1])" in ATLAS
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



def test_secondary_motion_is_compositor_only_and_still_under_reduced_motion():
    # Round 9 (the owner: "secondary motion"): the tail and the orbit take a
    # second sway on a period of their own, on their layer roots; the mane
    # sways in the whole drawing only, never inside a companion layer.
    for name in ("atl-hair-flow", "atl-tail-flow", "atl-neb-flow"):
        body = _keyframes(name).split("{", 1)[1]
        assert set(re.findall(r"([a-z-]+)\s*:", body)) <= {"rotate", "translate"}, name
    # The second loops run on `.atl-lw` boxes, never on the `<svg>` roots:
    # Chromium does not composite `rotate` or `translate` for an svg root, so
    # each restyled the page every frame (companioncost.js, 108ms -> 7ms of
    # recalc per 2.6s idle).
    assert "& .atl-lw-neb, & .atl-lw-neb-front { animation: atl-neb-flow 7.7s" in CSS
    assert "& .atl-lw-tail { animation: atl-tail-flow 8.3s" in CSS
    assert "atl-idle-sway" in CSS.split("atl-lw-body[data-atlas-look=\"masculine\"]", 1)[1][:80]
    assert "&.atl-layer-tail { animation: atl-swish 5.4s ease-in-out var(--nm-delay) infinite; }" in CSS
    assert 'ATLAS_ROOT_BOXES = ["body", "tail", "lower", "leg-l", "leg-r", "neb", "neb-front", "wisps"]' in ATLAS
    for name in ("atl-idle-sway", "atl-idle-sway-soft", "atl-tail-flow", "atl-neb-flow"):
        assert not re.search(rf"&[^{{\n]*\.atl-layer[^{{\n]*\{{[^}}\n]*{name}", CSS), name
    assert "&.atl-full .atl-mane { animation: atl-hair-flow" in CSS
    assert "&.atl-layer :is(.atl-rig, .atl-blink.nm-blinks, .atl-sway, .atl-mane," in CSS
    assert "&:is(.atl-layer-neb, .atl-layer-neb-front), & .atl-mane, " in CSS



def test_leg_roots_sit_in_boxes_like_every_other_svg_root():
    # No shipped look draws legs (`legs: false`), so a look that does would
    # have brought back the cost the other roots' boxes removed, unseen:
    # `nameMarkBuddyLimbs` turns the legs by `rotate` and `scale`, which
    # Chromium never composites for an `<svg>` root (companionlegs.js, legs
    # switched on: a leap's 2s window 102ms and 59 recalcs, with the boxes
    # 60ms and 36). The leg roots get `.atl-lw-leg-*` boxes about the same
    # hip points as the root's own transform, and the limb gestures aim at
    # the boxes, never at a root.
    assert '"leg-l", "leg-r"' in ATLAS.split("const ATLAS_ROOT_BOXES", 1)[1].split("\n", 1)[0]
    assert ".atl-lw-leg-l { transform-origin: 27.4px 60px; }" in CSS
    assert ".atl-lw-leg-r { transform-origin: 34.6px 60px; }" in CSS
    assert "#nm-buddy .atl-figure.nmb-leg-l { transform-origin: 27.4px 60px;" in CSS
    assert "#nm-buddy .atl-figure.nmb-leg-r { transform-origin: 34.6px 60px;" in CSS
    limbs = AVATARS[AVATARS.index("function nameMarkBuddyLimbs") :]
    limbs = limbs[: limbs.index("\n}\n")]
    assert 'part(".nmb-leg:not(.atl-layer), .atl-lw-leg-l, .atl-lw-leg-r", move.leg,' in limbs
    assert 'el.matches(".nmb-leg-r, .atl-lw-leg-r")' in limbs
    assert 'part(".nmb-leg"' not in limbs and 'part(".atl-layer' not in limbs
    # The CSS loops that run on a leg root are `transform`, which an svg root
    # does composite; a `rotate`, `scale` or `translate` loop belongs on a box.
    names = re.findall(r"\.nmb-leg-[lr][^{}\n]*\{\s*animation:\s*([\w-]+)", CSS)
    assert {"nmb-step", "nmb-kick", "nmb-dangle"} <= set(names)
    for name in set(names):
        body = _keyframes(name).split("{", 1)[1]
        assert set(re.findall(r"([a-z-]+)\s*:", body)) <= {"transform"}, name


def test_the_feminine_chest_is_a_subtle_contour_in_light_not_lines():
    # Round 9 (the owner: "a bit more of a feminine chest but don't overdo
    # it just really subtle", then of two drawn arcs: "less ... like atlas is
    # wearing cup bikinis ... make it attractive and smooth"): a continuous
    # swell in the outline and radial light, never a stroke.
    feminine = _look("feminine")
    assert "C22.4 38.8 26.2 44.4 26.2 51" in feminine and "chestLight:" in feminine
    assert "bust:" not in feminine and "atl-chest {" not in CSS and "atl-bust" not in CSS
    assert "chestLight" not in _look("masculine")
    torso = re.search(r'torso: "([^"]+)"', feminine).group(1)
    assert torso.count("C") == 5  # two per flank and the hem: atlasTorsoEdge counts on it
    for part in ("glow", "shade"):
        rule = re.search(rf"\.nm-atlas \.atl-chest-{part} \{{([^}}]*)\}}", CSS)
        assert rule and "stroke" not in rule.group(1) and "fill: var(--atl-chest" in rule.group(1)




def _mood(name: str) -> str:
    start = CSS.index(f'.nm-atlas[data-atlas-mood="{name}"] {{')
    return CSS[start : CSS.index("}", start)]


def test_the_doze_is_restful_with_drifting_zs_and_a_night_cap():
    # Round 9 (the owner, of the sleepy face: "also what is this face", then
    # "more emotes like zzzz coming off it for sleeping, wearing a night
    # cap"): a soft lid at rest where a heavy shut arc was, a relaxed
    # mouth where a pursed "o" read as a kiss, less blush, three Zs that
    # drift on a slow loop, and a night cap that fades in with the doze.
    sleepy = _mood("sleepy")
    assert "--atl-doze: 1" in sleepy and "--atl-shut: 1" not in sleepy
    assert "--atl-m-rest: 1" in sleepy and "--atl-m-tinyo: 1" not in sleepy
    assert float(re.search(r"--atl-cheek: ([0-9.]+)", sleepy).group(1)) <= 0.2
    assert "--atl-nightcap: 1" in sleepy and "--atl-fx-zz: 1" in sleepy
    assert "function atlasNightcap(" in ATLAS and "atl-zf-${k}" in ATLAS
    body = _keyframes("atl-z-drift").split("{", 1)[1]
    assert set(re.findall(r"([a-z-]+)\s*:", body)) <= {"transform", "opacity"}
    # Lying down to sleep (the companion's `lie`) wears it too, and Appearance can take it off.
    # Lying or asleep sitting only; never upright (the owner: "goes to
    # sleep standing with a night cap").
    # Curled up asleep (`data-pose` curl-1, curl, avatars.js `nameMarkBuddyCurlUp`) wears the cap as sitting did.
    assert '#nm-buddy:is(.nmb-act-lie, :is([data-pose="sit"], [data-pose^="curl"]):is(.nmb-sleep, .nmb-act-nap)):not(.nmb-cap-off) .nm-atlas,' in CSS
    # Reduced motion: the Zs hold still.
    assert '& .atl-zf, &[data-atlas-mood="sleepy"].atl-layer-fx-1, &[data-atlas-mood="sleepy"].atl-layer-fx-2 { animation: none !important; }' in CSS



def test_the_feminine_silhouette_is_one_body_arms_and_hair_grown_from_it():
    # Round 9 (the owner: "the part at where the arms of feminine atlas
    # attach to her main body look disconnected"; "there's a little gap
    # between the large hair and the ears ... not look like a separate
    # shape"). The torso's paint over each arm root under a soft mask, with
    # the torso's light above the joins; every feminine lock rooted inside
    # the head outline (centre 31, 23, radius about 13), so no flat root end
    # shows; and the locks shaded darker at the scalp.
    assert 'mask: `url(#${id}-shoulders)`' in ATLAS and 'id: `${id}-shoulders`' in ATLAS
    assert '"atl-torso-light"' in ATLAS
    feminine = _look("feminine")
    for block in ("locks: [", "head: ["):
        part = feminine[feminine.index(block):]
        part = part[: part.index("],\n")]
        roots = re.findall(r"seg: \[\[(-?[0-9.]+), (-?[0-9.]+),", part)
        assert roots
        for x, y in roots:
            assert (float(x) - 31) ** 2 + (float(y) - 23) ** 2 < 13 ** 2, (block, x, y)
    assert 'class: "atl-overlay atl-hair-root"' in ATLAS and ".nm-atlas .atl-hair-root { fill: var(--atl-hroot); }" in CSS



def test_drowsy_droops_softly_rather_than_staring():
    # Round 9 (the owner: "the half lidded eyes look a little creepy"): the
    # lid's edge droops in an arc, the pupils are small and look down, the
    # mouth relaxes whatever the mood, and a blink lingers closed.
    start = CSS.index("#nm-buddy.nmb-drowsy .nm-atlas {")
    drowsy = CSS[start : CSS.index("}", start)]
    assert "--atl-softlid: 1" in drowsy and "--atl-m-rest: 1" in drowsy and "--atl-m-grin: 0" in drowsy
    assert "--atl-ps: 0.8" in drowsy and "--atl-py: 1.6px" in drowsy
    assert '"atl-skin atl-lid-soft"' in ATLAS and ".nm-atlas .atl-lid-soft { opacity: var(--atl-softlid); }" in CSS
    assert "#nm-buddy.nmb-drowsy .nm-atlas.atl-layer-lids { animation: atl-blink-heavy 7s" in CSS
    body = _keyframes("atl-blink-heavy").split("{", 1)[1]
    assert set(re.findall(r"([a-z-]+)\s*:", body)) <= {"opacity"}



def test_the_lean_hook_turns_the_body_and_the_head_follows_with_lag():
    # Round 9 (the owner: "tilt their body that way while still mostly
    # facing forward"): `data-lean="l"|"r"` on #nm-buddy, a figure box or a
    # drawing. The body turns about the feet, the head follows further, the
    # pupils slide, and the tail and the nebula lag and settle. Its own
    # variable, `--atl-lean-dir`, because `--atl-lean` is the pose's lean
    # in degrees and a shared name silently zeroed every part but the box.
    assert ':where(#nm-buddy)[data-lean="l"] :where(' in CSS and "{ --atl-lean-dir: -1; }" in CSS
    assert ':where(#nm-buddy)[data-lean="r"] :where(' in CSS and "{ --atl-lean-dir: 1; }" in CSS
    assert '.atl-figure-box[data-lean="l"], .atl-figure-box[data-lean="l"] :where(' in CSS
    assert '.nm-atlas[data-lean="l"], .nm-atlas[data-lean="l"] :where(' in CSS
    assert "rotate: calc(var(--nmb-lean-pose) + var(--atl-lean-dir) * 3.5deg);" in CSS
    assert "rotate(calc(var(--atl-tilt) + var(--atl-lean-dir) * 4deg))" in CSS
    assert "translate(calc(var(--atl-px) + var(--atl-lean-dir) * 0.8px), var(--atl-py))" in CSS
    assert ".nm-atlas.atl-layer-tail { translate: calc(var(--atl-lean-dir) * -1.4px) 0; transition: translate calc(var(--motion-slow) * 4.5)" in CSS
    # None of the lean's, the variant's or the pose's custom properties
    # inherits (companioncost.js, 2026-10-04): an inherited one restyled all
    # 528 descendants of #nm-buddy for each change of an attribute on it
    # (15 to 25ms each). The value is written on the elements that read it.
    for name in ("--atl-lean-dir", "--nmb-lean-pose", "--nmb-lie-shift", "--atl-v1", "--atl-v2", "--atl-chin",
                 "--atl-lean", "--atl-sx", "--atl-sy", "--atl-tail"):
        assert re.search(rf"@property {name} \{{[^}}]*inherits: false;", CSS), name
        assert f":root {{\n  {name}:" not in CSS, name
    # The readers of the lean: the head and pupils, which are deep in a
    # drawing, are written to directly.
    assert re.search(r'\[data-lean="l"\] :where\([^)]*\.atl-head, \.atl-pupil', CSS)



def test_every_mood_places_the_arms_per_look_in_three_variants():
    # Round 9 (the owner: "the positions of the limbs ... actually match the
    # mood", then "state variations, not the exact same ... each time").
    for look in ("masculine", "feminine"):
        for mood in ATLAS_MOOD_NAMES:
            if mood == "calm":
                continue
            rule = re.search(rf'\.nm-atlas\[data-atlas-look="{look}"\]\[data-atlas-mood="{mood}"\] \{{([^}}]*)\}}', CSS)
            assert rule, (look, mood)
            for k in range(3):
                assert f"--atl-ar{k}:" in rule.group(1) and f"--atl-al{k}:" in rule.group(1), (look, mood, k)
    # The variant hook is on #nm-buddy, a figure box or a drawing; its two
    # weights do not inherit, so they are written on the arms and the chin
    # hand always, and in a lying pose on what the lie rules turn.
    assert ':where(#nm-buddy)[data-atlas-variant="1"] :where(.nmb-arm-l, .nmb-arm-r, .atl-chin-hand)' in CSS
    assert ':where(#nm-buddy)[data-pose^="lie"][data-atlas-variant="1"] :where(.nm-figure, .atl-orbits,' in CSS
    assert "{ --atl-v1: 1; --atl-v2: 0; }" in CSS and "{ --atl-v1: 0; --atl-v2: 1; }" in CSS
    assert ".nm-atlas .nmb-arm-r { transform: rotate(calc(var(--atl-ar0) * (1 - var(--atl-v1) - var(--atl-v2))" in CSS
    # The chin hand is a variant's choice, not thinking's alone.
    assert "#nm-buddy:not([data-pose=\"hang\"], [data-pose=\"sit\"]) .nm-atlas .atl-chin-hand { opacity: var(--atl-chin); }" in CSS
    # `--atl-chin` is computed where it is read (the right arm and the hand).
    assert ".nm-atlas :where(.nmb-arm-r, .atl-chin-hand) {\n  --atl-chin: calc(" in CSS


def test_the_poses_four_numbers_pass_down_by_inherit_along_the_readers_path():
    # `--atl-lean`, `--atl-sx`, `--atl-sy` (read by `.atl-pose`, the root's
    # first child) and `--atl-tail` (read by `.atl-tail`, five levels down in
    # the tail's layer and in a whole drawing) do not inherit, so a pose, a
    # mood or an act writing them on a root restyles the groups on that
    # path and not 492 elements. A tail built into another layer would need
    # its own link here: `atlasBody` routes it to `layers.tail.rig`.
    assert ".nm-atlas .atl-pose { --atl-lean: inherit; --atl-sx: inherit; --atl-sy: inherit; }" in CSS
    assert ".nm-atlas:is(.atl-layer-tail, :not(.atl-layer)) :is(.atl-pose, .atl-mood, .atl-rig, .atl-edges, .atl-fills, .atl-tail) { --atl-tail: inherit; }" in CSS
    assert "tail: layers.tail.rig" in ATLAS
    # The viewer's ledge reads a `data-pose` the visit copies onto its figure:
    # a `:has(> #nm-buddy[data-pose])` made every pose change restyle 968
    # elements with the view closed.
    assert ":has(> #nm-buddy[data-pose" not in CSS.replace("`.nm-viewer-figure:has(> #nm-buddy[data-pose])`", "")
    assert '.nm-viewer-figure[data-pose="sit"] .nm-viewer-ledge { opacity: 1; }' in CSS
    # Hanging draws no bar (the owner, 2026-10-04: "a random highlight at the
    # top of the companion expanded popup"): the bar sat at a fixed 24px, behind
    # the head, while the hands' height changes with each character and act.
    assert '.nm-viewer-figure[data-pose="hang"] .nm-viewer-ledge' not in CSS
    visit = AVATARS[AVATARS.index("function nameMarkBuddyVisit"):]
    visit = visit[:visit.index("function nameMarkBuddyHome")]
    assert 'host.dataset.pose = buddy.dataset.pose || ""' in visit and 'attributeFilter: ["data-pose"]' in visit
    home = AVATARS[AVATARS.index("function nameMarkBuddyHome"):][:400]
    assert "visit.watch?.disconnect();" in home


def test_the_walks_tilt_and_way_do_not_inherit_either():
    # `--nmb-tilt` and `--nmb-lean` are written inline on #nm-buddy when a
    # walk starts; inherited, each write restyled all 528 descendants (28ms,
    # companionrecalcorder.js). Not inherited, they pass by `inherit` to the
    # one element that reads each, and the skirt's root is written to
    # directly: an `inherit` on the `.atl-lw-lower` box above it made an idle
    # companion restyle every frame (6 recalcs in 2s became 105), since that
    # box is the limb loops' target.
    for name in ("--nmb-tilt", "--nmb-lean"):
        assert re.search(rf"@property {name} \{{[^}}]*inherits: false;", CSS), name
    assert "#nm-buddy :is(.nm-buddy-face, .nm-buddy-char) { --nmb-tilt: inherit; --nmb-lean: inherit; }" in CSS
    assert "atl-lw-lower, .atl-layer-lower) { --nmb-lean: inherit" not in CSS
    way = AVATARS[AVATARS.index("function nameMarkBuddyWay"):][:420]
    assert 'buddy.style.setProperty("--nmb-lean", way);' in way
    assert 'querySelectorAll(".atl-layer-lower")' in way and 'el.style.setProperty("--nmb-lean", way)' in way
    # Nothing else writes the way straight onto the buddy.
    assert AVATARS.count('.setProperty("--nmb-lean"') == 2
    assert AVATARS.count("nameMarkBuddyWay(buddy,") == 4  # its definition and the three walks that set it


ATLAS_MOOD_NAMES = re.findall(r"^  (\w+): \{ words:", ATLAS[ATLAS.index("const ATLAS_MOODS = {"):], re.M)



def test_the_lie_down_and_curl_frames_are_hooks_with_the_stream_as_a_bed():
    # Round 9 (the owner: "when it sleeps can it lay down", "use the nebular
    # stream as ... a bed to lay on ... and transitions to and from that
    # state"): frames the companion plays in order, each eased.
    for pose in ("lie-1", "lie-2", "lie", "curl-1", "curl"):
        assert f'#nm-buddy[data-pose="{pose}"] .nm-figure {{ --nmb-lean-pose:' in CSS, pose
    # The stream turns back upright and flattens under the body.
    assert '#nm-buddy[data-pose="lie"] :is(.atl-layer-neb, .atl-layer-neb-front) { rotate: calc(84deg - 168deg * var(--atl-v1)); scale:' in CSS
    # Per look: sprawled with an arm behind the head, or curled with hands
    # under the cheek and the skirt drawn up.
    assert '#nm-buddy[data-pose="lie"] .atl-figure[data-atlas-look="masculine"] .nmb-arm-r { transform: rotate(-150deg); }' in CSS
    assert '#nm-buddy[data-pose="lie"] .atl-figure[data-atlas-look="feminine"] .nmb-arm-l' in CSS
    assert '#nm-buddy[data-pose="lie"] .atl-layer-lower { rotate: -42deg; }' in CSS
    # Variant 1 lies the other way round; the Zs and the rings stay upright.
    assert '#nm-buddy[data-pose="lie"] :is(.atl-layer-fx-1, .atl-layer-fx-2) { rotate: calc(84deg - 168deg * var(--atl-v1)); }' in CSS
    assert '#nm-buddy[data-pose="lie"] :is(.atl-layer-back, .atl-layer-front) { rotate: calc(84deg - 168deg * var(--atl-v1)); }' in CSS



def test_the_masculine_look_is_a_star_being_not_an_animatronic():
    # Round 9 (the owner: "it still looks like a fnaf character"): no pillar
    # legs, a torso tapering into nebula wisps, slim bent arms with small
    # mittens, softer eyes and a gentle idle sway.
    masculine = _look("masculine")
    assert "legs: false," in masculine and "lowers: [" in masculine
    assert "armWidth: [4.4, 1.8]," in masculine and "handScale: 0.9," in masculine
    arms = re.search(r"    arm: \[(\[[^\]]+\]), (\[[^\]]+\])\],", masculine)
    assert arms, "the arm bends: two segments"
    assert '.nm-atlas[data-atlas-look="masculine"] .atl-eye { scale: 0.9; }' in CSS
    assert '.atl-lw-body[data-atlas-look="masculine"] { animation: atl-idle-sway' in CSS
    body = _keyframes("atl-idle-sway").split("{", 1)[1]
    assert set(re.findall(r"([a-z-]+)\s*:", body)) <= {"rotate"}



def test_both_looks_wear_a_hair_cap_so_the_crown_is_not_bald():
    # Round 9 (the owner: "have the hair start a little on the head, not
    # have it look like a bald head with lots of hair coming from the back").
    for look in ("masculine", "feminine"):
        assert "cap: \"M" in _look(look), look
    # The centred parting went with the owner's "school girl vibes"; the
    # fringe's off-centre parting is in the cap's own edge (see the fringe
    # test), not a drawn line.
    assert "capPart" not in _look("feminine") and "atl-cap-part" not in ATLAS
    assert "function atlasHairCap(parent, spec)" in ATLAS
    # Over the head, under the ears, so the ears rise out of it.
    head = ATLAS[ATLAS.index("function atlasHead("):]
    assert head.index("atlasHairCap(sway, spec)") < head.index("const ears = atlasEars(sway, level, false, look);")
    # Round 8's fading scalp is gone with it.
    assert "function atlasScalp(" not in ATLAS and 'fade("scalp"' not in ATLAS


def test_the_feminine_hair_is_a_side_swept_fringe_not_a_cap():
    # Round 9 swept the strands back off the brow after "school girl vibes"
    # (a centre parting and two rounded curtains). INBOX 480 took away the
    # lit hairline and circlet that read as a headband, and then the owner
    # of the smooth dome left: "it still looks like she's wearing a night cap
    # :(". The cap's lower edge is now a fringe: parted off centre and swept
    # across the brow in three locks of different lengths, each ending in a
    # point, with the forehead showing in the notches between them. No
    # parallel strand lines, no arc for a hairline, and the star is small
    # and off centre, at the parting.
    feminine = _look("feminine")
    cap = re.search(r'cap: "([^"]+)"', feminine).group(1)
    nums = [float(v) for v in re.findall(r"-?[0-9.]+", cap)]
    ys = nums[1::2]
    # The lower edge dips and rises: lock tips at 17 and more, notches back
    # up to 15 and less between them (a cap's arc never rises again).
    edge = ys[ys.index(20.6) + 1:]
    dips = [y for y in edge if y >= 17]
    notches = [y for y in edge if y <= 15]
    assert len(dips) >= 3 and len(notches) >= 3, edge
    for gone in ("frontLocks:", "hairline:", "atl-strand-light", "atl-hairline-shade"):
        assert gone not in feminine and gone not in CSS, gone
    assert "fringeShade: \"M" in feminine and '"atl-fringe-shade"' in ATLAS
    x, y, k = (float(v) for v in re.search(r"browStar: \[([^\]]+)\]", feminine).group(1).split(","))
    assert abs(x - 31) >= 6 and k <= 1.2, "a small star off centre, an ornament at the parting, not a badge"
    for gone in ("rootDust:", "circlet:", "spec.rootDust", "spec.circlet"):
        assert gone not in ATLAS, gone
    # Static: the brow adds nothing to the motion budget.
    assert not re.search(r"atl-(brow-star|brow-halo|fringe-shade)[^{]*\{[^}]*animation", CSS)
    # The masculine look keeps its own crest.
    assert "fringeShade" not in _look("masculine") and "browStar" not in _look("masculine")


def test_the_masculine_waist_has_no_seam():
    # The owner: "smoothen and blend the line between the main body and the
    # lower body whisps". The wisps fade in under the torso's fade, and every
    # wisp leaving the hips is rooted inside the torso rather than starting
    # at the waist.
    # (The feminine figure keeps its hips, INBOX 535: its fades are lower.)
    assert 'fade("lowerin", sower ? 53 : 60, sower ? 50 : 52);' in ATLAS and 'fade("waist", sower ? 52 : 54, sower ? 58 : 63);' in ATLAS
    assert 'lower.setAttribute("mask", `url(#${id}-lowerin)`);' in ATLAS
    assert "return [[x, y - 6, x, y - 4, x, y - 2, x, y], ...seg];" in ATLAS


def test_the_masculine_lower_body_is_one_snake_wisp_with_sub_wisps():
    # INBOX 435 (3), wrapup-0927 item 7. The owner: "on the masculine atlas
    # lower body looks like a tripod and very straight pencil-y, I was
    # thinking like a thicker main whispy tail in the middle like a snake and
    # then the smaller ones on the side"; at release: "too straight and
    # pointy and not flowy"; then "the side whisps should be thicker and more
    # like proper sub whisps", "properly and cleanly integrated with the body
    # and not obviously separate shapes", "the subwhisps look like spider or
    # centipede legs" and "the middle isnt now really bigger than the
    # subwhisps". Round 9's three near-straight streams over a veil cut into
    # two points read as five spikes. Now: one main wisp and a few sub-wisps
    # branching off it, drawn as one silhouette.
    masculine, feminine = _look("masculine"), _look("feminine")
    lowers = masculine[masculine.index("lowers: [") :]
    lowers = lowers[: lowers.index("\n    ],\n")]
    assert lowers.count("main: true") == 1
    assert 2 <= lowers.count("side: ") <= 4
    # No hand-drawn veil with points.
    assert "skirt:" not in masculine and 'lowerTaper: "wisp"' in masculine
    assert '"firm"' not in ATLAS
    # Hers is the Seed Sower's tail (INBOX 535), not a trail of wisps.
    assert 'lowerTaper: "sower"' in feminine and "main: true" not in feminine and "side:" not in feminine
    # Every paint of the trail is one path holding all the wisps (nonzero
    # fill paints an overlap once, so no brighter band where a sub-wisp
    # leaves the trunk), with no veil round it (a wider haze showed its own
    # edge, a second outline), and the trail stays in the one `lower` layer:
    # two layers drifting apart would stack their translucency where they
    # overlap.
    assert 'spec.trail = { fill: join("fill"), stream: join("stream"), specks: parts.flatMap((p) => p.specks) };' in ATLAS
    assert "if (spec.trail) ribbon(lower, spec.trail);" in ATLAS
    assert '...(spec.lowers ? ["lower"] : [])' in ATLAS and "lower-side" not in ATLAS


_WISPS_JS = r"""
const vm = require("vm");
const fs = require("fs");
const noop = () => {};
const el = () => ({ setAttribute: noop, appendChild: noop, style: { setProperty: noop }, classList: { add: noop } });
const ctx = { console, setInterval: noop, setTimeout: noop, clearInterval: noop, clearTimeout: noop, document: { addEventListener: noop, createElementNS: el, createElement: el, querySelectorAll: () => [] }, window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2], "utf8") + "\n;globalThis.__L = ATLAS_LOOKS; globalThis.__at = atlasSegsAt;", ctx);
const out = {};
for (const look of ["masculine", "feminine"]) {
  const spec = ctx.__L[look];
  out[look] = spec.lowers.map((l, i) => {
    const part = spec.lowerPaths[i];
    const pts = [];
    for (let k = 0; k <= 60; k += 1) pts.push(ctx.__at(l.seg, k / 60));
    //: The stem as built (with its root inside the torso, if it has one),
    //: and its width there.
    const built = [];
    for (let k = 0; k <= 80; k += 1) built.push([...ctx.__at(part.seg || l.seg, k / 80), part.width ? part.width(k / 80) : 0]);
    return { main: !!l.main, side: l.side || 0, pts, built, fill: part.fill };
  });
  out[`${look}Torso`] = spec.torsoNow;
  out[`${look}TailW`] = spec.tailWidth ? Array.from({ length: 51 }, (_, k) => spec.tailWidth(k / 50)) : [];
  out[`${look}Sower`] = spec.sower ? spec.sower.fill : "";
}
console.log(JSON.stringify(out));
"""


def test_the_masculine_wisps_measure_as_drawn(tmp_path):
    # The generated paths, measured: the main wisp leaves the torso as wide
    # as the hips and narrows as it falls, in an S, to a rounded tip; each
    # sub-wisp branches off it at its own height, half the main wisp's width
    # there, flows mostly down in one continuous curve (no knee), and is
    # shorter than the main wisp, no two alike; every path is smooth (cubic
    # curves and the tip's arc, no straight `L` spike) and inside the box
    # margins the feminine skirt already uses (x 9 to 53, y to 102).
    import json
    import math
    import shutil
    import subprocess

    import pytest

    node = shutil.which("node")
    if not node:  # pragma: no cover - node is in the sandbox and in CI
        pytest.skip("node is not available")
    script = tmp_path / "wisps.js"
    script.write_text(_WISPS_JS, encoding="utf-8")
    run = subprocess.run([node, str(script), str(ROOT / "frontend" / "js" / "atlas.js")], capture_output=True, text=True, timeout=60, check=False)
    assert run.returncode == 0, run.stderr
    got = json.loads(run.stdout)

    def length(pts):
        return sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))

    def points(d):
        # Every coordinate pair but the arc's radii and flags.
        d = re.sub(r"A[0-9.]+ [0-9.]+ 0 0 1 ", "M", d)
        nums = [float(n) for n in re.findall(r"-?[0-9.]+", d)]
        return nums[0::2], nums[1::2]

    def area(d):
        xs, ys = points(d)
        return sum(xs[i] * ys[i + 1] - xs[i + 1] * ys[i] for i in range(len(xs) - 1))

    parts = got["masculine"]
    main = next(p for p in parts if p["main"])
    subs = [p for p in parts if not p["main"]]

    # Flush with the body: the torso's width at the hips' fade (y 55) against
    # the main wisp's width where it leaves the torso (y 56).
    xs, ys = points(got["masculineTorso"])
    flank = [(x, y) for x, y in zip(xs, ys) if 50 <= y <= 60]
    left = min(flank, key=lambda q: abs(q[1] - 55) + (q[0] > 31) * 99)
    right = min(flank, key=lambda q: abs(q[1] - 55) + (q[0] < 31) * 99)
    hips = right[0] - left[0]
    top = min(main["built"], key=lambda q: abs(q[1] - 56))[2]
    assert abs(top - hips) <= 1.5, (top, hips)
    # Then it narrows: never wider below the waist than at it.
    assert max(q[2] for q in main["built"] if q[1] > 62) < top

    # An S: the centreline's sideways heading turns at least twice.
    dx = [b[0] - a[0] for a, b in zip(main["pts"], main["pts"][1:])]
    assert sum(1 for a, b in zip(dx, dx[1:]) if a * b < 0) >= 2

    main_len = length(main["pts"])
    for p in parts:
        assert "L" not in p["fill"] and p["fill"].count("C") >= 20, "smooth, no straight spike"
        assert "A" in p["fill"], "a rounded tip, not a point"
        xs, ys = points(p["fill"])
        assert min(xs) >= 9 and max(xs) <= 53 and max(ys) <= 102, (min(xs), max(xs), max(ys))
    # Every stem is walked the same way round, so the joined path's nonzero
    # fill unites them; one walked the other way would cut a hole where it
    # crosses the trunk.
    assert len({area(p["fill"]) > 0 for p in parts}) == 1, "a wisp wound the other way"

    roots, lengths = [], []
    for p in subs:
        x0, y0 = p["pts"][0]
        x1, y1 = p["pts"][-1]
        # Branching from the trunk, which is about twice as wide there and
        # stays the widest shape down to the sub-wisp's own tip.
        at = min(main["built"], key=lambda q: math.dist(q[:2], (x0, y0)))
        assert math.dist(at[:2], (x0, y0)) < at[2] / 2, "a sub-wisp's root is inside the main wisp"
        wide = max(q[2] for q in p["built"])
        assert at[2] >= 1.9 * wide, (at[2], wide)
        # Flowing down and out, not splayed sideways like a leg.
        assert y1 - y0 > abs(x1 - x0), (x0, y0, x1, y1)
        assert (x1 - 31) * p["side"] > (x0 - 31) * p["side"], "outward"
        # One continuous curve: the heading turns one way only (a knee is
        # a turn one way and then back).
        heads = [math.atan2(b[1] - a[1], b[0] - a[0]) for a, b in zip(p["pts"], p["pts"][1:])]
        turns = [b - a for a, b in zip(heads, heads[1:]) if abs(b - a) > 0.004]
        assert all(t > 0 for t in turns) or all(t < 0 for t in turns), "a knee"
        ratio = length(p["pts"]) / main_len
        assert 0.3 <= ratio <= 0.75, ratio
        roots.append(y0)
        lengths.append(length(p["pts"]))
    # Not a row of legs: each branches at its own height, each its own length.
    roots.sort()
    assert all(b - a >= 6 for a, b in zip(roots, roots[1:])), roots
    lengths.sort()
    assert all(b - a >= 2 for a, b in zip(lengths, lengths[1:])), lengths

    # Hers is one tail (INBOX 535), measured in its own test.
    assert len(got["feminine"]) == 1 and not got["feminine"][0]["main"]


def test_a_sleeping_atlas_keeps_its_arms_off_the_rings():
    # The owner: "no arm resting on the orbit rings". Measured by
    # scratchpad/ui-sweeps/atlasarms.js (MOODS=sleepy, and POSE=lie, sit):
    # the eye-rub turned the arm out over the rings, and her held-out arm
    # stayed out along them when dozing, sitting or lying.
    for look, ar2 in (("masculine", "150deg"), ("feminine", "-84deg")):
        rule = re.search(rf'\[data-atlas-look="{look}"\]\[data-atlas-mood="sleepy"\] \{{([^}}]+)\}}', CSS).group(1)
        assert f"--atl-ar2: {ar2}" in rule, (look, "the eye-rub crosses the body to the face")
        angles = dict(re.findall(r"--atl-(a[rl]\d): (-?\d+)deg", rule))
        assert abs(int(angles["al0"])) <= 10 and abs(int(angles["al2"])) <= 10, (look, "the left arm hangs")
    assert '#nm-buddy[data-pose="lie"] .atl-figure[data-atlas-look="feminine"] .nmb-arm-l { transform: rotate(-30deg); }' in CSS
    assert '#nm-buddy[data-pose="sit"] .atl-figure[data-atlas-look="feminine"][data-atlas-mood="sleepy"] .nmb-arm-r { transform: rotate(84deg); }' in CSS


def test_the_props_hang_from_each_look_s_own_hand():
    # The bell and the lantern were drawn about one grip, (48.2, 60), the
    # old arm's hand: measured by scratchpad/ui-sweeps/atlasprop.js, they sat
    # 2.1 to 3.9 units off the masculine mitten and about 18 off her held-out
    # hand. Each look names its grip and the props move there.
    assert "propHand: [42.2, 60.4]" in _look("masculine")
    assert "propHand: [51.2, 39.6]" in _look("feminine")
    assert "atlasHandProps(arms.r, arms.l, look);" in ATLAS
    assert "const grip = (ATLAS_LOOKS[look] || {}).propHand || hand;" in ATLAS


def test_a_head_scratch_reaches_the_head_and_her_arms_are_outlined():
    # atlasarms.js: "a scratch at the head" at 103deg and 108deg left the hand
    # out at shoulder height over the rings; a left arm's positive angle turns
    # it out, so reaching the head takes 145 to 163 degrees.
    for look, al0 in (("masculine", "163deg"), ("feminine", "145deg")):
        rule = re.search(rf'\[data-atlas-look="{look}"\]\[data-atlas-mood="confused"\] \{{([^}}]+)\}}', CSS).group(1)
        assert f"--atl-al0: {al0}" in rule, look
    # Her pale arms were lost at the companion's size (atlasmoodgrid.js).
    assert '.nm-atlas[data-atlas-look="feminine"] .nmb-arm path.atl-skin {' in CSS


def test_atlas_moves_by_its_own_look_and_its_rules_out_rank_the_generic_ones():
    # atlasgait.js: the skirt never swung in a walk (the idle drift's :is()
    # out-ranked it) and Atlas waved the generic -98 to -128 degrees (its own
    # wave set only animation-name, at lower specificity).
    for glide in ("atl-glide ", "atl-glide-heavy "):
        assert f"@keyframes {glide.strip()} {{" in CSS
    assert '&:has(.atl-figure[data-atlas-look="masculine"]).nmb-walking .nm-buddy-char { animation: atl-glide-heavy' in CSS
    assert "&.nmb-walking .nm-live .nm-atlas.atl-layer-lower {" in CSS
    assert '&.nmb-walking .nm-live .nm-atlas.atl-layer-lower[data-atlas-look="masculine"] { animation: atl-lower-trail' in CSS
    assert "&.nmb-act-wave .atl-figure .nmb-arm-r { animation: atl-buddy-wave 1.5s" in CSS
    assert '&.nmb-act-wave .atl-figure[data-atlas-look="feminine"] .nmb-arm-r { animation: atl-buddy-wave-f 1.5s' in CSS
    assert "animation-name: atl-buddy-wave" not in CSS
    assert '.atl-lw-body[data-atlas-look="feminine"] { animation: atl-idle-sway-soft' in CSS


def test_a_poke_holds_long_enough_to_read_and_eases_back():
    # The companion agent's report: a poke's mood snapped back after 1.8s.
    # scratchpad/ui-sweeps/atlaswake.js: now 3.8s, then 1.2s of .atl-easing.
    hold = int(re.search(r"const ATLAS_POKE_HOLD_MS = (\d+);", ATLAS).group(1))
    back = int(re.search(r"const ATLAS_POKE_BACK_MS = (\d+);", ATLAS).group(1))
    assert 3000 <= hold <= 5000 and 1000 <= back <= 1500
    assert "setAtlasMood(ATLAS_POKES[atlasPokeIndex], ATLAS_POKE_HOLD_MS, { quiet: true, backEaseMs: ATLAS_POKE_BACK_MS });" in ATLAS
    assert 'easeMs: rest === "sleepy" ? ATLAS_DOZE_MS : backEaseMs' in ATLAS


def test_the_feminine_waist_has_no_strings_and_no_sash():
    # INBOX 480: "two wierd thin string like appendages" were the ribbon
    # tails' lit edges and pale streams. INBOX 515: the sash that then
    # covered the join read as "a wierd waist wrap". INBOX 535 took the gown
    # and the ribbons away; none of the three may come back.
    for gone in ("atl-tail-ribbon", "atl-gown", "atl-ribbon-drift", "lower-back", "lower-front", "tailin"):
        assert gone not in ATLAS and gone not in CSS, gone
    assert "sash:" not in _look("feminine") and "atl-sash" not in ATLAS and "atl-sash" not in CSS


def _cubic_x_at_y(d: str, y: float, side: str) -> float:
    """The outline's x at height `y`, on the left (smallest x) or right."""
    nums = [float(v) for v in re.findall(r"-?[0-9.]+", d)]
    start, rest = nums[:2], nums[2:]
    xs = []
    p0 = start
    for k in range(0, len(rest) - 5, 6):
        c1, c2, p1 = rest[k : k + 2], rest[k + 2 : k + 4], rest[k + 4 : k + 6]
        for i in range(401):
            u = i / 400
            v = 1 - u
            px = v**3 * p0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u**3 * p1[0]
            py = v**3 * p0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u**3 * p1[1]
            if abs(py - y) < 0.12:
                xs.append(px)
        p0 = p1
    return min(xs) if side == "l" else max(xs)


def test_the_feminine_body_is_an_hourglass_that_flows_into_one_wide_tail(tmp_path):
    # INBOX 535, the owner: "I want the female bottom half and main body the
    # feminine atlas to be more like this", the reference "Female Galaxy Seed
    # Sower (expanded stance)": narrow shoulders, a small chest curve, a
    # clear waist flaring into rounded hips, no seams, no clothing; below the
    # hips one long, wide, tapering spectral tail curving to one side, its
    # inner side shaded deeper violet and speckled with sparkles, and a
    # second, thinner ribbon tail from the other hip curling up. The tails
    # are thick and soft, never stick-like, and grow out of the hips' full
    # width.
    import json
    import shutil
    import subprocess

    import pytest

    feminine = _look("feminine")
    torso = re.search(r'torso: "([^"]+)"', feminine).group(1)
    width = lambda y: _cubic_x_at_y(torso, y, "r") - _cubic_x_at_y(torso, y, "l")  # noqa: E731
    chest = max(width(y / 10) for y in range(380, 460))
    waist = min(width(y / 10) for y in range(470, 540))
    hips = max(width(y / 10) for y in range(550, 620))
    assert waist <= 0.8 * chest, (waist, chest)
    assert waist <= 0.62 * hips, (waist, hips)
    assert hips >= chest, "rounded hips at least as wide as the small chest"

    node = shutil.which("node")
    if not node:  # pragma: no cover - node is in the sandbox and in CI
        pytest.skip("node is not available")
    script = tmp_path / "wisps.js"
    script.write_text(_WISPS_JS, encoding="utf-8")
    run = subprocess.run([node, str(script), str(ROOT / "frontend" / "js" / "atlas.js")], capture_output=True, text=True, timeout=60, check=False)
    assert run.returncode == 0, run.stderr
    got = json.loads(run.stdout)
    built = got["feminine"][0]["built"]
    # At the hip join (where the torso starts to fade into it, y 62) the
    # tail is at least 80% of the hips' width; nowhere is it under 2 units
    # (2px at the companion's 1x).
    at_join = next(w for x, y, w in built if y >= 62)
    assert at_join >= 0.8 * hips, (at_join, hips)
    assert min(w for _, _, w in built) >= 2.0
    # It sweeps to one side and lifts at its end, which feathers into light
    # (a radial mask about the end), and its end is round, radius 2 or more
    # at the companion's 1x ("less sharp tooth looking").
    xs = [x for x, _, _ in built]
    ys = [y for _, y, _ in built]
    assert min(xs) < 5 and ys[-1] < max(ys) - 4, "a big sweep to one side that lifts at its end"
    assert built[-1][2] >= 4.0, "the tail's end is round, radius 2 or more"
    assert 'tail.setAttribute("mask", `url(#${id}-tailtip)`);' in ATLAS
    # One outline from the waist: the tail is as wide as the torso's own
    # flank at each height down to the hips (no corner where they meet, no
    # box beside the waist), within 0.15 of a unit (this test's own sampling
    # of the torso's outline is that coarse).
    for x, y, w in built:
        if 51.5 <= y <= 59:
            assert abs(w - width(y)) < 0.15, (y, w, width(y))
    # No straight run on the tail's outline longer than 6% of the figure's
    # height (92): every piece is a curve, and none is a near-line that long.
    fill = got["feminineSower"]
    assert not re.search(r"[LHVlhv]", fill)
    nums = [float(v) for v in re.findall(r"-?[0-9.]+", fill)]
    p0 = nums[:2]
    for k in range(2, len(nums) - 5, 6):
        c1, c2, p1 = nums[k : k + 2], nums[k + 2 : k + 4], nums[k + 4 : k + 6]
        length = ((p1[0] - p0[0]) ** 2 + (p1[1] - p0[1]) ** 2) ** 0.5
        if length > 0.06 * 92:
            dx, dy = (p1[0] - p0[0]) / length, (p1[1] - p0[1]) / length
            bend = max(abs((c[0] - p0[0]) * dy - (c[1] - p0[1]) * dx) for c in (c1, c2))
            assert bend > 0.15, ("a straight run", p0, p1)
        p0 = p1
    # The second ribbon tail (the comet tail, from the other hip) is never
    # under 2 across, and is rooted at the hip, not the middle.
    assert min(got["feminineTailW"]) >= 2.0
    assert "tail: [[36.4, 60," in feminine
    # Fills only along both tails: no stroke anywhere in the tail's paint.
    for cls in ("atl-sower-fill", "atl-sower-inner", "atl-sower-light", "atl-sower-sparkle"):
        rule = re.search(r"\.nm-atlas \." + cls + r" \{([^}]*)\}", CSS)
        assert rule and "stroke" not in rule.group(1), cls
    # The masculine look keeps its own torso and trail.
    assert "sower" not in _look("masculine") and "wisps:" not in _look("masculine")


def test_the_feminine_look_has_astral_wisps_that_drift_on_a_box():
    # INBOX 535, the owner: "add some ribbon like astral celestial angelic
    # wisps". Three thin ribbons of light round her, each a glow under a
    # core with a sparkle trail, fills only; in the companion a layer of
    # their own whose box drifts (`rotate` and `translate`, the compositor's
    # on a box, never on an svg root), still under reduced motion.
    feminine = _look("feminine")
    assert feminine.count("sparkles: [0.") == 3
    for cls in ("atl-astral-glow", "atl-astral-core", "atl-astral-sparkle"):
        rule = re.search(r"\.nm-atlas \." + cls + r" \{([^}]*)\}", CSS)
        assert rule and "stroke" not in rule.group(1), cls
    assert "& .atl-lw-wisps { animation: atl-wisp-drift" in CSS
    body = _keyframes("atl-wisp-drift").split("{", 1)[1]
    assert set(re.findall(r"([a-z-]+)\s*:", body)) <= {"rotate", "translate"}
    assert ".atl-lw-neb, .atl-lw-neb-front, .atl-lw-wisps { animation: none !important; }" in CSS


def test_one_aura_centred_on_the_figure_and_no_stray_glows():
    # INBOX 536, the owner: "the companion background glow needs a lot of
    # fixing". Three glows read as stains: the nebula's six unclipped haze
    # clouds (one beside the chest, one over the head), and in the dark
    # theme a plain face's head-and-shoulders light under Atlas, which rose
    # past the top of the large view's card when it hung. One aura stays,
    # centred on the figure's drawn bounds and tinted from the nebula;
    # atlasaura.js measures it within 4% of the figure's box and no glow at
    # the card's edges, stand, sit and hang, light and dark.
    assert "ATLAS_BAND_HAZE" not in ATLAS and "atl-band-haze" not in ATLAS and "atl-band-haze" not in CSS
    assert ':root[data-theme="dark"] #nm-buddy[data-seed="Atlas"]::after { content: none; }' in CSS
    assert 'atlasMake("ellipse", { class: "atl-aura", ...atlasAuraAt(spec) }, layers.back.pose);' in ATLAS
    assert "const [cx, cy] = spec.auraAt || [31, 46];" in ATLAS and "auraAt: [33.5, 46]," in _look("feminine")
    for k in "012":
        assert f".atl-st-aura{k} {{ stop-color: var(--atl-aura-c);" in CSS
    assert "--atl-aura-c: color-mix(in oklab, var(--atl-neb-c) 55%" in CSS
