"""The Guide with no model, tailored to the question and the switch it is
about (the composer ledger's "the Guide, 25 gold"). The gold is
`fixtures/composer/guide_1011.json`, typed the way people ask: measured
2026-10-11, the first topic right 20 of 25 and the first line answering 19
of 25 before; 25 and 25 after."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from memorymap.ai import composer, help_chat  # noqa: F401  # composer registers the help line

GOLD = json.loads((Path(__file__).parent / "fixtures" / "composer" / "guide_1011.json").read_text(encoding="utf-8"))["questions"]
FLOOR = 1.0


def _lead(question: str) -> str:
    paras = help_chat.offline_answer(question)["content"].split("\n\n")
    return next(p for p in paras if not p.startswith(("My reading", "Reading that", "I read that"))).lower()


def test_the_gold_questions_reach_their_topic():
    wrong = [(q, help_chat.topics_for(help_chat._read_as(q)[0])[0]["id"]) for q, ids, _w in GOLD
             if help_chat.topics_for(help_chat._read_as(q)[0])[0]["id"] not in ids]
    assert len(GOLD) >= 25 and 1 - len(wrong) / len(GOLD) >= FLOOR, wrong


def test_the_gold_questions_are_answered_in_the_first_line():
    wrong = [(q, _lead(q)[:120]) for q, _ids, words in GOLD if not any(w in _lead(q) for w in words)]
    assert 1 - len(wrong) / len(GOLD) >= FLOOR, wrong


@pytest.mark.parametrize(
    ("body", "want"),
    [
        ("Skills are requests above the chat box (e.g. \"Summarise my week\"). Add your own in Settings, Skills today.",
         ["Skills are requests above the chat box (e.g. \"Summarise my week\").", "Add your own in Settings, Skills today."]),
        ("Plays them at 0.5x or 2x speed in the player. Add to calendar (.ics) saves a file you can open.",
         ["Plays them at 0.5x or 2x speed in the player.", "Add to calendar (.ics) saves a file you can open."]),
        ("Manage categories (a category's ... menu) renames and merges them. Notes keys and controls.",
         ["Manage categories (a category's ... menu) renames and merges them."]),
    ],
)
def test_a_help_sentence_ends_where_a_sentence_ends(body, want):
    assert help_chat.help_sentences(body) == want


def test_a_switch_topic_says_how_the_switch_is_set_now(monkeypatch):
    for on in (False, True):
        monkeypatch.setattr(help_chat, "_preference", lambda _key, _default, on=on: on)
        lead = help_chat.offline_answer("how do i turn on web search")["content"].split("\n\n")[0]
        assert lead.startswith(f"Web search is {'on' if on else 'off'} now. Turn it on in Settings, Web search"), lead
        assert "by default" not in lead


def test_a_privacy_question_is_answered_yes_or_no_first():
    assert _lead("is my data sent anywhere").startswith("no. your notes stay on this computer")
    assert _lead("where did my deleted notes go").startswith("it's in the bin")
