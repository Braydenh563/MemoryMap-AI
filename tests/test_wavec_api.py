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


def test_embedding_failure_is_recorded_not_swallowed(app_state, monkeypatch):
    # Force the model load to fail deterministically. An offline machine
    # fails because the model isn't cached, but a networked CI runner would
    # download the real model and succeed — which isn't what this test is
    # about. We're checking that a genuine failure is RECORDED (last_error)
    # and not swallowed into a forever "warming up…" state (user-reported bug).
    service = EmbeddingService(deps.get_model_manager(), FakeOllama(running=False))

    def boom():
        raise RuntimeError("no embedding model available (forced for test)")

    monkeypatch.setattr(service, "_load_st_model", boom)
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


def test_retitle_uses_ai(ai_client, fake_ollama):
    created = ai_client.post(
        "/conversations", json={"question": "what jokes have I saved?", "answer": "A few."}
    ).json()
    fake_ollama.librarian_reply = "Saved jokes"
    named = ai_client.post(f"/conversations/{created['id']}/retitle").json()
    assert named["title"] == "Saved jokes"
    assert named["ai_named"] is True


def test_retitle_is_sentence_cased(ai_client, fake_ollama):
    created = ai_client.post(
        "/conversations", json={"question": "any jokes?", "answer": "One."}
    ).json()
    fake_ollama.librarian_reply = "saved jokes"
    named = ai_client.post(f"/conversations/{created['id']}/retitle").json()
    assert named["title"] == "Saved jokes"


def test_retitle_uses_the_active_persona(ai_client, fake_ollama):
    ai_client.put(
        "/preferences",
        json={
            "personas": [{"name": "Pirate", "prompt": "You are a pirate captain."}],
            "active_persona": "Pirate",
        },
    )
    created = ai_client.post(
        "/conversations", json={"question": "where is the treasure?", "answer": "Here."}
    ).json()
    fake_ollama.librarian_reply = "Treasure hunt"
    ai_client.post(f"/conversations/{created['id']}/retitle")
    system = fake_ollama.chat_calls[-1][0]["content"]
    assert "pirate captain" in system.lower()


def test_retitle_falls_back_without_ai(ai_client, fake_ollama):
    created = ai_client.post(
        "/conversations", json={"question": "how do I bake bread?", "answer": "Slowly."}
    ).json()
    fake_ollama.running = False
    named = ai_client.post(f"/conversations/{created['id']}/retitle").json()
    assert named["ai_named"] is False
    assert named["title"].startswith("how do I bake bread")


def test_retitle_rejects_a_rambling_title(ai_client, fake_ollama):
    created = ai_client.post(
        "/conversations", json={"question": "tell me about pasta", "answer": "Sure."}
    ).json()
    fake_ollama.librarian_reply = (
        "Of course! Here is a great title for this particular conversation about food."
    )
    named = ai_client.post(f"/conversations/{created['id']}/retitle").json()
    assert named["ai_named"] is False
    assert named["title"].startswith("tell me about pasta")


def test_delete_conversation_turn(client):
    created = client.post(
        "/conversations",
        json={"question": "first?", "answer": "one"},
    ).json()
    client.post(
        f"/conversations/{created['id']}/turns",
        json={"question": "second?", "answer": "two"},
    )
    client.post(
        f"/conversations/{created['id']}/turns",
        json={"question": "third?", "answer": "three"},
    )

    # Drop the middle exchange (turn index 1).
    summary = client.delete(f"/conversations/{created['id']}/turns/1").json()
    assert summary["turns"] == 2

    full = client.get(f"/conversations/{created['id']}").json()
    contents = [m["content"] for m in full["messages"]]
    assert contents == ["first?", "one", "third?", "three"]

    # Out-of-range index is a clean 404, not a crash. The request is made
    # outside the assert so it still runs under `python -O`.
    missing = client.delete(f"/conversations/{created['id']}/turns/9")
    assert missing.status_code == 404


def test_conversation_persists_tool_chips(client):
    """Tool-activity chips are saved on the turn so they survive a reload."""
    created = client.post(
        "/conversations",
        json={
            "question": "tidy my tags",
            "answer": "Done.",
            "tools": [{"label": "Merged 2 tags", "ok": True}],
        },
    ).json()
    full = client.get(f"/conversations/{created['id']}").json()
    assert full["messages"][1]["tools"][0]["label"] == "Merged 2 tags"
    assert full["messages"][1]["tools"][0]["ok"] is True


def test_replace_last_turn_swaps_answer_in_place(client):
    """Regenerate replaces the last answer instead of appending a new one."""
    created = client.post(
        "/conversations",
        json={"question": "sum up my week", "answer": "first take"},
    ).json()
    cid = created["id"]
    client.post(f"/conversations/{cid}/turns", json={"question": "again", "answer": "v1"})

    resp = client.put(
        f"/conversations/{cid}/turns/last",
        json={"question": "again", "answer": "v2 (better)"},
    )
    assert resp.status_code == 200
    full = client.get(f"/conversations/{cid}").json()
    assert full["turns"] == 2  # not 3 — the last pair was replaced, not added
    assert full["messages"][-1]["content"] == "v2 (better)"


def test_delete_turn_removes_one_exchange(client):
    created = client.post(
        "/conversations",
        json={"question": "q1", "answer": "a1"},
    ).json()
    cid = created["id"]
    client.post(f"/conversations/{cid}/turns", json={"question": "q2", "answer": "a2"})

    # Delete the first exchange (index 0) — the second should remain and shift up.
    resp = client.delete(f"/conversations/{cid}/turns/0")
    assert resp.status_code == 200
    full = client.get(f"/conversations/{cid}").json()
    assert full["turns"] == 1
    assert full["messages"][0]["content"] == "q2"

    # Deleting the last remaining exchange removes the whole conversation.
    resp = client.delete(f"/conversations/{cid}/turns/0")
    assert resp.json().get("conversation_deleted") is True
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


def test_truncate_drops_a_turn_and_everything_after_it(client):
    """Editing a question must clear the replies to the old wording."""
    created = client.post(
        "/conversations", json={"question": "q1", "answer": "a1"}
    ).json()
    cid = created["id"]
    client.post(f"/conversations/{cid}/turns", json={"question": "q2", "answer": "a2"})
    client.post(f"/conversations/{cid}/turns", json={"question": "q3", "answer": "a3"})

    result = client.post(f"/conversations/{cid}/truncate", json={"from_turn": 1}).json()
    assert result["removed"] == 2
    assert result["conversation_deleted"] is False

    full = client.get(f"/conversations/{cid}").json()
    assert [m["content"] for m in full["messages"]] == ["q1", "a1"]


def test_truncating_from_the_first_turn_removes_the_conversation(client):
    created = client.post(
        "/conversations", json={"question": "only", "answer": "one"}
    ).json()
    result = client.post(
        f"/conversations/{created['id']}/truncate", json={"from_turn": 0}
    ).json()
    assert result["conversation_deleted"] is True
    assert client.get("/conversations").json() == []


def test_truncating_past_the_end_changes_nothing(client):
    created = client.post("/conversations", json={"question": "q", "answer": "a"}).json()
    result = client.post(
        f"/conversations/{created['id']}/truncate", json={"from_turn": 9}
    ).json()
    assert result["removed"] == 0
    full = client.get(f"/conversations/{created['id']}").json()
    assert len(full["messages"]) == 2


def test_a_turn_can_record_the_agent_run_step_by_step(client):
    """The chat shows the agent's work as an ordered timeline, so reopening a
    conversation has to reproduce that order rather than a flattened summary.

    Steps live alongside the existing answer/thinking/tools fields rather than
    replacing them, so a chat saved before steps existed still renders.
    """
    steps = [
        {"kind": "thinking", "text": "I should look this up."},
        {"kind": "tool", "label": "ph:magnifying-glass Searched notes", "ok": True},
        {"kind": "answer", "text": "You have three notes about it."},
    ]
    created = client.post(
        "/conversations",
        json={
            "question": "what do I know?",
            "answer": "You have three notes about it.",
            "thinking": "I should look this up.",
            "tools": [{"label": "ph:magnifying-glass Searched notes", "ok": True}],
            "steps": steps,
        },
    ).json()

    messages = client.get(f"/conversations/{created['id']}").json()["messages"]
    assistant = messages[1]
    assert assistant["steps"] == steps
    # The flattened fields stay, so nothing that reads them breaks.
    assert assistant["content"] == "You have three notes about it."
    assert assistant["tools"] == [{"label": "ph:magnifying-glass Searched notes", "ok": True}]


def test_a_turn_without_steps_still_saves(client):
    """Older clients (and the plain non-agent path) send no steps at all."""
    created = client.post(
        "/conversations", json={"question": "hi", "answer": "hello"}
    ).json()
    assistant = client.get(f"/conversations/{created['id']}").json()["messages"][1]
    assert "steps" not in assistant
