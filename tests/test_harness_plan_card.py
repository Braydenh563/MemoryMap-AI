"""H1: a plan card for every multi-step turn (AGENT_SKILLS_REFORM, "Harness
robustness", phase H1).

Before: the plan tracker drew only for `make_plan` and skills, and a small
model is never offered `make_plan`, so a three-round turn showed tool rows and
no plan. Now the harness draws the card itself, from its own ledger, when a
turn's second round starts: no model call, the same `plan`/`step` events a
skill run emits, so `chat-agent.js` reuses `startPlan`.
"""

from __future__ import annotations

from memorymap.ai import agent
from tests._app_js import app_js_text


class _Session:
    def rollback(self):
        return None

    def commit(self):
        return None


class _Models:
    def chat_model(self):
        return "m"


class _Scripted:
    """Each round returns the next list of calls; an empty list answers."""

    def __init__(self, rounds):
        self.rounds = list(rounds)

    def chat_tools_stream(self, model, messages, offered, mode=None):
        calls = self.rounds.pop(0) if self.rounds else []
        if not calls:
            yield {"content_delta": "Your plumber note says Tuesday."}
            yield {"final": {"content": "Your plumber note says Tuesday.", "tool_calls": [], "streamed": True}}
            return
        yield {"final": {"content": "", "tool_calls": calls, "raw_tool_calls": []}}


def _run(monkeypatch, rounds, **kwargs):
    labels = iter(f"ph:magnifying-glass Step {n}" for n in range(1, 20))
    monkeypatch.setattr(
        agent.tools, "execute_tool", lambda *a, **k: {"results": [], "label": next(labels)}
    )
    return list(agent.run_agent(_Session(), "When is the plumber coming?", [], _Models(), _Scripted(rounds), **kwargs))


def _card(events):
    """The rows a client ends with: the plan's own, then every step event."""
    [plan] = [e for e in events if e["type"] == "plan"]
    rows = list(plan["steps"])
    states = {int(i): s["state"] for i, s in plan.get("states", {}).items()}
    for event in events:
        if event["type"] != "step":
            continue
        if event["index"] >= len(rows):
            rows.append(event["text"])
        elif event.get("text"):
            rows[event["index"]] = event["text"]
        states[event["index"]] = event["state"]
    return plan, rows, [states.get(i) for i in range(len(rows))]


def _call(n):
    return [{"name": "search_notes", "arguments": {"query": f"q{n}"}}]


def test_a_three_round_turn_shows_three_ticked_rows(monkeypatch, app_state):
    events = _run(monkeypatch, [_call(1), _call(2), []])
    plan, rows, states = _card(events)
    assert plan["kind"] == "turn"
    assert plan["skill"] == "When is the plumber coming?"
    assert states == ["done", "done", "done"]
    assert rows[:2] == ["Step 1", "Step 2"], "the icon is not part of a row"
    assert rows[2] == agent.TURN_ROW_ANSWER


def test_the_card_is_drawn_when_the_second_round_starts(monkeypatch, app_state):
    events = _run(monkeypatch, [_call(1), []])
    kinds = [e["type"] for e in events]
    first_tool = kinds.index("tool")
    assert kinds.index("plan") > first_tool
    assert kinds.index("plan") < kinds.index("answer"), "drawn before the answer streams"
    running = [e for e in events if e["type"] == "step" and e["state"] == "running"]
    assert running and running[0]["text"] == agent.TURN_ROW_RUNNING


def test_a_one_round_answer_draws_no_card(monkeypatch, app_state):
    events = _run(monkeypatch, [[]])
    assert not [e for e in events if e["type"] in ("plan", "step")]


def test_a_skill_step_keeps_its_own_card(monkeypatch, app_state):
    events = _run(monkeypatch, [_call(1), _call(2), []], show_plan=False)
    assert not [e for e in events if e["type"] in ("plan", "step")]


def test_running_out_of_rounds_ends_the_card_on_the_wrap_up(monkeypatch, app_state):
    events = _run(monkeypatch, [_call(1), _call(2), _call(3)], max_rounds=2, earned_rounds=0)
    _plan, rows, states = _card(events)
    assert rows[-1] == agent.TURN_ROW_WRAP_UP
    assert "running" not in states


def test_every_step_event_names_its_kind(monkeypatch, app_state):
    """The client keeps a turn's rows out of the activity panel's run list,
    which already has the turn's tool rows."""
    events = _run(monkeypatch, [_call(1), _call(2), []])
    assert all(e.get("kind") == "turn" for e in events if e["type"] == "step")


def test_the_skill_runner_turns_the_card_off():
    from pathlib import Path

    source = Path(agent.__file__).with_name("skill_runner.py").read_text(encoding="utf-8")
    assert "show_plan=False" in source


def test_the_client_grows_a_turn_card_and_keeps_it_out_of_the_panel():
    js = app_js_text()
    assert 'entry.plan.kind === "turn"' in js, "markStep appends a row a turn card did not start with"
    assert 'event.kind === "turn"' in js, "onPlan/onStep leave a turn's rows out of the activity panel"
    assert '["plan", "skill", "turn"].includes(step.kind)' in js, (
        "a saved card is spread over `kind`, so reopening must read all three"
    )


def test_the_guide_says_so():
    from memorymap.ai import help_chat, help_topics_more

    text = " ".join(str(v) for v in vars(help_chat).values() if isinstance(v, (str, dict, list, tuple)))
    text += " ".join(str(v) for v in vars(help_topics_more).values() if isinstance(v, (str, dict, list, tuple)))
    assert "takes more than one step" in text
