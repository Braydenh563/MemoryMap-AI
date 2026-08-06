"""A failed tool call has to tell the model what to do next.

The failure used to reach the model as a bare {"error": "..."}. Small models
do one of two things with that: apologise and give up, or call the identical
thing again until MAX_ROUNDS runs out and the user is told "I stopped after
using several tools in a row" having learned nothing. Neither is a reasonable
response to a mistyped note id.
"""

from __future__ import annotations

import json

from memorymap.ai import agent


def test_a_missing_id_says_to_search_rather_than_guess():
    hint = agent._recovery_hint("get_note", "Note 999 not found")
    assert "search_notes" in hint
    assert "Do not guess" in hint


def test_a_disabled_tool_says_to_stop_calling_it():
    hint = agent._recovery_hint(
        "web_search", "The 'web_search' tool is turned off in Settings → Tools"
    )
    assert "Do not call it again" in hint


def test_an_unknown_tool_says_to_stop_calling_it():
    hint = agent._recovery_hint("nope", "Unknown tool 'nope'")
    assert "does not exist" in hint


def test_bad_arguments_say_to_reread_the_schema():
    # execute_tool prefixes handler errors with the tool's own name.
    hint = agent._recovery_hint("create_note", "create_note: 'content' is required")
    assert "schema" in hint


def test_web_off_says_not_to_retry():
    hint = agent._recovery_hint("read_url", "Web search is disabled in Settings")
    assert "Do not retry" in hint


def test_anything_else_still_gets_advice():
    hint = agent._recovery_hint("summarize_notes", "the model is unreachable")
    assert "Do not repeat it unchanged" in hint


class _Session:
    def rollback(self):
        return None

    def commit(self):
        return None


class _FakeOllama:
    """A scripted model: each round returns the next batch of tool calls."""

    def __init__(self, rounds):
        self.rounds = list(rounds)
        self.sent: list[dict] = []

    def chat_tools_stream(self, model, messages, offered, mode=None):
        self.sent = list(messages)
        calls = self.rounds.pop(0) if self.rounds else []
        yield {"final": {"content": "", "tool_calls": calls, "raw_tool_calls": calls}}


class _FakeModels:
    def chat_model(self):
        return "m"


def _drive(monkeypatch, rounds, results):
    """Run one agent turn and hand back the messages the model last saw."""
    fake = _FakeOllama(rounds)
    monkeypatch.setattr(agent.tools, "ollama_tools", lambda allowed=None: [])
    monkeypatch.setattr(agent.tools, "execute_tool", lambda s, n, a, **kwargs: results.pop(0))
    list(agent.run_agent(_Session(), "q", [], _FakeModels(), fake))
    return [m for m in fake.sent if m.get("role") == "tool"]


def test_the_error_reaches_the_model_with_its_advice(monkeypatch, app_state):
    """The whole point: advice travels with the error, in the tool message."""
    tool_messages = _drive(
        monkeypatch,
        [[{"name": "get_note", "arguments": {"note_id": 999}}], []],
        [{"error": "Note 999 not found"}],
    )
    assert tool_messages, "the tool result must be handed back to the model"
    payload = json.loads(tool_messages[-1]["content"])
    assert payload["error"] == "Note 999 not found"
    assert "search_notes" in payload["what_to_do"]


def test_repeating_a_failed_call_is_called_out(monkeypatch, app_state):
    """Second identical failure gets a stronger message than the first."""
    same = {"name": "get_note", "arguments": {"note_id": 999}}
    tool_messages = _drive(
        monkeypatch,
        [[same], [same], []],
        [{"error": "Note 999 not found"}, {"error": "Note 999 not found"}],
    )
    payloads = [json.loads(m["content"]) for m in tool_messages]
    assert len(payloads) == 2
    assert "search_notes" in payloads[0]["what_to_do"]
    assert payloads[1]["what_to_do"] == agent.REPEATED_CALL_NOTE


def test_a_successful_call_carries_no_advice(monkeypatch, app_state):
    tool_messages = _drive(
        monkeypatch,
        [[{"name": "count_notes", "arguments": {}}], []],
        [{"count": 3, "label": "Counted notes"}],
    )
    payload = json.loads(tool_messages[-1]["content"])
    assert "what_to_do" not in payload


def test_the_prompt_tells_the_model_multiple_rounds_are_expected():
    """Asked for directly: 'I need agents to use tools more and better'."""
    guide = agent.TOOLS_GUIDE
    assert "several turns is normal and expected" in guide.lower()
    # A snippet is not a page — read_url before relying on a result.
    assert "read_url" in guide
    # It should stop narrating a timeline the user is already watching.
    assert "already see which tools you ran" in guide
    assert "what_to_do" in guide
