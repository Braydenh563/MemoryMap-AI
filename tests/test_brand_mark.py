"""The favicon and the in-page emblem are one drawing (brief "logo",
2026-10-11).

The mark is three hexagon cells of a tessellation, the last one lifted and
turned, about to settle. `GEOMETRY` below is its one source, the owner's
pick: favicon.svg, icon-maskable.svg, the Pages site's mark and the page's
own `#emblem-template` (index.html, cloned by `emblemArt`) are its points
written out, and the emblem's CSS turns about the lifted cell's centre.
These tests recompute the points and hold every copy to them, so a change to
the mark is made once, here, or fails.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
SHELL = FRONTEND / "js" / "phone-shell.js"

#: "C1, Pearl, lifted": hexagons of radius 17 at 0.78, the third moved
#: (5, -5) and turned 10 degrees, round joins of 7.
GEOMETRY = {
    "radius": 17,
    "row": 62,
    "scale": 0.78,
    "stroke": 7,
    "lift": [5, -5],
    "tilt": 10,
    "opacity": [0.95, 0.7],
    "shadow": {"dy": 3, "blur": 2.5, "colour": "#1a1060", "opacity": 0.45},
    "tile": {"stops": ["#5b7cff", "#4f6df5", "#a927d8"], "pearl": ["#ffffff", "#c9b8ff"]},
}


def _cells(g: dict) -> list[list[tuple[float, float]]]:
    """Each cell's six corners: pointy-top, packed two along `row`, one over."""
    half = math.sqrt(3) * g["radius"] / 2
    reach = g["radius"] * g["scale"]

    def cell(cx: float, cy: float, tilt: float = 0) -> list[tuple[float, float]]:
        return [
            (
                cx + reach * math.cos(math.radians(-90 + 60 * k + tilt)),
                cy + reach * math.sin(math.radians(-90 + 60 * k + tilt)),
            )
            for k in range(6)
        ]

    return [
        cell(50 - half, g["row"]),
        cell(50 + half, g["row"]),
        cell(50 + g["lift"][0], g["row"] - 1.5 * g["radius"] + g["lift"][1], g["tilt"]),
    ]


def _expected() -> list[str]:
    return [" ".join(f"{x:.1f},{y:.1f}" for x, y in cell) for cell in _cells(GEOMETRY)]


def _polygons(text: str) -> list[str]:
    return re.findall(r'<polygon points="([^"]+)"', text)


def test_the_page_wears_the_favicons_colours() -> None:
    """`EMBLEM_COLOURS` (phone-shell.js) paints the tile, the pearl and the
    shadow; on the default accent they are favicon.svg's exactly."""
    text = SHELL.read_text(encoding="utf-8")
    start = text.index("const EMBLEM_COLOURS = ") + len("const EMBLEM_COLOURS = ")
    literal = text[start : text.index(";", start)]
    colours = json.loads(re.sub(r"(\w+):", r'"\1":', literal))
    g = GEOMETRY
    assert colours == {
        "stops": g["tile"]["stops"],
        "pearl": g["tile"]["pearl"][1],
        "shadow": g["shadow"]["colour"],
    }
    favicon = (FRONTEND / "favicon.svg").read_text(encoding="utf-8")
    for colour in [*colours["stops"], colours["pearl"], colours["shadow"]]:
        assert colour in favicon


def test_the_icons_draw_the_emblems_points() -> None:
    expected = _expected()
    for name in ("favicon.svg", "icon-maskable.svg"):
        text = (FRONTEND / name).read_text(encoding="utf-8")
        assert _polygons(text) == expected, f"{name} has drifted from GEOMETRY"
        g = GEOMETRY
        assert f'stroke-width="{g["stroke"]}"' in text
        assert 'stroke-linejoin="round"' in text
        assert f'stdDeviation="{g["shadow"]["blur"]}"' in text
        assert f'dy="{g["shadow"]["dy"]}"' in text
    site = (ROOT / "docs" / "index.html").read_text(encoding="utf-8")
    header = site[site.index('<a class="brand"') :]
    header = header[: header.index("</svg>")]
    assert _polygons(header) == expected, "the Pages site's mark has drifted from GEOMETRY"


def test_the_opacity_is_on_a_group_never_on_fill_and_stroke() -> None:
    """Opacity on the fill and the stroke separately paints the overlap of
    the two twice: a brighter ring round every cell."""
    for name in ("favicon.svg", "icon-maskable.svg"):
        text = (FRONTEND / name).read_text(encoding="utf-8")
        assert "fill-opacity" not in text and "stroke-opacity" not in text, name
        for opacity in GEOMETRY["opacity"]:
            assert f'<g opacity="{opacity}">' in text, name


def test_the_maskable_icon_keeps_the_mark_in_the_safe_zone() -> None:
    """Android crops to a circle of radius 40 about the centre at worst."""
    g = GEOMETRY
    for cell in _cells(g):
        for x, y in cell:
            assert math.hypot(x - 50, y - 50) + g["stroke"] / 2 < 40


def _template() -> str:
    html = (FRONTEND / "index.html").read_text(encoding="utf-8")
    start = html.index('<template id="emblem-template">')
    return html[start : html.index("</template>", start)]


def test_the_emblem_is_the_favicons_points() -> None:
    """The page clones `#emblem-template`; it computes no points of its own.
    The two settled cells, then the lifted one twice: its shadow and itself."""
    left, right, lifted = _expected()
    assert _polygons(_template()) == [left, right, lifted, lifted]
    template = _template()
    g = GEOMETRY
    for opacity in g["opacity"]:
        assert f'<g opacity="{opacity}">' in template
    assert (
        f'<g opacity="{g["shadow"]["opacity"]}" transform="translate(0 {g["shadow"]["dy"]})">'
        in template
    )
    assert template.count(f'stroke-width="{g["stroke"]}" stroke-linejoin="round"') == 4
    shell = SHELL.read_text(encoding="utf-8")
    body = shell[shell.index("function emblemArt(") :]
    body = body[: body.index("\n}\n")]
    assert '$("emblem-template")' in body
    assert "points" not in body and "Math.cos" not in body
    #: The blur is the favicon's stdDeviation in 100ths of the box.
    assert f"size / {100 / g['shadow']['blur']:g}" in body


def test_the_lifted_cell_turns_about_its_own_centre() -> None:
    g = GEOMETRY
    cx = 50 + g["lift"][0]
    cy = g["row"] - 1.5 * g["radius"] + g["lift"][1]
    css = (FRONTEND / "css" / "03-dashboard-widgets.css").read_text(encoding="utf-8")
    assert f"transform-origin: {cx:g}% {cy:g}%;" in css
    assert f"rotate(-{g['tilt']}deg)" in css
