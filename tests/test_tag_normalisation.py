"""Tags are stored once each, whatever spelling and spacing arrive.

Measured by driving the real app (2026-10-03): tags were stored exactly as
sent, so a note carried ['meeting', 'meeting'] or ['Idea', 'idea', 'IDEA'],
an edit could save ['design', 'food', 'Food', 'design'], and
`POST /tags/rename` with a new name of "   " put an empty-string tag on four
notes. The rule now, at every write path: blank tags drop, duplicates fold
case-insensitively, and the first spelling a note was given is the one kept.
"""

from __future__ import annotations

from memorymap.entry import manager
from memorymap.entry.tagnames import normalise_tags


def test_normalise_tags_rules():
    assert normalise_tags(["meeting", "meeting"]) == ["meeting"]
    assert normalise_tags(["Idea", "idea", "IDEA"]) == ["Idea"]
    assert normalise_tags(["design", "food", "Food", "design"]) == ["design", "food"]
    assert normalise_tags(["  ", "", " spaced "]) == ["spaced"]
    assert normalise_tags(["x" * 80]) == ["x" * 60]
    assert normalise_tags(None) == []


def test_create_and_edit_store_each_tag_once(client):
    made = client.post("/entries", json={"content": "a note", "tags": ["Idea", "idea", "IDEA", " "]}).json()
    assert made["tags"] == ["Idea"]

    edited = client.put(f"/entries/{made['id']}", json={"tags": ["design", "food", "Food", "design"]}).json()
    assert edited["tags"] == ["design", "food"]


def test_manager_paths_normalise_too(session):
    """The AI tools and background passes call the manager, not the route."""
    entry = manager.create_entry(session, "from a tool", tags=["meeting", "Meeting", ""])
    assert manager.entry_tags(entry) == ["meeting"]
    manager.update_entry(session, entry, tags=["a", "A", "  b  "])
    assert manager.entry_tags(entry) == ["a", "b"]


def test_rename_onto_a_blank_name_is_refused(client):
    made = client.post("/entries", json={"content": "a note", "tags": ["old"]}).json()
    resp = client.post("/tags/rename", json={"old": "old", "new": "   "})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "A tag needs a name."
    assert client.get(f"/entries/{made['id']}").json()["tags"] == ["old"]
    assert "" not in client.get("/tags").json()


def test_rename_onto_an_existing_tag_leaves_no_duplicates(client):
    made = client.post("/entries", json={"content": "a note", "tags": ["Design", "food", "Food2"]}).json()
    assert client.post("/tags/rename", json={"old": "Food2", "new": "Food"}).json()["changed"] == 1
    assert client.get(f"/entries/{made['id']}").json()["tags"] == ["Design", "food"]

    assert client.post("/tags/rename", json={"old": "Design", "new": "food"}).json()["changed"] == 1
    assert client.get(f"/entries/{made['id']}").json()["tags"] == ["food"]
