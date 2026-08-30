"""Rasterising a PDF page, so a vision model can read a scan.

`core/docview.py` used to carry a docstring explaining that this could not
work: it takes a `vision_reader`, `ai/vision_ocr.py` reads images, and nothing
turned a PDF page into one. The seam was built and the plug did not exist.

pypdfium2 was then actually installed and measured — ~16 MB, no system
packages, no torch, about 20 ms a page — so the plug exists now. These tests
cover the two things that matter: it degrades to nothing when the optional
library is absent, and it never raises at a caller that has to return a page.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from memorymap.ai import vision_ocr
from memorymap.core import pdfpages

# The smallest legal PDF that still renders text, built by hand so the suite
# carries no binary fixture.
ONE_PAGE_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]/Contents 4 0 R"
    b"/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
    b"4 0 obj<</Length 44>>stream\nBT /F1 24 Tf 20 40 Td (Hello OCR) Tj ET\n"
    b"endstream endobj\n"
    b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
    b"trailer<</Root 1 0 R>>"
)

needs_pdfium = pytest.mark.skipif(
    not pdfpages.available(), reason="the pdfpages extra is not installed"
)


@pytest.fixture()
def one_page(tmp_path) -> Path:
    path = tmp_path / "scan.pdf"
    path.write_bytes(ONE_PAGE_PDF)
    return path


# --- it must never take down its caller ----------------------------------------


def test_a_missing_file_is_no_pages_rather_than_an_exception(tmp_path):
    assert pdfpages.render_pages(tmp_path / "nope.pdf") == []
    assert pdfpages.page_count(tmp_path / "nope.pdf") == 0


def test_a_file_that_is_not_a_pdf_is_no_pages(tmp_path):
    junk = tmp_path / "not.pdf"
    junk.write_bytes(b"this is not a PDF at all")
    assert pdfpages.render_pages(junk) == []


def test_a_truncated_pdf_is_no_pages(tmp_path):
    half = tmp_path / "half.pdf"
    half.write_bytes(ONE_PAGE_PDF[: len(ONE_PAGE_PDF) // 2])
    assert pdfpages.render_pages(half) == []


def test_without_the_extra_nothing_happens_and_nothing_breaks(one_page, monkeypatch):
    """The library is optional and stays optional — this is the path every
    install that never presses the button takes."""
    monkeypatch.setattr(pdfpages, "available", lambda: False)
    assert pdfpages.render_pages(one_page) == []
    assert pdfpages.page_count(one_page) == 0


# --- and when it is there, it must actually render ------------------------------


@needs_pdfium
def test_a_page_renders_to_a_png(one_page):
    pages = pdfpages.render_pages(one_page)
    assert len(pages) == 1
    assert pages[0].startswith(b"\x89PNG\r\n\x1a\n")


@needs_pdfium
def test_only_the_first_few_pages_are_ever_rendered(one_page):
    """A vision model reads a page in seconds, so a 300-page scan would be an
    hour of GPU time nobody asked for."""
    assert pdfpages.MAX_PAGES <= 16
    assert pdfpages.render_pages(one_page, limit=0) == []


@needs_pdfium
def test_an_absurdly_large_page_is_skipped_rather_than_allocated(one_page, monkeypatch):
    """A 40 KB PDF can declare a page a metre wide; rendering it at 2x is
    gigabytes of bitmap in one allocation."""
    monkeypatch.setattr(pdfpages, "MAX_PIXELS", 1)
    assert pdfpages.render_pages(one_page) == []


# --- the whole path, which is what was actually missing -------------------------


class _FakeOllama:
    def __init__(self, reply: str) -> None:
        self.reply = reply
        self.calls = 0

    def chat(self, model, messages, **kwargs):
        self.calls += 1
        return {"content": self.reply}


@needs_pdfium
def test_a_scanned_pdf_reaches_the_vision_model(one_page):
    """`docview` always took a vision_reader and its only caller always passed
    None, so this whole path was wired and had never once run."""
    fake = _FakeOllama("Hello OCR")
    read = vision_ocr.pdf_vision_reader("some-vision-model", fake)
    assert read(one_page) == "Hello OCR"
    assert fake.calls == 1


@needs_pdfium
def test_a_model_that_finds_nothing_yields_nothing(one_page):
    read = vision_ocr.pdf_vision_reader("m", _FakeOllama(""))
    assert read(one_page) == ""


def test_the_reader_survives_a_file_it_cannot_open(tmp_path):
    read = vision_ocr.pdf_vision_reader("m", _FakeOllama("x"))
    assert read(tmp_path / "gone.pdf") == ""


@needs_pdfium
def test_the_extras_catalogue_offers_it(one_page):
    from memorymap.core import extras

    entry = extras.EXTRAS_BY_ID["pdfpages"]
    assert entry.module == "pypdfium2"
    assert "Pillow" in entry.packages
    # It must not claim to read anything by itself — a model is still needed.
    assert "model" in entry.caveat.lower()
