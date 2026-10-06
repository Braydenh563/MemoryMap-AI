"""The tag manager's writes (INBOX 447 (4)): rename, merge, delete and the
bulk add or remove across chosen notes.

Each is one transaction, leaves the notes in place, records a revision and an
`edited` event per note it changed (so a note's History shows it), and answers
with the tags each changed note had, which `POST /tags/restore` puts back.
"""

from __future__ import annotations


def _note(client, text, tags):
    return client.post("/entries", json={"content": text, "tags": tags}).json()["id"]


def _tags(client, entry_id):
    return client.get(f"/entries/{entry_id}").json()["tags"]


def _history(client, entry_id):
    return client.get(f"/entries/{entry_id}/history").json()


def test_rename_records_a_revision_and_an_event_per_note(client):
    a = _note(client, "one", ["draft", "work"])
    b = _note(client, "two", ["draft"])
    c = _note(client, "three", ["other"])
    done = client.post("/tags/rename", json={"old": "draft", "new": "wip"}).json()
    assert done["changed"] == 2
    assert done["before"] == {str(a): ["draft", "work"], str(b): ["draft"]}
    assert _tags(client, a) == ["work", "wip"]
    assert _tags(client, c) == ["other"]
    for note in (a, b):
        history = _history(client, note)
        assert any(i["action"] == "edited" and i["detail"] == "tags" for i in history["items"])
        assert history["revisions"][0]["tags"] == (["draft", "work"] if note == a else ["draft"])
    assert not any(i["detail"] == "tags" for i in _history(client, c)["items"])


def test_rename_onto_an_existing_tag_merges_without_duplicates(client):
    a = _note(client, "one", ["Food", "food2"])
    assert client.post("/tags/rename", json={"old": "food2", "new": "food"}).json()["changed"] == 1
    assert _tags(client, a) == ["Food"]


def test_merge_folds_several_tags_into_one_name(client):
    a = _note(client, "one", ["ml", "ai"])
    b = _note(client, "two", ["machine-learning"])
    c = _note(client, "three", ["ai", "keep"])
    done = client.post("/tags/merge", json={"names": ["ml", "ai", "machine-learning"], "into": "AI"}).json()
    assert done["changed"] == 3
    assert _tags(client, a) == ["AI"]
    assert _tags(client, b) == ["AI"]
    assert _tags(client, c) == ["keep", "AI"]
    assert client.get("/tags").json()["AI"] == 3


def test_merge_refuses_a_blank_name(client):
    a = _note(client, "one", ["x"])
    assert client.post("/tags/merge", json={"names": ["x"], "into": "   "}).status_code == 400
    assert _tags(client, a) == ["x"]


def test_delete_removes_the_tag_and_never_the_notes(client):
    a = _note(client, "one", ["gone", "stay"])
    done = client.post("/tags/delete", json={"name": "gone"}).json()
    assert done == {"changed": 1, "before": {str(a): ["gone", "stay"]}}
    assert _tags(client, a) == ["stay"]
    assert client.get(f"/entries/{a}").status_code == 200
    assert any(i["detail"] == "tags" for i in _history(client, a)["items"])
    assert client.post("/tags/delete", json={"name": "gone"}).json() == {"changed": 0, "before": {}}


def test_bulk_adds_and_removes_on_the_chosen_notes_only(client):
    a = _note(client, "one", ["old", "keep"])
    b = _note(client, "two", ["Old"])
    c = _note(client, "three", ["old"])
    done = client.post("/tags/bulk", json={"ids": [a, b], "add": ["new", "keep"], "remove": ["OLD"]}).json()
    assert done["changed"] == 2
    assert _tags(client, a) == ["keep", "new"]
    assert _tags(client, b) == ["new", "keep"]
    assert _tags(client, c) == ["old"]
    assert any(i["detail"] == "tags" for i in _history(client, b)["items"])


def test_bulk_leaves_a_note_that_would_not_change_alone(client):
    a = _note(client, "one", ["x"])
    done = client.post("/tags/bulk", json={"ids": [a], "add": ["X"], "remove": ["nope"]}).json()
    assert done == {"changed": 0, "before": {}}
    assert _history(client, a)["revisions"] == []


def test_bulk_skips_binned_and_missing_notes(client):
    a = _note(client, "one", [])
    b = _note(client, "two", [])
    client.delete(f"/entries/{b}")
    done = client.post("/tags/bulk", json={"ids": [a, b, 99999], "add": ["t"]}).json()
    assert done["changed"] == 1
    assert _tags(client, a) == ["t"]


def test_bulk_needs_notes(client):
    assert client.post("/tags/bulk", json={"ids": [], "add": ["t"]}).status_code == 422


def test_restore_undoes_a_rename_a_merge_a_delete_and_a_bulk_edit(client):
    a = _note(client, "one", ["a", "b"])
    b = _note(client, "two", ["a"])
    for call in (
        lambda: client.post("/tags/rename", json={"old": "a", "new": "z"}),
        lambda: client.post("/tags/merge", json={"names": ["a", "b"], "into": "m"}),
        lambda: client.post("/tags/delete", json={"name": "a"}),
        lambda: client.post("/tags/bulk", json={"ids": [a, b], "add": ["n"], "remove": ["a"]}),
    ):
        done = call().json()
        assert done["changed"] > 0
        back = client.post("/tags/restore", json={"notes": done["before"]}).json()
        assert back["changed"] == done["changed"]
        assert _tags(client, a) == ["a", "b"]
        assert _tags(client, b) == ["a"]


def test_restore_is_its_own_redo(client):
    a = _note(client, "one", ["a"])
    done = client.post("/tags/rename", json={"old": "a", "new": "z"}).json()
    undone = client.post("/tags/restore", json={"notes": done["before"]}).json()
    client.post("/tags/restore", json={"notes": undone["before"]})
    assert _tags(client, a) == ["z"]


def test_delete_takes_several_tags_in_one_go_and_needs_a_name(client):
    a = _note(client, "one", ["x", "y", "keep"])
    b = _note(client, "two", ["y"])
    done = client.post("/tags/delete", json={"names": ["x", "y"]}).json()
    assert done["changed"] == 2
    assert _tags(client, a) == ["keep"]
    assert _tags(client, b) == []
    assert client.post("/tags/delete", json={}).status_code == 400


def test_a_tag_filter_follows_a_rename_or_clears_on_remove():
    """Found by the tag manager's own sweep: after a rename or remove, an
    active `tag:old` filter showed a list filtered on a tag that is gone."""
    from pathlib import Path

    js = (Path(__file__).resolve().parent.parent / "frontend" / "js" / "tag-manager.js").read_text(encoding="utf-8")
    assert "function retargetTagFilter(moves)" in js
    assert "if (moves) retargetTagFilter(moves);" in js
    # Merge into, Remove, and a look-alike suggestion's Merge (INBOX 504).
    assert js.count("Object.fromEntries(names.map((name) => [name,") == 3
