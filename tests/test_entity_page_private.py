"""`GET /entities/{id}` follows the list's visibility rule (sweep 1004, item 2):
an entity only private notes ever named is a 404, not a name with zero notes."""

from __future__ import annotations

from memorymap.core.database import Entity, EntityMention


def _entity(session, name, entry_ids):
    entity = Entity(name=name, aliases=["Sammy"])
    session.add(entity)
    session.flush()
    for entry_id in entry_ids:
        session.add(EntityMention(entity_id=entity.id, entry_id=entry_id))
    session.commit()
    return entity.id


def test_an_entity_named_only_by_a_private_note_is_a_404(client, session):
    note = client.post("/entries", json={"content": "Sam Lee booked the kiln"}).json()
    entity_id = _entity(session, "Sam Lee", [note["id"]])
    assert client.get(f"/entities/{entity_id}").status_code == 200

    # The mentions are lifted when a note goes private, so write the shape a
    # note made private by an older build leaves behind.
    from memorymap.core.database import Entry

    session.get(Entry, note["id"]).is_private = True
    session.commit()

    assert [e["id"] for e in client.get("/entities").json()] == []
    assert client.get(f"/entities/{entity_id}").status_code == 404


def test_an_entity_with_one_visible_note_still_opens(client, session):
    public = client.post("/entries", json={"content": "Sam Lee came by"}).json()
    private = client.post("/entries", json={"content": "Sam Lee and the secret"}).json()
    entity_id = _entity(session, "Sam Lee", [public["id"], private["id"]])
    from memorymap.core.database import Entry

    session.get(Entry, private["id"]).is_private = True
    session.commit()

    page = client.get(f"/entities/{entity_id}")
    assert page.status_code == 200
    assert [m["id"] for m in page.json()["mentions"]] == [public["id"]]
