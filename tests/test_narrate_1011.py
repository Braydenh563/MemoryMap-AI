"""A note told as what happened (the owner, 2026-10-11): its relative time
resolved against the day it was written and said again from today, its
connected facts in one flowing sentence with a reporting verb rather than
label lines, its citation kept and covering every sentence it tells."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from tests import _gold
import pytest

from tessellate.ai import composer_digest
from tests.test_gold_answers import KEYS, NOTES, TODAY

FIXTURE = json.loads((Path(__file__).parent / "fixtures/gold_narrated.json").read_text(encoding="utf-8"))
ONE = [n for n in NOTES if n["id"] == KEYS[FIXTURE["note"]]]


@pytest.mark.parametrize("variant", FIXTURE["variants"], ids=lambda v: v["name"])
def test_the_note_is_told_from_today(variant):
    result = composer_digest.answer(FIXTURE["question"], ONE, today=date.fromisoformat(variant["today"]))
    text = result["text"]
    for words in variant["says"]:
        assert words in text, (words, text)
    for words in variant["never"]:
        assert words not in text, (words, text)
    #: The first paragraph against the gold, measured 2026-10-11
    #: (scratchpad/atlas-narr-measure.py): same week 0.31 before, 0.68 now
    #: (against the owner's own words); months later 0.59 before, 1.0 now.
    assert _gold.similarity(text.split("\n\n")[0], variant["gold"]) >= {"same week": 0.6, "months later": 0.9}[variant["name"]]
    row = result["grounding"][0]
    assert row["note_id"] == KEYS[FIXTURE["note"]] and len(row["parts"]) == 3


@pytest.mark.parametrize(("today", "said", "ahead"), [
    (date(2026, 7, 17), "next week", True),
    (date(2026, 7, 21), "this week", True),
    (date(2026, 7, 29), "the week of 20 July", False),
])
def test_next_week_is_said_from_today(today, said, ahead):
    assert composer_digest._when_now("next week", date(2026, 7, 17), today) == (said, ahead)


def test_in_the_whole_notebook_the_note_is_one_flowing_line():
    text = composer_digest.answer(FIXTURE["question"], NOTES, today=TODAY)["text"]
    assert "You went back to uni the week of 20 July, and you" in text
    assert "**This semester:**" not in text and "**Your week:** classes" not in text


ALL = composer_digest.answer(FIXTURE["question"], NOTES, today=TODAY)


@pytest.mark.parametrize("para", FIXTURE["paragraphs"], ids=lambda p: p["note"])
def test_every_paragraph_is_prose_that_understands_its_note(para):
    """The owner, 2026-10-11: "it didnt do the understanding and rewrite for
    the rest of the response, only the first paragraph and note"."""
    text = ALL["text"]
    line = next((p for p in text.split("\n\n") if para["says"][0] in p), "")
    assert line, (para["says"][0], text)
    for words in para["says"]:
        assert words in line, (words, line)
    for words in para["never"]:
        assert words not in line, (words, line)
    assert _gold.similarity(line, para["gold"]) >= 0.8, line
    #: Its mark still covers the note it tells.
    assert any(r["note_id"] == KEYS[para["note"]] for r in ALL["grounding"])


def test_no_heading_label_lines_and_varied_openings():
    paragraphs = ALL["text"].split("\n\n")[1:]
    assert not [p for p in paragraphs if p.startswith("**")], paragraphs
    openings = [" ".join(p.split()[:2]) for p in paragraphs]
    assert len(openings) == len(set(openings)), openings


def test_the_open_plan_is_said_once_in_prose():
    text = ALL["text"]
    for words in FIXTURE["said_once"]:
        assert text.count(words) == 1, (words, text)
    drift = [i for i in ALL["insights"] if i["rule"] == "drift"]
    assert drift and drift[0]["in_answer"] is True
    assert "It may be still open" not in text


@pytest.mark.parametrize(("body", "said"), [
    ("Lisbon trip planned for May", "you planned the Lisbon trip for May"),
    ("squats 80 kg for 5, bench 60 kg for 5", "you squatted 80 kg for 5 and benched 60 kg for 5"),
    ("squats up to 90 kg for 5", "your squat was up to 90 kg for 5"),
    ("knee felt fine", "your knee felt fine"),
    ("going Monday, Wednesday and Friday", "you were going on Mondays, Wednesdays and Fridays"),
    ("tram 28, pasteis de Belem", None),
])
def test_a_days_shorthand_is_said_as_the_persons_own_clause(body, said):
    assert composer_digest._day_clause(body) == said


def test_a_day_line_is_prose_not_a_date_label():
    """The owner, 2026-10-11: "it didnt do the understanding and rewrite for
    the rest of the response". The gym log and the Lisbon plan were left as
    "**8 September:** squats 80 kg for 5 ..." and "**30 August:** Lisbon
    trip planned for May"."""
    import re

    for question in ("how's the gym going?", "what's the plan for Lisbon?"):
        text = composer_digest.answer(question, NOTES, today=TODAY)["text"]
        assert not re.search(r"^\*\*\d{1,2} [A-Z][a-z]+:\*\*", text, re.M), text
    gym = composer_digest.answer("how's the gym going?", NOTES, today=TODAY)["text"]
    assert "On 8 September, you squatted 80 kg for 5 and benched 60 kg for 5, going on Mondays, Wednesdays and Fridays." in gym
    assert "by 2 October, your squat was up to 90 kg for 5, and your knee felt fine." in gym or "on 2 October, your squat" in gym
