"""The unified search finds by meaning and through a typo, not only by
keyword (audit 2026-10-05, ARCH-07).

Measured before: `/search?q=horticulture` 0 hits, `vegetable patch` 0,
`gardn` 0 on a notebook full of garden notes. Candidates came only from the
keyword pass (`if not rows: return []`), so the cosine signal only ever
re-ranked keyword hits, and the vocabulary typo fix lived only in the older
`search_manager` path. The finder and the palette, which B3 was meant to
unify, were keyword only.

The fake embedder files "buy", "milk", "shopping", "groceries" and "eggs"
on one axis, so "shopping" means a note about milk and eggs without sharing
a word with it.
"""

from __future__ import annotations


def _found(client, q: str) -> dict[int, list[str]]:
    reply = client.get("/search", params={"q": q})
    assert reply.status_code == 200, reply.text
    return {hit["id"]: hit["explain"] for hit in reply.json()["hits"] if hit["kind"] == "note"}


def test_a_note_is_found_by_meaning_with_no_shared_word(ai_client):
    note = ai_client.post("/entries", json={"content": "buy milk and eggs on the way home"}).json()["id"]
    ai_client.post("/entries", json={"content": "a pun about a scarecrow"})
    found = _found(ai_client, "shopping")
    assert note in found, found
    assert "similar meaning" in found[note]


def test_a_typo_still_finds_the_word(client):
    note = client.post("/entries", json={"content": "Planted the garden beds today"}).json()["id"]
    assert note in _found(client, "gardn")


def test_keyword_only_stays_keyword_only(ai_client):
    ai_client.post("/entries", json={"content": "buy milk and eggs on the way home"})
    reply = ai_client.get("/search", params={"q": "shopping", "hybrid": "false"})
    assert reply.json()["hits"] == []
