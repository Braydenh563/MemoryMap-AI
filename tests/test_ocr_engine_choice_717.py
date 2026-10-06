"""RapidOCR as a choice, not only Tesseract's stand-in (INBOX 717).

The owner: "does the ocr worspace give rapidocr as an alternative??" It did
not: RapidOCR read only when Tesseract was not ready (`ocr.engine()`). The
workspace's reader can now be "rapidocr" by name, and:

- it reads with RapidOCR even when Tesseract is ready;
- a named engine that is not installed is a 400 with the reason, never read
  by another engine under its name;
- "tesseract" (and naming nothing) keeps the automatic pick;
- the reading records which engine read it (`model`), and is stored under the
  local reader's id.

RapidOCR is faked: `rapidocr_available` and the line reader are monkeypatched.
"""

from __future__ import annotations

import io

import pytest
from fastapi import HTTPException

from memorymap.api import routes_files
from memorymap.core import ocr

PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x00"
    b"\x00\x00\x00:~\x9bU\x00\x00\x00\nIDATx\x9cc`\x00\x00\x00\x02\x00\x01"
    b"\xe2!\xbc3\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture
def both_ready(monkeypatch):
    """Tesseract ready, RapidOCR installed, each reader faked to say who it is."""
    monkeypatch.setattr(ocr, "tesseract_available", lambda: True)
    monkeypatch.setattr(ocr, "packages_available", lambda: True)
    monkeypatch.setattr(ocr, "rapidocr_available", lambda: True)
    monkeypatch.setattr(ocr, "_rapidocr_text", lambda path: "read by rapid")
    monkeypatch.setattr(ocr, "_rapidocr_regions", lambda path: {
        "width": 1, "height": 1, "engine": "rapidocr",
        "regions": [{"index": 0, "kind": "text", "text": "read by rapid", "confidence": 90.0,
                     "box": {"x": 0, "y": 0, "w": 1, "h": 1}}],
    })
    real_text = ocr.extract_text

    def text(path, choice=""):
        # Tesseract itself is not installed in CI: its half answers by name.
        if ocr.engine(choice) == "tesseract":
            return "read by tesseract"
        return real_text(path, choice)

    monkeypatch.setattr(ocr, "extract_text", text)
    return monkeypatch


def test_the_engine_choice_overrides_a_ready_tesseract(both_ready):
    assert ocr.engine() == "tesseract"
    assert ocr.engine("rapidocr") == "rapidocr"
    assert ocr.engine_name("rapidocr") == "RapidOCR"
    assert ocr.extract_text(PNG, "rapidocr") == "read by rapid"
    assert ocr.extract_text(PNG) == "read by tesseract"


def test_a_named_engine_that_is_missing_is_refused_with_its_reason(monkeypatch):
    monkeypatch.setattr(ocr, "rapidocr_available", lambda: False)
    assert ocr.engine("rapidocr") == ""
    assert "RapidOCR isn't installed" in ocr.unavailable_reason("rapidocr")
    with pytest.raises(HTTPException) as raised:
        routes_files._checked_reader("rapidocr")
    assert raised.value.status_code == 400
    assert "RapidOCR isn't installed" in raised.value.detail
    with pytest.raises(HTTPException) as raised:
        routes_files._checked_engine("rapidocr")
    assert raised.value.status_code == 400


def test_the_allow_list_holds(monkeypatch):
    monkeypatch.setattr(ocr, "rapidocr_available", lambda: True)
    assert routes_files._checked_reader("RapidOCR") == "rapidocr"
    assert routes_files._checked_reader("tesseract") == "tesseract"
    assert routes_files._checked_engine("") == ""
    assert routes_files._checked_engine("tesseract") == ""  # the automatic pick
    for bad in ("easyocr", "rapid"):
        with pytest.raises(HTTPException) as raised:
            routes_files._checked_reader(bad)
        assert raised.value.status_code == 400
        with pytest.raises(HTTPException):
            routes_files._checked_engine(bad)


def _upload_png(client) -> int:
    created = client.post(
        "/media/upload",
        files={"file": ("shot.png", io.BytesIO(PNG), "image/png")},
        data={"direct": "true"},
    )
    assert created.status_code == 200, created.text
    return created.json()["id"]


def test_an_image_read_with_rapidocr_by_name(client, both_ready):
    upload_id = _upload_png(client)
    chosen = client.post(f"/media/{upload_id}/ocr", json={"engine": "rapidocr"})
    assert chosen.status_code == 200, chosen.text
    assert chosen.json()["ocr_text"] == "read by rapid"
    automatic = client.post(f"/media/{upload_id}/ocr", json={})
    assert automatic.json()["ocr_text"] == "read by tesseract"


def test_an_image_read_with_a_missing_rapidocr_is_a_400(client, monkeypatch):
    monkeypatch.setattr(ocr, "rapidocr_available", lambda: False)
    upload_id = _upload_png(client)
    answer = client.post(f"/media/{upload_id}/ocr", json={"engine": "rapidocr"})
    assert answer.status_code == 400
    assert "RapidOCR isn't installed" in answer.json()["detail"]
    bad = client.post(f"/media/{upload_id}/ocr", json={"engine": "nonsense"})
    assert bad.status_code == 400


def test_a_first_look_can_name_rapidocr(client, both_ready):
    upload_id = _upload_png(client)
    body = client.get(f"/media/{upload_id}/ocr-regions?page=0&auto=1&engine=rapidocr").json()
    assert [r["text"] for r in body["regions"]] == ["read by rapid"]


def test_a_page_read_records_the_engine_that_read_it(client, both_ready, tmp_path, monkeypatch):
    """`_tesseract_read_page` with RapidOCR chosen: `model` says rapidocr, the
    stored row keeps the local reader's id."""
    monkeypatch.setattr(routes_files.pdfpages, "available", lambda: True)
    monkeypatch.setattr(routes_files.pdfpages, "page_count", lambda path: 2)
    monkeypatch.setattr(routes_files.pdfpages, "render_page", lambda path, index: PNG)
    stored: list[tuple] = []
    monkeypatch.setattr(
        routes_files, "_remember_page_read", lambda key, result, reader: stored.append((reader, result.model))
    )
    pdf = tmp_path / "scan.pdf"
    pdf.write_bytes(b"%PDF-1.4")
    out = routes_files._read_page(pdf, 1, "rapidocr", ("upload", 1))
    assert out.text == "read by rapid" and out.model == "rapidocr"
    assert stored == [("tesseract", "rapidocr")]
    out = routes_files._read_page(pdf, 0, "tesseract", ("upload", 1))
    assert out.text == "read by tesseract" and out.model == "tesseract"


def test_a_region_can_be_read_with_rapidocr(client, both_ready):
    created = client.post(
        "/media/upload", files={"file": ("deck.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")}
    )
    upload_id = created.json()["id"]
    answer = client.post(
        f"/media/{upload_id}/region-read",
        files={"crop": ("region.png", io.BytesIO(PNG), "image/png")},
        data={"page": "0", "mode": "read", "reader": "rapidocr"},
    )
    assert answer.status_code == 200, answer.text
    assert answer.json()["text"] == "read by rapid"
