"""H2: verify against sources before answering (AGENT_SKILLS_REFORM,
"Harness robustness", phase H2).

Done when the twenty-answer fixture scores at least 18 right with no false
flag on the twelve true ones, and no second model round is spent on it.
"""

from __future__ import annotations

import json
from pathlib import Path

from memorymap.ai import agent
from memorymap.ai.source_check import Sources, heads_up, sources_from_messages, unbacked_claims

CASES = json.loads(
    (Path(__file__).parent / "fixtures" / "chat" / "source_check_cases.json").read_text(encoding="utf-8")
)["cases"]


def _flags(case):
    return unbacked_claims(case["answer"], Sources(case["sources"]))


def test_the_fixture_scores_eighteen_of_twenty_with_no_false_flag():
    right = 0
    false_flags = []
    for case in CASES:
        flagged = bool(_flags(case))
        if flagged == (not case["backed"]):
            right += 1
        elif case["backed"]:
            false_flags.append((case["id"], _flags(case)))
    assert len(CASES) == 20 and sum(c["backed"] for c in CASES) == 12
    assert not false_flags, false_flags
    assert right >= 18, right


def test_the_flag_names_what_was_invented():
    by_id = {c["id"]: c for c in CASES}
    assert _flags(by_id["invented-person"]) == ["Robert Hughes"]
    assert _flags(by_id["invented-count"]) == ["41"]
    assert "Grand Kensington Hotel" in _flags(by_id["invented-place"])


def test_the_system_prompt_and_the_model_s_own_words_back_nothing():
    messages = [
        {"role": "system", "content": "You have 4 rounds."},
        {"role": "user", "content": "How many?"},
        {"role": "assistant", "content": "You have 4 notes."},
        {"role": "tool", "content": json.dumps({"count": 2})},
    ]
    assert unbacked_claims("You have 4 notes.", sources_from_messages(messages)) == ["4"]


def test_the_heads_up_reads_like_the_act_one():
    line = heads_up(["41"])
    assert line.startswith("\n\nHeads up: ") and "41" in line and chr(0x2014) not in line


class _Session:
    def rollback(self):
        return None

    def commit(self):
        return None


class _Models:
    def chat_model(self):
        return "m"


class _OneSearch:
    def __init__(self, answer):
        self.answer = answer
        self.rounds = 0

    def chat_tools_stream(self, model, messages, offered, mode=None):
        self.rounds += 1
        if self.rounds == 1:
            call = {"name": "search_notes", "arguments": {"query": "plumber"}}
            yield {"final": {"content": "", "tool_calls": [call], "raw_tool_calls": []}}
            return
        yield {"final": {"content": self.answer, "tool_calls": []}}


def _turn(monkeypatch, answer, **kwargs):
    monkeypatch.setattr(
        agent.tools,
        "execute_tool",
        lambda *a, **k: {"results": [{"title": "Plumber", "snippet": "comes Tuesday morning"}], "label": "searched"},
    )
    fake = _OneSearch(answer)
    events = list(agent.run_agent(_Session(), "When is the plumber coming?", [], _Models(), fake, **kwargs))
    return fake, "".join(e.get("delta", "") for e in events if e.get("type") == "answer")


def test_an_invented_time_is_flagged_without_another_round(monkeypatch, app_state):
    fake, text = _turn(monkeypatch, "Your note says Tuesday at 10:15.")
    assert "Heads up: I could not find 10:15 in your notes" in text
    assert fake.rounds == 2, "no second model round for the check"


def test_a_backed_answer_gets_no_flag(monkeypatch, app_state):
    _fake, text = _turn(monkeypatch, "Your plumber note says he comes Tuesday morning.")
    assert "Heads up" not in text


def test_a_skill_step_is_not_checked(monkeypatch, app_state):
    _fake, text = _turn(monkeypatch, "Your note says Tuesday at 10:15.", show_plan=False)
    assert "Heads up" not in text
