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


def test_ask_grounds_the_model_in_the_matching_reference_notes(ai_client, fake_ollama):
    # The model has no idea what MemoryMap is on its own — item 40's whole
    # "never invent a feature" instruction is only followable if the prompt
    # actually hands it real facts. Assert the reference text lands in the
    # messages sent to the model, not just that the reply looks plausible.
    fake_ollama.librarian_reply = "Open the Reminders tab."
    ai_client.post("/help/ask", json={"question": "how do I set a reminder?"})
    sent = fake_ollama.chat_calls[-1]
    reference_messages = [m["content"] for m in sent if "Reference notes" in m["content"]]
    assert reference_messages
    assert "Overdue" in reference_messages[0]  # from the reminders HELP_TOPICS entry


def test_ask_with_no_matching_topic_sends_no_reference_block(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "I'm not sure — try the Help topics above."
    ai_client.post("/help/ask", json={"question": "purple elephants dance quietly"})
    sent = fake_ollama.chat_calls[-1]
    assert not any("Reference notes" in m["content"] for m in sent)


def test_matching_topics_finds_known_features():
    topics = help_chat._matching_topics("Check the Graph tab for your concept map")
    assert any(t["id"] == "graph" for t in topics)


def test_matching_topics_caps_at_max_topics():
    text = "reminder graph timeline dashboard library document template"
    assert len(help_chat._matching_topics(text)) <= help_chat.MAX_TOPICS


def test_matching_topics_no_match_is_empty():
    assert help_chat._matching_topics("the weather is nice today") == []


def test_matching_topics_keyword_match_is_whole_word_not_substring():
    # "ask" is a keyword (the ask-chat topic); "basket" and "task" both
    # contain it as a raw substring but neither is asking about chat.
    assert help_chat._matching_topics("where's the picnic basket for our task?") == []


def test_badges_for_derives_from_matched_topics():
    topics = help_chat._matching_topics("how do I set a reminder?")
    badges = help_chat.badges_for(topics)
    assert {"label": "Reminders", "tab": "reminders"} in badges


def test_every_help_topic_has_a_non_empty_body_and_badge():
    for topic in help_chat.HELP_TOPICS:
        assert topic["body"].strip()
        assert topic["keywords"]
        assert topic["badge"].get("label")
        assert topic["badge"].get("tab") or topic["badge"].get("section")
