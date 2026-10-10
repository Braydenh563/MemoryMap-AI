"""Open questions are the person's own (INBOX 745 (b)).

The owner, of the Questions list (11 open): "these are just random questions
form my notes?? I didnt actually have any questions for myself, they are
unrelated and mostly from test notes". The ones quoted were a play's line,
conversation-starter prompts in quotes, a quote fragment, and joke setups
answered on the next line. Every sentence ending in "?" was a question.
"""

from __future__ import annotations

import json

from memorymap.ai import facts
from memorymap.core.database import DerivedFact, Entry, utcnow

NOT_OWN = {
    "script": "ACT I\nSCENE 2. A street at night.\nKNIGHT: What daring deed hath led thee to this street?\nSQUIRE: A dragon, sire.",
    "prompts": 'Conversation starters:\n- "If you were a spice, which one would you be and why?"\n- "What is the most adventurous thing you have done?"',
    "fragment": '" or "What\'s the most adventurous thing you have ever done so far?',
    "jokes": "Jokes for Sam\nWhat's an astronaut's favorite drink?\nGravi-tea.\nWhy did the student eat his homework?\nBecause the teacher said it was a piece of cake.",
    "example": 'Ask it things, for example "how do I sort my notes by date?" and it answers.',
    "guide": "# Getting started\n## Your first note\nHave you ever wondered where your ideas go?\n- Press New\n- Type\n- Save\n## Asking\nWhat would you like to find today?",
}

OWN = {
    "plain": "Plans for the shed. When does the timber arrive this month? Who is fixing the roof on the shed?",
    "bold": "**Should I renew the lease before June?** The landlord wants an answer soon.",
    "list": "To sort out:\n- Should I call the bank about the fee?\n- Book the dentist",
}


def _questions(text: str) -> list[str]:
    return [c.text for c in facts.candidates(text) if c.kind == "question"]


def test_not_the_persons_own_questions_are_not_candidates():
    for name, text in NOT_OWN.items():
        assert _questions(text) == [], name


def test_the_persons_own_questions_still_are():
    assert len(_questions(OWN["plain"])) == 2
    assert _questions(OWN["bold"]) == ["**Should I renew the lease before June?"]
    assert _questions(OWN["list"]) == ["- Should I call the bank about the fee?"]


def test_stored_questions_that_are_not_own_are_tombstoned_and_stay_gone(client, session):
    """Rows the old rule stored leave the list at the next pass, as
    tombstones, so a later read does not bring them back."""
    entry = Entry(content=NOT_OWN["jokes"], tags=json.dumps([]))
    session.add(entry)
    session.commit()
    start = NOT_OWN["jokes"].index("What's")
    end = NOT_OWN["jokes"].index("?", start) + 1
    session.add(DerivedFact(entry_id=entry.id, kind="question", text=NOT_OWN["jokes"][start:end],
                            span_start=start, span_end=end, model="local", confidence=0.9, computed_at=utcnow()))
    session.commit()
    facts.run(session, budget=5000, force=True)
    session.commit()
    rows = session.query(DerivedFact).filter_by(entry_id=entry.id, kind="question").all()
    assert rows and all(row.deleted_at is not None for row in rows)
    assert client.get("/questions?state=open").json()["total"] == 0


def test_the_list_shows_questions_and_titles_without_markdown(client, session):
    entry = Entry(content="**Lease** notes\n" + OWN["bold"], tags=json.dumps([]))
    session.add(entry)
    session.commit()
    facts.run(session, budget=5000)
    session.commit()
    item = client.get("/questions?state=open").json()["items"][0]
    assert item["display"] == "Should I renew the lease before June?"
    assert "**" not in item["note_title"]


def test_a_note_says_how_many_open_questions_it_asks(client, session):
    """INBOX 745 (c): "notes ask questions but there is no way to view the
    questions asked by notes if they have any from the notes themselves". The
    card reads `/questions/counts` (open questions per note, the reminders'
    shape) and opens the list filtered to that note (`entry_id`)."""
    asks = Entry(content=OWN["plain"], tags=json.dumps([]))
    quiet = Entry(content="Nothing to ask here, only a plain sentence or two.", tags=json.dumps([]))
    session.add_all([asks, quiet])
    session.commit()
    facts.run(session, budget=5000)
    session.commit()
    counts = client.get("/questions/counts", params={"ids": f"{asks.id},{quiet.id}"}).json()["counts"]
    assert counts == {str(asks.id): 2}
    only = client.get("/questions", params={"state": "open", "entry_id": asks.id}).json()
    assert only["total"] == 2 and {item["entry_id"] for item in only["items"]} == {asks.id}
    assert client.get("/questions", params={"state": "open", "entry_id": quiet.id}).json()["total"] == 0
