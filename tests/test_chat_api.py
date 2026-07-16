"""Phase 2 'Done when': the dad-joke test, end-to-end over HTTP
(with the AI faked so it runs offline — the real-model run happens
manually with Ollama installed)."""

from __future__ import annotations

from memorymap.ai import librarian


def _save(client, content, tags=None):
    response = client.post("/entries", json={"content": content, "tags": tags or []})
    assert response.status_code == 201
    return response.json()


def test_dad_joke_loop(ai_client):
    joke = _save(ai_client, "Why did the scarecrow win an award? Outstanding in his field!")
    shopping = _save(ai_client, "buy milk, eggs and bread")
    race = _save(ai_client, "Came 2nd in the 100m sprint at the athletics carnival")

    # The janitor filed the three notes into three different categories.
    assert joke["category"] == "Dad Jokes"
    assert shopping["category"] == "Shopping"
    assert race["category"] == "Sport Results"
    assert joke["ai_confidence"] > 0

    response = ai_client.post("/chat", json={"question": "What jokes have I saved?"})
    assert response.status_code == 200
    body = response.json()

    # Both halves of the answer: conversational + raw rows.
    assert body["ai_response"] == "Here's what I found in your notebook!"
    assert body["search_mode"] == "semantic"
    contents = [row["content"] for row in body["raw_results"]]
    assert joke["content"] in contents
    assert shopping["content"] not in contents  # only joke-topic rows come back


def test_second_joke_skips_llm(ai_client, fake_ollama):
    _save(ai_client, "Why did the scarecrow win an award? Outstanding in his field!")
    calls_before = len(fake_ollama.chat_calls)

    second = _save(ai_client, "another funny pun about cheese")

    # Same topic → centroid match decided it; the LLM was not consulted.
    assert second["category"] == "Dad Jokes"
    assert len(fake_ollama.chat_calls) == calls_before


def test_chat_with_ollama_down_still_returns_raw_results(ai_client, fake_ollama):
    _save(ai_client, "Why did the scarecrow win an award? Outstanding in his field!")

    fake_ollama.running = False  # kill the chat model, keep embeddings
    response = ai_client.post("/chat", json={"question": "any jokes?"})
    body = response.json()

    assert body["ai_response"] == librarian.OFFLINE_MESSAGE
    assert len(body["raw_results"]) == 1  # raw results survive an AI outage


def test_capture_works_with_zero_ai(client):
    saved = _save(client, "note taken while everything AI is off")
    assert saved["category"] == "Uncategorised"
    assert saved["ai_confidence"] == 0

    response = client.post("/chat", json={"question": "everything AI"})
    body = response.json()
    assert body["search_mode"] == "keyword"  # no embeddings → keyword fallback
    assert len(body["raw_results"]) == 1
    assert body["ai_response"] == librarian.OFFLINE_MESSAGE
