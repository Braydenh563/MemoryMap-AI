"""The sample notebook (WORLD_CLASS_PLAN 25c, Brief 49): offered on a new
notebook's first steps, added in one press with no model, found again by
asking, and taken away to the bin in one press."""

from __future__ import annotations

from tessellate.entry.sample_notebook import SAMPLE_NOTES, SAMPLE_TAG


def test_the_sample_notes_arrive_filed_tagged_and_linked(client):
    made = client.post("/help/sample-notebook")
    assert made.status_code == 201, made.text
    ids = made.json()["ids"]
    assert len(ids) == len(SAMPLE_NOTES) >= 6
    notes = [client.get(f"/entries/{i}").json() for i in ids]
    assert all(SAMPLE_TAG in note["tags"] for note in notes)
    assert {note["category"] for note in notes} == {n["category"] for n in SAMPLE_NOTES}
    kickoff = next(note for note in notes if note["content"].startswith("Project Juniper kickoff"))
    assert kickoff["links"], "the [[wiki link]] to the checklist was not made"
    # Offered once: a second press while they are here is refused, and the
    # notebook remembers it was added (the dashboard stops offering it).
    again = client.post("/help/sample-notebook")
    assert again.status_code == 409
    state = client.get("/help/sample-notebook").json()
    assert state == {"live": len(ids), "added": True}


def test_the_welcome_notes_question_is_answered_from_the_notes(client):
    client.post("/help/sample-notebook")
    found = client.get("/search", params={"q": "spare key"}).json()
    notes = [hit for hit in found["hits"] if hit["kind"] == "note"]
    assert notes, found


def test_remove_bins_only_the_sample_notes(client):
    own = client.post("/entries", json={"content": "My own note about a sample of paint", "category": "Home"}).json()
    ids = client.post("/help/sample-notebook").json()["ids"]
    names_before = {row["name"] for row in client.get("/categories").json()}
    gone = client.delete("/help/sample-notebook").json()
    # The categories it made go with it; Home was the person's own first.
    names_after = {row["name"] for row in client.get("/categories").json()}
    made = {n["category"] for n in SAMPLE_NOTES} - {"Home"}
    assert made <= names_before and not made & names_after and "Home" in names_after
    assert gone["categories_removed"] == len(made)
    assert gone["binned"] == len(ids) and sorted(gone["ids"]) == sorted(ids)
    listed = client.get("/entries", params={"limit": 200}).json()
    live = {row["id"] for row in (listed["entries"] if isinstance(listed, dict) else listed)}
    assert own["id"] in live and not live.intersection(ids)
    # Restorable from the bin like any note.
    restored = client.post(f"/entries/{ids[0]}/restore")
    assert restored.status_code == 200
