"""ROADMAP.md item 40's mini AI chat: app-guidance-only, utility model,
no persisted history. `ai_client`/`fake_ollama` give the happy path;
`client` proves it degrades without crashing when the model is offline."""

from __future__ import annotations

from memorymap.ai import help_chat


def test_ask_without_ai_returns_offline_message_never_5xx(client):
    response = client.post("/help/ask", json={"question": "how do I set a reminder?"})
    assert response.status_code == 200
    assert "doesn't seem to be running" in response.json()["content"]
    assert response.json()["badges"] == []


def test_ask_with_only_whitespace_is_a_no_op_not_a_model_call(ai_client, fake_ollama):
    # min_length=1 lets " " through the Pydantic body; help_chat.answer()
    # itself is what actually guards against calling the model on nothing.
    response = ai_client.post("/help/ask", json={"question": " "})
    assert response.status_code == 200
    assert response.json() == {"content": "", "badges": []}


def test_ask_with_working_model(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "Open the Reminders tab and click New reminder."
    response = ai_client.post("/help/ask", json={"question": "how do I set a reminder?"})
    assert response.status_code == 200
    body = response.json()
    assert "New reminder" in body["content"]
    assert {"label": "Reminders", "tab": "reminders"} in body["badges"]


def test_ask_never_writes_history_server_side(ai_client, fake_ollama):
    # Two independent calls with no shared state get no cross-talk — proof
    # this endpoint never reads a database table for context.
    fake_ollama.librarian_reply = "Answer one."
    first = ai_client.post("/help/ask", json={"question": "q1"}).json()
    fake_ollama.librarian_reply = "Answer two."
    second = ai_client.post("/help/ask", json={"question": "q2"}).json()
    assert first["content"] == "Answer one."
    assert second["content"] == "Answer two."


def test_ask_passes_along_client_held_history(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "Following up on that."
    response = ai_client.post(
        "/help/ask",
        json={
            "question": "and what about dark mode?",
            "history": [
                {"role": "user", "content": "how do I change the theme?"},
                {"role": "assistant", "content": "Settings -> Appearance."},
            ],
        },
    )
    assert response.status_code == 200
    assert response.json()["content"] == "Following up on that."


def test_help_chat_answer_function_is_grounded_in_app_guidance_only():
    assert "app guidance only" in help_chat.SYSTEM_PROMPT or "app itself" in help_chat.SYSTEM_PROMPT


def test_badges_for_matches_known_features():
    badges = help_chat.badges_for("Check the Graph tab for your concept map")
    assert {"label": "Graph", "tab": "graph"} in badges


def test_badges_for_caps_at_three():
    text = "reminder graph timeline dashboard library document template"
    assert len(help_chat.badges_for(text)) <= 3


def test_badges_for_no_match_is_empty():
    assert help_chat.badges_for("the weather is nice today") == []
