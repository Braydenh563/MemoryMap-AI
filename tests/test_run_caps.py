"""A run carries its budget: steps, tool calls, tokens and wall time against
the skill's declared caps (AGENT_SKILLS_REFORM Phase E, decision 3).

A fake transport drives the run (CLAUDE.md section 4): what is shown is that
the harness counts, caps and reports; not how a real model spends.
"""

from __future__ import annotations

import pytest

from memorymap.ai import budget, skills
from memorymap.core import deps
from tests._skill_run import run_for_test


def test_a_skill_may_declare_caps():
    raw = {"name": "t", "prompt": "p", "budget": {"tool_calls": 12, "steps": 4}}
    assert skills.normalise(raw)["budget"] == {"tool_calls": 12, "steps": 4}
    assert "budget" not in skills.normalise({"name": "t", "prompt": "p"})


@pytest.mark.parametrize(
    "caps, words",
    [
        ({"rounds": 3}, "can cap"),
        ({"tool_calls": 0}, "whole number"),
        ({"tool_calls": True}, "whole number"),
        ({"steps": 10_000}, "whole number"),
        ("lots", "set of caps"),
    ],
)
def test_a_bad_cap_is_refused_with_a_sentence(caps, words):
    with pytest.raises(skills.SkillError, match=words):
        skills.normalise({"name": "t", "prompt": "p", "budget": caps})


def test_declared_caps_only_tighten_the_settings(app_state):
    config = deps.get_config()
    config.set_preference("run_budget_seconds", 60)
    skill = {"steps": ["a", "b"], "budget": {"tokens": 4_000, "seconds": 600, "tool_calls": 9, "steps": 3}}
    spend = budget.for_skill(config, skill)
    assert spend.allowance() == 4_000, "the run's token cap, split per step and multiplied back"
    assert spend.seconds == 60, "a skill cannot raise the person's own time limit"
    assert (spend.tool_calls, spend.max_steps) == (9, 3)
    plain = budget.for_skill(config, {"steps": ["a", "b"]})
    assert plain.call_allowance() == 2 * budget.DEFAULT_CALLS_PER_STEP
    assert plain.max_steps == 0


def test_a_call_cap_and_a_step_cap_stop_with_a_reason():
    spend = budget.RunBudget(tokens=0, tool_calls=2)
    spend.count_call()
    spend.count_call()
    assert spend.exceeded() == "", "the cap's last call is allowed"
    spend.count_call()
    assert "cap of 2 tool calls" in spend.exceeded()
    steps = budget.RunBudget(tokens=0, max_steps=1)
    steps.count_step()
    assert steps.exceeded() == ""
    steps.count_step()
    assert "cap of 1 step attempts" in steps.exceeded()


def test_usage_reports_each_cap():
    spend = budget.RunBudget(tokens=100, steps=2, tool_calls=5)
    spend.count_call()
    spend.count_step()
    usage = spend.usage()
    assert (usage["tool_calls"], usage["steps"]) == (1, 1)
    assert usage["caps"] == {"steps": 0, "tool_calls": 5, "tokens": 200, "seconds": 0}


THREE_COUNTS = {
    "name": "Count thrice",
    "prompt": "Count my notes three times.",
    "steps": [
        {"text": f"Count my notes ({n}).", "expects": "tool_called", "tools": ["count_notes"]}
        for n in ("first", "second", "third")
    ],
    "tools": ["count_notes"],
}


def test_a_run_over_its_call_cap_stops_and_says_which(app_state, fake_ollama, fake_embeddings):
    deps.get_config().set_preference("skills", [THREE_COUNTS])
    fake_ollama.tool_script = [[{"name": "count_notes", "arguments": {}}], []] * 3
    run = run_for_test(fake_ollama, skill="count_thrice", budget={"tokens": 0, "tool_calls": 2})
    assert run.stopped_by == "budget"
    assert [s.state for s in run.steps][:2] == ["done", "done"]
    result = next(e for e in run.events if e.get("type") == "result")
    assert result["budget"]["tool_calls"] == 3, "one round over, then stopped"
    assert result["budget"]["caps"]["tool_calls"] == 2
    assert "tool calls" in run.verification.reason


def test_a_finished_run_reports_what_it_spent(app_state, fake_ollama, fake_embeddings):
    deps.get_config().set_preference("skills", [THREE_COUNTS])
    fake_ollama.tool_script = [[{"name": "count_notes", "arguments": {}}], []] * 3
    run = run_for_test(fake_ollama, skill="count_thrice", budget={"tokens": 0})
    assert run.stopped_by == ""
    result = next(e for e in run.events if e.get("type") == "result")
    assert result["budget"]["tool_calls"] == 3
    assert result["budget"]["steps"] == 3
