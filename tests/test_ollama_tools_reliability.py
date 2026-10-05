"""A tool-capable Ollama model is not relabelled "can't call tools" by one
slip (INBOX 538: the owner's tool-capable model was answered with "can't call
tools", from the spec sheet's own "Can use tools: yes").

Fake transport: `requests.post` is replaced, so these pin the decisions, not
a real Ollama. Not verified against a real Ollama here (none in the sandbox).
"""

from __future__ import annotations

import json

import pytest

from memorymap.ai import ollama_client as oc
from memorymap.ai.provider import ToolsUnsupportedError, tools_unsupported_message

TOOLS = [{"type": "function", "function": {"name": "search_notes", "parameters": {"type": "object", "properties": {}}}}]
OK_BODY = {"message": {"role": "assistant", "content": "done", "tool_calls": []}, "done": True}


class _Resp:
    def __init__(self, status, body):
        self.status_code = status
        self._body = body
        self.text = body if isinstance(body, str) else json.dumps(body)
        self.ok = status < 400

    def json(self):
        return self._body

    def raise_for_status(self):
        if self.status_code >= 400:
            import requests

            raise requests.HTTPError(f"{self.status_code} Server Error", response=self)

    def iter_lines(self):
        yield self.text.encode()

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def _client(monkeypatch, responses):
    calls = []

    def post(url, json=None, **kwargs):  # noqa: A002
        calls.append(json)
        return responses.pop(0)

    monkeypatch.setattr(oc.requests, "post", post)
    client = oc.OllamaClient("http://ollama.test")
    monkeypatch.setattr(client, "runtime_options", lambda model, mode=None: {})
    monkeypatch.setattr(client, "request_extras", lambda mode, model: {})
    monkeypatch.setattr(client, "_stats_from", lambda data, model: {})
    return client, calls


def test_a_400_that_only_mentions_tools_is_not_a_missing_capability(monkeypatch):
    client, _ = _client(monkeypatch, [_Resp(400, {"error": "invalid tool_choice value"})])
    with pytest.raises(Exception) as caught:
        client.chat_tools("m", [{"role": "user", "content": "hi"}], TOOLS)
    assert not isinstance(caught.value, ToolsUnsupportedError)


def test_ollamas_own_words_are_a_missing_capability(monkeypatch):
    client, _ = _client(monkeypatch, [_Resp(400, {"error": "registry.ollama.ai/library/x does not support tools"})])
    with pytest.raises(ToolsUnsupportedError) as caught:
        client.chat_tools("m", [{"role": "user", "content": "hi"}], TOOLS)
    assert caught.value.declared is True


def test_an_unreadable_tool_call_is_asked_again_once(monkeypatch):
    client, calls = _client(
        monkeypatch,
        [_Resp(500, {"error": "error parsing tool call: raw='{\"name\": search'"}), _Resp(200, OK_BODY)],
    )
    reply = client.chat_tools("m", [{"role": "user", "content": "hi"}], TOOLS)
    assert reply["content"] == "done"
    assert len(calls) == 2


def test_the_stream_path_asks_again_too(monkeypatch):
    client, calls = _client(
        monkeypatch,
        [_Resp(500, {"error": "error parsing tool call"}), _Resp(200, OK_BODY)],
    )
    pieces = list(client.chat_tools_stream("m", [{"role": "user", "content": "hi"}], TOOLS))
    assert any("final" in p for p in pieces)
    assert len(calls) == 2


def test_an_error_line_mid_stream_is_said_not_swallowed(monkeypatch):
    client, _ = _client(monkeypatch, [_Resp(200, {"error": "error parsing tool call"})])
    with pytest.raises(oc.OllamaError) as caught:
        list(client.chat_tools_stream("m", [{"role": "user", "content": "hi"}], TOOLS))
    assert "parsing tool call" in str(caught.value)


def test_a_model_that_claims_tools_is_told_apart_in_the_words():
    declared = tools_unsupported_message("m", True)
    claimed = tools_unsupported_message("m", False)
    assert "can't call tools" in declared
    assert "says it can call tools" in claimed and "can't call tools" not in claimed
