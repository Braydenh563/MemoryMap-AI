"""How much of an answer the notebook actually backs, and who decides.

CHAT_PLAN Phase 1's fourth gate line, and Brief 12's decision: "the 'I don't
know' copy is triggered when < 50% of sentences are supported". The marks have
always shown *which* sentences came from notes. Nothing showed how many, so an
answer with one cited sentence in six read, at a glance, exactly like one with
six in six, which is the one thing a notebook that cites must not get wrong.

The threshold lives here, in the backend, and rides on the event beside the
numbers. Two places each choosing when an answer counts as thin is two places
to disagree, and the copy would then describe a different answer from the one
the marks describe.
"""

from __future__ import annotations

import re
from pathlib import Path

from memorymap.ai import grounding

ROOT = Path(__file__).resolve().parents[1]

NOTES = [
    {
        "id": 1,
        "content": (
            "The sourdough starter needs feeding every day with flour and water "
            "before you can bake bread with it."
        ),
    }
]


def test_a_fully_supported_answer_is_not_low():
    answer = (
        "The sourdough starter needs feeding every day with flour and water. "
        "Feed the starter with flour and water before you bake bread with it."
    )
    marks = grounding.ground_answer_sentences(answer, NOTES)
    result = grounding.support(answer, marks)
    assert result["sentences"] == 2
    assert result["supported"] == 2
    assert result["ratio"] == 1.0
    assert result["low"] is False


def test_an_answer_the_notes_barely_back_is_low():
    answer = (
        "The sourdough starter needs feeding every day with flour and water. "
        "Bananas are grown in tropical countries a very long way from here. "
        "Most commercial yeast is produced in enormous industrial fermenters."
    )
    marks = grounding.ground_answer_sentences(answer, NOTES)
    result = grounding.support(answer, marks)
    assert result["sentences"] == 3
    assert result["supported"] == 1
    assert result["low"] is True


def test_one_sentence_is_never_called_low():
    """A single unmarked sentence is not evidence of anything.

    Without this floor, every honest one-line answer ("You have no notes about
    that.") would carry a warning, which is how a warning gets ignored.
    """
    answer = "You have no notes about that at all."
    result = grounding.support(answer, [])
    assert result["sentences"] <= 1
    assert result["low"] is False


def test_a_sentence_about_two_notes_is_counted_once():
    """`ground_answer_sentences` emits one row per (sentence, note).

    Counting rows rather than distinct sentences would let a two-note sentence
    push the ratio above one.
    """
    marks = [
        {"sentence": "Feed the starter before the walk.", "note_id": 1},
        {"sentence": "Feed the starter before the walk.", "note_id": 2},
    ]
    result = grounding.support("Feed the starter before the walk. Bananas grow far away.", marks)
    assert result["supported"] == 1
    assert result["ratio"] <= 1.0


def test_the_stream_sends_support_beside_the_sentences():
    """Read off the route, because the frontend reads `event.support`.

    A grounding event that carries sentences and no support is a notice that
    never appears, silently, which is the shape `test_lazy_bundle_calls.py`
    exists for in another corner of the app.
    """
    source = (ROOT / "src" / "memorymap" / "api" / "routes_chat.py").read_text(encoding="utf-8")
    emits = re.findall(r'\{\s*"type":\s*"grounding".*?\}', source, re.S)
    assert emits, "no grounding event found in routes_chat.py"
    without = [e for e in emits if '"support"' not in e]
    assert not without, "grounding events with no support:\n" + "\n".join(
        e[:120] for e in without
    )


def test_the_frontend_takes_the_backends_judgement_rather_than_its_own():
    """`renderAnswerSupport` may read `low`; it may not re-derive it.

    A number written into app.js is a second threshold, and the two drift.
    """
    source = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    body = re.search(r"function renderAnswerSupport\(.*?\n\}", source, re.S)
    assert body, "renderAnswerSupport not found"
    assert "support.low" in body.group(0), "the notice must key off the backend's own `low`"
    assert not re.search(r"0\.5|ratio\s*<", body.group(0)), (
        "no threshold in the frontend: `grounding.support` decides, and sends `low`"
    )
