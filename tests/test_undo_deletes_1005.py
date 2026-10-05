"""Undo for the deletes the app's stack did not cover (undo-1005, "Still
open" 1 and 3): a reference detached from a note, a note type, a relation
type (which clears that kind from every link), a space, a conversation.

The shape is the reminders' `restore` door (INBOX 537): each DELETE answers
with what it removed, the client keeps that in its Undo closure, and the
create endpoint takes it back with `restore`, so the thing comes back as it
was: the same id or key, the same links typed, the same rows in the space.
"""

from __future__ import annotations


def _note(client, text, **extra):
    return client.post("/entries", json={"content": text, **extra}).json()


def test_a_detached_reference_comes_back_in_its_place(client):
    note = _note(client, "References here")
    first = client.post("/bookmarks", json={"url": "https://a.example", "title": "A"}).json()
    second = client.post("/bookmarks", json={"url": "https://b.example", "title": "B"}).json()
    for bm in (first, second):
        client.post(f"/entries/{note['id']}/bookmarks", json={"bookmark_id": bm["id"]})
    gone = client.delete(f"/entries/{note['id']}/bookmarks/{first['id']}")
    assert gone.status_code == 200
    body = gone.json()
    assert body["detached"] is True and body["created_at"]
    assert [b["id"] for b in client.get(f"/entries/{note['id']}/bookmarks").json()] == [second["id"]]
    back = client.post(
        f"/entries/{note['id']}/bookmarks",
        json={"bookmark_id": first["id"], "created_at": body["created_at"]},
    )
    assert back.status_code == 201
    # Back first, where it was, not appended after B.
    assert [b["id"] for b in client.get(f"/entries/{note['id']}/bookmarks").json()] == [first["id"], second["id"]]


def test_a_deleted_note_type_comes_back_with_its_id_and_fields(client):
    made = client.post(
        "/note-types",
        json={"name": "Meeting", "icon": "ph-users", "colour": "teal", "fields": [{"name": "attendees", "kind": "list"}]},
    ).json()
    gone = client.delete(f"/note-types/{made['id']}").json()
    assert gone["type"] == made
    assert client.get("/note-types").json() == []
    back = client.post("/note-types", json={**gone["type"], "restore": True})
    assert back.status_code == 201, back.text
    assert back.json() == made
    # Without `restore` an id in the body is ignored, as before.
    other = client.post("/note-types", json={"name": "Other", "id": 999}).json()
    assert other["id"] != 999


def test_a_deleted_relation_type_comes_back_with_its_key_and_its_links(client):
    a, b, c = (_note(client, f"Note {n}") for n in "abc")
    client.post("/relation-types", json={"name": "Part of", "inverse": "Has part", "colour": "teal"})
    # A rename keeps the key, so Undo has to send the key, not re-derive it.
    client.patch("/relation-types/part_of", json={"name": "Piece of"})
    first = client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"], "link_type": "part_of"})
    second = client.post(f"/entries/{a['id']}/links", json={"target_id": c["id"], "link_type": "part_of"})
    assert first.status_code in (200, 201), first.text
    assert second.status_code in (200, 201), second.text
    before = client.get("/relation-types").json()
    gone = client.delete("/relation-types/part_of").json()
    assert gone["links_untyped"] == 2
    restore = gone["restore"]
    assert restore["key"] == "part_of" and restore["name"] == "Piece of" and len(restore["link_ids"]) == 2
    back = client.post("/relation-types", json={**restore, "restore": True})
    assert back.status_code == 201, back.text
    assert back.json()["key"] == "part_of" and back.json()["name"] == "Piece of"
    assert client.get("/relation-types").json() == before
    kinds = {link["entry_id"]: link.get("link_type") for link in client.get(f"/entries/{a['id']}").json()["links"]}
    assert kinds[b["id"]] == "part_of" and kinds[c["id"]] == "part_of"


def test_a_relation_type_restore_leaves_a_link_given_another_kind_since(client):
    a, b = _note(client, "One"), _note(client, "Two")
    client.post("/relation-types", json={"name": "Cites"})
    link = client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"], "link_type": "cites"}).json()
    restore = client.delete("/relation-types/cites").json()["restore"]
    link_id = restore["link_ids"][0]
    client.patch(f"/entries/{a['id']}/links/{link_id}", json={"link_type": "supports"})
    client.post("/relation-types", json={**restore, "restore": True})
    kinds = [x.get("link_type") for x in client.get(f"/entries/{a['id']}").json()["links"]]
    assert kinds == ["supports"], (link, kinds)


def test_a_relation_type_delete_and_restore_reach_every_space(client):
    """A kind is the notebook's, not a space's: deleting it while one space
    is open used to leave it on the other spaces' links."""
    other = client.post("/spaces", json={"name": "Elsewhere"}).json()["id"]
    hdr = {"X-Workspace-ID": other}
    a = client.post("/entries", json={"content": "Away a"}, headers=hdr).json()
    b = client.post("/entries", json={"content": "Away b"}, headers=hdr).json()
    client.post("/relation-types", json={"name": "Answers"})
    client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"], "link_type": "answers"}, headers=hdr)
    gone = client.delete("/relation-types/answers").json()
    assert gone["links_untyped"] == 1
    assert [x.get("link_type") for x in client.get(f"/entries/{a['id']}", headers=hdr).json()["links"]] == [None]
    client.post("/relation-types", json={**gone["restore"], "restore": True})
    assert [x.get("link_type") for x in client.get(f"/entries/{a['id']}", headers=hdr).json()["links"]] == ["answers"]


def test_a_space_deleted_by_moving_comes_back_with_exactly_its_rows(client, session):
    from memorymap.core.database import Category, Entry

    source = client.post("/spaces", json={"name": "Old", "icon": "ph-star"}).json()["id"]
    target = client.post("/spaces", json={"name": "New"}).json()["id"]
    client.put(f"/spaces/{source}", json={"hidden_from_all": True})
    moved = client.post("/entries", json={"content": "moves along", "category": "Shared"}, headers={"X-Workspace-ID": source}).json()
    own = client.post("/entries", json={"content": "own category", "category": "Only old"}, headers={"X-Workspace-ID": source}).json()
    stays = client.post("/entries", json={"content": "already there", "category": "Shared"}, headers={"X-Workspace-ID": target}).json()
    shared_before = session.get(Entry, moved["id"]).category_id

    gone = client.delete(f"/spaces/{source}?move_to={target}")
    assert gone.status_code == 200, gone.text
    restore = gone.json()["restore"]
    assert restore["space"] == {"id": source, "name": "Old", "icon": "ph-star", "hidden_from_all": True}

    back = client.post("/spaces/restore", json=restore)
    assert back.status_code == 200, back.text
    session.expire_all()
    assert session.get(Entry, moved["id"]).workspace_id == source
    assert session.get(Entry, own["id"]).workspace_id == source
    assert session.get(Entry, stays["id"]).workspace_id == target
    # The merged category is re-made in the source space, with its id, and
    # its note points at it again; the target's own "Shared" is untouched.
    assert session.get(Entry, moved["id"]).category_id == shared_before
    assert session.get(Category, shared_before).workspace_id == source
    assert session.get(Entry, stays["id"]).category_id != shared_before
    spaces = {s["id"]: s for s in client.get("/spaces").json()}
    assert spaces[source]["hidden_from_all"] is True and spaces[source]["icon"] == "ph-star"
    # And it is findable in its own space again.
    found = client.get("/entries", headers={"X-Workspace-ID": source}).json()
    assert {e["id"] for e in found} == {moved["id"], own["id"]}


def test_an_empty_space_comes_back_and_a_full_one_says_it_cannot(client):
    empty = client.post("/spaces", json={"name": "Empty"}).json()["id"]
    restore = client.delete(f"/spaces/{empty}").json()["restore"]
    assert restore is not None
    assert client.post("/spaces/restore", json=restore).status_code == 200
    assert empty in {s["id"] for s in client.get("/spaces").json()}

    full = client.post("/spaces", json={"name": "Full"}).json()["id"]
    client.post("/entries", json={"content": "gone for good"}, headers={"X-Workspace-ID": full})
    deleted = client.delete(f"/spaces/{full}")
    assert deleted.json()["restore"] is None


def test_a_space_restore_refuses_a_taken_id(client):
    sid = client.post("/spaces", json={"name": "Twice"}).json()["id"]
    restore = client.delete(f"/spaces/{sid}").json()["restore"]
    client.post("/spaces", json={"name": "Twice"})
    assert client.post("/spaces/restore", json=restore).status_code == 409
    restore["space"]["id"] = "all"
    assert client.post("/spaces/restore", json=restore).status_code == 400


def test_a_deleted_conversation_comes_back_whole(client):
    made = client.post("/conversations", json={"question": "Where is the map?", "answer": "In the drawer."}).json()
    client.post(f"/conversations/{made['id']}/turns", json={"question": "Which drawer?", "answer": "The top one."})
    client.put(f"/conversations/{made['id']}/pin", json={"pinned": True})
    before = client.get(f"/conversations/{made['id']}").json()
    gone = client.delete(f"/conversations/{made['id']}").json()
    assert gone["deleted"] is True and gone["restore"]["id"] == made["id"]
    assert client.get(f"/conversations/{made['id']}").status_code == 404
    back = client.post("/conversations/restore", json=gone["restore"])
    assert back.status_code == 201, back.text
    assert client.get(f"/conversations/{made['id']}").json() == before
    # Twice is refused, not duplicated.
    assert client.post("/conversations/restore", json=gone["restore"]).status_code == 409
