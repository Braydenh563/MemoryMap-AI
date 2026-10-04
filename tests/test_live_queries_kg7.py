"""Saved live queries (GRAPH_PLAN KG7, INBOX 528).

One evaluator (`entry/query.py`, `GET /entries/query`) answers the
structural half of the notes filter: `type:`, `prop:`, `links:`, `rel:`,
`entity:`, `tag:`, words, and `-` before any of them. The list, the table and
the graph all take its ids, so the done-when (one query, the same ids in all
three) is the route answering once.
"""

from __future__ import annotations

from memorymap.entry.query import parse


def test_the_grammar():
    q = parse('type:meeting prop:status=open prop:effort>2 -tag:old links:[[Kiln plan]] rel:supports entity:"Sam Lee" fire')
    kinds = [(t.kind, t.key, t.op, t.value, t.negate) for t in q]
    assert ("type", None, "=", "meeting", False) in kinds
    assert ("prop", "status", "=", "open", False) in kinds
    assert ("prop", "effort", ">", "2", False) in kinds
    assert ("tag", None, "=", "old", True) in kinds
    assert ("links", None, "=", "Kiln plan", False) in kinds
    assert ("rel", None, "=", "supports", False) in kinds
    assert ("entity", None, "=", "Sam Lee", False) in kinds
    assert ("word", None, "=", "fire", False) in kinds


def _note(client, text, **extra):
    return client.post("/entries", json={"content": text, **extra}).json()


def _ids(client, q):
    response = client.get("/entries/query", params={"q": q})
    assert response.status_code == 200, response.text
    return response.json()["ids"]


def test_type_and_props_and_negation(client):
    a = _note(client, "---\ntype: Meeting\nstatus: open\neffort: 3\n---\n# Standup")
    b = _note(client, "---\ntype: Meeting\nstatus: done\neffort: 1\n---\n# Retro")
    c = _note(client, "---\nstatus: open\n---\n# Kiln plan")
    assert set(_ids(client, "type:meeting")) == {a["id"], b["id"]}
    assert _ids(client, "type:meeting prop:status=open") == [a["id"]]
    assert set(_ids(client, "prop:status=open")) == {a["id"], c["id"]}
    assert _ids(client, "prop:effort>2") == [a["id"]]
    assert _ids(client, "type:meeting -prop:status=open") == [b["id"]]
    assert set(_ids(client, "prop:effort")) == {a["id"], b["id"]}


def test_links_rel_entity_and_words(client, session):
    from memorymap.core.database import Entity, EntityMention

    target = _note(client, "# Kiln plan\n\nbody")
    holder = _note(client, "# Firing\n\nsee [[Kiln plan]] for the fire")
    other = _note(client, "# Glaze\n\nnothing to fire")
    client.post(f"/entries/{other['id']}/links", json={"target_id": holder["id"], "link_type": "supports"})
    sam = Entity(name="Sam Lee", aliases=["Sam"])
    session.add(sam)
    session.flush()
    session.add(EntityMention(entity_id=sam.id, entry_id=other["id"]))
    session.commit()
    assert _ids(client, "links:[[Kiln plan]]") == [holder["id"]]
    assert set(_ids(client, "rel:supports")) == {holder["id"], other["id"]}
    assert set(_ids(client, 'rel:"Supported by"')) == {holder["id"], other["id"]}
    assert _ids(client, 'entity:"Sam"') == [other["id"]]
    assert set(_ids(client, "fire")) == {holder["id"], other["id"]}
    assert _ids(client, "fire -entity:Sam") == [holder["id"]]
    assert target["id"] not in _ids(client, "fire")


def test_a_private_note_is_never_matched_by_its_words(client, session):
    from memorymap.core.database import Entry

    made = _note(client, "secret kiln words")
    session.get(Entry, made["id"]).is_private = True
    session.commit()
    assert _ids(client, "kiln") == []


def test_the_table_has_the_properties_as_columns(client):
    _note(client, "---\ntype: Meeting\nstatus: open\nowner: Priya\n---\n# Standup")
    _note(client, "---\ntype: Meeting\nstatus: done\n---\n# Retro")
    body = client.get("/entries/query", params={"q": "type:meeting"}).json()
    assert body["columns"][:2] == ["type", "status"]
    assert "owner" in body["columns"]
    rows = {r["title"]: r for r in body["rows"]}
    assert rows["Standup"]["properties"]["status"] == ["open"]
    assert [r["id"] for r in body["rows"]] == body["ids"]


def test_an_empty_or_plain_query_is_refused_politely(client):
    assert client.get("/entries/query", params={"q": ""}).json() == {"ids": [], "columns": [], "rows": [], "structural": False}
