"""The open tab as context (CHAT_PLAN B10): "Summarise this" sums up the
note that is open, else the category the sidebar filters to, through the
route with no model; with nothing open it says so rather than answering
with the newest notes; "summarise Travel" and "what's in Travel?" read the
whole category rather than what a keyword search finds.
"""

from __future__ import annotations

import json

import pytest

from memorymap.ai import composer_digest
from memorymap.entry import manager


def _turn(client, question: str, **extra) -> str:
    body = {"question": question, "history": [], "notes_only": True, "use_tools": False, "answer_from": "notes", **extra}
    with client.stream("POST", "/chat/stream", json=body) as response:
        assert response.status_code == 200
        events = [json.loads(line) for line in response.iter_lines() if line.strip()]
    return "".join(e.get("delta", "") for e in events if e.get("type") == "answer")


@pytest.fixture
def notebook(session):
    trip = manager.create_entry(
        session,
        "Trip planning: flights to Lisbon on 3 May, 240 pounds. Hotel near Alfama booked for four nights. Still need travel insurance.",
        category_name="Travel",
    )
    manager.create_entry(session, "Packing list: adapter, sun cream, walking shoes.", category_name="Travel")
    gym = manager.create_entry(session, "Gym: squats at 80 kg.", category_name="Health")
    session.commit()
    return {"trip": trip.id, "gym": gym.id}


def test_summarise_this_sums_up_the_open_note_point_by_point(client, notebook):
    text = _turn(client, "Summarise this", open_note_id=notebook["trip"], open_category="Travel")
    assert text.startswith("Your trip planning note of ")
    assert "in Travel, in three points:" in text
    assert "- Flights to Lisbon on 3 May, 240 pounds.\n- Hotel near Alfama" in text
    assert "Packing" not in text and "squats" not in text


def test_a_one_point_note_is_one_sentence(client, notebook):
    text = _turn(client, "tl;dr", open_note_id=notebook["gym"])
    assert "Your gym note of " in text and ", in Health, says one thing: squats at 80 kg." in text


def test_with_no_note_open_the_open_category_is_summed_up(client, notebook):
    text = _turn(client, "what's this about?", open_category="Travel")
    assert text.startswith("Two notes in Travel")
    assert "adapter" in text and "Lisbon" in text and "squats" not in text


def test_with_nothing_open_it_says_so(client, notebook):
    text = _turn(client, "Summarise this")
    assert text.startswith("Nothing is open to sum up.")
    assert "squats" not in text


@pytest.mark.parametrize("question", ["summarise Travel", "what's in Travel?", "what do I have in my travel notes?"])
def test_a_named_category_reads_all_its_notes(client, notebook, question):
    text = _turn(client, question)
    assert text.startswith("Two notes in Travel"), text
    assert "adapter" in text and "Lisbon" in text and "squats" not in text


def test_the_open_context_never_changes_another_question(client, notebook):
    text = _turn(client, "what have I saved about the gym?", open_note_id=notebook["trip"])
    assert "squats" in text and "Lisbon" not in text


@pytest.mark.parametrize("question", ["Summarise this", "summarise it please", "can you sum up this note?", "what is this about?", "TL;DR", "recap"])
def test_about_this_reads_the_phrasings(question):
    assert composer_digest.about_this(question)


@pytest.mark.parametrize("question", ["summarise my trip to Lisbon", "what is this week about?", "summarise the gym notes from May"])
def test_about_this_leaves_a_subject_alone(question):
    assert not composer_digest.about_this(question)
