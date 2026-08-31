"""§25: decisions/action-items extraction for a meeting transcript.

Same shape as suggest-tags: a best-effort completion that never blocks the
caller. `client` runs with AI unavailable (proves the endpoint degrades
gracefully); `ai_client` runs with the fake Ollama for the happy path.
"""

from __future__ import annotations

from memorymap.ai import librarian


def test_summarize_with_working_model(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "**Decisions**\n- Ship Friday\n\n**Action items**\n- Brayden to write the changelog"
    response = ai_client.post("/voice/summarize", json={"text": "long transcript here"})
    assert response.status_code == 200
    body = response.json()
    assert "Ship Friday" in body["summary"]
    assert "changelog" in body["summary"]


def test_summarize_returns_empty_when_model_says_none(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "NONE"
    response = ai_client.post("/voice/summarize", json={"text": "just small talk"})
    assert response.status_code == 200
    assert response.json() == {"summary": ""}


def test_summarize_is_empty_without_ai_never_5xx(client):
    response = client.post("/voice/summarize", json={"text": "some transcript"})
    assert response.status_code == 200
    assert response.json() == {"summary": ""}


def test_summarize_rejects_empty_text_without_calling_the_model(client):
    response = client.post("/voice/summarize", json={"text": "   "})
    assert response.status_code == 200
    assert response.json() == {"summary": ""}


def test_summarize_meeting_function_strips_none(fake_ollama):
    from memorymap.core import deps

    fake_ollama.librarian_reply = "none"
    result = librarian.summarize_meeting(
        "small talk transcript", deps.get_model_manager(), fake_ollama
    )
    assert result == ""


def test_summarize_meeting_function_returns_the_reply(fake_ollama):
    from memorymap.core import deps

    fake_ollama.librarian_reply = "**Decisions**\n- Use SQLite"
    result = librarian.summarize_meeting(
        "let's use sqlite for this", deps.get_model_manager(), fake_ollama
    )
    assert result == "**Decisions**\n- Use SQLite"
