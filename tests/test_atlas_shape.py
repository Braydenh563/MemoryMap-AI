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
    assert "atlasLimbTo(5.8, 2.6)" in ATLAS
    hand = ATLAS[ATLAS.index("const ATLAS_HAND_POINTS = [") :][:400]
    # No notch at the fingertips: the side values run one way round the end.
    tips = [float(v) for v in re.findall(r"\[4\.[0-9]+, (-?[0-9.]+)\]", hand)]
    assert tips == sorted(tips, reverse=True)


def test_the_nebula_is_one_ribbon_behind_the_figure_that_drifts_on_its_own_layer():
    assert "ATLAS_BAND_FRONT" not in ATLAS and "atl-band-front" not in CSS
    assert "const ATLAS_BAND = atlasBandPaths(" in ATLAS
    assert 'const names = ["neb", "back",' in ATLAS
    drift = re.findall(r"([^{}\n]+)\{[^{}]*animation: atl-neb-drift", CSS)
    assert drift and all(".atl-layer-neb" in rule for rule in drift)
    assert "#nm-buddy .atl-layer-neb { animation: none; }" in CSS
