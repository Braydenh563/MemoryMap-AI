"""The harness reads what a small model meant (AGENT_SKILLS_REFORM, "Harness
robustness, 2026-10-04", INBOX 527).

Measured before (scratchpad/harness_argmeasure.py): 0 of 5 ordinary JSON
slips were read, each became `{}`; 11 of 31 tools with a required parameter
named the missing one; `get_note {"id": 1}` failed and `pin_note` read the
string "false" as true.
"""

from __future__ import annotations

import json

import pytest

from memorymap.ai import agent, tools
from memorymap.ai.provider import loads_lenient, normalise_tool_calls


@pytest.mark.parametrize(
    "text",
    [
        '{"content": "milk",}',
        "{'content': 'milk'}",
        '{"content": "milk"',
        '```json\n{"content": "milk"}\n```',
        '{"content": "milk"} and then some words',
    ],
)
def test_ordinary_json_slips_are_read(text):
    assert loads_lenient(text)["content"] == "milk"


def test_python_literals_and_a_cut_off_string_are_read():
    assert loads_lenient('{"pinned": True, "note_id": 3}') == {"pinned": True, "note_id": 3}
    assert loads_lenient('{"content": "buy mi') == {"content": "buy mi"}


def test_valid_json_is_never_reinterpreted():
    assert loads_lenient('{"a": "it\'s, }"}') == {"a": "it's, }"}


def test_an_unreadable_call_is_marked_not_emptied():
    [call] = normalise_tool_calls([{"function": {"name": "create_note", "arguments": "content: milk"}}])
    assert call["arguments"] == {}
    assert call["invalid_arguments"] == "content: milk"
    [ok] = normalise_tool_calls([{"function": {"name": "create_note", "arguments": '{"content": "x",}'}}])
    assert ok == {"name": "create_note", "arguments": {"content": "x"}}


def test_a_missing_argument_is_named_with_an_example():
    _args, problem = tools.check_arguments("get_note", {})
    assert "note_id (integer)" in problem
    assert '"note_id": 12' in problem


def test_spellings_are_folded_to_the_schema():
    args, problem = tools.check_arguments("get_note", {"id": "7"})
    assert problem is None and args == {"note_id": 7}
    args, problem = tools.check_arguments("get_note", {"noteId": 7})
    assert problem is None and args["note_id"] == 7
    args, problem = tools.check_arguments("create_note", {"content": "x", "tag": "urgent"})
    assert problem is None and args["tags"] == ["urgent"]


def test_values_are_read_as_their_schema_types():
    args, problem = tools.check_arguments("pin_note", {"note_id": "#3", "pinned": "false"})
    assert problem is None and args == {"note_id": 3, "pinned": False}
    args, problem = tools.check_arguments("tag_note", {"note_id": 1, "add": "a, b"})
    assert args["add"] == ["a", "b"]
    args, problem = tools.check_arguments("set_reminder", {"text": "x", "due_at": "2026-10-05T09:00", "priority": "HIGH"})
    assert problem is None and args["priority"] == "high"


def test_an_unreadable_value_is_named():
    _args, problem = tools.check_arguments("get_note", {"note_id": "the plumber one"})
    assert "wrong type" in problem and "note_id (integer)" in problem


def test_execute_tool_refuses_before_the_handler(session):
    result = tools.execute_tool(session, "get_note", {})
    assert "note_id (integer)" in result["error"]


class _Session:
    def rollback(self):
        return None

    def commit(self):
        return None


class _Fake:
    def __init__(self, rounds):
        self.rounds = list(rounds)
        self.sent: list[dict] = []

    def chat_tools_stream(self, model, messages, offered, mode=None):
        self.sent = list(messages)
        calls = self.rounds.pop(0) if self.rounds else []
        yield {"final": {"content": "" if calls else "done", "tool_calls": calls, "raw_tool_calls": []}}


class _Models:
    def chat_model(self):
        return "m"


def test_unreadable_json_comes_back_as_that_with_a_shape(monkeypatch, app_state):
    fake = _Fake([[{"name": "get_note", "arguments": {}, "invalid_arguments": "note_id=3"}], []])
    ran = []
    monkeypatch.setattr(agent.tools, "execute_tool", lambda *a, **k: ran.append(a) or {})
    events = list(agent.run_agent(_Session(), "q", [], _Models(), fake))
    assert not ran, "a call whose JSON did not read must not run with {}"
    payload = json.loads([m for m in fake.sent if m.get("role") == "tool"][-1]["content"])
    assert "not valid JSON" in payload["error"]
    assert '"note_id": 12' in payload["what_to_do"]
    assert any(e.get("type") == "tool" and e.get("ok") is False for e in events)


# --- running out of rounds ends in an answer ------------------------------------


class _Looping:
    """Calls a fresh search every round; with no tools offered, answers."""

    def __init__(self):
        self.offered: list[list] = []
        self.n = 0

    def chat_tools_stream(self, model, messages, offered, mode=None):
        self.offered.append(list(offered))
        if not offered:
            yield {"content_delta": "Your plumber note says the invoice is late."}
            yield {"final": {"content": "Your plumber note says the invoice is late.", "tool_calls": [], "streamed": True}}
            return
        self.n += 1
        call = {"name": "search_notes", "arguments": {"query": f"q{self.n}"}}
        yield {"final": {"content": "", "tool_calls": [call], "raw_tool_calls": []}}


def test_running_out_of_rounds_still_answers_from_what_was_found(monkeypatch, app_state):
    """Before: only "I stopped after N rounds". Now one more round with the
    tools withdrawn answers, and the stop and Continue still follow it."""
    fake = _Looping()
    monkeypatch.setattr(agent.tools, "execute_tool", lambda *a, **k: {"results": [], "label": "searched"})
    events = list(agent.run_agent(_Session(), "q", [], _Models(), fake, max_rounds=2, earned_rounds=0))
    answer = "".join(e.get("delta", "") for e in events if e.get("type") == "answer")
    assert answer.startswith("Your plumber note says the invoice is late.")
    assert "Continue" in answer
    assert fake.offered[-1] == [], "the wrap-up round offers no tools"
    assert [e["type"] for e in events].index("limit") < len(events) - 1


def test_a_skill_step_that_runs_out_gets_no_wrap_up(monkeypatch, app_state):
    fake = _Looping()
    monkeypatch.setattr(agent.tools, "execute_tool", lambda *a, **k: {"results": []})
    events = list(
        agent.run_agent(_Session(), "q", [], _Models(), fake, max_rounds=2, earned_rounds=0, exhausted_note="stalled")
    )
    assert all(offered for offered in fake.offered)
    assert [e.get("delta") for e in events if e.get("type") == "answer"] == ["stalled"]


# --- the agent's own provider path retries a transient 5xx --------------------


def test_the_tools_stream_retries_a_503_once(openai_client, capture_post):
    """llama-server answers 503 while it loads a model. `chat` and
    `chat_stream` retried once; the agent's own path ended the turn."""
    from fakes_http import FakeResponse, sse

    capture_post.queue.extend([
        FakeResponse(status=503, text="Loading model"),
        FakeResponse(lines=sse({"choices": [{"delta": {"content": "ok"}}]})),
    ])
    final = [p["final"] for p in openai_client.chat_tools_stream("m", [], []) if "final" in p][0]
    assert final["content"] == "ok"
    assert len(capture_post.sent) == 2
    assert "tools" not in capture_post.sent[0]["json"], "an empty tool list is not sent"


def test_a_second_5xx_is_still_an_error(openai_client, capture_post):
    from fakes_http import FakeResponse

    from memorymap.ai.provider import ProviderError

    capture_post.queue.extend([FakeResponse(status=500), FakeResponse(status=500)])
    with pytest.raises(ProviderError):
        list(openai_client.chat_tools_stream("m", [], []))


# --- a result too big for what is left is shortened, not dropped ---------------


def _page(n=20, chars=500):
    return {
        "results": [{"id": i, "content": f"note {i} " + "x" * chars} for i in range(n)],
        "label": "searched",
    }


def test_a_result_that_fits_is_untouched():
    result = {"count": 3}
    assert json.loads(agent._fit_result(result, "count_notes", 1000)) == {"count": 3}


def test_a_big_page_is_shortened_from_the_back_with_a_note():
    """Measured: a 20-note page of 500-character notes is 11,166 characters
    fenced; the turn had 3,000 left. Before: dropped whole, tools withdrawn."""
    full = json.dumps(agent.fence.fence_result(_page(), "search_notes"))
    payload = agent._fit_result(_page(), "search_notes", 3000)
    assert payload is not None and len(payload) <= 3000 < len(full)
    data = json.loads(payload)
    assert [row["id"] for row in data["results"]] == list(range(len(data["results"])))
    assert len(data["results"]) >= 3
    assert "Shortened to fit" in data["shortened"] and "left out" in data["shortened"]


def test_no_room_at_all_is_still_refused():
    assert agent._fit_result(_page(), "search_notes", 200) is None
