"""The floors of CHAT_PLAN Phase 6's five eval sets (decision 40), each set a
fixture in `fixtures/composer/` written by `scripts/phase6_fixtures.py` with
its expected values worked out from the row, never from the engine.

Floors are the first measured run's numbers; a change that lowers one has
found something real (CLAUDE.md section 7: fix the cause, never the floor).
"""

from __future__ import annotations

import functools

from tests import _composer_eval as ev


@functools.cache
def _dialogues() -> dict:
    return ev.dialogues_summary(ev.run_dialogues())


def test_insights_fire_on_their_threshold_and_are_rederived():
    got = ev.insights_summary(ev.run_insights())
    assert got["rows"] == 40
    assert got["positive_recall"] >= 0.9
    assert got["negatives_silent"] == got["negatives"] == 10
    assert got["measured_rederived"]


def test_dialogues_read_each_terse_turn_and_stay_grounded():
    got = _dialogues()
    assert got["turns"] == 600
    assert got["kind_accuracy"] >= 0.99
    assert all(share >= 0.95 for share in got["by_effect"].values()), got["by_effect"]
    assert got["grounded"]


def test_a_conversation_never_repeats_a_lead_in():
    got = _dialogues()
    assert got["lead_in_repeats_max"] == 0
    assert got["openers_distinct_min"] >= 6


def test_acts_parse_and_no_lookalike_is_an_act():
    got = ev.acts_summary(ev.run_acts())
    assert got["acts"] >= 33
    assert got["parse_accuracy"] == 1.0
    assert got["false_positive_acts"] == 0


def test_web_answers_are_spans_of_the_pages_cited_by_url():
    got = ev.web_summary(ev.run_web())
    assert got["web_spans"] == got["cited_by_url"] == 1.0
    assert got["first_from_the_right_page"] >= 0.9


def test_each_source_kind_is_cited_as_itself():
    got = ev.sources_summary(ev.run_sources())
    assert got["kind_right"] == got["caption_and_quote_right"] == 1.0
    assert got["grounded"]
