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


def test_the_feminine_look_has_no_legs_and_a_skirt_of_ribbons():
    feminine = _look("feminine")
    assert "legs: false," in feminine
    assert "skirt: \"M" in feminine
    assert feminine.count("{ seg: [[") >= 5 + 7  # five ribbon tails over the gown (INBOX 480), and the hair's locks
    # No leg layers are built for a look without legs, and none is drawn.
    assert 'const legs = spec.legs !== false;' in ATLAS
    assert '...(legs ? ["leg-l", "leg-r"] : [])' in ATLAS
    assert "if (spec.legs === false) spec.legPaths = [];" in ATLAS
    # Ribbon tails, not a tripod (INBOX 480): each tapers to a wisp and is
    # pinched twice where it turns edge-on, which reads as a ribbon.
    assert "const tail = (w) => (t) => (0.22 + (w - 0.22) * (1 - t) ** 0.85) * (0.58 + 0.42 * Math.abs(Math.cos(" in ATLAS
    assert "fill: atlasStem(seg, width, { samples: 18, cap: true })" in ATLAS


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
    feminine = _look("feminine")
    tails = re.findall(r"\]\], w: ([0-9.]+), op: ([0-9.]+), (back: true, )?specks", feminine)
    #: INBOX 480: five broad ribbon tails in two tiers ("too thin and stick
    #: like": none under 7 across at the root), at different opacities,
    #: three in the back tier, rooted across the dress (x 22 to 41) and not
    #: from one point under the body's middle.
    assert len(tails) == 5 and sum(1 for t in tails if t[2]) == 3, tails
    assert len({t[1] for t in tails}) >= 4 and min(float(t[0]) for t in tails) >= 7, tails
    roots = [float(x) for x in re.findall(r"\{ seg: \[\[([0-9.]+), 7[0-9.]*, ", feminine[feminine.index("lowers: ["):])]
    assert len(roots) == 5 and max(roots) - min(roots) >= 15, roots
    assert 'g.setAttribute("mask", `url(#${id}-tailin)`);' in ATLAS and 'fade("tailin", 86, 74);' in ATLAS
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
    assert 'ATLAS_ROOT_BOXES = ["body", "tail", "lower", "lower-back", "lower-front", "leg-l", "leg-r", "neb", "neb-front"]' in ATLAS
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
    assert "22.6 45" in feminine and "39.4 45" in feminine and "chestLight:" in feminine
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
    # The feminine parting went with the owner's "school girl vibes": the
    # hairline is one arc with no parting (see the astral crown test).
    assert "capPart" not in _look("feminine") and "atl-cap-part" not in ATLAS
    assert "function atlasHairCap(parent, spec)" in ATLAS
    # Over the head, under the ears, so the ears rise out of it.
    head = ATLAS[ATLAS.index("function atlasHead("):]
    assert head.index("atlasHairCap(sway, spec)") < head.index("const ears = atlasEars(sway, level, false, look);")
    # Round 8's fading scalp is gone with it.
    assert "function atlasScalp(" not in ATLAS and 'fade("scalp"' not in ATLAS


def test_the_feminine_front_locks_are_soft_and_seamless():
    # Round 9 (the owner: "this front part of the feminine atlas hair needs a
    # fix and smoothen"): no blade wisps with square roots over the cap.
    feminine = _look("feminine")
    assert "frontLocks: [" in feminine
    assert "atlasStem(seg, (t) => 0.35 + w * Math.sin(Math.PI * Math.min(1, t * 1.02)) ** 0.8, { samples: 10, cap: true })" in ATLAS
    assert 'class: "atl-skin atl-lock atl-front-lock"' in ATLAS
    assert "frontLocks" not in _look("masculine")


def test_the_feminine_crown_is_astral_not_a_fringe():
    # The owner after 0bcfd1a: "I dont like the forehead hair part. it gives
    # off school girl vibes and not astral cosmic beauty vibes", and "a bit
    # more texture to the start of the long hair". The strands are fine and
    # swept up and back. INBOX 480 (the owner: "a redesign of whatever this
    # is on the forehead between the ears"): the lit hairline, the root dust
    # and the circlet on its thread read as a stray headband; the hairline
    # is a soft shade and one star sits in the hair at its peak.
    feminine = _look("feminine")
    for key in ("hairline: \"M", "browStar: ["):
        assert key in feminine, key
    for gone in ("rootDust:", "circlet:", "spec.rootDust", "spec.circlet"):
        assert gone not in ATLAS, gone
    for gone in ("atl-circlet", "atl-root-dust", "atl-hairline-glow", ".atl-hairline {"):
        assert gone not in CSS, gone
    shade = re.search(r"\.atl-hairline-shade \{[^}]*stroke: var\(--atl-dp\);[^}]*opacity: ([0-9.]+)", CSS)
    assert shade and float(shade.group(1)) <= 0.2, "the hairline is a shade, never a line of light"
    x, y, k = (float(v) for v in re.search(r"browStar: \[([^\]]+)\]", feminine).group(1).split(","))
    assert 29 <= x <= 33 and y < 12.4 and k <= 1.6, "one small star, centred, in the hair above the hairline"
    # Static: the brow adds nothing to the motion budget.
    assert not re.search(r"atl-brow-(star|halo)[^{]*\{[^}]*animation", CSS)
    locks = feminine[feminine.index("frontLocks: ["):]
    locks = locks[: locks.index("lowers: [")]
    for w in re.findall(r"w: ([0-9.]+)", locks):
        assert float(w) <= 1.5, "a front strand wider than 1.5 is a lock, the curtains again"
    for seg in re.findall(r"seg: \[\[([^\]]+)\]\]", locks):
        nums = [float(n) for n in seg.split(",")]
        # Swept back toward the mass, which streams off to her left (+x),
        # and never falling over the brow: the curtains ended at y 17 to 19.
        assert nums[-2] > nums[0] and nums[-1] < 16, "a swept strand runs back toward the mass, above the brow"
    assert '"atl-glint atl-brow-star"' in ATLAS and '"atl-strand-light"' in ATLAS


def test_the_masculine_waist_has_no_seam():
    # The owner: "smoothen and blend the line between the main body and the
    # lower body whisps". The wisps fade in under the torso's fade, and every
    # wisp leaving the hips is rooted inside the torso rather than starting
    # at the waist.
    assert 'fade("lowerin", 60, 52);' in ATLAS and 'fade("waist", 54, 63);' in ATLAS
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
    # Her skirt is untouched.
    assert "lowerTaper" not in feminine and "main: true" not in feminine and "side:" not in feminine
    # Every paint of the trail is one path holding all the wisps (nonzero
    # fill paints an overlap once, so no brighter band where a sub-wisp
    # leaves the trunk), with no veil round it (a wider haze showed its own
    # edge, a second outline), and the trail stays in the one `lower` layer:
    # two layers drifting apart would stack their translucency where they
    # overlap.
    assert 'spec.trail = { fill: join("fill"), stream: join("stream"), specks: parts.flatMap((p) => p.specks) };' in ATLAS
    assert "if (spec.trail) ribbon(lower, spec.trail);" in ATLAS
    assert 'const tiers = spec.lowers ? (spec.skirt ? ["lower", "lower-back", "lower-front"] : ["lower"]) : [];' in ATLAS and "lower-side" not in ATLAS


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

    # Her ribbons are what they were: five, ending in soft points.
    assert len(got["feminine"]) == 5 and not any(p["main"] for p in got["feminine"])  # the gown's ribbon tails (INBOX 480)


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


def test_the_feminine_gown_is_layered_and_flows_into_the_nebula():
    # INBOX 480, the owner: "a better and more majestic and attractive female
    # atlas lower body". The A-line read as a lamp shade: one pale veil
    # fading to nothing with four straight folds fanned over it. Now a train
    # behind in the nebula's colours, the gown, a sheer overskirt, a lit hem
    # and stars, back to front, all static paint in the one lower layer.
    feminine = _look("feminine")
    for key in ("skirt: \"M", "skirtTrain: \"M", "skirtDrape: \"M", "skirtDrapeEdge: \"M", "skirtHem: \"M", "skirtStars: ["):
        assert key in feminine, key
    # Soft curves only: no straight `L` edge in any layer of the gown.
    for key in ("skirt", "skirtTrain", "skirtDrape", "skirtHem"):
        d = re.search(key + r': "([^"]+)"', feminine).group(1)
        assert "L" not in d and d.count("C") >= 3, key
        ys = [float(v) for v in re.findall(r"-?[0-9.]+", d)[1::2]]
        assert max(ys) <= 100, f"{key} past the full level's box (y 100)"
    # The train reaches past the gown's hem toward the comet tail.
    hem_x = max(float(v) for v in re.findall(r"-?[0-9.]+", re.search(r'skirt: "([^"]+)"', feminine).group(1))[0::2])
    train_x = max(float(v) for v in re.findall(r"-?[0-9.]+", re.search(r'skirtTrain: "([^"]+)"', feminine).group(1))[0::2])
    assert train_x > hem_x + 8, (train_x, hem_x)
    # The gown deepens to the nebula's violet; it does not fade to nothing.
    assert '"skirt", "gown", ' in ATLAS
    stop = re.search(r"\.atl-st-gown3 \{ stop-color: var\(--atl-neb2-c\); stop-opacity: ([0-9.]+); \}", CSS)
    assert stop and float(stop.group(1)) >= 0.6
    # Drawn inside the lower layer's group, so the pose and the sway are the
    # layer's, as before; no animation of its own.
    draw = ATLAS[ATLAS.index("const gown = atlasGroup(lower, \"atl-skirt\");") :][:1600]
    for cls in ("atl-gown-train", "atl-skirt-veil", "atl-gown-drape", "atl-gown-hem"):
        assert cls in draw, cls
    assert not re.search(r"\.atl-gown-[a-z-]+[^{]*\{[^}]*animation", CSS)


def test_the_feminine_ribbon_tails_sway_out_of_step_on_their_boxes():
    # INBOX 480: "less like a tripod and more like whispy ribbony/flowy
    # tails". The two tiers are layers of their own, each also a lower layer
    # (so every pose, walk, carry and gesture rule takes them), and each
    # tier's box drifts on its own clock: a box, never an svg root, so the
    # loop is the compositor's (companioncost.js).
    assert 'const tierOf = name.startsWith("lower-") ? " atl-layer-lower" : "";' in ATLAS
    assert 'box.className = `atl-lw atl-lw-${name}${tierOf ? " atl-lw-lower" : ""}`;' in ATLAS
    back = re.search(r"& \.atl-lw-lower-back \{ animation: atl-ribbon-drift ([0-9.]+)s", CSS)
    front = re.search(r"& \.atl-lw-lower-front \{ animation: atl-ribbon-drift ([0-9.]+)s", CSS)
    assert back and front and back.group(1) != front.group(1)
    for rule in re.findall(r"([^{}\n]+)\{[^{}]*animation:[^;{}]*\batl-ribbon-drift\b", CSS):
        assert ".atl-lw-lower-" in rule and "svg" not in rule, rule
    # The masculine look keeps its one lower layer.
    assert '"lower-back"' not in _look("masculine")
