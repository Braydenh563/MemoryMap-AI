"""`GET /media` reports each upload's size on disk.

Asked for directly, in the Files sub-tab redesign: "there should be details
on the name... file details such as the type, size, topic/category". The
schema comment on `created_at` had explicitly declined to carry a byte count
("a number nobody asked for"); this is the request that reverses it, so the
test pins the number rather than leaving it to the comment.
"""
from __future__ import annotations

import io


def _upload(client, name: str, blob: bytes) -> dict:
    response = client.post("/media/upload", files={"file": (name, io.BytesIO(blob), "image/png")})
    assert response.status_code == 200, response.text
    return response.json()


def test_the_gallery_reports_the_real_byte_count(client):
    blob = b"x" * 4321
    _upload(client, "sized.png", blob)
    row = next(r for r in client.get("/media").json() if r["original_name"] == "sized.png")
    assert row["size_bytes"] == len(blob)


def test_a_row_whose_file_is_gone_reports_zero_rather_than_failing(client, tmp_path):
    """The gallery already renders a placeholder for a file deleted off disk,
    so listing has to survive it — a raise here would take out the whole
    Library, not one tile."""
    from memorymap.core import deps

    created = _upload(client, "vanishing.png", b"y" * 100)
    stored = deps.get_config().data_dir / "media"
    for path in stored.iterdir():
        if path.is_file():
            path.unlink()
    row = next(r for r in client.get("/media").json() if r["id"] == created["id"])
    assert row["size_bytes"] == 0
