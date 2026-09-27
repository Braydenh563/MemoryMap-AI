"""The Library's Images sub-tab filters by where a picture came from.

Asked for directly (2026-09-23): a way to show only the sketches, or only the
uploaded images, keeping the sort. A sketch is not a separate table: the
sketch pad saves its PNG through `/media/upload` under the name
`sketch-<stamp>.png` (`saveSketch` in app.js) and files it as a note in
"Sketches", so the name is the one thing the gallery row carries that says
which it is. `libraryImageOrigin` is where that rule lives, run here in node
against its own source; the markup half is the Timeline's "Kinds" dock menu
recipe (DESIGN.md's index), checked the way that one is.
"""

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LIBRARY = (ROOT / "frontend" / "library.js").read_text(encoding="utf-8")
PAGE = re.sub(r"<!--.*?-->", "", (ROOT / "frontend" / "index.html").read_text(encoding="utf-8"), flags=re.S)


def _function(name: str) -> str:
    start = LIBRARY.index(f"function {name}(")
    return LIBRARY[start : LIBRARY.index("\n}\n", start) + 3]


def _origin(row: dict) -> str:
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    script = _function("libraryImageOrigin") + f"\nconsole.log(JSON.stringify(libraryImageOrigin({json.dumps(row)})));"
    out = subprocess.run([node, "-e", script], capture_output=True, text=True, check=True)
    return json.loads(out.stdout.strip())


def test_a_sketch_pad_png_is_a_sketch():
    assert _origin({"original_name": "sketch-2026-09-23-10-04-11.png", "_isImage": True}) == "sketch"


def test_an_older_bare_sketch_png_is_a_sketch():
    assert _origin({"original_name": "Sketch.png", "_isImage": True}) == "sketch"


def test_a_photo_is_an_upload():
    assert _origin({"original_name": "IMG_2231.jpg", "_isImage": True}) == "upload"


def test_a_photo_that_mentions_sketch_later_in_its_name_is_an_upload():
    assert _origin({"original_name": "my-sketchbook-cover.jpg", "_isImage": True}) == "upload"


def test_the_filter_is_the_kinds_dock_menu_recipe():
    start = PAGE.index('id="library-media-origin-menu"')
    block = PAGE[PAGE.rindex("<details", 0, start) : PAGE.index("</details>", start)]
    assert "dock-menu" in block and "doc-dock-menu-btn" in block, block[:200]
    assert 'id="library-media-origin-label"' in block, "the closed button says what the filter is set to"
    body = _function("renderLibraryImageOrigins")
    assert 'type = "checkbox"' in body and "doc-dock-menu-check" in body, (
        "each kind is a checkbox row that keeps the menu open, as the Timeline's are"
    )
    handler = LIBRARY[LIBRARY.index('getElementById("library-media-origins")') :][:200]
    assert '?.addEventListener("change"' in handler, (
        "`change`, not `click`: the checkbox is inside its own label and a click fires twice"
    )
