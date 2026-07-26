"""Finding and merging near-duplicate notes.

Merging is the one operation here that can silently lose writing, so most of
these tests are about it not doing that.
"""

from __future__ import annotations

from memorymap.entry import duplicates


def _make(client, content, tags=None):
    return client.post("/entries", json={"content": content, "tags": tags or []}).json()


# --- detection (no AI involved) -------------------------------------------------


def test_scoring_ignores_order_and_punctuation():
    assert duplicates.similarity("buy milk and eggs", "buy milk and eggs") == 1.0
    assert duplicates.similarity("milk and eggs", "eggs and milk") == 1.0
    assert duplicates.similarity("Buy milk, and eggs!", "buy milk and eggs") == 1.0
    assert duplicates.similarity("buy milk", "kayaking in March") == 0.0


def test_identical_notes_are_found(client):
    a = _make(client, "remember to book the dentist for a check-up")
    b = _make(client, "remember to book the dentist for a check-up")
    groups = client.get("/duplicates").json()["groups"]

    assert len(groups) == 1
    assert {e["id"] for e in groups[0]["entries"]} == {a["id"], b["id"]}
    assert groups[0]["similarity"] == 1.0


def test_unrelated_notes_are_not_reported(client):
    _make(client, "bread proving times vary by temperature")
    _make(client, "kayaking trip planned for March")
    assert client.get("/duplicates").json()["groups"] == []


def test_three_similar_notes_form_one_group(client):
    """Not three overlapping pairs the user then has to reconcile."""
    for _ in range(3):
        _make(client, "buy milk eggs bread and butter from the shop")
    groups = client.get("/duplicates").json()["groups"]
    assert len(groups) == 1
    assert len(groups[0]["entries"]) == 3


def test_private_notes_are_never_reported(client, session):
    """Reporting one would reveal it exists and roughly what it says."""
    from memorymap.core import vault

    vault.close()
    vault.create(session, "test-passphrase")
    session.commit()

    secret = _make(client, "the very same secret text here")
    _make(client, "the very same secret text here")
    client.post(f"/entries/{secret['id']}/privacy", json={"private": True})

    assert client.get("/duplicates").json()["groups"] == []
    vault.close()


def test_binned_notes_are_not_reported(client):
    a = _make(client, "duplicated text right here")
    _make(client, "duplicated text right here")
    client.delete(f"/entries/{a['id']}")
    assert client.get("/duplicates").json()["groups"] == []


# --- merging --------------------------------------------------------------------


def test_merging_without_ai_keeps_every_word(client):
    """Worse prose than an AI merge, but it cannot lose anything."""
    a = _make(client, "buy milk and eggs")
    b = _make(client, "buy milk, eggs and butter")

    result = client.post(
        "/duplicates/merge", json={"ids": [a["id"], b["id"]], "use_ai": False}
    ).json()

    assert result["used_ai"] is False
    assert "buy milk and eggs" in result["content"]
    assert "butter" in result["content"]


def test_merging_bins_the_others_rather_than_destroying_them(client):
    """The bin is the undo for the one operation that can lose writing."""
    a = _make(client, "the same note twice over")
    b = _make(client, "the same note twice over")

    result = client.post(
        "/duplicates/merge", json={"ids": [a["id"], b["id"]], "use_ai": False}
    ).json()

    assert result["binned_ids"] == [b["id"]]
    assert client.get(f"/entries/{a['id']}").status_code == 200
    binned = client.get("/entries?deleted=true").json()
    assert b["id"] in [e["id"] for e in binned]


def test_merging_keeps_tags_from_every_note(client):
    """A tag is a deliberate choice; a tidy-up must not quietly drop one."""
    a = _make(client, "shopping list for the week", ["shopping"])
    b = _make(client, "shopping list for this week", ["errands", "shopping"])

    merged = client.post(
        "/duplicates/merge", json={"ids": [a["id"], b["id"]], "use_ai": False}
    ).json()
    tags = client.get(f"/entries/{merged['id']}").json()["tags"]
    assert set(tags) == {"shopping", "errands"}


def test_the_ai_merge_is_used_when_it_is_available(ai_client, fake_ollama):
    a = _make(ai_client, "buy milk and eggs")
    b = _make(ai_client, "buy milk, eggs and butter")
    fake_ollama.librarian_reply = "Buy milk, eggs and butter."

    result = ai_client.post(
        "/duplicates/merge", json={"ids": [a["id"], b["id"]], "use_ai": True}
    ).json()

    assert result["used_ai"] is True
    assert result["content"] == "Buy milk, eggs and butter."


def test_merging_falls_back_to_joining_when_the_ai_is_off(ai_client, fake_ollama):
    a = _make(ai_client, "buy milk and eggs")
    b = _make(ai_client, "buy milk, eggs and butter")
    fake_ollama.running = False

    result = ai_client.post(
        "/duplicates/merge", json={"ids": [a["id"], b["id"]], "use_ai": True}
    ).json()

    assert result["used_ai"] is False
    assert "butter" in result["content"]  # nothing lost by the fallback


def test_preview_changes_nothing(ai_client, fake_ollama):
    a = _make(ai_client, "buy milk and eggs")
    b = _make(ai_client, "buy milk, eggs and butter")
    fake_ollama.librarian_reply = "Buy milk, eggs and butter."

    ai_client.post("/duplicates/preview", json={"ids": [a["id"], b["id"]]})

    assert ai_client.get(f"/entries/{a['id']}").json()["content"] == "buy milk and eggs"
    assert ai_client.get(f"/entries/{b['id']}").status_code == 200


def test_merging_needs_at_least_two_notes(client):
    a = _make(client, "just the one")
    response = client.post("/duplicates/merge", json={"ids": [a["id"], a["id"]]})
    assert response.status_code == 400


def test_private_notes_cannot_be_merged(client, session):
    from memorymap.core import vault

    vault.close()
    vault.create(session, "test-passphrase")
    session.commit()
    a = _make(client, "a private one")
    b = _make(client, "a private one")
    client.post(f"/entries/{a['id']}/privacy", json={"private": True})

    response = client.post("/duplicates/merge", json={"ids": [a["id"], b["id"]]})
    assert response.status_code == 400
    vault.close()
