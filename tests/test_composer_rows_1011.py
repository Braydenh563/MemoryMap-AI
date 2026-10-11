"""The small and medium "Composer, engine and Ask" rows of the 2026-10-11
ledger (OPEN-ledger rows 395 to 543), each pinned where it was fixed. The
owner's typos are fixtures (Brief 90): each row tries its typed forms too."""

from __future__ import annotations

import re

import pytest

from memorymap.ai import intent, question_noise

#: Row 543: "think", "plan" and "idea" are note words, so a one-line reply
#: of agreement was searched for. Each is the person answering, not asking.
AGREEMENT = [
    "I think so", "i think so tbh", "i guess so", "i suppose so", "i hope so",
    "good plan", "gud plan", "nice idea", "good idea", "great idea", "good call",
    "good point", "sounds like a plan", "sure thing", "i think so too",
]


@pytest.mark.parametrize("message", AGREEMENT)
def test_agreeing_is_small_talk_not_a_search(message):
    assert question_noise.social_kind(message) in {"ack", "compliment"}, message
    assert intent.classify(message) == intent.SMALLTALK, message


@pytest.mark.parametrize("message", ["what did I plan for the trip", "my ideas for the garden", "what do I think about rust"])
def test_the_same_words_in_a_question_still_search(message):
    assert question_noise.social_kind(message) is None
    assert intent.classify(message) != intent.SMALLTALK


def test_a_monthly_repeat_from_the_31st_keeps_its_day(client):
    """Row 414: "monthly" from the 31st landed on 28 February and stayed on
    the 28th. The day it was set for is kept (BYMONTHDAY) from the first
    roll on, so March is the 31st again; a day the store collapsed to
    "monthly" keeps its rule when the month may not hold it."""
    from memorymap.ai import recognise as rec

    assert rec.stored_repeat("FREQ=MONTHLY;BYMONTHDAY=31") == "FREQ=MONTHLY;BYMONTHDAY=31"
    assert rec.stored_repeat("FREQ=MONTHLY;BYMONTHDAY=5") == "monthly"
    made = client.post("/reminders", json={"text": "Pay rent", "due_at": "2030-01-31T09:00:00Z", "recurring": "monthly"}).json()
    february = client.post(f"/reminders/{made['id']}/complete").json()
    assert february["due_at"].startswith("2030-02-28T09:00"), february
    march = client.post(f"/reminders/{made['id']}/complete").json()
    assert march["due_at"].startswith("2030-03-31T09:00"), march
    assert march["repeat_words"] == "every month"
    plain = client.post("/reminders", json={"text": "Water", "due_at": "2030-01-10T09:00:00Z", "recurring": "monthly"}).json()
    rolled = client.post(f"/reminders/{plain['id']}/complete").json()
    assert rolled["recurring"] == "monthly"


@pytest.mark.parametrize("asked, plain", [
    ("hwo do i set a remnder", "how do I set a reminder"),
    ("hwo do i turn on dark mdoe", "how do I turn on dark mode"),
])
def test_the_guide_with_no_model_says_how_it_read_a_typo(asked, plain):
    """Row 404: the Guide's no-model answer said nothing of the repair, and
    answered the misspelt question worse than the plain one (row 417: "The
    Reminders tab groups items..." rather than the steps)."""
    from memorymap.ai import composer_ack, help_chat

    typed = help_chat.offline_answer(asked)["content"]
    clean = help_chat.offline_answer(plain)["content"]
    starts = composer_ack.STARTS["natural"]
    assert any(typed.startswith(s) for s in starts), typed[:80]
    assert typed.split(composer_ack.END, 1)[1] == clean
    assert not any(clean.startswith(s) for s in starts)


def test_a_real_word_no_note_holds_is_not_put_right_to_one_that_does():
    """Found working row 409: "what do I know about rust" quoted the soup
    recipe, because "rust" was fitted to the note word "rest" (one edit).
    A dictionary word is what the person meant; only a non-word is a typo
    of a note's word ("lisbn" is "lisbon")."""
    import json
    from datetime import date
    from pathlib import Path

    from memorymap.ai import composer

    notes = json.loads((Path(__file__).parent / "fixtures" / "composer" / "showcase_725.json").read_text(encoding="utf-8"))["notes"]
    said = composer.compose("what do I know about rust", notes, today=date(2026, 10, 1))
    assert not said["grounding"], said["text"]
    assert "rust" in said["text"]


@pytest.mark.parametrize("question", ["what are my notes about sourdough", "show me notes on sourdough", "wat r my notes abt sourdough"])
def test_a_next_question_chip_names_the_subject_not_the_word_notes(question):
    """Row 410: "some next-question chips repeat the subject": "What is the
    latest on notes about sourdough?" was offered."""
    import json
    from datetime import date
    from pathlib import Path

    from memorymap.ai import composer

    notes = json.loads((Path(__file__).parent / "fixtures" / "composer" / "showcase_725.json").read_text(encoding="utf-8"))["notes"]
    chips = composer.compose(question, notes, today=date(2026, 10, 1))["next"]
    assert chips, question
    assert not [c for c in chips if re.search(r"\bnotes? (?:about|on|abt)\b", c)], chips
