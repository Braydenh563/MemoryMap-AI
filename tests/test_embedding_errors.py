"""The Ollama embedding path should turn a chat-model failure into advice.

Picking a chat model as the "Ollama embedding model" is the most common way
to misconfigure the search engine. Ollama then answers /api/embed with 501
(older builds: 400 "does not support embeddings"). We assert the user gets an
actionable message naming a real embedding model, not a raw HTTP error.
"""

from __future__ import annotations

import pytest
import requests

from memorymap.ai import ollama_client
from memorymap.ai.ollama_client import OllamaClient, OllamaError


class _FakeResponse:
    """Minimal stand-in for a requests.Response."""

    def __init__(self, status_code: int, text: str = "") -> None:
        self.status_code = status_code
        self.text = text

    def raise_for_status(self) -> None:
        err = requests.HTTPError(f"{self.status_code} Server Error")
        err.response = self  # type: ignore[assignment]
        raise err

    def json(self) -> dict:
        return {"embeddings": [[0.0]]}


def _patch_post(monkeypatch, response: _FakeResponse) -> None:
    monkeypatch.setattr(ollama_client.requests, "post", lambda *a, **k: response)


@pytest.mark.parametrize("status", [501, 400])
def test_embed_with_chat_model_gives_actionable_error(monkeypatch, status):
    _patch_post(monkeypatch, _FakeResponse(status, "not implemented"))
    client = OllamaClient(base_url="http://localhost:11434")

    with pytest.raises(OllamaError) as excinfo:
        client.embed("some-chat-model", "hello")

    message = str(excinfo.value)
    assert "nomic-embed-text" in message
    assert "embedding model" in message


def test_embed_does_not_support_body_gives_actionable_error(monkeypatch):
    # Some Ollama versions return 200-ish shapes with an explanatory body.
    _patch_post(monkeypatch, _FakeResponse(500, "model does not support embeddings"))
    client = OllamaClient(base_url="http://localhost:11434")

    with pytest.raises(OllamaError) as excinfo:
        client.embed("some-chat-model", "hello")

    assert "nomic-embed-text" in str(excinfo.value)


def test_embed_other_http_error_stays_generic(monkeypatch):
    _patch_post(monkeypatch, _FakeResponse(503, "upstream boom"))
    client = OllamaClient(base_url="http://localhost:11434")

    with pytest.raises(OllamaError) as excinfo:
        client.embed("nomic-embed-text", "hello")

    message = str(excinfo.value)
    assert "failed" in message
    assert "nomic-embed-text" in message  # names the model that failed
