"""Flicking through the Library sub-tabs shows no stale or shifting content
(INBOX 852: "weird split second layout and content visual glitches when quickly
flicking through the library subtabs").

Measured with scratchpad/ui-sweeps/libflick.js (a click every 50 ms, three
rounds, layout-shift entries read per frame): a layout shift of 0.37 to 0.52 at
1440, from the Files placeholders (a column of 51px bars replaced by 160px rows,
or a grid flipped to a column mid-load) and from the previous kind's tiles
sitting under the new heading until the fetch answered; 0.017 after. The
browser measurement is the proof; these pin the three causes.
"""

from __future__ import annotations

import re
from pathlib import Path

from tests._css_paths import css_text

ROOT = Path(__file__).resolve().parent.parent
LIBRARY = (ROOT / "frontend" / "js" / "library.js").read_text(encoding="utf-8")


def _gallery() -> str:
    start = LIBRARY.index("async function renderLibraryImagesGallery(")
    return LIBRARY[start : LIBRARY.index("\n}\n", start)]


def test_a_gallery_render_that_was_overtaken_does_not_draw():
    body = _gallery()
    assert "const gen = ++libraryImagesGen;" in body
    # One check after each of the two fetches, before anything is cleared.
    assert len(re.findall(r"if \(gen !== libraryImagesGen\) return;", body)) == 2


def test_switching_media_kind_repaints_from_the_cache_in_the_same_frame():
    switch = LIBRARY[LIBRARY.index("setLibraryMediaKind(btn.dataset.mediaKind);") :][:900]
    assert "if (libraryImagesLoaded)" in switch
    assert switch.index("filterLibraryImagesGallery()") < switch.index('ifUnchanged: "skip"')


def test_media_placeholders_are_tile_sized_and_keep_the_grid_while_busy():
    css = css_text()
    assert re.search(r"\.library-image-grid > \.skeleton \{[^}]*height: 11\.75rem", css)
    assert re.search(
        r'\.library-image-grid\.library-file-rows\[aria-busy="true"\] \{[^}]*display: grid', css
    )
