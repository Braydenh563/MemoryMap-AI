"""A regions cache stored before words were kept says how to get Live Text
(ledger libr-1011 row 1228).

Before 2026-10-10 the stored regions carried boxes and no `words`, so the
transparent word layer over the picture (Live Text) stayed empty with no
reason given. A cached answer with regions and no word anywhere now carries a
one-line message; a cache that has words, and a fresh read, say nothing."""

from __future__ import annotations

import json
from pathlib import Path

from memorymap.core import ocr

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32
BOX = {"x": 0.1, "y": 0.1, "w": 0.5, "h": 0.2}


def _reader(monkeypatch, words):
    def fake(path: Path):
        region = {"index": 0, "kind": "text", "text": "Hello world", "confidence": 90.0, "box": BOX}
        if words:
            region["words"] = [{"text": "Hello", "x": 0.1, "y": 0.1, "w": 0.2, "h": 0.2}]
        return {"width": 200, "height": 100, "regions": [region]}

    monkeypatch.setattr(ocr, "extract_regions", fake)


def _attach(client) -> int:
    created = client.post("/entries", json={"content": "host note"}).json()
    upload = client.post(
        f"/entries/{created['id']}/files", files={"file": ("scan.png", PNG, "application/octet-stream")}
    )
    assert upload.status_code == 201, upload.text
    return upload.json()["attachments"][-1]["id"]


def _strip_words_from_the_cache(attachment_id: int) -> None:
    """Make the stored cache look like one written before words were kept."""
    from memorymap.core import deps
    from memorymap.core.database import PageRead

    with deps.get_db().session() as session:
        row = session.query(PageRead).filter(PageRead.kind == "attachment", PageRead.source_id == attachment_id).one()
        body = json.loads(row.regions)
        for region in body["regions"]:
            region.pop("words", None)
        row.regions = json.dumps(body)
        session.commit()


def test_a_cache_from_before_words_says_to_read_again(client, monkeypatch):
    _reader(monkeypatch, words=False)
    attachment_id = _attach(client)
    fresh = client.get(f"/files/{attachment_id}/ocr-regions").json()
    _strip_words_from_the_cache(attachment_id)
    old = client.get(f"/files/{attachment_id}/ocr-regions").json()
    assert fresh["message"] == ""
    assert old["message"] == "Read this page again to select its words on the picture."


def test_a_reader_that_found_no_words_is_not_an_old_cache(client, monkeypatch):
    _reader(monkeypatch, words=False)
    attachment_id = _attach(client)
    client.get(f"/files/{attachment_id}/ocr-regions")
    again = client.get(f"/files/{attachment_id}/ocr-regions").json()
    assert again["message"] == ""


def test_a_cache_with_words_says_nothing(client, monkeypatch):
    _reader(monkeypatch, words=True)
    attachment_id = _attach(client)
    client.get(f"/files/{attachment_id}/ocr-regions")
    cached = client.get(f"/files/{attachment_id}/ocr-regions").json()
    assert cached["message"] == ""
    assert cached["regions"][0]["words"]
