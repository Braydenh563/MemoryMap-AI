"""Vision-capable models in chat (ROADMAP.md's largest open item).

An attached image reaches the model as `images` on the last user message —
see `routes_chat._resolve_chat_images` for how a `/media/upload` id becomes
a data URI, and `ollama_client`/`openai_client`'s own `_to_*_messages` for
how each dialect adapts that shape. These tests exercise the plumbing
end-to-end through the real routes, with `FakeOllama` standing in for the
model (this sandbox has no reachable Ollama — see CLAUDE.md's own standing
caveat) and confirm the one behaviour bug an image attachment could
silently trigger: a vision-only question retrieving zero notes must not be
mistaken for "nothing to answer with".
"""

from __future__ import annotations

from memorymap.api import routes_files


def _upload_image(ai_client, monkeypatch) -> int:
    # OCR runs in a background thread on any real image upload; harmless in
    # production but noisy and irrelevant here (test_media_api.py uses the
    # same monkeypatch for the same reason).
    monkeypatch.setattr(routes_files.ocr, "extract_in_background", lambda *a: None)
    response = ai_client.post(
        "/media/upload", files={"file": ("photo.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_an_attached_image_reaches_the_model_as_a_data_uri(ai_client, fake_ollama, monkeypatch):
    media_id = _upload_image(ai_client, monkeypatch)
    response = ai_client.post(
        "/chat", json={"question": "what is in this photo?", "image_media_ids": [media_id]}
    )
    assert response.status_code == 200
    sent = fake_ollama.chat_calls[-1][-1]
    assert sent["images"] and sent["images"][0].startswith("data:image/png;base64,")


def test_a_vision_only_question_is_not_treated_as_no_matching_notes(
    ai_client, fake_ollama, monkeypatch
):
    """Retrieval never sees the image, so an empty search result must not
    stand in for "there's nothing to look at" — the exact bug the guard in
    `librarian.answer` (and `routes_chat.chat_stream`'s `plain_events`)
    exists to prevent."""
    media_id = _upload_image(ai_client, monkeypatch)
    body = ai_client.post(
        "/chat",
        json={
            "question": "describe this completely unrelated to my notebook photo",
            "image_media_ids": [media_id],
        },
    ).json()
    assert body["ai_response"] != "I couldn't find any notes about that."
    assert body["ai_response"] == fake_ollama.librarian_reply


def test_streaming_chat_without_tools_also_carries_the_image(ai_client, fake_ollama, monkeypatch):
    """`use_tools: false` forces the plain (non-agent) streaming path —
    `librarian.build_messages`, tracked via `chat_calls`."""
    media_id = _upload_image(ai_client, monkeypatch)
    with ai_client.stream(
        "POST",
        "/chat/stream",
        json={"question": "what's this?", "image_media_ids": [media_id], "use_tools": False},
    ) as response:
        list(response.iter_lines())  # drain — the assertion is on what was sent
    sent = fake_ollama.chat_calls[-1][-1]
    assert sent.get("images")


def test_streaming_chat_in_agent_mode_also_carries_the_image(ai_client, fake_ollama, monkeypatch):
    """Agent/tools mode is the default — `agent.run_agent`, tracked via
    `tool_rounds` rather than `chat_calls` (`FakeOllama.chat_tools`)."""
    media_id = _upload_image(ai_client, monkeypatch)
    with ai_client.stream(
        "POST",
        "/chat/stream",
        json={"question": "what's this?", "image_media_ids": [media_id]},
    ) as response:
        list(response.iter_lines())
    sent = fake_ollama.tool_rounds[-1][-1]
    assert sent.get("images")


def test_a_missing_media_id_is_dropped_rather_than_erroring(ai_client, fake_ollama):
    """The UI already confirmed the upload before sending its id — a miss
    means the file moved or was deleted after that, not a bad request."""
    response = ai_client.post(
        "/chat", json={"question": "hello", "image_media_ids": [999999]}
    )
    assert response.status_code == 200


def test_no_image_means_no_images_key_at_all(ai_client, fake_ollama):
    """The overwhelming majority of turns carry no attachment — this proves
    the new plumbing is a no-op for them, not just "doesn't crash". A note
    is attached so the turn actually reaches the model rather than short-
    circuiting on "no notes, no images, nothing to say" (the case the
    previous test already covers)."""
    note_id = ai_client.post("/entries", json={"content": "leftover pasta in the fridge"}).json()["id"]
    ai_client.post(
        "/chat", json={"question": "what should I have for lunch", "note_ids": [note_id]}
    )
    sent = fake_ollama.chat_calls[-1][-1]
    assert "images" not in sent
