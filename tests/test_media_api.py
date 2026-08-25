"""`/media`: uploads are tracked, not just written to disk, and the folder is
not a script host — asked for and found directly (§40 open item 6).

Split out of test_antigravity_regressions.py.
"""

from __future__ import annotations

from memorymap.api import routes_files


def test_media_upload_triggers_background_ocr_for_an_image(ai_client, monkeypatch):
    """ROADMAP.md item 30d — OCR runs in the background, never on the
    request itself, so this only checks it was *asked to start*, not that
    it finished (see test_ocr.py for the extraction logic itself)."""
    calls = []
    monkeypatch.setattr(
        routes_files.ocr, "extract_in_background", lambda upload_id, path: calls.append((upload_id, path))
    )
    response = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    )
    assert response.status_code == 200
    assert len(calls) == 1
    assert calls[0][0] == response.json()["id"]


def test_media_upload_never_triggers_ocr_for_a_pdf(ai_client, monkeypatch):
    """Tesseract can't OCR a PDF directly (no page-rasterisation step here
    — see ocr.py's own docstring) — a PDF upload must never even try."""
    calls = []
    monkeypatch.setattr(
        routes_files.ocr, "extract_in_background", lambda upload_id, path: calls.append((upload_id, path))
    )
    response = ai_client.post(
        "/media/upload", files={"file": ("scan.pdf", b"%PDF-1.4", "application/pdf")}
    )
    assert response.status_code == 200
    assert calls == []


def test_media_list_and_upload_include_ocr_text(ai_client):
    """`ocr_text` is always a string over the wire, never null, so the
    frontend gallery's substring filter never needs a null check."""
    response = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    )
    listed = ai_client.get("/media").json()
    row = next(r for r in listed if r["id"] == response.json()["id"])
    assert row["ocr_text"] == ""


def test_media_upload_refuses_anything_that_is_not_an_image(ai_client):
    """`/media/{name}` serves from the app's own origin, so an .html or .svg
    landing here runs with the notebook's token rather than being a picture.
    The AI can write into this folder too, which is what makes it worth
    closing on a single-user local app."""
    for name, mime in [("x.html", "text/html"), ("x.svg", "image/svg+xml")]:
        response = ai_client.post(
            "/media/upload", files={"file": (name, b"<svg onload=alert(1)>", mime)}
        )
        assert response.status_code == 415, name


def test_media_upload_still_takes_a_png(ai_client):
    response = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    )
    assert response.status_code == 200
    assert response.json()["url"].startswith("/media/")


def test_an_upload_is_tracked_listed_and_deletable(ai_client):
    """An image pasted into a note's own markdown had no DB row at all — it
    could not be listed in a gallery, could not be deleted, and there was
    no way to tell "still referenced" apart from "already gone off disk"
    (ROADMAP.md item 20a). `MediaUpload` closes that gap for every upload,
    not just whiteboard image objects."""
    uploaded = ai_client.post(
        "/media/upload", files={"file": ("photo.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()

    listed = ai_client.get("/media").json()
    assert any(row["url"] == uploaded["url"] and row["original_name"] == "photo.png" for row in listed)

    upload_id = next(row["id"] for row in listed if row["url"] == uploaded["url"])
    deleted = ai_client.delete(f"/media/{upload_id}")
    assert deleted.status_code == 200

    # The row and the file are both gone.
    assert not any(row["id"] == upload_id for row in ai_client.get("/media").json())
    assert ai_client.get(uploaded["url"]).status_code == 404


def test_deleting_an_unknown_upload_404s(ai_client):
    # CodeQL py/side-effect-in-assert: the DELETE call is a side effect, and
    # an assert's own expression is skipped entirely under `python -O` —
    # split so the request always fires regardless of optimization flags.
    response = ai_client.delete("/media/999999")
    assert response.status_code == 404


def test_media_is_served_with_a_disposition_header(ai_client):
    url = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["url"]
    served = ai_client.get(url)
    assert served.status_code == 200
    assert "inline" in served.headers["content-disposition"]


def test_a_dangerous_file_already_on_disk_is_still_not_served(ai_client, app_state):
    """Upload is not the only way into this folder — a restored backup or a
    synced data directory is another — so the suffix is checked on the way out
    as well as on the way in."""
    media = app_state.data_dir / "media"
    media.mkdir(parents=True, exist_ok=True)
    (media / "evil.html").write_text("<script>alert(1)</script>", encoding="utf-8")
    assert ai_client.get("/media/evil.html").status_code == 404


# --- captioning (ai/captioning.py) -------------------------------------------


def test_media_upload_triggers_background_captioning_for_an_image(ai_client, monkeypatch):
    """Same shape as the OCR trigger test above — this only checks
    captioning was *asked to start*, not that it produced anything (see
    test_captioning.py for that). Whether a vision model exists is decided
    inside the background call itself, not on the request path, so the
    trigger fires unconditionally for a raster image."""
    calls = []
    monkeypatch.setattr(
        routes_files.captioning,
        "caption_in_background",
        lambda upload_id, path: calls.append((upload_id, path)),
    )
    response = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    )
    assert response.status_code == 200
    assert len(calls) == 1
    assert calls[0][0] == response.json()["id"]


def test_media_upload_never_triggers_captioning_for_a_pdf(ai_client, monkeypatch):
    calls = []
    monkeypatch.setattr(
        routes_files.captioning,
        "caption_in_background",
        lambda upload_id, path: calls.append((upload_id, path)),
    )
    ai_client.post(
        "/media/upload", files={"file": ("scan.pdf", b"%PDF-1.4", "application/pdf")}
    )
    assert calls == []


def test_media_list_and_upload_include_caption(ai_client):
    response = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    )
    listed = ai_client.get("/media").json()
    row = next(r for r in listed if r["id"] == response.json()["id"])
    assert row["caption"] == ""


def test_caption_media_generates_a_caption(ai_client, fake_ollama):
    fake_ollama.capabilities_declared = ["vision"]
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["id"]
    response = ai_client.post(f"/media/{upload_id}/caption")
    assert response.status_code == 200
    assert response.json()["caption"] == fake_ollama.librarian_reply


def test_caption_media_wont_rewrite_without_force(ai_client, fake_ollama):
    fake_ollama.capabilities_declared = ["vision"]
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["id"]
    ai_client.post(f"/media/{upload_id}/caption")
    calls_before = len(fake_ollama.chat_calls)
    response = ai_client.post(f"/media/{upload_id}/caption")
    assert response.status_code == 200
    assert len(fake_ollama.chat_calls) == calls_before  # never asked the model again


def test_caption_media_force_regenerates(ai_client, fake_ollama):
    fake_ollama.capabilities_declared = ["vision"]
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["id"]
    ai_client.post(f"/media/{upload_id}/caption")
    calls_before = len(fake_ollama.chat_calls)
    response = ai_client.post(f"/media/{upload_id}/caption", json={"force": True})
    assert response.status_code == 200
    assert len(fake_ollama.chat_calls) == calls_before + 1


def test_caption_media_refuses_a_pdf(ai_client, fake_ollama):
    fake_ollama.capabilities_declared = ["vision"]
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("scan.pdf", b"%PDF-1.4", "application/pdf")}
    ).json()["id"]
    response = ai_client.post(f"/media/{upload_id}/caption")
    assert response.status_code == 415


def test_caption_media_reports_no_vision_model_available(ai_client, fake_ollama):
    fake_ollama.capabilities_declared = []  # nothing declares vision
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["id"]
    response = ai_client.post(f"/media/{upload_id}/caption")
    assert response.status_code == 409


def test_caption_media_404s_for_an_unknown_id(ai_client, fake_ollama):
    assert ai_client.post("/media/999999/caption").status_code == 404
