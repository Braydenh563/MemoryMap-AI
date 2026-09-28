"""Site-builder pages in the web reader and the clipper.

Reported with a screenshot: a Squarespace page read as raw `<body id=...`
markup, and "some websites only show one or a couple words"."""

from __future__ import annotations

from memorymap.core import webclip
from memorymap.search import websearch

PROSE = " ".join(["The series follows a man pulled into a world of magic."] * 6)
THEMED_BODY = '<body id="c" class="' + " ".join(f"tweak-header-{i}" for i in range(400)) + '">'


def test_a_body_whose_classes_say_header_is_still_read():
    page = f"<html>{THEMED_BODY}<main><p>{PROSE}</p></main></body></html>"
    assert webclip.extract(page, "https://x.test/")["words"] > 40


def test_a_page_of_divs_reads_as_separate_blocks():
    page = f"<html><body><div><div>{PROSE}</div><div>{PROSE} Second.</div></div></body></html>"
    markdown = webclip.extract(page, "https://x.test/")["markdown"]
    assert len(markdown.split("\n\n")) >= 2


def test_a_tag_longer_than_the_old_bound_is_stripped():
    assert "<body" not in websearch._strip_tags(f"{THEMED_BODY}hello")
    assert "<body" not in websearch._readable_text(f"<html>{THEMED_BODY}<p>hello</p></body></html>")


def test_markdown_becomes_reader_blocks():
    blocks = websearch._blocks_from_markdown("# Title\n\nA [link](https://x.test/) here.\n\n- one\n- two")
    assert [b["type"] for b in blocks] == ["heading", "p", "li", "li"]
    assert blocks[1]["text"] == "A link here."
