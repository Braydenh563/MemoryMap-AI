"""The image viewer's layout (§ lightbox).

Reported with two screenshots after the first version of the info panel
shipped:

    "the lightbox arrow icons in are not centred, same with the caption and
     ocr text at the bottom. is the lightbox scrollable?? maybe it can have
     the image information and other info about it below the image with the
     caption and ocr text??"

All three were the same cause. `.lightbox` was a fixed, non-scrolling box with
`place-content: center`, which centres a column and then clips whatever does
not fit — at both ends. Adding a caption panel made the column taller than the
viewport, so the panel was cut off with no way to scroll to it, and the arrows
(`position: fixed; top: 50%`) were centred on the viewport rather than on an
image that was no longer in the middle of it.

These are lints — nothing here renders a page. They pin the structure that
makes the geometry correct without measuring, so it cannot silently regress
the way the JS-measured version did.
"""

from __future__ import annotations

from pathlib import Path

JS = Path("frontend/app.js").read_text(encoding="utf-8")
CSS = Path("frontend/css/02-chat-graph.css").read_text(encoding="utf-8")
LIGHTBOX = JS.split("function openLightbox(")[1].split("\n// ")[0]


def test_the_arrows_share_a_positioned_box_with_the_image():
    """This is what makes "centred on the image" true by construction. Two
    earlier versions computed it — `top: 50%` of the viewport, then a measured
    `getBoundingClientRect` written back on every `show()` — and both were
    wrong the moment anything else in the dialog had height."""
    assert "lightbox-stage" in LIGHTBOX
    assert "stage.append(img, broken);" in LIGHTBOX
    stage = CSS.split(".lightbox-stage {")[1].split("}")[0]
    assert "position: relative" in stage
    nav = CSS.split(".lightbox-nav {")[1].split("}")[0]
    assert "position: absolute" in nav
    assert "top: 50%" in nav and "translateY(-50%)" in nav


def test_nothing_measures_the_image_to_place_the_arrows():
    """The measured version had to be re-run on every image change and every
    resize, and was one forgotten call away from being wrong again."""
    # In code, not in the comment explaining why it went.
    code = "\n".join(
        line for line in LIGHTBOX.splitlines() if not line.strip().startswith("//")
    )
    assert "positionNav" not in code
    assert 'addEventListener("resize"' not in code


def test_the_overlay_scrolls():
    """"is the lightbox scrollable??" — it was not, and a column taller than
    the viewport simply lost its ends."""
    block = CSS.split(".lightbox {")[1].split("}")[0]
    assert "overflow-y: auto" in block
    assert "place-content: center" not in block, (
        "place-content centres and then clips; that is the bug"
    )


def test_the_info_panel_has_no_scrollbar_of_its_own():
    """A box that is itself cut off, with its own inner scrollbar, is the
    thing in the screenshot. The dialog scrolls; the panel just gets taller."""
    block = CSS.split(".lightbox-info {")[1].split("}")[0]
    assert "overflow-y: auto" not in block
    assert "max-height" not in block


def test_the_image_leaves_room_for_what_is_under_it():
    block = CSS.split(".lightbox img {")[1].split("}")[0]
    assert "max-height: 68vh" in block, "80vh left no room for the caption panel"


def test_the_panel_says_which_picture_this_is():
    """"maybe it can have the image information and other info about it below
    the image with the caption and ocr text??" — size, when it arrived, what
    it is called."""
    assert "lightbox-facts" in LIGHTBOX
    assert "naturalWidth" in LIGHTBOX, "dimensions come from the decoded image"
    assert "item.addedAt" in LIGHTBOX


def test_the_upload_list_carries_the_date_the_panel_shows():
    """The one fact of that kind the browser cannot work out for itself."""
    routes = Path("src/memorymap/api/routes_files.py").read_text(encoding="utf-8")
    assert "created_at: str = \"\"" in routes
    assert "created_at=u.created_at.isoformat()" in routes
    library = Path("frontend/library.js").read_text(encoding="utf-8")
    assert "addedAt: i.created_at" in library


def test_the_panel_is_readable_over_whatever_is_behind_it():
    """At 0.45 the Library grid showed straight through a paragraph of
    transcribed text."""
    block = CSS.split(".lightbox-info {")[1].split("}")[0]
    assert "rgba(10, 12, 20, 0.86)" in block
    assert "backdrop-filter" in block


def test_every_other_caller_still_passes_only_what_it_always_did():
    """`caption`, `text`, `byline` and `addedAt` are optional. A caller that
    passes `{filename, getUrl}` must get exactly the dialog it got before."""
    assert "item.caption || \"\"" in LIGHTBOX
    assert "item.text || \"\"" in LIGHTBOX
    for other in ("frontend/graph.js", "frontend/dashboard.js"):
        source = Path(other).read_text(encoding="utf-8")
        if "openLightbox(" in source:
            assert "getUrl" in source
