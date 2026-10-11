"""GET /search says which category a note hit is filed under (INBOX 1332).

BACKLOG said the route already returned each hit's category; it did not
(`engine.Hit` has no such field). Find anything groups its results by kind;
a Group by category needs the name on the hit. Only a note has one: a
document, a file or a reminder gets `null`, and a private note's hit is the
engine's to keep out, as it already does.
"""

from __future__ import annotations


def _hits(client, q: str) -> list[dict]:
    reply = client.get("/search", params={"q": q, "limit": 50})
    assert reply.status_code == 200, reply.text
    return reply.json()["hits"]


def test_a_note_hit_names_its_category(client):
    client.post("/entries", json={"content": "Simmer the lentil soup slowly", "category": "Cooking"})
    client.post("/entries", json={"content": "Lentil sprouts need a window", "category": "Garden"})
    hits = [hit for hit in _hits(client, "lentil") if hit["kind"] == "note"]
    assert {hit["category"] for hit in hits} == {"Cooking", "Garden"}


def test_a_hit_that_is_not_a_note_has_none(client):
    client.post("/entries", json={"content": "Zebra crossing notes", "category": "Roads"})
    client.post("/reminders", json={"text": "Zebra feeding", "due_at": "2030-01-01T10:00:00Z"})
    hits = _hits(client, "zebra")
    assert {hit["kind"] for hit in hits} >= {"note"}
    for hit in hits:
        assert "category" in hit
        if hit["kind"] != "note":
            assert hit["category"] is None


def test_find_anything_can_group_by_category():
    """The frontend half: the Sort select has the option and the renderer groups
    a note under its category and anything else under its kind."""
    from tests._app_js import JS_DIR

    html = (JS_DIR.parent / "index.html").read_text(encoding="utf-8")
    assert '<option value="category">Group by category</option>' in html
    js = (JS_DIR / "search.js").read_text(encoding="utf-8")
    assert 'sortMode === "category"' in js
    assert "hit.category" in js
