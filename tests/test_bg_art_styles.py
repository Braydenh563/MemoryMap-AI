"""The background art's styles: one list in three places, the cost rules,
and the seeded ones.

The style list lives in `BG_ART_STYLES` (settings.js, what a saved choice is
checked against), in `BG_ART_BUILDERS` (bg-art.js, what draws it) and in the
`#bg-art-style` picker (index.html, what a person can choose). They drifted
once already: the picker offered "constellations", "blobs" and "particles"
while the code drew "constellation", "bubbles" and "mesh", so every option
but Aurora failed the name check and silently fell back.

The microbes and mycelium styles grow their species from the display name,
through a genome adapted from helixlabs (MIT). The genome is exercised in
node, because "the same name always grows the same ecosystem" is the whole
promise of the feature and a regression would be invisible in a screenshot.

The frame costs themselves are measured, not tested here:
`scratchpad/ui-sweeps/bgartcost.js`.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"
BG_ART = FRONTEND / "bg-art.js"
SETTINGS = FRONTEND / "settings.js"
INDEX = FRONTEND / "index.html"
CSS = FRONTEND / "css" / "03-dashboard-widgets.css"

_HEAD = r"^  ([a-z]+)(?:\(p, ctx\) \{|: \{)$"


def _styles_const() -> list[str]:
    m = re.search(r"const BG_ART_STYLES = \[([^\]]*)\]", SETTINGS.read_text(encoding="utf-8"))
    assert m, "BG_ART_STYLES not found in settings.js"
    return re.findall(r'"([a-z]+)"', m.group(1))


def _builders_body() -> str:
    text = BG_ART.read_text(encoding="utf-8")
    return text[text.index("const BG_ART_BUILDERS = {") : text.index("// --- the runtime")]


def _builders() -> list[str]:
    return re.findall(_HEAD, _builders_body(), flags=re.M)


def _chunks() -> dict[str, str]:
    parts = re.split(_HEAD, _builders_body(), flags=re.M)
    # re.split with a group returns [pre, name, body, name, body, ...]
    return dict(zip(parts[1::2], parts[2::2]))


def _picker() -> list[str]:
    html = INDEX.read_text(encoding="utf-8")
    start = html.index('<select id="bg-art-style"')
    select = html[start : html.index("</select>", start)]
    return re.findall(r'<option value="([a-z]+)"', select)


def test_the_three_lists_agree():
    styles = _styles_const()
    assert styles == _builders(), "BG_ART_STYLES and BG_ART_BUILDERS name different styles"
    assert styles == _picker(), "the #bg-art-style picker offers a different list"
    assert {"microbes", "mycelium"} <= set(styles)


def test_every_style_says_how_its_frame_begins():
    """A canvas style washes, clears or keeps the last frame on its own word;
    one without a word would get none of the three and smear. A CSS style
    has no frames and says so instead."""
    chunks = _chunks()
    assert list(chunks) == _builders()
    for name, chunk in chunks.items():
        assert re.search(r'background: "(wash|clear|keep)"', chunk) or "dom: true" in chunk, name


def test_the_css_styles_draw_nothing_per_frame():
    """The mesh and the bubbles are CSS animations of pre-rendered images:
    no p5, no frame function, nothing drawn per frame."""
    chunks = _chunks()
    for name in ("mesh", "bubbles"):
        assert "dom: true" in chunks[name], name
        assert "frame(" not in chunks[name], name
        assert not re.search(r"\bp\.", chunks[name]), name
    css = CSS.read_text(encoding="utf-8")
    for anim in ("bg-drift-x", "bg-drift-y", "bg-rise", "bg-wobble"):
        assert f"@keyframes {anim}" in css, anim


def test_no_colour_or_gradient_is_built_per_frame():
    """A mark's fade is globalAlpha on a colour built once; a colour string
    per mark per frame was most of the old styles' garbage (the old
    constellation allocated about 140MB in ten seconds, measured)."""
    for name, chunk in _chunks().items():
        if "frame(" not in chunk:
            continue
        frame = chunk[chunk.index("      frame(") :]
        assert "bgHsla(" not in frame, f"{name} builds a colour string inside frame()"
        assert "createRadialGradient" not in frame, name
        assert "createLinearGradient" not in frame, name
        assert "new Map(" not in frame and "new Float32Array(" not in frame, name


def test_waves_keeps_its_wash_and_its_shape():
    """The owner likes the waves as they are: the trail wash and the five
    scrolling sine layers stay exactly as they were. Only the drawing moved
    from p5's vertex list to one canvas path per layer, with the colour p5
    itself would have set."""
    waves = _chunks()["waves"]
    assert 'background: "wash"' in waves
    for line in (
        "layers = Math.max(2, Math.round(5 * ctx.density));",
        "const hue = (ctx.baseHue + l * 12) % 360;",
        "fills.push(bgP5Rgba(hue, 62, ctx.dark ? 55 : 58, 0.16));",
        "const yBase = H * (0.35 + l * 0.13);",
        "const amp = 26 + l * 10;",
        "for (let x = 0; x <= W; x += 14) {",
        "const y = yBase + Math.sin(x * 0.006 + t * (0.6 + l * 0.18) + l) * amp",
        "+ Math.sin(x * 0.013 - t * 0.4) * (amp * 0.35);",
    ):
        assert line in waves, line
    runtime = BG_ART.read_text(encoding="utf-8")
    assert "bgP5Rgba(0, 0, o.dark ? 12 : 98, o.dark ? 0.1 : 0.12)" in runtime


def test_still_is_an_image_not_a_stopped_sketch():
    """Still captures one frame to an image and removes the sketch, so no
    loop and no canvas are left behind."""
    runtime = BG_ART.read_text(encoding="utf-8")
    run = runtime[runtime.index("function bgArtRun(") :]
    still = run[run.index("if (o.still) {\n    // One frame") :]
    still = still[: still.index("\n    return;\n  }\n")]
    assert "toBlob(" in still and "URL.createObjectURL" in still
    # The still's canvas is never put in the page, and no loop is started.
    assert "appendChild(canvas)" not in still
    assert "requestAnimationFrame" not in still and "bgArtInstance =" not in still


def test_the_art_pauses_when_hidden_unfocused_or_covered():
    text = BG_ART.read_text(encoding="utf-8")
    assert 'document.addEventListener("visibilitychange"' in text
    assert 'window.addEventListener("blur"' in text
    assert "function bgArtCovered()" in text
    apply = text[text.index("function bgArtApplyPause()") :]
    apply = apply[: apply.index("\n}\n")]
    assert "noLoop()" in apply and "loop()" in apply and "is-paused" in apply


def test_bg_art_loads_before_settings():
    html = INDEX.read_text(encoding="utf-8")
    assert html.index('src="/bg-art.js?v=') < html.index('src="/settings.js?v=')


def test_helixlabs_is_credited():
    text = BG_ART.read_text(encoding="utf-8")
    assert "helixlabs" in text and "MIT" in text


_GENOME_SCRIPT = r"""
const fs = require("fs");
const vm = require("vm");
const src = fs.readFileSync(process.argv[2], "utf8");
const noop = () => {};
const box = {
  document: { addEventListener: noop }, window: { addEventListener: noop },
  navigator: {}, performance: { now: () => 0 }, console,
};
vm.createContext(box);
vm.runInContext(src + "\nthis.out = { bgArtGenome, bgArtStrains, bgArtSpeciesName, bgArtStrainCount, bgColourHue, bgP5Rgba };", box);
const { bgArtGenome, bgArtStrains, bgArtSpeciesName, bgArtStrainCount, bgColourHue, bgP5Rgba } = box.out;
const grow = (name) => bgArtStrains(name, bgArtStrainCount(name)).map((s) => ({
  name: bgArtSpeciesName(s), sum: bgArtGenome(s).sum,
}));
console.log(JSON.stringify({
  helixSum: bgArtGenome("AB").sum,
  a: grow("Brayden"),
  again: grow("Brayden"),
  b: grow("Ada"),
  repeat: grow("aaaa"),
  blank: grow("   "),
  fallback: grow("MemoryMap"),
  p5: [bgP5Rgba(229.41176470588235, 62, 58, 0.16), bgP5Rgba(301.41176470588235, 62, 55, 0.16), bgP5Rgba(0, 0, 98, 0.12), bgP5Rgba(0, 0, 12, 0.1)],
  hues: [bgColourHue("#ff0000"), bgColourHue("#00ff00"), bgColourHue("#4664f0"), bgColourHue("rgb(0, 0, 255)"), bgColourHue("#fff")],
}));
"""


@pytest.fixture(scope="module")
def genome(tmp_path_factory):
    node = shutil.which("node")
    if not node:  # pragma: no cover - node is in the sandbox and in CI
        pytest.skip("node is not available")
    script = tmp_path_factory.mktemp("bgart") / "genome.js"
    script.write_text(_GENOME_SCRIPT, encoding="utf-8")
    out = subprocess.run(
        [node, str(script), str(BG_ART)], capture_output=True, text=True, timeout=60, check=False
    )
    assert out.returncode == 0, out.stderr
    return json.loads(out.stdout)


def test_the_genome_is_helixlabs_sum(genome):
    # helixlabs: sumCode += charCodeAt(i) * (i + 1). "AB" is 65*1 + 66*2.
    assert genome["helixSum"] == 65 + 66 * 2


def test_the_same_name_grows_the_same_ecosystem(genome):
    assert genome["a"] == genome["again"]
    assert 3 <= len(genome["a"]) <= 5


def test_a_different_name_grows_a_different_one(genome):
    assert [s["name"] for s in genome["a"]] != [s["name"] for s in genome["b"]]


def test_strains_of_one_name_differ_even_for_a_repeated_letter(genome):
    for key in ("a", "repeat"):
        sums = [s["sum"] for s in genome[key]]
        assert len(set(sums)) == len(sums), key


def test_a_blank_name_falls_back_to_the_app_name(genome):
    assert genome["blank"] == genome["fallback"]


def test_the_accent_hue_is_read_without_p5(genome):
    """The CSS styles run without p5, so the accent's hue is computed here;
    it must be the number p5's `hue()` gave (standard HSL hue)."""
    red, green, indigo, blue, white = genome["hues"]
    assert round(red) == 0 and round(green) == 120 and round(blue) == 240
    assert 228 <= indigo <= 230
    assert white == 0


def test_the_waves_colours_are_the_ones_p5_set(genome):
    """The waves no longer go through p5, and must look as they did: these
    are p5 1.9.4's own `color(h, s, l, a).toString()` in `colorMode(HSL,
    360, 100, 100, 1)`, read from the vendored p5 in Chromium, for the
    default accent's first and last wave layers and the two trail washes."""
    assert genome["p5"] == [
        "rgba(81,105,214,0.16)",
        "rgba(211,69,208,0.16)",
        "rgba(250,250,250,0.12)",
        "rgba(31,31,31,0.1)",
    ]


def test_the_art_runs_at_30_or_20_frames_a_second():
    """A timestamp gate, not every display frame: 30 a second, 20 on a
    small machine (four cores or four gigabytes or fewer) or on battery."""
    text = BG_ART.read_text(encoding="utf-8")
    rate = text[text.index("function bgArtFrameRate()") :]
    rate = rate[: rate.index("\n}\n")]
    assert "? 20 : 30" in rate
    assert "hardwareConcurrency" in text and "deviceMemory" in text and "getBattery" in text
    assert "1000 / bgArtFrameRate()" in text


def test_the_art_needs_no_p5():
    """The art draws on its own canvas; p5 stays for the emblem and the
    dashboard's art widget only."""
    text = BG_ART.read_text(encoding="utf-8")
    assert "new p5(" not in text
    start = SETTINGS.read_text(encoding="utf-8")
    body = start[start.index("function startBgArt()") :]
    body = body[: body.index("\n}\n")]
    assert "ensureP5" not in body

