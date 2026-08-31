"""`/media`: uploads are tracked, not just written to disk, and the folder is
not a script host — asked for and found directly (§40 open item 6).

Split out of test_antigravity_regressions.py.
"""

from __future__ import annotations

from memorymap.api import routes_files


def test_media_upload_does_not_process_a_staged_upload_by_default(ai_client, monkeypatch):
    """Asked for directly, correcting this session's own earlier choice:
    "the OCR shouldn't happen to staged files, only when they are actually
    saved as a note, actually sent in a chat message, or uploaded directly
    to the library." A plain upload (no `direct`) is the staged case —
    OCR/captioning/vision-OCR must not run until something actually
    commits it (see test_media_process.py for those trigger points)."""
    calls = []
    monkeypatch.setattr(
        routes_files.media_process,
        "process_committed_upload",
        lambda upload, media_dir: calls.append(upload.id),
    )
    response = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    )
    assert response.status_code == 200
    assert calls == []


def test_media_upload_with_direct_processes_immediately(ai_client, monkeypatch):
    """The Library's own "Upload images" button has no separate staging
    step — the upload itself is the commit, so `direct=true` (the form
    field it sends) processes right away, same as every upload used to."""
    calls = []
    monkeypatch.setattr(
        routes_files.media_process,
        "process_committed_upload",
        lambda upload, media_dir: calls.append(upload.id),
    )
    response = ai_client.post(
        "/media/upload",
        files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")},
        data={"direct": "true"},
    )
    assert response.status_code == 200
    assert calls == [response.json()["id"]]


def test_media_upload_never_processes_a_pdf_even_with_direct(ai_client, monkeypatch):
    """process_committed_upload itself guards by suffix (OCR_SUFFIXES etc.)
    — a PDF upload reaching it is a no-op, not an error; covered directly
    in test_media_process.py. This just confirms `direct=true` doesn't
    bypass the 415 that already refuses non-image/PDF types elsewhere."""
    response = ai_client.post(
        "/media/upload",
        files={"file": ("scan.pdf", b"%PDF-1.4", "application/pdf")},
        data={"direct": "true"},
    )
    assert response.status_code == 200


def test_media_list_and_upload_include_ocr_text(ai_client):
    """`ocr_text` is always a string over the wire, never null, so the
    frontend gallery's substring filter never needs a null check."""
    response = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    )
    listed = ai_client.get("/media").json()
    row = next(r for r in listed if r["id"] == response.json()["id"])
    assert row["ocr_text"] == ""


# --- manual OCR retry + edit (core/ocr.py) -----------------------------------


def test_ocr_media_retries_extraction(ai_client, monkeypatch):
    """Asked for directly: "allow for manual OCR extraction or retries."
    ocr.extract_and_store has no write-once guard, so a plain POST always
    re-reads the image — this only checks the retry actually ran and its
    result made it back onto the row (see test_ocr.py for extract_text
    itself)."""
    import memorymap.core.ocr as ocr_module

    monkeypatch.setattr(ocr_module, "extract_text", lambda path: "retried text")
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["id"]

    response = ai_client.post(f"/media/{upload_id}/ocr")
    assert response.status_code == 200
    assert response.json()["ocr_text"] == "retried text"


def test_ocr_media_can_be_edited_by_hand(ai_client):
    """"allow the user to access, view, and edit OCR extracted text" — same
    manual-text-override shape as CaptionBody.text."""
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["id"]

    response = ai_client.post(f"/media/{upload_id}/ocr", json={"text": "corrected by hand"})
    assert response.status_code == 200
    assert response.json()["ocr_text"] == "corrected by hand"

    listed = ai_client.get("/media").json()
    row = next(r for r in listed if r["id"] == upload_id)
    assert row["ocr_text"] == "corrected by hand"


def test_ocr_media_clears_with_empty_text(ai_client):
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["id"]
    ai_client.post(f"/media/{upload_id}/ocr", json={"text": "something"})

    response = ai_client.post(f"/media/{upload_id}/ocr", json={"text": "   "})
    assert response.json()["ocr_text"] == ""


def test_ocr_media_refuses_a_pdf(ai_client):
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("scan.pdf", b"%PDF-1.4", "application/pdf")}
    ).json()["id"]
    response = ai_client.post(f"/media/{upload_id}/ocr")
    assert response.status_code == 415


def test_ocr_media_404s_for_an_unknown_id(ai_client):
    assert ai_client.post("/media/999999/ocr").status_code == 404


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


def test_media_upload_still_accepts_a_pdf_without_direct(ai_client):
    """A staged PDF upload — nothing here processes it either way (PDFs
    aren't in any of the three SUFFIXES sets yet), but the 415 gate for
    "is this an accepted type at all" must still pass it regardless of
    `direct`."""
    response = ai_client.post(
        "/media/upload", files={"file": ("scan.pdf", b"%PDF-1.4", "application/pdf")}
    )
    assert response.status_code == 200


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


# --- vision OCR (ai/vision_ocr.py) -------------------------------------------


def test_media_list_and_upload_include_vision_ocr_fields(ai_client):
    response = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    )
    listed = ai_client.get("/media").json()
    row = next(r for r in listed if r["id"] == response.json()["id"])
    assert row["vision_ocr_text"] == ""
    assert row["vision_ocr_model"] == ""


def test_vision_ocr_media_reads_text(ai_client, fake_ollama):
    fake_ollama.capabilities_declared = ["vision"]
    fake_ollama.librarian_reply = "Room 204"
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["id"]
    response = ai_client.post(f"/media/{upload_id}/vision-ocr")
    assert response.status_code == 200
    assert response.json()["vision_ocr_text"] == "Room 204"
    assert response.json()["vision_ocr_model"]


def test_vision_ocr_media_wont_reread_without_force(ai_client, fake_ollama):
    fake_ollama.capabilities_declared = ["vision"]
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["id"]
    ai_client.post(f"/media/{upload_id}/vision-ocr")
    calls_before = len(fake_ollama.chat_calls)
    response = ai_client.post(f"/media/{upload_id}/vision-ocr")
    assert response.status_code == 200
    assert len(fake_ollama.chat_calls) == calls_before


def test_vision_ocr_media_force_rereads(ai_client, fake_ollama):
    fake_ollama.capabilities_declared = ["vision"]
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["id"]
    ai_client.post(f"/media/{upload_id}/vision-ocr")
    calls_before = len(fake_ollama.chat_calls)
    response = ai_client.post(f"/media/{upload_id}/vision-ocr", json={"force": True})
    assert response.status_code == 200
    assert len(fake_ollama.chat_calls) == calls_before + 1


def test_vision_ocr_media_refuses_a_pdf(ai_client, fake_ollama):
    fake_ollama.capabilities_declared = ["vision"]
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("scan.pdf", b"%PDF-1.4", "application/pdf")}
    ).json()["id"]
    response = ai_client.post(f"/media/{upload_id}/vision-ocr")
    assert response.status_code == 415


def test_vision_ocr_media_reports_no_vision_model_available(ai_client, fake_ollama):
    fake_ollama.capabilities_declared = []
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["id"]
    response = ai_client.post(f"/media/{upload_id}/vision-ocr")
    assert response.status_code == 409


def test_vision_ocr_media_404s_for_an_unknown_id(ai_client, fake_ollama):
    assert ai_client.post("/media/999999/vision-ocr").status_code == 404


# --- manual caption input, asked for directly --------------------------------


def test_a_caption_can_be_typed_by_hand(ai_client, fake_ollama):
    """`text` sets the caption directly and needs no model at all — a
    person editing a caption is not asking for a second opinion."""
    fake_ollama.capabilities_declared = []  # no vision model available
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["id"]
    response = ai_client.post(f"/media/{upload_id}/caption", json={"text": "A hand-typed caption"})
    assert response.status_code == 200
    assert response.json()["caption"] == "A hand-typed caption"
    assert response.json()["caption_edited"] is True
    assert len(fake_ollama.chat_calls) == 0  # never asked the model


def test_a_hand_typed_caption_overwrites_an_existing_one_without_force(ai_client, fake_ollama):
    """Manual edit bypasses the write-once guard entirely — that guard
    exists to protect against silent *automatic* rewrites, not a person
    who deliberately opened the field and typed something."""
    fake_ollama.capabilities_declared = ["vision"]
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["id"]
    ai_client.post(f"/media/{upload_id}/caption")  # AI-generated first
    response = ai_client.post(f"/media/{upload_id}/caption", json={"text": "corrected by hand"})
    assert response.json()["caption"] == "corrected by hand"
    assert response.json()["caption_edited"] is True
    # Which model wrote the pre-edit caption is kept, not cleared — the
    # badge can still credit it alongside "edited" (see
    # MediaUpload.caption_edited's docstring for why).
    assert response.json()["caption_model"]


def test_an_empty_typed_caption_clears_it(ai_client, fake_ollama):
    fake_ollama.capabilities_declared = ["vision"]
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["id"]
    ai_client.post(f"/media/{upload_id}/caption")
    response = ai_client.post(f"/media/{upload_id}/caption", json={"text": "   "})
    assert response.json()["caption"] == ""
    # A full reset, not a caption with nothing to show for who last wrote one.
    assert response.json()["caption_edited"] is False
    assert response.json()["caption_model"] == ""


def test_a_hand_typed_caption_works_on_a_pdf_upload_target_refused(ai_client, fake_ollama):
    """Manual text still goes through the same suffix guard as generation —
    typing a caption for a PDF is refused the same way, for the same
    reason (this endpoint is images only)."""
    upload_id = ai_client.post(
        "/media/upload", files={"file": ("scan.pdf", b"%PDF-1.4", "application/pdf")}
    ).json()["id"]
    response = ai_client.post(f"/media/{upload_id}/caption", json={"text": "a caption"})
    assert response.status_code == 415


def test_media_meta_returns_what_the_app_knows_about_one_upload(ai_client):
    """The lightbox's own lookup, keyed on the stored filename because a url
    is the only identifier most callers hold.

    Reported directly: a caption and OCR text showed under the picture in
    the Image Gallery and nowhere else in the app. The cause was that
    `openLightbox` took them as arguments and only the gallery had a media
    row to pass — so this endpoint exists to let the lightbox ask instead.
    """
    uploaded = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()
    stored = uploaded["url"].rsplit("/", 1)[-1]

    body = ai_client.get(f"/media/meta/{stored}").json()
    assert body["id"] == uploaded["id"]
    assert body["original_name"] == "shot.png"
    assert body["url"] == uploaded["url"]
    # The fields the lightbox actually renders are all present, even empty.
    for key in ("caption", "ocr_text", "vision_ocr_text", "created_at"):
        assert key in body


def test_media_meta_404s_rather_than_shadowing_the_upload_id_route(ai_client):
    """Two things at once, both real.

    A url can outlive its row — deleting an upload deliberately leaves any
    note still pointing at it alone — so a miss is an ordinary state the
    lightbox renders as "no panel", not a fault.

    And a 404 (rather than a 422) is what proves the route is not being
    shadowed: declared after `/media/{upload_id}`, "meta" would be parsed as
    an upload id and rejected as a non-integer before this handler ever ran.
    That is the same ordering trap `/media/orphans` already carries a
    comment about.
    """
    assert ai_client.get("/media/meta/never-existed.png").status_code == 404
