"""Wave C: pill status fields, conversations, personas."""

from __future__ import annotations

from memorymap.ai import librarian
from memorymap.ai.embeddings import EmbeddingService
from memorymap.core import deps
from tests.fakes import FakeOllama


def _save(client, content, **extra):
    response = client.post("/entries", json={"content": content, **extra})
    assert response.status_code == 201
    return response.json()


# --- pill fix: warming vs failed --------------------------------------------------


def test_status_reports_embedding_error(client):
    body = client.get("/models/status").json()
    assert "embedding_warming" in body
    assert "embedding_error" in body


def test_embedding_failure_is_recorded_not_swallowed(app_state):
    # The real service in this sandbox has no sentence-transformers →
    # embed fails; before the fix it failed silently ("warming up…" forever).
    service = EmbeddingService(deps.get_model_manager(), FakeOllama(running=False))
    assert service.embed_text("hello") is None
    assert service.last_error is not None
    assert service.is_ready() is False


# --- conversations ----------------------------------------------------------------


def test_conversation_lifecycle(client):
    created = client.post(
        "/conversations",
        json={"question": "what jokes have I saved?", "answer": "A scarecrow one."},
    ).json()
    assert created["title"].startswith("what jokes")
    assert created["turns"] == 1

    client.post(
        f"/conversations/{created['id']}/turns",
        json={"question": "any more?", "answer": "No.", "thinking": "hmm"},
    )
    full = client.get(f"/conversations/{created['id']}").json()
    assert full["turns"] == 2
    assert full["messages"][2]["content"] == "any more?"
    assert full["messages"][3]["thinking"] == "hmm"

    client.put(f"/conversations/{created['id']}", json={"title": "Joke hunt"})
    assert client.get("/conversations").json()[0]["title"] == "Joke hunt"

    client.delete(f"/conversations/{created['id']}")
    assert client.get("/conversations").json() == []


# --- personas ---------------------------------------------------------------------


def test_build_messages_keeps_grounding_with_persona():
    messages = librarian.build_messages(
        "q?", [{"content": "n", "category": "c"}], persona_prompt="You are a pirate."
    )
    system = messages[0]["content"]
    assert system.startswith("You are a pirate.")
    assert "ONLY the notes provided" in system  # grounding survives any persona


def test_chat_uses_selected_persona(ai_client, fake_ollama):
    _save(ai_client, "a funny scarecrow joke")
    ai_client.put(
        "/preferences",
        json={"personas": [{"name": "Pirate", "prompt": "You are a pirate captain."}]},
    )

    ai_client.post("/chat", json={"question": "any jokes?", "persona": "Pirate"})
    assert "pirate captain" in fake_ollama.chat_calls[-1][0]["content"].lower()

    # Built-ins work too, and unknown names fall back to the default.
    ai_client.post("/chat", json={"question": "any jokes?", "persona": "Coach"})
    assert "coach" in fake_ollama.chat_calls[-1][0]["content"].lower()
    ai_client.post("/chat", json={"question": "any jokes?", "persona": "Ghost"})
    assert "librarian" in fake_ollama.chat_calls[-1][0]["content"].lower()


def test_edited_builtin_persona_overrides_and_resets(ai_client, fake_ollama):
    _save(ai_client, "a funny scarecrow joke")
    # Editing a built-in stores an override under the same name…
    ai_client.put(
        "/preferences",
        json={"personas": [{"name": "Librarian", "prompt": "You are a grumpy archivist."}]},
    )
    ai_client.post("/chat", json={"question": "any jokes?", "persona": "Librarian"})
    assert "grumpy archivist" in fake_ollama.chat_calls[-1][0]["content"].lower()

    # …and removing the override resets to the default prompt.
    ai_client.put("/preferences", json={"personas": []})
    ai_client.post("/chat", json={"question": "any jokes?", "persona": "Librarian"})
    assert "librarian of the user's personal notebook" in fake_ollama.chat_calls[-1][0][
        "content"
    ].lower()


def test_active_persona_preference_is_default(ai_client, fake_ollama):
    _save(ai_client, "a funny scarecrow joke")
    ai_client.put(
        "/preferences",
        json={
            "personas": [{"name": "Robot", "prompt": "You are a terse robot."}],
            "active_persona": "Robot",
        },
    )
    ai_client.post("/chat", json={"question": "any jokes?"})  # no persona sent
    assert "terse robot" in fake_ollama.chat_calls[-1][0]["content"].lower()
