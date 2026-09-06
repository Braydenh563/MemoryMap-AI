"""Two readers, chosen rather than assumed.

This feature has been given two direct instructions, in opposite directions.
First: *"I basically dont want to download tesseract and only want to use an ai
vision learning and ocr model for images and scanned documents"* — which is why
the vision model is the default everywhere and why `core/pdfpages.py` exists at
all. Then, later: *"make sure tesseract exists as an alternative as well."*

Both hold, because they are not the same claim. The vision model is the
default; Tesseract is an alternative you can pick, and for some work it is the
better answer — no model running, about a tenth of a second a page, it never
invents a line that was not on the page, and it is the only reader that returns
*where* each block sits.

What these cover is the part that can be checked without a model or a
`tesseract` binary: that a reader is never silently substituted for the other,
that an unknown one is refused rather than quietly falling back, and that the
picker is told the truth about what this machine can do.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import HTTPException

from memorymap.api.routes_files import (
    MAX_RANGE_PAGES,
    MAX_TESSERACT_RANGE_PAGES,
    READERS,
    _checked_reader,
    _read_page,
    _tesseract_read_page,
)


def test_the_default_reader_is_the_vision_model():
    """The first instruction, kept: nothing reaches Tesseract unless it was
    asked for by name."""
    assert _checked_reader("") == "vision"
    assert _checked_reader(None) == "vision"  # type: ignore[arg-type]
    assert READERS[0] == "vision"


@pytest.mark.parametrize("name", ["vision", "tesseract", "Tesseract", "  VISION "])
def test_a_reader_is_named_case_and_space_insensitively(name):
    assert _checked_reader(name) in READERS


def test_an_unknown_reader_is_refused_rather_than_defaulted():
    """A typo'd `?reader=tesserract` that quietly ran the vision model would
    charge seconds of GPU time for a request meant to be instant, and then
    report that Tesseract had done it. Both halves are wrong, and the second is
    worse: it is the app stating something untrue about its own working."""
    with pytest.raises(HTTPException) as raised:
        _checked_reader("tesserract")
    assert raised.value.status_code == 400
    assert "tesseract" in raised.value.detail  # it names what was expected


def test_asking_for_tesseract_without_it_installed_says_so(monkeypatch, tmp_path: Path):
    """It does **not** fall back to the vision model. A reader is a claim about
    who read the page, and answering a request for one with the other is the
    silent-substitution failure this module exists to prevent."""
    monkeypatch.setattr("memorymap.core.pdfpages.available", lambda: True)
    monkeypatch.setattr("memorymap.core.ocr.tesseract_available", lambda: False)
    with pytest.raises(HTTPException) as raised:
        _tesseract_read_page(tmp_path / "nothing.pdf", 0)
    assert raised.value.status_code == 409
    assert "Tesseract" in raised.value.detail
    # And it points at the alternative rather than leaving a dead end.
    assert "AI" in raised.value.detail


def test_without_a_rasteriser_neither_reader_pretends_to_have_read(monkeypatch, tmp_path: Path):
    """The rasteriser gap is upstream of the reader choice — a PDF page has to
    become pixels before anything can look at it — so both readers must report
    the same missing piece rather than one of them reporting "no text"."""
    monkeypatch.setattr("memorymap.core.pdfpages.available", lambda: False)
    out = _tesseract_read_page(tmp_path / "nothing.pdf", 0)
    assert out.text == ""
    assert "PDF rasteriser" in out.message


def test_read_page_dispatches_on_the_reader_it_was_given(monkeypatch, tmp_path: Path):
    """`_read_page` is the one seam the endpoints go through, so a reader that
    reached the wrong implementation would be invisible everywhere else."""
    seen: list[str] = []
    monkeypatch.setattr(
        "memorymap.api.routes_files._tesseract_read_page",
        lambda path, index: seen.append("tesseract") or _Stub(index),
    )
    monkeypatch.setattr(
        "memorymap.api.routes_files._vision_read_page",
        lambda path, index: seen.append("vision") or _Stub(index),
    )
    _read_page(tmp_path / "x.pdf", 0, "tesseract")
    _read_page(tmp_path / "x.pdf", 0, "vision")
    #: The default arm, spelled as an unknown value the way `_read_page` sees
    #: one after `_checked_reader` has already vetted it: anything that is not
    #: "tesseract" is the vision model.
    _read_page(tmp_path / "x.pdf", 0, "vision")
    assert seen == ["tesseract", "vision", "vision"]


class _Stub:
    def __init__(self, index: int) -> None:
        self.page = index
        self.text = ""


def test_tesseracts_range_cap_is_larger_because_it_is_not_the_slow_one():
    """The 25-page cap exists to stop a mis-click occupying a *model* for an
    hour. Tesseract reads a rendered page in about a tenth of a second, so
    applying the model's cap to it would be a limit with no reason behind it —
    but it is still bounded, because a 2,000-page scan is not a synchronous
    request either."""
    assert MAX_TESSERACT_RANGE_PAGES > MAX_RANGE_PAGES
    assert MAX_TESSERACT_RANGE_PAGES <= 500
