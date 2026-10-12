"""Personal and random questions with no model (brief composer item 8; the
owner, 2026-10-11: "Can the composer answer personal questions or any other
random questions??"): about the person, from their notes; about the app or
the assistant, in its voice; small talk; and general knowledge the offline
app cannot know, said honestly, never invented."""

from __future__ import annotations

import json
import re
from pathlib import Path

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


GOLD = json.loads((Path(__file__).parent / "fixtures" / "composer" / "personal_1011.json").read_text(encoding="utf-8"))
#: Measured 2026-10-11: 9 of 30 before `ai/personal.py`, 30 of 30 after.
FLOOR = 1.0


def _ask(client, question):
    with client.stream("POST", "/chat/stream", json={"question": question, "use_tools": False}) as response:
        events = [json.loads(line) for line in response.iter_lines() if line.strip()]
    said = "".join(e.get("delta", "") for e in events if e["type"] == "answer")
    #: How a misspelt question was read is said first, then the answer.
    said = re.sub(r"^I read that as “[^”]*”\.\n\n", "", said)
    return said, [e for e in events if e["type"] == "grounding"]


def test_the_gold_personal_and_random_questions(client, session):
    from memorymap.entry import manager

    for note in GOLD["notes"]:
        manager.create_entry(session, note)
    session.commit()
    misses = []
    for question, lead in GOLD["questions"]:
        said, _ = _ask(client, question)
        #: A list is a family whose line varies by chat and by day
        #: (`routes_chat._reply_seed`): any of its openings is right.
        if not said.startswith(tuple(lead) if isinstance(lead, list) else lead) or any(n in said for n in GOLD["never"]) or not said.strip():
            misses.append((question, said[:120]))
    assert len(GOLD["questions"]) >= 30
    assert 1 - len(misses) / len(GOLD["questions"]) >= FLOOR, misses


def test_a_fact_about_the_person_carries_its_note(client, session):
    from memorymap.entry import manager

    about = manager.create_entry(session, "# About me\n\nI live in Perth and I work part time at the cafe.").id
    session.commit()
    said, grounding = _ask(client, "where do i live")
    assert said.startswith("You live in Perth, going by your note of")
    row = grounding[0]["sentences"][0]
    assert row["note_id"] == about and row["source"].startswith("I live in Perth")


@pytest.mark.parametrize(
    ("note", "key", "said"),
    [
        ("I live in Perth and I work at the cafe.", "live", "you live in Perth"),
        ("I work as a nurse at St John's.", "work", "you work as a nurse at St John's"),
        ("my birthday is on 3 December", "birthday", "your birthday is 3 December"),
        ("I was born in 1998.", "born", "you were born 1998"),
        ("My dog Biscuit hates the vacuum.", "person", "your dog is Biscuit"),
        ("Coffee with Priya, my boss, at 10.", "person", "your boss is Priya"),
        ("Fav movie is Dune.", "favourite", "your favourite movie is Dune"),
        ("I'm learning Japanese on Duolingo.", "learning", "you're learning Japanese"),
    ],
)
def test_what_a_note_says_of_its_writer(note, key, said):
    from memorymap.ai import personal

    found = personal.facts([{"id": 1, "content": note, "created_at": "2026-10-01T10:00:00"}])
    assert any(f.key == key and f.said == said for f in found), [(f.key, f.said) for f in found]


def test_an_age_is_worked_out_from_a_birth_year():
    from datetime import date

    from memorymap.ai import personal

    notes = [{"id": 1, "content": "I was born in 1998.", "created_at": "2026-01-05T10:00:00"}]
    assert personal.answer("how old am i", notes, date(2026, 10, 11))["text"].startswith("You're about 28: you were born in 1998")


def test_a_question_about_someone_else_is_not_personal():
    from memorymap.ai import personal

    for question in ("where does sam live", "what did i say about the dentist", "who is jess", "what's the capital of my essay"):
        assert personal.asked(question) is None, question
    assert not personal.general("what did I write about france")
    assert personal.general("whats the capital of france")
    assert not personal.general("who is Sam") and personal.general("who is the president of france")
