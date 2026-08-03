"""The recycle bin: emptying it, and getting rid of one note for good.

**"Empty now" has been reported broken three times** and driven end to end in a
real browser twice — dialog, POST, empty bin, toast, server reporting zero
binned notes. So these tests pin the server half, and the frontend's half of
the fix is that a failure is now *visible*: every path through that handler
used to swallow its error, which is indistinguishable from a button that does
nothing.

The per-note purge is new, and it is the one route in the app that destroys
something with no undo — hence the rule it enforces: a note has to be in the
bin already, so permanent loss is always the second deliberate step.
"""

from __future__ import annotations

import json

from memorymap.core.database import Attachment, EmbeddingRecord, Entry, EntryLink


def _note(session, content, tags=None, parent_id=None):
    entry = Entry(content=content, tags=json.dumps(tags or []), parent_id=parent_id)
    session.add(entry)
    session.commit()
    return entry


def test_emptying_the_bin_removes_only_binned_notes(client, session):
    keep = _note(session, "a note I am still using")
    bin_me = _note(session, "a note I binned")
    client.delete(f"/entries/{bin_me.id}")

    body = client.post("/recycle-bin/empty").json()
    assert body["removed"] == 1
    assert client.get("/entries?deleted=true").json() == []
    assert [n["id"] for n in client.get("/entries").json()] == [keep.id]


def test_emptying_an_empty_bin_is_not_an_error(client, session):
    """It reports zero rather than failing. A button that errors when there is
    nothing to do reads as broken, which is the report this whole area is
    fighting."""
    body = client.post("/recycle-bin/empty").json()
    assert body["removed"] == 0


def test_one_note_can_be_deleted_for_good(client, session):
    keep = _note(session, "still in the bin, and staying there")
    goner = _note(session, "this one goes for good")
    client.delete(f"/entries/{keep.id}")
    client.delete(f"/entries/{goner.id}")

    response = client.delete(f"/entries/{goner.id}/purge")
    assert response.status_code == 200
    assert response.json()["purged"] == 1

    remaining = client.get("/entries?deleted=true").json()
    assert [n["id"] for n in remaining] == [keep.id]
    # The route committed through its own session, so this one still holds the
    # row in its identity map. Expunged rather than expired: expiring a row
    # that has since been deleted raises on the next access instead of
    # returning None, which reads as a failure when it is bookkeeping.
    session.expunge_all()
    assert session.get(Entry, goner.id) is None


def test_a_note_still_in_the_notebook_cannot_be_purged(client, session):
    """The soft-delete step is not optional. Without this, one mis-routed
    request destroys a note that was never binned — and there is no undo to
    reach for, which is exactly why the rule lives on the server."""
    live = _note(session, "a note I am still using")

    response = client.delete(f"/entries/{live.id}/purge")
    assert response.status_code == 400
    assert "recycle bin" in response.json()["detail"]
    assert session.get(Entry, live.id) is not None


def test_purging_one_note_takes_its_vectors_links_and_files_with_it(client, session, tmp_path):
    """The whole point of sharing `_hard_delete` between the two paths. A purge
    that left an embedding behind would leave a note that is gone from every
    list and still turns up in semantic search."""
    from memorymap.core import deps

    other = _note(session, "the note on the other end of the link")
    goner = _note(session, "the note being purged")
    session.add(EntryLink(source_entry_id=goner.id, target_entry_id=other.id))
    session.add(
        EmbeddingRecord(
            entry_id=goner.id, embedding=b"\x00" * 8, dim=2, model_version="test"
        )
    )
    uploads = deps.get_config().uploads_dir
    uploads.mkdir(parents=True, exist_ok=True)
    (uploads / "purge-me.png").write_bytes(b"png")
    session.add(
        Attachment(
            entry_id=goner.id,
            filename="purge-me.png",
            stored_name="purge-me.png",
            mime="image/png",
            size=3,
        )
    )
    session.commit()
    client.delete(f"/entries/{goner.id}")

    client.delete(f"/entries/{goner.id}/purge")

    session.expunge_all()
    assert session.get(Entry, goner.id) is None
    assert session.query(EmbeddingRecord).filter_by(entry_id=goner.id).count() == 0
    assert session.query(EntryLink).count() == 0
    assert not (uploads / "purge-me.png").exists()
    # The note at the other end is untouched — a link is a connection, not a
    # dependency.
    assert session.get(Entry, other.id) is not None


def test_purging_a_parent_leaves_its_replies_as_roots(client, session):
    """A reply whose parent is destroyed becomes a thread root rather than a
    note pointing at an id that no longer exists."""
    parent = _note(session, "the note that started a thread")
    reply = _note(session, "a reply to it", parent_id=parent.id)
    client.delete(f"/entries/{parent.id}")

    client.delete(f"/entries/{parent.id}/purge")

    session.expunge_all()
    assert session.get(Entry, reply.id).parent_id is None
