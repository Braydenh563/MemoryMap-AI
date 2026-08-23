"""Local OCR text extraction (core/ocr.py, ROADMAP.md item 30d).

Never touches a real Tesseract binary or a real image file: every test
mocks `shutil.which` and (where needed) `pytesseract`/`PIL.Image` so this
suite runs identically whether or not Tesseract happens to be installed on
the machine running it — the same reasoning `find_system_python`'s own
tests use for not depending on the real system Python being anything in
particular.
"""

from __future__ import annotations

import sys
from pathlib import Path

from memorymap.core import ocr


def test_tesseract_available_reflects_shutil_which(monkeypatch):
    monkeypatch.setattr(ocr.shutil, "which", lambda name: "/usr/bin/tesseract")
    assert ocr.tesseract_available() is True

    monkeypatch.setattr(ocr.shutil, "which", lambda name: None)
    assert ocr.tesseract_available() is False


def test_extract_text_returns_empty_and_never_raises_when_the_binary_is_missing(monkeypatch):
    monkeypatch.setattr(ocr, "_binary_missing_logged", False)
    monkeypatch.setattr(ocr.shutil, "which", lambda name: None)
    assert ocr.extract_text(Path("/does/not/exist.png")) == ""
    # Logged once, not raised — the "once per process, not once per
    # upload" contract this module's own docstring promises.
    assert ocr._binary_missing_logged is True


def test_extract_text_returns_the_real_text_on_success(monkeypatch, tmp_path):
    monkeypatch.setattr(ocr.shutil, "which", lambda name: "/usr/bin/tesseract")

    class _FakeImage:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    class _FakePytesseract:
        @staticmethod
        def image_to_string(img):
            return "  buy oat milk tuesday  \n"

    fake_image_module = type(
        "M", (), {"open": staticmethod(lambda path: _FakeImage())}
    )
    monkeypatch.setitem(
        sys.modules, "pytesseract", _FakePytesseract()
    )
    monkeypatch.setitem(sys.modules, "PIL", type("P", (), {"Image": fake_image_module}))
    monkeypatch.setitem(sys.modules, "PIL.Image", fake_image_module)

    image_path = tmp_path / "whiteboard.png"
    image_path.write_bytes(b"not a real image, mocked open() ignores this")
    assert ocr.extract_text(image_path) == "buy oat milk tuesday"


def test_extract_text_never_raises_on_a_corrupt_or_unreadable_image(monkeypatch, tmp_path):
    monkeypatch.setattr(ocr.shutil, "which", lambda name: "/usr/bin/tesseract")

    class _FakeImageModule:
        @staticmethod
        def open(path):
            raise OSError("cannot identify image file")

    monkeypatch.setitem(sys.modules, "pytesseract", type("P", (), {}))
    monkeypatch.setitem(
        sys.modules, "PIL", type("P", (), {"Image": _FakeImageModule})
    )
    monkeypatch.setitem(sys.modules, "PIL.Image", _FakeImageModule)

    bad = tmp_path / "corrupt.png"
    bad.write_bytes(b"garbage")
    assert ocr.extract_text(bad) == ""


def test_extract_and_store_writes_ocr_text_onto_the_row(app_state, session, monkeypatch, tmp_path):
    from memorymap.core.database import MediaUpload

    upload = MediaUpload(filename="a.png", original_name="a.png")
    session.add(upload)
    session.commit()
    session.refresh(upload)
    upload_id = upload.id
    session.close()

    monkeypatch.setattr(ocr, "extract_text", lambda path: "found text")
    ocr.extract_and_store(upload_id, tmp_path / "a.png")

    from memorymap.core import deps

    with deps.get_db().session() as check:
        reloaded = check.get(MediaUpload, upload_id)
        assert reloaded.ocr_text == "found text"


def test_extract_and_store_does_nothing_when_no_text_was_found(app_state, session, monkeypatch, tmp_path):
    from memorymap.core.database import MediaUpload

    upload = MediaUpload(filename="b.png", original_name="b.png")
    session.add(upload)
    session.commit()
    session.refresh(upload)
    upload_id = upload.id
    session.close()

    monkeypatch.setattr(ocr, "extract_text", lambda path: "")
    ocr.extract_and_store(upload_id, tmp_path / "b.png")

    from memorymap.core import deps

    with deps.get_db().session() as check:
        reloaded = check.get(MediaUpload, upload_id)
        assert reloaded.ocr_text is None


def test_extract_and_store_does_not_blow_up_if_the_upload_was_deleted_first(
    app_state, monkeypatch, tmp_path
):
    """A race is possible: OCR is still running when the row it would write
    to has already been deleted (DELETE /media/{id}). Must not raise."""
    monkeypatch.setattr(ocr, "extract_text", lambda path: "found text")
    ocr.extract_and_store(999999, tmp_path / "gone.png")  # no such row — must not raise
