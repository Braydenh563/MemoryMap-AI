"""INBOX 792: "there is only one actual arrow option for the links", and the
Start and End lists were eleven words long with no picture.

The renderer draws the plain ends open (`arrow`, `bar`, `circle`, `square`,
`multiline`) or closed (`triangle`, `diamond`, `diamond-filled`; a solid end is
a closed outline with smaller copies of itself inside, so it stays one more
subpath of the shaft's `d`). The lists group the plain and the
entity-relationship ends and every row leads with a drawing of its end, which
is the renderer's own path as a mask: this runs the renderer and checks each
drawing against it, so the picture cannot drift from what lands on the board.
"""

import json
import re
import shutil
import subprocess
import urllib.parse
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")
INDEX = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
LAZY = (ROOT / "frontend" / "css" / "library-lazy.css").read_text(encoding="utf-8")


def _function(name: str) -> str:
    start = SOURCE.index(f"function {name}(")
    return SOURCE[start : SOURCE.index("\n}\n", start) + 3]


def _paths(tip_x=38, tip_y=8, angle=0, head=12) -> dict[str, str]:
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    start = SOURCE.index("const WB_CAP_KINDS")
    head_src = SOURCE[start : SOURCE.index("function wbCapPath(", start)]
    script = (
        _function("wbArrowHeadPath") + head_src + _function("wbCapPath")
        + f"console.log(JSON.stringify(WB_CAP_KINDS.map((k) => [k, wbCapPath(k, {tip_x}, {tip_y}, {angle}, {head})])));"
    )
    out = subprocess.run([node, "-e", script], capture_output=True, text=True, check=True)
    return dict(json.loads(out.stdout.strip()))


def _round(path: str) -> str:
    return re.sub(r"-?\d+\.\d{3,}", lambda m: str(round(float(m.group()), 2)), path)


def test_every_end_the_renderer_draws_is_offered_with_a_drawing_of_it():
    paths = _paths()
    assert {"triangle", "diamond", "diamond-filled", "bar"} <= set(paths)
    for which in ("startcap", "endcap"):
        select = INDEX[INDEX.index(f'id="wb-prop-{which}"') :]
        select = select[: select.index("</select>")]
        assert '<optgroup label="Plain ends">' in select and '<optgroup label="Entity-relationship ends">' in select
        for kind in paths:
            assert f'value="{kind}" data-menu-class="wb-cap wb-cap-{kind}' in select, (which, kind)
    for kind, cap in paths.items():
        rule = re.search(rf"\.wb-cap-{re.escape(kind)} \{{\s*--wb-cap: url\(\"([^\"]+)\"\);", LAZY)
        assert rule, kind
        drawing = urllib.parse.unquote(rule.group(1))
        assert _round(cap) in drawing if cap else "M 3 8 L 38 8'" in drawing, kind


def test_a_solid_end_is_a_closed_outline_with_copies_inside_it():
    paths = _paths(head=12)
    assert paths["triangle"].count("Z") > 3 and paths["diamond-filled"].count("Z") > 2
    assert paths["diamond"].count("Z") == 1
    assert paths["bar"].count("M") == 1 and "Z" not in paths["bar"]
    # A heavier line has a longer head and takes fewer, wider steps.
    assert paths["triangle"].count("Z") >= _paths(head=30)["triangle"].count("Z")
    assert len(set(paths.values())) == len(paths), "two ends draw the same mark"


def test_the_rows_draw_the_example_in_the_ink_and_start_is_turned_round():
    row = re.search(r"\.wb-cap::before \{([^}]*)\}", LAZY)
    assert row and "background: currentColor" in row.group(1) and "mask: var(--wb-cap)" in row.group(1)
    assert re.search(r"\.wb-cap-start::before \{\s*transform: scaleX\(-1\);", LAZY)
    assert "#wb-prop-startcap ~ .select-opener .select-value::before" in LAZY
    fmt = (ROOT / "frontend" / "js" / "whiteboard-format.js").read_text(encoding="utf-8")
    assert "to.append(node.cloneNode(true))" in fmt, "the Format panel takes the bar's groups and drawings"
