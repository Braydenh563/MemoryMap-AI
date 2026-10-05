"""Smart guides while dragging (wb-phase2 step 4; draw.io and Figma).

The guides (edges, centres, equal spacing between two neighbours, Alt to
bypass) were built; two gaps were left: a drawn shape was never a target, so
the boxes of a flowchart had nothing to line up with, and a row's spacing
could only be matched between two neighbours, never continued past the end
of a row. The pure parts run in node; the browser half is
`scratchpad/ui-sweeps/wbguides.js`.
"""

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")


def _function(name: str) -> str:
    start = SOURCE.index(f"function {name}(")
    return SOURCE[start : SOURCE.index("\n}\n", start) + 3]


def _guides(boxes, x, y, w, h):
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    script = (
        "const WB_ALIGN_SNAP_PX = 6;\n"
        f"const BOXES = {json.dumps(boxes)};\n"
        "function wbGuideBoxes() { return BOXES; }\n"
        + _function("wbAlignmentGuides")
        + _function("wbSpacingSeries")
        + f"console.log(JSON.stringify(wbAlignmentGuides(null, {x}, {y}, {w}, {h})));"
    )
    out = subprocess.run([node, "-e", script], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def _box(x, y, w=100, h=60):
    return {"minX": x, "minY": y, "maxX": x + w, "maxY": y + h}


def test_a_row_spacing_is_continued_past_its_end() -> None:
    # Two boxes 40 apart; the third dragged to 43 past the second snaps to 40.
    out = _guides([_box(0, 0), _box(140, 0)], 283, 0, 100, 60)
    assert out["dx"] == -3
    spacing = [line for line in out["guideLines"] if line["kind"] == "spacing"]
    assert len(spacing) == 2 and {(s["x1"], s["x2"]) for s in spacing} == {(100, 140), (240, 280)}


def test_a_column_spacing_is_continued_too() -> None:
    out = _guides([_box(0, 0), _box(0, 100)], 0, 196, 100, 60)
    assert out["dy"] == 4


def test_before_the_start_of_a_row_as_well() -> None:
    out = _guides([_box(200, 0), _box(340, 0)], 58, 0, 100, 60)
    assert out["dx"] == 2


def test_between_two_still_wins_and_far_gaps_do_not_snap() -> None:
    between = _guides([_box(0, 0), _box(300, 0)], 152, 0, 100, 60)
    assert between["dx"] == -2
    far = _guides([_box(0, 0), _box(140, 0)], 300, 0, 100, 60)
    assert far["dx"] == 0 and not [line for line in far["guideLines"] if line["kind"] == "spacing"]


def test_shapes_are_targets_and_ink_is_not() -> None:
    body = _function("wbGuideBoxes")
    assert 'for (const sketch of wbState.sketches || [])' in body
    assert "parsed.shape || wbShapeLabelKind(parsed)" in body
    assert 'wbItemHidden("sketch", sketch)' in body and "wbItemHidden(kind, item)" in body
