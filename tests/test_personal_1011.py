"""Personal and random questions with no model (brief composer item 8; the
owner, 2026-10-11: "Can the composer answer personal questions or any other
random questions??"): about the person, from their notes; about the app or
the assistant, in its voice; small talk; and general knowledge the offline
app cannot know, said honestly, never invented."""

from __future__ import annotations

import pytest

from memorymap.ai import capability, realise


@pytest.mark.parametrize(
    ("written", "said"),
    [
        ("I live in Perth and I work part time at the cafe.", "you live in Perth and you work part time at the cafe."),
        ("Then Sam and I left.", "Then you and Sam left."),
        ("Sam and I went to Lisbon.", "you and Sam went to Lisbon."),
        ("I went with Sam and me.", "you went with you and Sam."),
    ],
)
def test_a_place_before_and_i_is_not_a_person_beside_the_writer(written, said):
    """Found probing item 8: "I live in Perth and I work at the cafe" was
    said back as "You live in you and Perth work part time at the cafe"."""
    assert realise.shift_person(written) == said


@pytest.mark.parametrize(
    ("question", "lead"),
    [
        ("do you send my notes anywhere", "No."),
        ("do my notes go online", "No."),
        ("is my data private", "Yes."),
        ("are my notes safe", "Yes."),
        ("where are my notes stored", "Your notes stay on this computer"),
        ("can you see my notes", "Yes, here on this computer."),
    ],
)
def test_where_the_notes_go_is_answered_plainly(question, lead):
    """"do you send my notes anywhere" was answered "Yes. Say make a note"."""
    assert capability.asks(question), question
    assert capability.answer(question).startswith(lead), capability.answer(question)


def test_going_online_is_still_the_web_question():
    assert capability.answer("can you go online").startswith("Yes, when web search is on.")
