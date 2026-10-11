"""Variation and the conversation (CHAT_PLAN Phase 6 step 4, decisions 34
and 35): a 20-turn session over the showcase, Ask again, the dialogue state
carried in the request's history, and the route's retry."""

from __future__ import annotations

from datetime import datetime, time

from memorymap.ai import composer, recognise
from memorymap.core import deps
from memorymap.core.config import user_now
from memorymap.entry import manager
from tests import _composer_eval
from tests.test_composer_route_688 import _ask


def test_a_twenty_turn_conversation_opens_more_ways_and_repeats_no_joiner():
    alone = _composer_eval.session_summary(_composer_eval.session(dialogue=False))
    talk = _composer_eval.session_summary(_composer_eval.session())
    assert talk["session_grounded"] and alone["session_grounded"]
    assert talk["session_lead_in_repeats"] == 0
    assert talk["session_openers_distinct"] >= 15
    assert talk["session_openers_distinct"] > alone["session_openers_distinct"]


def test_three_regenerations_differ_and_keep_the_lead():
    answers = _composer_eval.regenerations()
    texts = [a["text"] for a in answers]
    assert len(set(texts)) == 3
    assert len({(a["grounding"][0]["note_id"], a["grounding"][0]["start"]) for a in answers}) == 1


def test_outside_a_conversation_the_same_question_gets_the_same_words():
    data = _composer_eval.load()
    entry = data["questions"][0]
    notes = _composer_eval.notes_for(entry, data)
    on = _composer_eval.today(data)
    first = composer.compose(entry["question"], notes, today=on)["text"]
    assert composer.compose(entry["question"], notes, today=on)["text"] == first


def test_the_dialogue_is_read_from_the_history():
    history = [{"question": "When is the dentist?", "answer": "On 27 September you wrote: Check-up booked for the 21st."}]
    talk = composer.Dialogue.from_history(history)
    assert talk.turns == 1 and talk.salt == composer.Dialogue.from_history(history).salt
    assert composer.PHRASES["wrote_on_b"] in talk.used
    assert "dentist" in talk.topic_stack


def _seed(session, on_day=None) -> None:
    for content in (
        "# Gym log\n\nI went to the gym on Monday and did squats. I like the morning sessions best.",
        "# Running\n\nI ran 5 km on Saturday in 28 minutes. The new shoes helped on the hills.",
        "# Gym plan\n\nI plan to go three times a week. Decided to go with the strength programme.",
    ):
        entry = manager.create_entry(session, content)
        if on_day is not None:
            entry.created_at = datetime.combine(on_day, time(10))
    session.commit()


ASK = {"notes_only": True, "use_tools": False, "answer_from": "notes"}


def test_try_again_on_the_route_rewords_and_keeps_the_lead(client, session):
    _seed(session)
    first = _ask(client, "what have I done for fitness", **ASK)
    again = _ask(client, "what have I done for fitness", attempt=1, **ASK)
    assert first["text"] != again["text"]
    lead = lambda out: (out["grounding"][0]["sentences"][0]["note_id"], out["grounding"][0]["sentences"][0]["start"])  # noqa: E731
    assert lead(first) == lead(again)


def test_a_correction_on_the_route_answers_from_the_note_it_names(client, session):
    # "on Saturday" is the last Saturday, so the notes are dated then: seeded
    # "now" they are found only when the suite happens to run on that day.
    saturday = recognise.question_day("on Saturday", user_now(deps.get_config()).date())[0]
    _seed(session, on_day=saturday)
    first = _ask(client, "what did I do on Saturday", **ASK)
    history = [{"question": "what did I do on Saturday", "answer": first["text"]}]
    fixed = _ask(client, "no, the gym one", history=history, **ASK)
    assert fixed["grounding"][0]["sentences"][0]["sentence"].startswith(("You went to the gym", "I went to the gym")), fixed["text"]
