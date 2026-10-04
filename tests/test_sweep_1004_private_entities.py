"""A note made private after a model read it lends nothing the entity layer
could show (sweep 1004). Entity membership is lifted out of the note's text,
so it goes when the note is encrypted, as its embedding and its dates do."""

from __future__ import annotations

import pytest

from memorymap.core import vault
from memorymap.core.database import Entity, EntityMention, Entry


@pytest.fixture(autouse=True)
def open_vault(session):
    vault.close()
    vault.create(session, "test-passphrase")
    session.commit()
    yield
    vault.close()


def test_making_a_note_private_drops_what_a_model_read_out_of_it(client, session):
    note = client.post("/entries", json={"content": "Sam Lee booked the kiln for the secret commission"}).json()
    sam = Entity(name="Sam Lee")
    session.add(sam)
    session.flush()
    session.add(EntityMention(entity_id=sam.id, entry_id=note["id"]))
    entry = session.get(Entry, note["id"])
    entry.entities_extracted_at = entry.created_at
    session.commit()
    assert client.get("/entries/query", params={"q": 'entity:"Sam Lee"'}).json()["ids"] == [note["id"]]

    assert client.post(f"/entries/{note['id']}/privacy", json={"private": True}).status_code == 200
    assert client.get("/entries/query", params={"q": 'entity:"Sam Lee"'}).json()["ids"] == []
    assert session.query(EntityMention).filter_by(entry_id=note["id"]).count() == 0

    # Made readable again, it is read again by the next extraction pass.
    assert client.post(f"/entries/{note['id']}/privacy", json={"private": False}).status_code == 200
    session.expire_all()
    assert session.get(Entry, note["id"]).entities_extracted_at is None
