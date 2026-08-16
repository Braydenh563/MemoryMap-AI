"""`/media`: uploads are tracked, not just written to disk, and the folder is
not a script host — asked for and found directly (§40 open item 6).

Split out of test_antigravity_regressions.py.
"""

from __future__ import annotations


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
