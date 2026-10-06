"""The composed answer through `/chat/stream` (INBOX 688).

The Ask box sends `answer_from: "notes"` when "From your notes" is chosen; with
no model running a notes-only turn is composed whatever it sends. The answer
arrives in one piece with exact grounding rows, `meta.composed` says which kind
of answer it is, and no model is called for it.
"""

from __future__ import annotations

import json

from memorymap.entry import manager


def _ask(client, question: str, **body) -> dict:
    events: dict[str, list] = {}
    with client.stream("POST", "/chat/stream", json={"question": question, **body}) as response:
        assert response.status_code == 200
        for line in response.iter_lines():
            if line.strip():
                event = json.loads(line)
                events.setdefault(event["type"], []).append(event)
    events["text"] = "".join(e["delta"] for e in events.get("answer", []))
    return events


def _seed(session) -> None:
    manager.create_entry(
        session,
        "# Harbor launch plan\n\nShip the mobile app to the public on the 14th of next month. "
        "Three gates before then: beta feedback closed and the pricing page signed off.",
    )
    manager.create_entry(session, "# Dentist\n\nCheck-up booked for the 21st. Ask about the night guard.")
    session.commit()


def test_from_your_notes_composes_even_with_a_model_running(ai_client, fake_ollama, session):
    _seed(session)
    calls_before = len(fake_ollama.chat_models)
    out = _ask(ai_client, "What is the Harbor launch plan?", notes_only=True, use_tools=False, answer_from="notes")
    meta = out["meta"][0]
    assert meta["composed"] is True
    assert meta["answered_by"] is None
    assert "**Harbor launch plan**" in out["text"]
    assert "> Ship the mobile app to the public on the 14th of next month." in out["text"]
    assert fake_ollama.librarian_reply not in out["text"]
    #: No model was asked for this answer.
    assert len(fake_ollama.chat_models) == calls_before
    #: One grounding event, the exact rows, not re-grounded after the stream.
    assert len(out["grounding"]) == 1
    rows = out["grounding"][0]["sentences"]
    assert out["grounding"][0]["exact"] is True
    assert rows and all(row["sentence"] in out["text"] for row in rows)
    assert out["grounding"][0]["support"]["low"] is False


def test_the_composed_turn_is_saved_with_its_rows(ai_client, session):
    _seed(session)
    _ask(ai_client, "When is the dentist check-up?", notes_only=True, use_tools=False, answer_from="notes")
    turns = ai_client.get("/ask-history").json()["turns"]
    assert len(turns) == 1
    turn = ai_client.get(f"/ask-history/{turns[0]['id']}").json()
    assert "Check-up booked for the 21st." in turn["answer"]
    assert any(row["sentence"] == "Check-up booked for the 21st." for row in turn["grounding"])


def test_ai_is_still_the_model_when_a_model_runs(ai_client, fake_ollama, session):
    _seed(session)
    out = _ask(ai_client, "What is the Harbor launch plan?", notes_only=True, use_tools=False, answer_from="ai")
    assert out["meta"][0]["composed"] is False
    assert fake_ollama.librarian_reply in out["text"]


def test_an_unknown_choice_is_the_default_not_an_error(ai_client, fake_ollama, session):
    _seed(session)
    out = _ask(ai_client, "What is the Harbor launch plan?", notes_only=True, use_tools=False, answer_from="xyz")
    assert out["meta"][0]["composed"] is False


def test_with_no_model_the_ask_box_composes(client, session):
    _seed(session)
    out = _ask(client, "What is the Harbor launch plan?", notes_only=True, use_tools=False)
    assert out["meta"][0]["composed"] is True
    assert "**Harbor launch plan**" in out["text"]


def test_the_chat_tab_keeps_its_own_offline_answer(client, session):
    _seed(session)
    out = _ask(client, "What is the Harbor launch plan?", use_tools=False)
    assert out["meta"][0]["composed"] is False
    assert "No model is running" in out["text"]
    #: The extractive rows are exact too now, and kept rather than replaced.
    assert len(out["grounding"]) == 1 and out["grounding"][0]["exact"] is True


def test_a_greeting_still_hints_rather_than_composing(ai_client, session):
    out = _ask(ai_client, "hey", notes_only=True, use_tools=False, answer_from="notes")
    assert "hint" in out and not out.get("answer")
