"""Round 1: suggestions endpoint + follow-up conversation memory."""

from __future__ import annotations

from memorymap.ai import librarian


def _save(client, content, **extra):
    response = client.post("/entries", json={"content": content, **extra})
    assert response.status_code == 201
    return response.json()


# --- suggestions -----------------------------------------------------------------


def test_suggestions_starters_for_empty_notebook(client):
    assert client.get("/chat/suggestions").json() == librarian_starters()


def librarian_starters():
    from memorymap.api.routes_chat import STARTER_SUGGESTIONS

    return STARTER_SUGGESTIONS


def test_suggestions_are_content_aware(client):
    # Guided mode files these under real categories, skipping the AI.
    _save(client, "a joke", category="Jokes")
    _save(client, "another joke", category="Jokes")
    _save(client, "milk", category="Shopping")

    picks = client.get("/chat/suggestions").json()
    assert any("jokes" in p.lower() for p in picks)  # most-populated first
    assert any("shopping" in p.lower() for p in picks)
    assert len(picks) <= 5
    assert len(picks) == len(set(picks))  # no duplicates


def test_suggestions_ignore_uncategorised(client):
    _save(client, "a stray thought")  # lands in Uncategorised (no AI)
    # Only the generic starters, since there's no real category.
    assert client.get("/chat/suggestions").json() == librarian_starters()


# --- follow-up memory -------------------------------------------------------------


def test_build_messages_replays_history():
    notes = [{"content": "the cheese joke", "category": "Jokes"}]
    history = [{"question": "what jokes?", "answer": "You have a cheese joke."}]
    messages = librarian.build_messages("tell me more", notes, history=history)

    roles = [m["role"] for m in messages]
    assert roles == ["system", "user", "assistant", "user"]
    assert messages[1]["content"] == "what jokes?"
    assert messages[2]["content"] == "You have a cheese joke."
    assert "tell me more" in messages[-1]["content"]


def test_build_messages_clips_history_length():
    long_answer = "x" * 5000
    history = [{"question": f"q{i}", "answer": long_answer} for i in range(10)]
    messages = librarian.build_messages("now", [{"content": "n", "category": "c"}], history=history)

    # At most MAX_HISTORY_TURNS pairs survive, and each answer is clipped.
    assistant_msgs = [m for m in messages if m["role"] == "assistant"]
    assert len(assistant_msgs) == librarian.MAX_HISTORY_TURNS
    assert all(len(m["content"]) <= librarian.MAX_HISTORY_ANSWER_CHARS for m in assistant_msgs)


def test_chat_endpoint_threads_history_to_model(ai_client, fake_ollama):
    _save(ai_client, "a funny scarecrow joke")
    ai_client.post(
        "/chat",
        json={
            "question": "any more jokes?",
            "history": [{"question": "any jokes?", "answer": "Yes, a scarecrow one."}],
        },
    )
    # The fake records the exact messages it was asked to answer.
    sent = fake_ollama.chat_calls[-1]
    assert any(m["content"] == "any jokes?" for m in sent)
    assert any(m["content"] == "Yes, a scarecrow one." for m in sent)
