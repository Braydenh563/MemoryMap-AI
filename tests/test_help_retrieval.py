"""The Guide finds the right help topic for the way people actually ask.

INBOX 406, the owner: "improve the answers and accuracy of responses when no
ai model is available". With no model the Guide answers from `HELP_TOPICS`
alone, so which topic a question reaches *is* the answer. Measured on
`fixtures/help_questions.json` (122 questions with typos, synonyms and plain
phrasing): the keyword-count rule it replaced reached the right topic first
for 49% and nothing at all for 20%; the ranked rule reaches it first for 99%
and within the top three for all of them. INBOX 410 added 55 questions about
each surface's keys, controls and hidden features (177 in all): 99.4% first,
100% within three. The bar below is lower than the
number so a new topic can shift one question without a false alarm, and high
enough that a regression in the rule cannot hide.
"""

from __future__ import annotations

import json
from pathlib import Path

from memorymap.ai import help_chat

BANK = json.loads((Path(__file__).parent / "fixtures" / "help_questions.json").read_text())


def _ranked(question: str) -> list[str]:
    return [topic["id"] for topic in help_chat._matching_topics(question)]


def test_every_expected_topic_exists():
    ids = {topic["id"] for topic in help_chat.HELP_TOPICS}
    assert not [expected for _, expected in BANK if expected not in ids]


def test_the_right_topic_comes_first_for_nearly_every_question():
    wrong = [(q, e, _ranked(q)) for q, e in BANK if _ranked(q)[:1] != [e]]
    assert len(wrong) <= len(BANK) * 0.05, wrong


def test_the_right_topic_is_always_in_the_top_three():
    missing = [(q, e, _ranked(q)) for q, e in BANK if e not in _ranked(q)]
    assert not missing, missing


def test_a_typo_still_finds_its_topic():
    assert _ranked("hwo do i set a remnder")[:1] == ["reminders"]
    assert _ranked("how do I chnage the theme")[:1] == ["appearance"]


def test_the_offline_answer_leads_with_one_topic_and_names_the_rest():
    reply = help_chat.offline_answer("how do I scan a document")
    assert reply["content"].count("\n\n") >= 1
    body = reply["content"].split("\n\n", 1)[1]
    first = help_chat._matching_topics("how do I scan a document")[0]
    assert body.startswith(first["body"][:60])
