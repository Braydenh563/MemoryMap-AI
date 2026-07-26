"""Keyword search — the whole of search when no AI is running.

It used to be a single `LIKE %query%`, so the words had to appear as a
contiguous substring in exactly the order typed. Word order is not something
anyone should have to guess.
"""

from __future__ import annotations

import pytest

from memorymap.core.database import Entry
from memorymap.search import search_manager


@pytest.fixture()
def notes(session):
    rows = [
        ("bread proving times vary by temperature", '["baking"]'),
        ("proving dough overnight in the fridge", '["bread"]'),
        ("sourdough starter needs feeding daily", "[]"),
        ("my bread recipe notes", "[]"),
    ]
    for content, tags in rows:
        session.add(Entry(content=content, tags=tags, ai_confidence=0))
    session.commit()
    return session


def _contents(hits):
    return [h.content for h in hits]


def test_word_order_does_not_matter(notes):
    """The bug: "proving bread" found nothing, "bread proving" found one."""
    forwards = _contents(search_manager.keyword_search(notes, "bread proving"))
    backwards = _contents(search_manager.keyword_search(notes, "proving bread"))
    assert len(forwards) == 2
    assert sorted(forwards) == sorted(backwards)


def test_all_words_must_appear_somewhere(notes):
    hits = _contents(search_manager.keyword_search(notes, "fridge dough"))
    assert hits == ["proving dough overnight in the fridge"]


def test_tags_are_searched_too(notes):
    """A tag is a deliberate choice, so it should be findable."""
    hits = _contents(search_manager.keyword_search(notes, "baking"))
    assert "bread proving times vary by temperature" in hits


def test_an_exact_phrase_ranks_above_scattered_words(notes):
    hits = _contents(search_manager.keyword_search(notes, "bread proving"))
    assert hits[0] == "bread proving times vary by temperature"


def test_partial_matches_beat_an_empty_page(notes):
    """No note has all three words; showing some beats showing nothing."""
    hits = search_manager.keyword_search(notes, "bread sourdough kayaking")
    assert hits, "a partial answer is better than none"


def test_search_is_case_insensitive(notes):
    assert len(search_manager.keyword_search(notes, "BREAD")) == len(
        search_manager.keyword_search(notes, "bread")
    )


def test_punctuation_is_ignored(notes):
    assert _contents(search_manager.keyword_search(notes, "bread, proving!")) == _contents(
        search_manager.keyword_search(notes, "bread proving")
    )


def test_nothing_matching_returns_nothing(notes):
    assert search_manager.keyword_search(notes, "helicopter") == []


def test_an_empty_query_returns_nothing(notes):
    assert search_manager.keyword_search(notes, "   ") == []


def test_private_and_binned_notes_stay_out(notes, session):
    session.add(Entry(content="bread secret", is_private=True, ai_confidence=0))
    session.add(Entry(content="bread binned", is_deleted=True, ai_confidence=0))
    session.commit()
    found = _contents(search_manager.keyword_search(notes, "bread"))
    assert "bread secret" not in found
    assert "bread binned" not in found


def test_the_limit_is_respected(notes):
    assert len(search_manager.keyword_search(notes, "bread", limit=1)) == 1


def test_a_question_made_of_common_words_is_not_a_keyword_search(notes):
    """"what have I saved so far?" has no keywords in it.

    Matching on its words would return the whole notebook — "%a%" appears in
    nearly every note — so it must come back empty and let the caller fall
    through to showing recent notes instead.
    """
    assert search_manager.keyword_search(notes, "what have I saved so far?") == []
    assert search_manager.keyword_search(notes, "how do I") == []


def test_stopwords_are_ignored_but_real_words_still_count(notes):
    """"what about the bread" should search for "bread", not for "the"."""
    hits = _contents(search_manager.keyword_search(notes, "what about the bread"))
    assert hits
    assert all("bread" in h or "proving" in h for h in hits)


def test_short_words_do_not_match_everything(notes):
    assert search_manager.keyword_search(notes, "a") == []


# --- saved filters -------------------------------------------------------------


def test_saved_searches_round_trip(client):
    """A named filter is just a preference, so it survives a restart."""
    saved = [{"name": "Work, untagged", "query": "tag:work is:untagged"}]
    body = client.put("/preferences", json={"saved_searches": saved}).json()
    assert body["saved_searches"] == saved

    # And it comes back on a fresh read, not just in the write response.
    assert client.get("/preferences").json()["saved_searches"] == saved


def test_saved_searches_default_to_empty(client):
    assert client.get("/preferences").json()["saved_searches"] == []


def test_a_saved_search_needs_a_name_and_a_query(client):
    too_short = client.put("/preferences", json={"saved_searches": [{"name": "", "query": "x"}]})
    assert too_short.status_code == 422
    no_query = client.put("/preferences", json={"saved_searches": [{"name": "x", "query": ""}]})
    assert no_query.status_code == 422
