"""UK/AU and US spellings are one word to search and the composer (INBOX
895: the owner wants both handled). `ai/variants.py` finds the pairs in the
shipped English list; search asks for both forms; the composer compares by
one key; an answer keeps the spelling of the person's own note."""

from __future__ import annotations

from datetime import date

import pytest

from tessellate.ai import composer, variants
from tessellate.core.database import Entry
from tessellate.search import engine, search_manager

PAIRS = [
    ("organise", "organize"), ("organised", "organized"), ("organisation", "organization"),
    ("colour", "color"), ("colours", "colors"), ("centre", "center"), ("centred", "centered"),
    ("travelled", "traveled"), ("traveller", "traveler"), ("realise", "realize"), ("summarise", "summarize"),
    ("favourite", "favorite"), ("behaviour", "behavior"), ("honoured", "honored"), ("theatre", "theater"),
    ("metre", "meter"), ("fibre", "fiber"), ("licence", "license"), ("defence", "defense"),
    ("catalogue", "catalog"), ("analyse", "analyze"), ("grey", "gray"), ("cancelled", "canceled"),
    ("labelled", "labeled"), ("programme", "program"), ("jewellery", "jewelry"), ("paediatric", "pediatric"),
]
NOT_PAIRS = ["four", "tour", "hours", "filled", "precise", "noise", "acre", "ogre", "fence", "yours", "prised", "trabeculae"]


@pytest.mark.parametrize(("uk", "us"), PAIRS)
def test_each_spelling_has_the_other(uk, us):
    assert variants.forms(uk) == (uk, us)
    assert variants.forms(us) == (us, uk)
    assert variants.canonical(uk) == variants.canonical(us) == us


@pytest.mark.parametrize("word", NOT_PAIRS)
def test_a_word_with_no_other_spelling_is_alone(word):
    assert variants.forms(word) == (word,)


def test_an_fts_term_asks_for_both():
    assert variants.fts_group("colour") == "(colour OR color)"
    assert variants.fts_group("organiz*") == "organiz*"
    assert variants.fts_group("kiln") == "kiln"


@pytest.fixture()
def notes(session):
    for content in (
        "My favourite colour for the study wall is sage green",
        "Organize the garage shelves by weekend",
        "We travelled to the city centre for the theatre",
        "Kiln firing on Saturday",
    ):
        session.add(Entry(content=content, tags="[]", ai_confidence=0))
    session.commit()
    return session


@pytest.mark.parametrize(("query", "found"), [
    ("favorite color", "My favourite colour"),
    ("favourite colour", "My favourite colour"),
    ("organise garage", "Organize the garage"),
    ("organize garage", "Organize the garage"),
    ("traveled center theater", "We travelled to the city centre"),
])
def test_keyword_search_finds_either_spelling(notes, query, found, monkeypatch):
    #: Not by the near-word correction stage, which reads "color" as the
    #: index's "colour" only by luck of distance: by asking for both.
    monkeypatch.setattr(search_manager, "_corrected_terms", lambda _s, terms: terms)
    hits = [h.content for h in search_manager.keyword_search(notes, query)]
    assert hits and hits[0].startswith(found), hits


@pytest.mark.parametrize(("query", "found"), [
    ("favorite color", "My favourite colour"),
    ("organise", "Organize the garage"),
    ("center", "We travelled to the city centre"),
])
def test_the_search_engine_finds_either_spelling(notes, query, found):
    hits = engine.search(notes, query, ctx=None, hybrid=False)
    assert any(found in f"{h.title} {h.snippet}" for h in hits), [(h.title, h.snippet) for h in hits]


NOTEBOOK = [
    {"id": 1, "content": "My favourite colour for the study wall is sage green.", "created_at": "2026-09-01T10:00:00", "category": "Home", "tags": []},
    {"id": 2, "content": "Need to organize the garage shelves before winter.", "created_at": "2026-09-02T10:00:00", "category": "Home", "tags": []},
]


@pytest.mark.parametrize(("question", "keeps"), [
    ("what is my favorite color?", "colour"),
    ("what did I say about my favourite colour?", "colour"),
    ("what do I need to organise?", "organize"),
])
def test_the_composer_answers_across_spellings_in_the_notes_own(question, keeps):
    result = composer.compose(question, NOTEBOOK, today=date(2026, 10, 11))
    assert result["grounding"], result["text"]
    assert keeps in result["text"], result["text"]
