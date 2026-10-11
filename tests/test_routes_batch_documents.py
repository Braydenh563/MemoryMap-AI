"""Named-route tests for the documents' joins, AI panel and history (ledger 1573).

The AI routes run with no model (the `client` fixture), which is the path a
person without one takes: they answer, say so, and change nothing.
"""

from __future__ import annotations


def _doc(client, content="hello world"):
    return client.post("/documents", json={"title": "T", "content": content}).json()["id"]


def test_a_note_attaches_to_a_document_shows_in_connections_and_detaches(client):
    doc_id = _doc(client)
    note_id = client.post("/entries", json={"content": "a note"}).json()["id"]
    attached = client.post(f"/documents/{doc_id}/notes", json={"entry_id": note_id})
    assert attached.status_code == 201
    connections = client.get(f"/documents/{doc_id}/connections").json()
    assert connections["total"] == 1 and connections["notes"][0]["id"] == note_id
    detached = client.delete(f"/documents/{doc_id}/notes/{note_id}")
    assert detached.status_code == 200
    assert client.get(f"/documents/{doc_id}/connections").json()["total"] == 0


def test_a_bookmark_attaches_to_a_document_and_a_note_and_detaches_from_both(client):
    doc_id = _doc(client)
    note_id = client.post("/entries", json={"content": "a note"}).json()["id"]
    mark_id = client.post("/bookmarks", json={"url": "https://example.com", "title": "Ex"}).json()["id"]
    client.post(f"/documents/{doc_id}/bookmarks", json={"bookmark_id": mark_id})
    client.post(f"/entries/{note_id}/bookmarks", json={"bookmark_id": mark_id})
    assert client.get(f"/documents/{doc_id}/connections").json()["bookmarks"][0]["id"] == mark_id
    gone_doc = client.delete(f"/documents/{doc_id}/bookmarks/{mark_id}")
    gone_note = client.delete(f"/entries/{note_id}/bookmarks/{mark_id}")
    assert gone_doc.json()["detached"] is True and gone_note.status_code == 200
    assert client.get(f"/documents/{doc_id}/connections").json()["bookmarks"] == []


def test_a_document_exports_as_markdown(client):
    doc_id = _doc(client, "Body text.")
    response = client.get(f"/documents/{doc_id}/export.md")
    assert response.status_code == 200 and "Body text." in response.text


def test_the_ai_panel_without_a_model_says_so_and_changes_nothing(client):
    doc_id = _doc(client)
    edit = client.post(f"/documents/{doc_id}/ai-edit", json={"instruction": "shorten", "verb": "edit"})
    assert edit.status_code == 200 and edit.json()["revised"] == "hello world"
    check = client.post(f"/documents/{doc_id}/ai-check", json={})
    assert check.status_code == 200 and "No model is connected" in check.text
    assert client.get(f"/documents/{doc_id}").json()["content"] == "hello world"


def test_an_ai_edit_is_reverted_from_the_log_and_a_revision_is_restored(client):
    doc_id = _doc(client, "before")
    logged = client.post(
        f"/documents/{doc_id}/ai-edit-log",
        json={"verb": "edit", "before_content": "before", "after_content": "after"},
    )
    entry_id = logged.json()["id"]
    client.put(f"/documents/{doc_id}", json={"content": "after"})
    reverted = client.post(f"/documents/{doc_id}/ai-edit-log/{entry_id}/revert")
    assert reverted.status_code == 200
    assert client.get(f"/documents/{doc_id}").json()["content"] == "before"
    client.put(f"/documents/{doc_id}", json={"content": "third"})
    revisions = client.get(f"/documents/{doc_id}/revisions").json()
    revision_id = revisions[-1]["id"]
    restored = client.post(f"/documents/{doc_id}/revisions/{revision_id}/restore")
    assert restored.status_code == 200
    missing = client.post(f"/documents/{doc_id}/revisions/99999/restore")
    assert missing.status_code == 404
