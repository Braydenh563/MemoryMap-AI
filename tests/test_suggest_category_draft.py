"""A category for a note that is not saved yet (INBOX 1330).

The Capture box already offers tags while you type (`/entries/suggest-tags`);
this is the other half of "a live, inline organization suggestion": the
category the notebook's own words point to, with the reason, with no model and
no write. Nothing is offered where the words know nothing: a guess shown as a
choice costs a glance, but a category with no reason behind it is noise.
"""

from __future__ import annotations


def _seed(client):
    for text in (
        "Simmer the tomato sauce for an hour, add basil and garlic",
        "Sourdough starter: feed it flour and water, bake the loaf hot",
        "Roast chicken with lemon, garlic and thyme, rest it before carving",
    ):
        client.post("/entries", json={"content": text, "category": "Cooking"})
    for text in (
        "Squat day: five sets, deadlift next, bench on Friday",
        "Gym session: pull day, rows and curls, stretch after",
        "Running plan: easy miles, one long run, rest on Sunday",
    ):
        client.post("/entries", json={"content": text, "category": "Fitness"})


def test_a_draft_gets_the_category_its_words_point_to_with_the_reason(client):
    _seed(client)
    body = client.post(
        "/entries/suggest-category",
        json={"content": "Roast the potatoes with garlic and a little thyme"},
    ).json()
    assert body["category"] == "Cooking"
    assert body["reason"], "a suggestion without its reason is not offered"


def test_the_title_counts_with_the_first_line(client):
    _seed(client)
    body = client.post(
        "/entries/suggest-category",
        json={"content": "five sets, then rest", "title": "Deadlift and squat session"},
    ).json()
    assert body["category"] == "Fitness"


def test_words_the_notebook_does_not_know_offer_nothing(client):
    _seed(client)
    for content in ("", "   ", "Zebra quokka nebula fjord"):
        body = client.post("/entries/suggest-category", json={"content": content}).json()
        assert body == {"category": None, "reason": ""}


def test_nothing_is_written_and_no_model_is_asked(client):
    from tessellate.core import deps

    _seed(client)
    before = client.get("/entries").json()
    client.post("/entries/suggest-category", json={"content": "Simmer the sauce"})
    after = client.get("/entries").json()
    assert after == before
    assert deps.get_ollama().chat_calls == []
