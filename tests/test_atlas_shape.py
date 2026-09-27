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



def test_secondary_motion_is_compositor_only_and_still_under_reduced_motion():
    # Round 9 (the owner: "secondary motion"): the tail and the orbit take a
    # second sway on a period of their own, on their layer roots; the mane
    # sways in the whole drawing only, never inside a companion layer.
    for name in ("atl-hair-flow", "atl-tail-flow", "atl-neb-flow"):
        body = _keyframes(name).split("{", 1)[1]
        assert set(re.findall(r"([a-z-]+)\s*:", body)) <= {"rotate", "translate"}, name
    assert "atl-neb-drift 13s ease-in-out infinite alternate, atl-neb-flow" in CSS
    assert "&.atl-layer-tail { animation: atl-swish 5.4s ease-in-out var(--nm-delay) infinite, atl-tail-flow" in CSS
    assert "&.atl-full .atl-mane { animation: atl-hair-flow" in CSS
    assert "&.atl-layer :is(.atl-rig, .atl-blink.nm-blinks, .atl-sway, .atl-mane," in CSS
    assert "&:is(.atl-layer-neb, .atl-layer-neb-front), & .atl-mane, " in CSS



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
    assert '#nm-buddy:is(.nmb-act-lie, [data-pose="sit"]:is(.nmb-sleep, .nmb-act-nap)):not(.nmb-cap-off) .nm-atlas,' in CSS
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
    assert ':is(#nm-buddy, .atl-figure-box, .nm-atlas)[data-lean="l"] { --atl-lean-dir: -1; }' in CSS
    assert ':is(#nm-buddy, .atl-figure-box, .nm-atlas)[data-lean="r"] { --atl-lean-dir: 1; }' in CSS
    assert "rotate: calc(var(--nmb-lean-pose) + var(--atl-lean-dir) * 3.5deg);" in CSS
    assert "rotate(calc(var(--atl-tilt) + var(--atl-lean-dir) * 4deg))" in CSS
    assert "translate(calc(var(--atl-px) + var(--atl-lean-dir) * 0.8px), var(--atl-py))" in CSS
    assert ".nm-atlas.atl-layer-tail { translate: calc(var(--atl-lean-dir) * -1.4px) 0; transition: translate calc(var(--motion-slow) * 4.5)" in CSS
    # Its default is the root's alone: declared on a drawing, an ancestor's
    # value would never reach the layers.
    assert len(re.findall(r"--atl-lean-dir:\s*0", CSS)) == 1



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
    # The variant hook inherits from any host, defaulting at the root only.
    assert '[data-atlas-variant="1"] { --atl-v1: 1; --atl-v2: 0; }' in CSS
    assert '[data-atlas-variant="2"] { --atl-v1: 0; --atl-v2: 1; }' in CSS
    assert ".nm-atlas .nmb-arm-r { transform: rotate(calc(var(--atl-ar0) * (1 - var(--atl-v1) - var(--atl-v2))" in CSS
    # The chin hand is a variant's choice, not thinking's alone.
    assert "#nm-buddy:not([data-pose=\"hang\"], [data-pose=\"sit\"]) .nm-atlas .atl-chin-hand { opacity: var(--atl-chin); }" in CSS


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
    assert "legs: false," in masculine and "lowers: [" in masculine and "skirt:" in masculine
    assert "armWidth: [4.4, 1.8]," in masculine and "handScale: 0.9," in masculine
    arms = re.search(r"    arm: \[(\[[^\]]+\]), (\[[^\]]+\])\],", masculine)
    assert arms, "the arm bends: two segments"
    assert '.nm-atlas[data-atlas-look="masculine"] .atl-eye { scale: 0.9; }' in CSS
    assert "&.atl-layer-body[data-atlas-look=\"masculine\"] { animation: atl-breathe 4.4s ease-in-out var(--nm-delay) infinite, atl-idle-sway" in CSS
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
    # swept up and back, the hairline
    # is lit, dust glints at the roots and a circlet of stars sits above it.
    feminine = _look("feminine")
    for key in ("hairline: \"M", "rootDust: [", "circlet: ["):
        assert key in feminine, key
    locks = feminine[feminine.index("frontLocks: ["):]
    locks = locks[: locks.index("],\n    lowers")]
    for w in re.findall(r"w: ([0-9.]+)", locks):
        assert float(w) <= 1.5, "a front strand wider than 1.5 is a lock, the curtains again"
    for seg in re.findall(r"seg: \[\[([^\]]+)\]\]", locks):
        nums = [float(n) for n in seg.split(",")]
        # Swept back toward the mass, which streams off to her left (+x),
        # and never falling over the brow: the curtains ended at y 17 to 19.
        assert nums[-2] > nums[0] and nums[-1] < 16, "a swept strand runs back toward the mass, above the brow"
    assert 'class: "atl-thread atl-circlet"' in ATLAS and '"atl-strand-light"' in ATLAS


def test_the_masculine_wisps_fall_and_the_waist_has_no_seam():
    # The owner: his lower-body wisps "more masculine: fewer, broader,
    # straighter-falling streams with a firmer taper", and "smoothen and
    # blend the line between the main body and the lower body whisps".
    masculine, feminine = _look("masculine"), _look("feminine")
    def widths(look):
        return [float(w) for w in re.findall(r"\], w: ([0-9.]+), specks", look)]

    assert len(widths(masculine)) < len(widths(feminine))
    assert min(widths(masculine)) > max(w for w in widths(feminine) if w < 7), "his streams are broader than her outer ribbons"
    assert 'lowerTaper: "firm"' in masculine and "lowerTaper" not in feminine
    assert "atl-lower-sway-heavy" in CSS
    # The seam: the wisps fade in under the torso's fade, and every wisp
    # is rooted inside the torso rather than starting at the waist.
    assert 'fade("lowerin", 60, 52);' in ATLAS and 'fade("waist", 54, 63);' in ATLAS
    assert 'lower.setAttribute("mask", `url(#${id}-lowerin)`);' in ATLAS
    assert "return [[x, y - 6, x, y - 4, x, y - 2, x, y], ...seg];" in ATLAS
