"""WORLD_CLASS_PLAN section 17 row 6: explain this note.

The owner's first notes: "explains what you entered". A note action reads the
note aloud, then says what it links to and why, from the link reasons. The
script is built from the note's own words and its links, with no model, so it
works with Atlas off; the page speaks it.
"""

from __future__ import annotations

import pytest

from memorymap.core import vault


def _make(client, content, **extra):
    return client.post("/entries", json={"content": content, **extra}).json()


def test_a_note_with_no_links_says_so(client):
    a = _make(client, "# Sourdough starter\n\nFeed it twice a day with equal flour and water.")
    out = client.get(f"/entries/{a['id']}/explain").json()
    assert out["links"] == []
    assert out["text"].startswith("Sourdough starter.")
    assert "Feed it twice a day" in out["text"]
    assert "not linked to any other note" in out["text"]


def test_markdown_marks_are_not_spoken(client):
    a = _make(client, "# Plan\n\n**Bold** words, `code`, [a link](https://example.com) and ![pic](/media/x.png)")
    text = client.get(f"/entries/{a['id']}/explain").json()["text"]
    for mark in ("**", "`", "](", "!["):
        assert mark not in text
    assert "a link" in text


def test_links_are_named_with_direction_and_reason(client):
    a = _make(client, "# Sourdough starter\n\nFeed it daily.")
    b = _make(client, "# Oven temperatures\n\nHot first.")
    c = _make(client, "# Kitchen log\n\nWhat I baked.")
    client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"], "reason": "the bread needs a hot oven"})
    client.post(f"/entries/{c['id']}/links", json={"target_id": a["id"], "reason": "the log records each feeding"})

    out = client.get(f"/entries/{a['id']}/explain").json()
    by_id = {row["id"]: row for row in out["links"]}
    assert by_id[b["id"]]["direction"] == "out"
    assert by_id[b["id"]]["reason"] == "the bread needs a hot oven"
    assert by_id[c["id"]]["direction"] == "in"
    assert "links to 2 notes" in out["text"]
    assert "Oven temperatures, because the bread needs a hot oven" in out["text"]
    assert "Kitchen log" in out["text"] and "the log records each feeding" in out["text"]


def test_a_link_with_no_reason_is_still_named(client):
    a = _make(client, "# Alpha\n\nOne.")
    b = _make(client, "# Beta\n\nTwo.")
    client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})
    out = client.get(f"/entries/{a['id']}/explain").json()
    assert "Beta" in out["text"]
    row = out["links"][0]
    assert row["label"] == "Beta"


def test_a_binned_note_is_not_a_link(client):
    a = _make(client, "# Kept\n\nx")
    b = _make(client, "# Binned\n\ny")
    client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})
    client.delete(f"/entries/{b['id']}")
    out = client.get(f"/entries/{a['id']}/explain").json()
    assert out["links"] == []


def test_category_and_tags_are_said(client):
    a = _make(client, "# Run\n\n5k easy.", category="Fitness", tags=["running"])
    text = client.get(f"/entries/{a['id']}/explain").json()["text"]
    assert "Fitness" in text and "running" in text


def test_a_long_note_is_cut_at_a_sentence_and_says_so(client):
    body = " ".join(f"Sentence number {i} says something plain." for i in range(60))
    a = _make(client, f"# Long\n\n{body}")
    out = client.get(f"/entries/{a['id']}/explain").json()
    assert len(out["text"]) < 1500
    assert "The note goes on" in out["text"]


def test_a_missing_note_is_a_404(client):
    assert client.get("/entries/99999/explain").status_code == 404


@pytest.fixture
def open_vault(session):
    """A note can only be made private once a vault exists."""
    vault.close()
    vault.create(session, "test-passphrase")
    session.commit()
    yield
    vault.close()


def test_a_linked_private_note_never_gives_up_its_words(client, open_vault):
    a = _make(client, "# Public one\n\nHello.")
    b = _make(client, "# Secret title\n\nSecret body.")
    client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"], "reason": "SECRETREASON"})
    assert client.post(f"/entries/{b['id']}/privacy", json={"private": True}).status_code == 200
    out = client.get(f"/entries/{a['id']}/explain").json()
    assert len(out["links"]) == 1
    assert "Secret" not in str(out)
    assert "a private note" in out["text"]


def test_a_locked_private_note_does_not_read_its_placeholder(client, open_vault):
    a = _make(client, "# Diary\n\nDear diary.")
    assert client.post(f"/entries/{a['id']}/privacy", json={"private": True}).status_code == 200
    vault.close()
    text = client.get(f"/entries/{a['id']}/explain").json()["text"]
    assert "Dear diary" not in text
    assert "private" in text.lower()
