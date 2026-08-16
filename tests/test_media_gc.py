"""Orphaned `/media/` garbage collection (ROADMAP.md item 20a).

An upload is orphaned when nothing left in the notebook — a note, a
document, or a whiteboard image object — still points at it. The one case
worth getting exactly right: a private note's content is encrypted, so an
image referenced only from a currently-locked private note must never be
treated as unreferenced.
"""

from __future__ import annotations


def _upload(ai_client, name="photo.png"):
    return ai_client.post(
        "/media/upload", files={"file": (name, b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()


def test_an_unreferenced_upload_is_orphaned(ai_client):
    uploaded = _upload(ai_client)

    listed = ai_client.get("/media/orphans").json()
    assert listed["skipped_private"] is False
    assert any(o["url"] == uploaded["url"] for o in listed["orphans"])


def test_an_upload_referenced_by_a_note_is_not_orphaned(ai_client):
    uploaded = _upload(ai_client)
    ai_client.post("/entries", json={"content": f"look at this: ![img]({uploaded['url']})"})

    listed = ai_client.get("/media/orphans").json()
    assert not any(o["url"] == uploaded["url"] for o in listed["orphans"])


def test_an_upload_referenced_by_a_document_is_not_orphaned(ai_client):
    uploaded = _upload(ai_client)
    ai_client.post("/documents", json={"title": "Doc", "content": f"![img]({uploaded['url']})"})

    listed = ai_client.get("/media/orphans").json()
    assert not any(o["url"] == uploaded["url"] for o in listed["orphans"])


def test_an_upload_referenced_by_a_whiteboard_image_object_is_not_orphaned(ai_client):
    uploaded = _upload(ai_client)
    ai_client.post(
        "/whiteboard/objects",
        json={"kind": "image", "data": {"url": uploaded["url"]}, "board_id": None},
    )

    listed = ai_client.get("/media/orphans").json()
    assert not any(o["url"] == uploaded["url"] for o in listed["orphans"])


def test_clean_deletes_only_orphans(ai_client):
    orphan = _upload(ai_client, "orphan.png")
    referenced = _upload(ai_client, "referenced.png")
    ai_client.post("/entries", json={"content": f"![img]({referenced['url']})"})

    result = ai_client.delete("/media/orphans").json()
    assert result["skipped_private"] is False

    remaining_urls = {row["url"] for row in ai_client.get("/media").json()}
    assert orphan["url"] not in remaining_urls
    assert referenced["url"] in remaining_urls
    assert ai_client.get(orphan["url"]).status_code == 404
    assert ai_client.get(referenced["url"]).status_code == 200


def test_a_locked_private_note_blocks_deletion_of_everything(ai_client, session):
    """The risky case: an image referenced only inside a private note whose
    vault is currently locked must never be deleted — nor may any other
    orphan, since the pass as a whole can no longer prove the list is
    complete.
    """
    from memorymap.core import vault

    vault.close()
    vault.create(session, "test-passphrase")
    session.commit()

    referenced_only_privately = _upload(ai_client, "private-ref.png")
    truly_orphaned = _upload(ai_client, "genuinely-orphaned.png")

    created = ai_client.post(
        "/entries", json={"content": f"secret: ![img]({referenced_only_privately['url']})"}
    ).json()
    ai_client.post(f"/entries/{created['id']}/privacy", json={"private": True})

    vault.close()  # lock it — the state a real "left the app open" session ends in

    dry_run = ai_client.get("/media/orphans").json()
    assert dry_run["skipped_private"] is True

    result = ai_client.delete("/media/orphans").json()
    assert result["skipped_private"] is True
    assert result["deleted"] == 0

    remaining_urls = {row["url"] for row in ai_client.get("/media").json()}
    assert referenced_only_privately["url"] in remaining_urls
    assert truly_orphaned["url"] in remaining_urls

    vault.close()


def test_orphans_route_is_not_shadowed_by_the_upload_id_route(ai_client):
    """`/media/orphans` must resolve to the dedicated handler, not fall into
    `/media/{upload_id}` and 422 on trying to parse "orphans" as an int."""
    assert ai_client.get("/media/orphans").status_code == 200
    assert ai_client.delete("/media/orphans").status_code == 200
