"""The retrieval engine, measured (SESSION_BRIEFS Brief 11, WORLD_CLASS_PLAN B3).

`tests/test_search_engine_spec.py` is the contract and stays as written; this
file is where the behaviour around it is pinned: the operators one by one, the
index's write path, the three scores, and the perf gates with the numbers they
were measured at.
"""
from __future__ import annotations

from datetime import date

import pytest

from memorymap.search.query import understand


def test_an_ordinary_question_has_no_operators():
    u = understand("what did I write about beans")
    assert u.filters == {"tag": [], "kind": [], "space": [], "has": [], "is": []}
    assert not u.has_operators
    assert u.subject == "beans"


def test_operators_are_lifted_out_of_the_subject():
    u = understand("tag:work sourdough starter")
    assert u.filters["tag"] == ["work"]
    assert "tag:work" not in u.subject
    assert "sourdough" in u.subject


def test_a_quoted_value_and_a_comma_list():
    u = understand('tag:"two words" kind:note,document')
    assert u.filters["tag"] == ["two words"]
    assert u.filters["kind"] == ["note", "document"]


def test_aliases_mean_the_same_thing():
    assert understand("type:document").filters["kind"] == ["document"]
    assert understand("space:work").filters["space"] == ["work"]
    assert understand("tags:garden").filters["tag"] == ["garden"]


def test_before_and_after_are_exclusive_bounds():
    u = understand("before:2026-01-01 after:2025-12-01")
    assert u.until == date(2025, 12, 31)
    assert u.since == date(2025, 12, 2)


def test_a_typed_date_beats_a_time_phrase():
    """Both in one query: the stated bound wins rather than being overwritten."""
    u = understand("beans before:2026-01-01 last week", now=date(2026, 6, 1))
    assert u.until == date(2025, 12, 31)


def test_an_unreadable_date_invents_nothing():
    """`before:tuesday` is not an ISO date. No bound is guessed from it, and
    the words stay in the query, so the person sees their own text matching
    nothing rather than the app filtering by a date it made up."""
    u = understand("before:tuesday", now=date(2026, 6, 3))
    assert u.since is None and u.until is None
    assert "tuesday" in u.subject


def test_an_operator_query_is_not_a_time_only_question():
    u = understand("kind:document before:2026-01-01")
    assert not u.time_only


def test_a_url_is_not_an_operator():
    u = understand("https://example.com/thing")
    assert not u.has_operators
    assert "example.com" in u.subject


@pytest.mark.parametrize("q", ["", "   ", '"', "-", "tag:"])
def test_a_ragged_query_is_never_an_error(q):
    understand(q)
