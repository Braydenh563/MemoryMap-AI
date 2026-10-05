"""A very short note needs a close relative before meaning may file it
(BACKLOG section 8: "I wrote 'ai is cool' as a note and it was filed under
Sketches").

The numbers behind `SHORT_NOTE_MIN_NEIGHBOUR` were measured with the real
embedding model in `scratchpad/filing_short_eval.py`; these pin the behaviour
with vectors chosen by the test, so similarity is exact.
"""

from __future__ import annotations

from memorymap.ai import janitor
from tests.test_janitor_knn import DeadOllama, DirectedEmbeddings, _note


def _file(session, text, vectors):
    return janitor.categorise(
        session, text, DirectedEmbeddings(vectors), model_manager=None, ollama=DeadOllama()
    )


def _two_categories(session):
    _note(session, "gym a", "Gym", [1.0, 0.0, 0.0, 0.0])
    _note(session, "gym b", "Gym", [0.95, 0.31, 0.0, 0.0])
    _note(session, "food a", "Food", [0.0, 0.0, 1.0, 0.0])
    _note(session, "food b", "Food", [0.0, 0.31, 0.95, 0.0])


def test_a_short_note_far_from_everything_is_not_filed_by_meaning(session, app_state):
    _two_categories(session)
    # Cosine 0.6 to the nearest Gym note: over the old 0.42 neighbour bar (it
    # was filed), under the short-note floor of 0.72.
    name, _confidence, method = _file(session, "ai is cool", {"ai is cool": [0.6, 0.0, 0.0, 0.8]})
    assert (name, method) == ("Uncategorised", "none")


def test_a_short_note_with_a_close_relative_is_still_filed(session, app_state):
    _two_categories(session)
    # Cosine 0.8 to the nearest Gym note, well over the floor.
    name, _confidence, method = _file(session, "squats today", {"squats today": [0.8, 0.0, 0.0, 0.6]})
    assert name == "Gym"
    assert method in ("semantic-match", "semantic-neighbours")


def test_a_note_of_four_words_is_judged_as_before(session, app_state):
    _two_categories(session)
    name, _confidence, method = _file(
        session, "ai is really cool", {"ai is really cool": [0.6, 0.0, 0.0, 0.8]}
    )
    assert name == "Gym"
    assert method == "semantic-neighbours"


def test_a_short_note_that_matches_a_word_falls_through_to_the_words(session, app_state):
    _two_categories(session)
    # Far from every vector, but its word is the category's name: the
    # notebook's own words (lexical_filing) still get to speak.
    _note(session, "gym day one", "Gym", [1.0, 0.0, 0.0, 0.0])
    name, _confidence, method = _file(session, "gym stuff", {"gym stuff": [0.6, 0.0, 0.0, 0.8]})
    assert (name, method) == ("Gym", "words")


def test_nothing_to_compare_with_is_not_a_reason_to_refuse(session, app_state):
    assert janitor._too_short_to_trust("hello", DirectedEmbeddings({}), None) is False
