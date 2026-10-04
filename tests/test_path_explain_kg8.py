"""A path's hop says every reason its two notes are related (GRAPH_PLAN KG8).

`/graph/path` gave each step one phrase, the edge the route took ("linked
to"). Two notes on a route often relate in more ways than that one edge, and
the Trace bar is where a person asks "how are these related?". Each step now
carries `also`: the KG2 signals that join the pair besides the edge, in the
same sentences the link suggestions use.
"""

from __future__ import annotations

from memorymap.ai.relations import NoteFacts, explain_pair


def test_one_pair_explained_by_entities_neighbours_and_tags():
    notes = {i: NoteFacts(label=f"Note {i}", tags=frozenset({"glaze"}) if i in (1, 2) else frozenset()) for i in range(1, 6)}
    reasons = [s["reason"] for s in explain_pair(1, 2, notes, {3: {1, 2}, 1: {3}, 2: {3}}, {"Priya": {1, 2}, "Kiln": {1, 4}})]
    assert "both mention Priya" in reasons
    assert "both linked with “Note 3”" in reasons
    assert "both tagged #glaze" in reasons
    assert not any("Kiln" in r for r in reasons)


def test_nothing_shared_is_no_reason():
    notes = {1: NoteFacts(label="a"), 2: NoteFacts(label="b")}
    assert explain_pair(1, 2, notes, {}, {}) == []


def _note(client, content, tags=()):
    response = client.post("/entries", json={"content": content, "tags": list(tags)})
    assert response.status_code in (200, 201), response.text
    return response.json()


def _mention(session, name, *entry_ids):
    from memorymap.core.database import Entity, EntityMention

    entity = Entity(name=name)
    session.add(entity)
    session.flush()
    for entry_id in entry_ids:
        session.add(EntityMention(entity_id=entity.id, entry_id=entry_id))
    session.commit()


def test_a_path_step_carries_the_other_reasons(client, session):
    a = _note(client, "Glaze trial", ["glazelab"])
    b = _note(client, "Firing log", ["glazelab"])
    client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})
    _mention(session, "Priya Shah", a["id"], b["id"])
    body = client.get(f"/graph/path?source={a['id']}&target={b['id']}").json()
    assert body["found"] is True
    also = [s["reason"] for s in body["steps"][0]["also"]]
    assert "both mention Priya Shah" in also
    assert "both tagged #glazelab" in also
    assert body["routes"][0]["steps"][0]["also"] == body["steps"][0]["also"]


def test_a_private_end_explains_nothing(client, session):
    from memorymap.core.database import Entry

    a = _note(client, "Glaze trial", ["glazelab"])
    b = _note(client, "Firing log", ["glazelab"])
    client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})
    _mention(session, "Priya Shah", a["id"], b["id"])
    row = session.get(Entry, b["id"])
    row.is_private = True
    session.commit()
    body = client.get(f"/graph/path?source={a['id']}&target={b['id']}").json()
    assert body["steps"][0]["also"] == []
