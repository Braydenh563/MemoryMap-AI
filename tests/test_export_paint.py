"""A board or map exported as a picture is painted in the colours on screen.

The owner, 2026-09-24: "I exported a mindmap selection as an image to the
library, the mindmap nodes turned white??" `wbBuildExportSvg` drew every
topic and card as `#ffffffee` with `#1f2430` ink, the light theme's look, and
forced every branch to `fill="none"` with a grey stroke. Measured with
`scratchpad/ui-sweeps/exportcolours.js` in dark mode: topics 30,30,28 on
screen and 240,240,239 in the PNG, a text box's ink 236,235,232 on screen and
31,36,48 in the PNG. After: the same pixels in both, light and dark.

The suite cannot rasterise, so this holds the shape: the builder reads each
box's paint off the live element, and the old constants are fallbacks only.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS = "\n".join(p.read_text(encoding="utf-8") for p in sorted((ROOT / "frontend").glob("*.js")))


def _body(name: str) -> str:
    match = re.search(rf"^(?:async )?function {re.escape(name)}\(", JS, re.MULTILINE)
    assert match, f"{name} is gone; this lint is about its body"
    rest = JS[match.end():]
    end = re.search(r"^(?:async )?function \w+\(", rest, re.MULTILINE)
    return rest[: end.start()] if end else rest


def test_the_export_reads_the_paint_on_screen() -> None:
    body = _body("wbBuildExportSvg")
    assert body.count("wbExportPaint(") >= 3, "cards and topics take their paint from the live element"
    assert 'fill="#ffffffee"' not in body and 'fill="#ffffffcc"' not in body, (
        "a hard-coded white fill is the light theme's look, painted into every theme"
    )
    assert 'setAttribute("fill", "none")' not in body, "a branch is a filled ribbon; forcing no fill draws its outline"


def test_a_computed_colour_becomes_plain_srgb() -> None:
    body = _body("wbExportColour")
    assert "color\\(srgb" in body, "a color-mix() surface computes to color(srgb ...), parsed here"
    assert "getImageData" in body, "anything else goes through a canvas pixel"
