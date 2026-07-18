"""Thinking-model support + the streaming chat endpoint."""

from __future__ import annotations

import json

from memorymap.ai.ollama_client import _ThinkTagSplitter, split_thinking


def _save(client, content):
    response = client.post("/entries", json={"content": content})
    assert response.status_code == 201
    return response.json()


# --- think-tag handling --------------------------------------------------------


def test_split_thinking_extracts_block():
    clean, thinking = split_thinking("<think>hmm, jokes…</think>Here you go!")
    assert clean == "Here you go!"
    assert thinking == "hmm, jokes…"


def test_split_thinking_plain_text_untouched():
    assert split_thinking("just an answer") == ("just an answer", None)


def test_splitter_handles_tags_broken_across_chunks():
    splitter = _ThinkTagSplitter()
    pieces = []
    for chunk in ["<thi", "nk>ab", "c</thi", "nk>hel", "lo"]:
        pieces += splitter.feed(chunk)
    pieces += splitter.flush()

    thinking = "".join(p["thinking_delta"] for p in pieces if "thinking_delta" in p)
    answer = "".join(p["content_delta"] for p in pieces if "content_delta" in p)
    assert thinking == "abc"
    assert answer == "hello"


def test_splitter_plain_stream_passes_through():
    splitter = _ThinkTagSplitter()
    pieces = splitter.feed("no tags here") + splitter.flush()
    assert pieces == [{"content_delta": "no tags here"}]


# --- API surfaces ----------------------------------------------------------------


def test_chat_returns_thinking_when_model_thinks(ai_client, fake_ollama):
    fake_ollama.librarian_thinking = "The user wants jokes; note 1 is a joke."
    _save(ai_client, "a funny scarecrow joke")

    body = ai_client.post("/chat", json={"question": "any funny jokes?"}).json()
    assert body["ai_thinking"] == "The user wants jokes; note 1 is a joke."
    assert body["ai_response"] == fake_ollama.librarian_reply


def test_chat_stream_order_and_content(ai_client, fake_ollama):
    fake_ollama.librarian_thinking = "reasoning…"
    _save(ai_client, "a funny scarecrow joke")

    with ai_client.stream(
        "POST", "/chat/stream", json={"question": "any funny jokes?"}
    ) as response:
        assert response.status_code == 200
        events = [json.loads(line) for line in response.iter_lines() if line]

    assert events[0]["type"] == "meta"
    assert events[0]["search_mode"] == "semantic"
    assert events[0]["answered_by"] == "llama3.2"
    assert [r["content"] for r in events[0]["raw_results"]] == ["a funny scarecrow joke"]

    thinking = "".join(e["delta"] for e in events if e["type"] == "thinking")
    answer = "".join(e["delta"] for e in events if e["type"] == "answer")
    assert thinking == "reasoning…"
    assert answer == fake_ollama.librarian_reply
    assert events[-1]["type"] == "done"


def test_chat_stream_offline_still_sends_results(client):
    _save(client, "note about cheese")
    with client.stream("POST", "/chat/stream", json={"question": "cheese"}) as response:
        events = [json.loads(line) for line in response.iter_lines() if line]

    assert events[0]["type"] == "meta"
    assert events[0]["answered_by"] is None
    assert len(events[0]["raw_results"]) == 1
    answer = "".join(e["delta"] for e in events if e["type"] == "answer")
    assert "Ollama" in answer  # the friendly offline message
