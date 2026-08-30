"""core/media_process.py — where OCR/captioning/vision-OCR actually fire
now that they no longer run automatically on `/media/upload` itself.

Asked for directly, correcting this session's own earlier choice: "the OCR
shouldn't happen to staged files, only when they are actually saved as a
note, actually sent in a chat message, or uploaded directly to the
library." These tests cover the module's own three entry points directly;
test_media_api.py covers the upload route's `direct` flag, and the
per-route tests below cover each of the three "committed" moments actually
triggering it end to end.
"""

from __future__ import annotations

from memorymap.ai import captioning, vision_ocr
from memorymap.core import media_process, ocr
from memorymap.core.database import MediaUpload


def _upload(session, filename="a.png") -> MediaUpload:
    row = MediaUpload(filename=filename, original_name=filename)
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def test_process_committed_upload_triggers_all_three_readers_for_an_image(
    session, tmp_path, monkeypatch
):
    # `process_committed_upload` imports these three lazily (the CodeQL
    # cyclic-import fix), so the names it calls are the real modules'
    # attributes, not attributes of `media_process` itself — patch those.
    calls = []
    monkeypatch.setattr(ocr, "extract_in_background", lambda *a: calls.append("ocr"))
    monkeypatch.setattr(
        captioning, "caption_in_background", lambda *a: calls.append("caption")
    )
    monkeypatch.setattr(
        vision_ocr, "vision_ocr_in_background", lambda *a: calls.append("vision_ocr")
    )
    upload = _upload(session)
    media_process.process_committed_upload(upload, tmp_path)
    assert set(calls) == {"ocr", "caption", "vision_ocr"}


def test_process_committed_upload_does_nothing_for_an_unsupported_suffix(
    session, tmp_path, monkeypatch
):
    calls = []
    monkeypatch.setattr(ocr, "extract_in_background", lambda *a: calls.append("ocr"))
    monkeypatch.setattr(
        captioning, "caption_in_background", lambda *a: calls.append("caption")
    )
    monkeypatch.setattr(
        vision_ocr, "vision_ocr_in_background", lambda *a: calls.append("vision_ocr")
    )
    upload = _upload(session, filename="scan.pdf")
    media_process.process_committed_upload(upload, tmp_path)
    assert calls == []


def test_process_referenced_uploads_finds_media_by_filename_in_text(
    session, tmp_path, monkeypatch
):
    from memorymap.core import media_process as mp

    calls = []
    monkeypatch.setattr(
        mp, "process_committed_upload", lambda upload, media_dir: calls.append(upload.id)
    )
    upload = _upload(session, filename="hash123.png")
    other = _upload(session, filename="unrelated.png")

    media_process.process_referenced_uploads(
        session, tmp_path, f"a note with ![img](/media/{upload.filename})"
    )
    assert calls == [upload.id]
    assert other.id not in calls


def test_process_referenced_uploads_does_nothing_for_unreferenced_text(
    session, tmp_path, monkeypatch
):
    from memorymap.core import media_process as mp

    calls = []
    monkeypatch.setattr(
        mp, "process_committed_upload", lambda upload, media_dir: calls.append(upload.id)
    )
    _upload(session, filename="never-mentioned.png")
    media_process.process_referenced_uploads(session, tmp_path, "just plain text, no images")
    assert calls == []


def test_process_committed_upload_ids_finds_media_by_id(session, tmp_path, monkeypatch):
    from memorymap.core import media_process as mp

    calls = []
    monkeypatch.setattr(
        mp, "process_committed_upload", lambda upload, media_dir: calls.append(upload.id)
    )
    upload = _upload(session)
    media_process.process_committed_upload_ids(session, tmp_path, [upload.id])
    assert calls == [upload.id]


def test_process_committed_upload_ids_does_nothing_for_an_empty_list(
    session, tmp_path, monkeypatch
):
    from memorymap.core import media_process as mp

    calls = []
    monkeypatch.setattr(
        mp, "process_committed_upload", lambda upload, media_dir: calls.append(upload.id)
    )
    media_process.process_committed_upload_ids(session, tmp_path, [])
    assert calls == []


# --- end-to-end: each of the three "committed" moments ----------------------


def test_saving_a_note_processes_its_referenced_upload(ai_client, monkeypatch):
    import memorymap.core.media_process as mp

    calls = []
    monkeypatch.setattr(
        mp, "process_referenced_uploads", lambda session, media_dir, text: calls.append(text)
    )
    uploaded = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()
    ai_client.post("/entries", json={"content": f"look: ![img]({uploaded['url']})"})
    assert any(uploaded["url"] in text for text in calls)


def test_saving_a_document_processes_its_referenced_upload(ai_client, monkeypatch):
    import memorymap.core.media_process as mp

    calls = []
    monkeypatch.setattr(
        mp, "process_referenced_uploads", lambda session, media_dir, text: calls.append(text)
    )
    uploaded = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()
    ai_client.post(
        "/documents", json={"title": "Doc", "content": f"![img]({uploaded['url']})"}
    )
    assert any(uploaded["url"] in text for text in calls)


def test_updating_a_document_with_new_content_processes_its_upload(ai_client, monkeypatch):
    import memorymap.core.media_process as mp

    calls = []
    monkeypatch.setattr(
        mp, "process_referenced_uploads", lambda session, media_dir, text: calls.append(text)
    )
    created = ai_client.post("/documents", json={"title": "Doc", "content": "empty"}).json()
    calls.clear()
    uploaded = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()
    ai_client.put(
        f"/documents/{created['id']}",
        json={"content": f"![img]({uploaded['url']})"},
    )
    assert any(uploaded["url"] in text for text in calls)


def test_saving_a_chat_turn_processes_its_attached_image(ai_client, monkeypatch):
    import memorymap.core.media_process as mp

    calls = []
    monkeypatch.setattr(
        mp,
        "process_committed_upload_ids",
        lambda session, media_dir, media_ids: calls.append(media_ids),
    )
    uploaded = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()
    ai_client.post(
        "/conversations",
        json={"question": "what's this?", "answer": "a photo", "image_media_ids": [uploaded["id"]]},
    )
    assert calls == [[uploaded["id"]]]


def test_creating_a_whiteboard_image_object_processes_its_upload(ai_client, monkeypatch):
    import memorymap.core.media_process as mp

    calls = []
    monkeypatch.setattr(
        mp, "process_referenced_uploads", lambda session, media_dir, text: calls.append(text)
    )
    uploaded = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()
    ai_client.post(
        "/whiteboard/objects",
        json={"kind": "image", "data": {"url": uploaded["url"]}, "board_id": None},
    )
    assert any(uploaded["url"] in text for text in calls)
