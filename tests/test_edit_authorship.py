"""Whose edit it was: yours, Atlas's, or both (INBOX 446, the owner: "note
edit history doens allow me to go back on manual edits and I cant
distinguish between personal or ai edits or mixed edits")."""

from __future__ import annotations


def _edit(client, entry_id, text, **extra):
    current = client.get(f"/entries/{entry_id}").json()
    return client.put(
        f"/entries/{entry_id}",
        json={"content": text, "base_hash": current["content_hash"], **extra},
    )


def test_a_manual_edit_is_yours_and_can_be_put_back(client):
    note = client.post("/entries", json={"content": "first words"}).json()
    assert _edit(client, note["id"], "second words").status_code == 200
    history = client.get(f"/entries/{note['id']}/history").json()
    edited = [item for item in history["items"] if item["action"] == "edited"]
    assert edited and edited[0]["actor"] == "user"
    created = next(item for item in history["items"] if item["action"] == "created")
    restored = client.post(f"/entries/{note['id']}/restore/{created['id']}")
    assert restored.status_code == 200
    assert client.get(f"/entries/{note['id']}").json()["content"] == "first words"


def test_an_edit_carrying_an_applied_suggestion_is_both_of_yours(client):
    note = client.post("/entries", json={"content": "rough draft"}).json()
    assert _edit(client, note["id"], "A cleaner draft.", ai_assisted=True).status_code == 200
    history = client.get(f"/entries/{note['id']}/history").json()
    edited = [item for item in history["items"] if item["action"] == "edited"]
    assert edited[0]["actor"] == "user+ai"


def test_the_labels_say_who():
    from tests._app_js import app_js_text

    js = app_js_text()
    assert 'if (!actor || actor === "user") return "You";' in js
    assert 'if (actor === "user+ai") return "You and Atlas";' in js
    assert 'ai_assisted: textarea.dataset.aiTouched === "1"' in js
