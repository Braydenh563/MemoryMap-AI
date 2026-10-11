"""A note's backlinks with their sentence, and its unlinked mentions turned
into links in one click (GRAPH_PLAN KG1, INBOX 528).

Documents had both (`test_doc_backlinks.py`); a note had a "mentions it" row
with no sentence and no way to act on it. The scanner is now one module
(`entry/mentions.py`) read by both, and the link action runs on the server so
the span is checked against the text it rewrites, not against the browser's
copy of it.
"""

from __future__ import annotations


def _note(client, content):
    response = client.post("/entries", json={"content": content})
    assert response.status_code in (200, 201), response.text
    return response.json()


def _document(client, title, content=""):
    response = client.post("/documents", json={"title": title, "content": content})
    assert response.status_code == 201, response.text
    return response.json()


def _backlinks(client, entry_id):
    response = client.get(f"/entries/{entry_id}/backlinks")
    assert response.status_code == 200, response.text
    return response.json()


def _marked(row):
    return row["context"][row["hit_start"] : row["hit_end"]]


def test_a_wiki_link_to_a_note_arrives_with_its_sentence(client):
    target = _note(client, "# Sourdough starter\n\nFed at 9.")
    source = _note(client, "# Bake day\n\nMonday was quiet. I fed the [[Sourdough starter]] twice. Then bread.")
    body = _backlinks(client, target["id"])
    assert body["name"] == "Sourdough starter"
    assert [row["id"] for row in body["links"]] == [source["id"]]
    row = body["links"][0]
    assert row["kind"] == "note" and row["title"] == "Bake day"
    assert row["context"] == "I fed the [[Sourdough starter]] twice."
    assert _marked(row) == "[[Sourdough starter]]"
    assert body["mentions"] == []


def test_an_unlinked_mention_is_listed_with_its_offsets(client):
    target = _note(client, "# Sourdough starter\n\nFed at 9.")
    text = "# Errands\n\nBuy flour for the sourdough starter tomorrow."
    source = _note(client, text)
    body = _backlinks(client, target["id"])
    assert body["links"] == []
    assert len(body["mentions"]) == 1
    row = body["mentions"][0]
    assert row["id"] == source["id"]
    assert _marked(row) == "sourdough starter"
    assert text[row["start"] : row["end"]] == "sourdough starter"


def test_a_document_mention_is_found_too(client):
    target = _note(client, "# Quarterly plan\n\nThree goals.")
    _document(client, "Board pack", "See the quarterly plan for the goals.")
    body = _backlinks(client, target["id"])
    assert [row["kind"] for row in body["mentions"]] == ["document"]


def test_one_click_turns_a_mention_into_a_stored_wiki_link(client):
    target = _note(client, "# Sourdough starter\n\nFed at 9.")
    source = _note(client, "# Errands\n\nBuy flour for the sourdough starter tomorrow.")
    row = _backlinks(client, target["id"])["mentions"][0]
    response = client.post(
        f"/entries/{target['id']}/mentions/link",
        json={"kind": "note", "id": row["id"], "start": row["start"], "end": row["end"]},
    )
    assert response.status_code == 200, response.text
    assert response.json()["linked"] is True
    after = client.get(f"/entries/{source['id']}").json()["content"]
    assert after == "# Errands\n\nBuy flour for the [[sourdough starter]] tomorrow."
    body = _backlinks(client, target["id"])
    assert body["mentions"] == []
    assert [r["id"] for r in body["links"]] == [source["id"]]
    connections = client.get(f"/entries/{source['id']}/connections").json()
    assert target["id"] in [r["id"] for r in connections["outgoing"]]
    assert any(r["link_id"] for r in connections["outgoing"] if r["id"] == target["id"]), (
        "the wiki link is stored, not only read from the text"
    )


def test_a_document_mention_is_linked_in_the_document(client):
    target = _note(client, "# Quarterly plan\n\nThree goals.")
    doc = _document(client, "Board pack", "See the quarterly plan for the goals.")
    row = _backlinks(client, target["id"])["mentions"][0]
    response = client.post(
        f"/entries/{target['id']}/mentions/link",
        json={"kind": "document", "id": doc["id"], "start": row["start"], "end": row["end"]},
    )
    assert response.status_code == 200, response.text
    assert client.get(f"/documents/{doc['id']}").json()["content"] == "See the [[quarterly plan]] for the goals."


def test_a_moved_span_is_refused_and_nothing_is_written(client):
    target = _note(client, "# Sourdough starter\n\nFed at 9.")
    source = _note(client, "# Errands\n\nBuy flour for the sourdough starter tomorrow.")
    row = _backlinks(client, target["id"])["mentions"][0]
    client.put(f"/entries/{source['id']}", json={"content": "# Errands\n\nAlso eggs. Buy flour for the sourdough starter."})
    response = client.post(
        f"/entries/{target['id']}/mentions/link",
        json={"kind": "note", "id": row["id"], "start": row["start"], "end": row["end"]},
    )
    assert response.status_code == 409
    assert "[[" not in client.get(f"/entries/{source['id']}").json()["content"]


def test_a_span_already_inside_a_wiki_link_is_refused(client):
    target = _note(client, "# Sourdough starter\n\nFed at 9.")
    text = "# Bake\n\nThe [[Sourdough starter]] is lively."
    source = _note(client, text)
    start = text.index("Sourdough")
    response = client.post(
        f"/entries/{target['id']}/mentions/link",
        json={"kind": "note", "id": source["id"], "start": start, "end": start + len("Sourdough starter")},
    )
    assert response.status_code == 409


def test_the_note_is_never_its_own_backlink_and_private_notes_are_not_sources(client, session):
    from memorymap.core.database import Entry

    target = _note(client, "# Sourdough starter\n\nThe sourdough starter again.")
    hidden = _note(client, "# Secret\n\nThe sourdough starter is mine.")
    row = session.get(Entry, hidden["id"])
    row.is_private = True
    session.commit()
    body = _backlinks(client, target["id"])
    assert body["links"] == [] and body["mentions"] == []


def test_a_short_name_is_never_hunted_as_a_mention(client):
    target = _note(client, "# AI\n\nShort.")
    _note(client, "# Other\n\nAI is everywhere.")
    assert _backlinks(client, target["id"])["mentions"] == []


def test_a_missing_note_is_a_404(client):
    assert client.get("/entries/999999/backlinks").status_code == 404


def test_one_function_draws_a_backlink_sentence():
    """DESIGN.md's recipe row: every backlink sentence comes from
    `docBacklinkContext` (menus.js, loaded at boot), so a note's column, its
    sheet and a document's panel mark a hit the same way."""
    from pathlib import Path

    js = Path(__file__).resolve().parents[1] / "frontend" / "js"
    text = "".join(path.read_text(encoding="utf-8") for path in sorted(js.glob("*.js")))
    assert text.count("function docBacklinkContext(") == 1
    assert text.count('"doc-backlink-context"') == 1
    #: Connections moved from menus.js to the lazy connections.js (INBOX 784).
    menus = (js / "connections.js").read_text(encoding="utf-8")
    assert "/backlinks`" in menus and "mentions/link`" in menus
