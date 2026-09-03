"""Spaces (workspace partitioning): CRUD, id/icon/name validation, and the
delete-time reassignment that keeps rows from becoming invisible.
"""

from __future__ import annotations

from memorymap.core.database import Category, Entry, EntryLink, Document


def _row(session, model, **kwargs):
    obj = model(**kwargs)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


def test_create_rename_delete_happy_path(client):
    created = client.post("/spaces", json={"name": "Garden Notes"}).json()
    assert created["id"] == "garden-notes"
    assert created["name"] == "Garden Notes"
    assert created["icon"] == "ph-circles-four"

    renamed = client.put(
        f"/spaces/{created['id']}", json={"name": "Garden"}
    ).json()
    assert renamed["name"] == "Garden"
    assert renamed["icon"] == "ph-circles-four"  # untouched field survives

    deleted = client.delete(f"/spaces/{created['id']}")
    assert deleted.status_code == 200
    assert deleted.json()["id"] == created["id"]

    ids = [s["id"] for s in client.get("/spaces").json()]
    assert created["id"] not in ids


def test_client_supplied_id_is_ignored(client):
    """A client-sent id (including a reserved sentinel) never wins — the
    server always slugifies `name` itself."""
    resp = client.post("/spaces", json={"id": "all", "name": "My Space"}).json()
    assert resp["id"] == "my-space"


def test_name_that_slugifies_to_a_reserved_word_is_deduped(client):
    resp = client.post("/spaces", json={"name": "All"}).json()
    assert resp["id"] != "all"
    assert resp["id"] not in ("all", "default")


def test_duplicate_names_get_a_numeric_suffix(client):
    first = client.post("/spaces", json={"name": "Work"}).json()
    second = client.post("/spaces", json={"name": "Work"}).json()
    assert first["id"] != second["id"]
    assert second["id"].startswith("work-")


def test_bad_icon_refused_on_create(client):
    resp = client.post(
        "/spaces", json={"name": "X", "icon": "evil\" onclick=\"alert(1)"}
    )
    assert resp.status_code == 400


def test_bad_icon_refused_on_update(client):
    created = client.post("/spaces", json={"name": "X"}).json()
    resp = client.put(f"/spaces/{created['id']}", json={"icon": "not-an-icon"})
    assert resp.status_code == 400


def test_bad_name_refused_empty(client):
    resp = client.post("/spaces", json={"name": "   "})
    assert resp.status_code == 400


def test_bad_name_refused_too_long(client):
    resp = client.post("/spaces", json={"name": "x" * 61})
    assert resp.status_code == 400


def test_update_only_applies_provided_fields(client):
    created = client.post(
        "/spaces", json={"name": "Keep Icon", "icon": "ph-star"}
    ).json()
    updated = client.put(
        f"/spaces/{created['id']}", json={"name": "Keep Icon Renamed"}
    ).json()
    assert updated["icon"] == "ph-star"


def test_renaming_a_missing_space_404s(client):
    resp = client.put("/spaces/does-not-exist", json={"name": "New"})
    assert resp.status_code == 404


def test_deleting_default_refused(client):
    resp = client.delete("/spaces/default")
    assert resp.status_code == 400


def test_deleting_all_refused(client):
    resp = client.delete("/spaces/all")
    assert resp.status_code == 400


def test_deleting_missing_space_404s(client):
    resp = client.delete("/spaces/does-not-exist")
    assert resp.status_code == 404


def test_delete_reassigns_every_workspace_scoped_model_to_default(client, session):
    created = client.post("/spaces", json={"name": "Doomed"}).json()
    space_id = created["id"]

    category = _row(session, Category, name="doomed-cat", workspace_id=space_id)
    entry = _row(session, Entry, content="a note", workspace_id=space_id)
    other_entry = _row(session, Entry, content="another note", workspace_id=space_id)
    link = _row(
        session,
        EntryLink,
        source_entry_id=entry.id,
        target_entry_id=other_entry.id,
        workspace_id=space_id,
    )
    document = _row(
        session, Document, title="doomed doc", content="", workspace_id=space_id
    )

    resp = client.delete(f"/spaces/{space_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == space_id  # response captured before the row was gone

    session.expire_all()
    assert session.get(Category, category.id).workspace_id == "default"
    assert session.get(Entry, entry.id).workspace_id == "default"
    assert session.get(Entry, other_entry.id).workspace_id == "default"
    assert session.get(EntryLink, link.id).workspace_id == "default"
    assert session.get(Document, document.id).workspace_id == "default"


# --- chats are workspace-scoped too -------------------------------------------
#
# Reported directly, with a screenshot: the Library showed every chat
# regardless of which space was active — 13 chats and 200 activity rows on a
# space that should have had zero of either — while Notes and Documents
# (which already carried WorkspaceMixin) correctly scoped to zero. Conversation
# was the one model that had shipped without the mixin the whole feature
# depends on.


def test_a_chat_made_in_one_space_is_invisible_from_another(client):
    created = client.post("/spaces", json={"name": "Focus Room"}).json()
    space_id = created["id"]

    resp = client.post(
        "/conversations",
        json={"question": "a question asked in Focus Room", "answer": "an answer"},
        headers={"X-Workspace-ID": space_id},
    )
    assert resp.status_code == 201
    conversation_id = resp.json()["id"]

    # Visible from its own space, and from "all".
    assert conversation_id in [
        c["id"] for c in client.get("/conversations", headers={"X-Workspace-ID": space_id}).json()
    ]
    assert conversation_id in [
        c["id"] for c in client.get("/conversations", headers={"X-Workspace-ID": "all"}).json()
    ]

    # Not visible from an unrelated space, or the default one. (No header at
    # all means unfiltered — same as "all" — so that is not the negative case
    # here; a *named* space that isn't this one is.)
    assert conversation_id not in [
        c["id"]
        for c in client.get("/conversations", headers={"X-Workspace-ID": "default"}).json()
    ]
    other = client.post("/spaces", json={"name": "Somewhere Else"}).json()
    assert conversation_id not in [
        c["id"]
        for c in client.get(
            "/conversations", headers={"X-Workspace-ID": other["id"]}
        ).json()
    ]


def test_deleting_a_space_reassigns_its_chats_to_default(client, session):
    from memorymap.core.database import Conversation

    created = client.post("/spaces", json={"name": "Temporary"}).json()
    space_id = created["id"]
    conversation = _row(
        session, Conversation, title="doomed chat", messages="[]", workspace_id=space_id
    )

    resp = client.delete(f"/spaces/{space_id}")
    assert resp.status_code == 200

    session.expire_all()
    assert session.get(Conversation, conversation.id).workspace_id == "default"


def test_a_hidden_space_leaves_all_spaces_but_still_works_when_selected(client):
    """Asked for directly: "how do I hide a specific space's notes and
    images/documents etc, all the content from the 'all spaces' space if I
    wish??" There was no way — `Space` carried only id/name/icon, and "all"
    switched the workspace filter off entirely, so it showed everything.

    The flag is a *view* filter and this pins both halves of that: the space
    drops out of the everything-view, and stays completely usable when it is
    the one selected.
    """
    private = client.post("/spaces", json={"name": "Journal"}).json()
    other = client.post("/spaces", json={"name": "Work"}).json()

    client.post(
        "/entries",
        json={"content": "a private thought", "defer_filing": True},
        headers={"X-Workspace-ID": private["id"]},
    )
    client.post(
        "/entries",
        json={"content": "a work note", "defer_filing": True},
        headers={"X-Workspace-ID": other["id"]},
    )

    def contents(workspace):
        rows = client.get("/entries", headers={"X-Workspace-ID": workspace}).json()
        return {e["content"] for e in rows}

    # Before hiding, "all" sees both.
    everything = contents("all")
    assert "a private thought" in everything
    assert "a work note" in everything

    hidden = client.put(f"/spaces/{private['id']}", json={"hidden_from_all": True})
    assert hidden.status_code == 200
    assert hidden.json()["hidden_from_all"] is True

    # Gone from the everything-view, and nothing else went with it.
    after = contents("all")
    assert "a private thought" not in after
    assert "a work note" in after

    # Still entirely usable when you actually go there.
    assert "a private thought" in contents(private["id"])

    # And it comes back.
    client.put(f"/spaces/{private['id']}", json={"hidden_from_all": False})
    assert "a private thought" in contents("all")


def test_the_default_space_cannot_be_hidden(client):
    """It is where a deleted space's notes land, so hiding it would quietly
    empty the everything-view of anything that ever fell back to it.
    """
    refused = client.put("/spaces/default", json={"hidden_from_all": True})
    assert refused.status_code == 400
