"""Turning an uploaded document into notes, via markitdown (§37G).

*"I want to be able to upload documents and images"* — the sketch pad's image
upload (a canvas background layer, verified in Chromium rather than here,
since there's no DOM to drive from a Python test) is the other half of that
ask. This is the one the README's "Next up" list and `core/extras.py` already
named as a debt: markitdown installed and did nothing, because there was no
"bring in a PDF" button for it to sit behind.

Mirrors `tests/test_waveh_voice.py`'s convention: markitdown is optional,
like faster-whisper, so every test here fakes
`importer.markitdown_available`/`convert_to_markdown` rather than depending
on the real package — CLAUDE.md's dependency recipe doesn't install it, and
these tests must pass in that ordinary setup.
"""

from __future__ import annotations

from memorymap.api import routes_settings
from memorymap.entry import importer


def _upload(client, filename, content=b"fake bytes"):
    return client.post(
        "/import/document",
        files={"file": (filename, content, "application/octet-stream")},
    )


# --- split_into_sections: a pure function, no package needed -----------------


def test_no_headings_is_one_section():
    assert importer.split_into_sections("just some plain text") == ["just some plain text"]


def test_one_heading_is_still_one_section():
    """A single "# Page 1" from a plain-letter conversion must not turn one
    page into a note titled "Page 1" and nothing else."""
    text = "# Page 1\nHello there."
    assert importer.split_into_sections(text) == [text]


def test_multiple_headings_split_into_sections():
    text = "# One\nFirst.\n\n# Two\nSecond."
    assert importer.split_into_sections(text) == ["# One\nFirst.", "# Two\nSecond."]


def test_text_before_the_first_heading_is_its_own_section():
    text = "Some preamble.\n\n# One\nFirst.\n\n# Two\nSecond."
    sections = importer.split_into_sections(text)
    assert sections[0] == "Some preamble."
    assert len(sections) == 3


def test_empty_text_has_no_sections():
    assert importer.split_into_sections("   ") == []


# --- the endpoint, markitdown faked like faster-whisper is elsewhere ---------


def test_not_available_is_503_with_hint(client, monkeypatch):
    monkeypatch.setattr(importer, "markitdown_available", lambda: False)
    response = _upload(client, "notes.pdf")
    assert response.status_code == 503
    assert "markitdown" in response.json()["detail"]


def test_a_single_note_document(client, monkeypatch):
    monkeypatch.setattr(importer, "markitdown_available", lambda: True)
    monkeypatch.setattr(importer, "convert_to_markdown", lambda path: "Just one plain note.")
    response = _upload(client, "letter.pdf")
    assert response.status_code == 201
    assert response.json() == {"imported": 1, "truncated": False, "filename": "letter.pdf"}

    entry = client.get("/entries").json()[0]
    assert entry["content"] == "Just one plain note."
    assert entry["category"] == "Imports"
    assert entry["tags"] == ["imported"]
    assert entry["user_filed"] is True  # the file said where it came from


def test_a_multi_section_deck_becomes_several_notes(client, monkeypatch):
    monkeypatch.setattr(importer, "markitdown_available", lambda: True)
    monkeypatch.setattr(
        importer,
        "convert_to_markdown",
        lambda path: "# Slide one\nFirst.\n\n# Slide two\nSecond.",
    )
    response = _upload(client, "deck.pptx")
    assert response.json()["imported"] == 2
    contents = {e["content"] for e in client.get("/entries").json()}
    assert contents == {"# Slide one\nFirst.", "# Slide two\nSecond."}


def test_a_huge_deck_is_capped_and_says_so(client, monkeypatch):
    monkeypatch.setattr(importer, "markitdown_available", lambda: True)
    monkeypatch.setattr(routes_settings, "MAX_DOCUMENT_IMPORT_NOTES", 3)
    many = "\n\n".join(f"# Slide {n}\nText {n}." for n in range(10))
    monkeypatch.setattr(importer, "convert_to_markdown", lambda path: many)
    response = _upload(client, "deck.pptx")
    body = response.json()
    assert body["imported"] == 3
    assert body["truncated"] is True


def test_a_file_with_no_readable_text_is_refused(client, monkeypatch):
    monkeypatch.setattr(importer, "markitdown_available", lambda: True)
    monkeypatch.setattr(importer, "convert_to_markdown", lambda path: "   ")
    response = _upload(client, "blank.pdf")
    assert response.status_code == 422


def test_a_conversion_failure_is_422_not_500(client, monkeypatch):
    monkeypatch.setattr(importer, "markitdown_available", lambda: True)

    def _boom(path):
        raise ValueError("not a real PDF")

    monkeypatch.setattr(importer, "convert_to_markdown", _boom)
    response = _upload(client, "corrupt.pdf")
    assert response.status_code == 422


def test_an_oversized_file_is_413(client, monkeypatch):
    monkeypatch.setattr(importer, "markitdown_available", lambda: True)
    monkeypatch.setattr(routes_settings, "MAX_DOCUMENT_IMPORT_BYTES", 10)
    response = _upload(client, "big.pdf", content=b"x" * 100)
    assert response.status_code == 413


def test_an_empty_upload_is_refused(client, monkeypatch):
    monkeypatch.setattr(importer, "markitdown_available", lambda: True)
    response = _upload(client, "empty.pdf", content=b"")
    assert response.status_code == 400
