"""A note told as what happened (the owner, 2026-10-11): its relative time
resolved against the day it was written and said again from today, its
connected facts in one flowing sentence with a reporting verb rather than
label lines, its citation kept and covering every sentence it tells."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import _gold
import pytest

from memorymap.ai import composer_digest
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
