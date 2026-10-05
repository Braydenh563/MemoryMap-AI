"""The model bench (WORLD_CLASS_PLAN 15, I8; 18, H3): which installed model is
best on *this* notebook, measured locally, with the failures shown.

Every model here is a fake: the property under test is the bench (the held-out
set, the scoring, the ranking, the stop and the budget), not any real model's
quality, which no CI run can know (CLAUDE.md section 4).
"""

from __future__ import annotations

import json
import re
import threading

import pytest

from memorymap.ai import bench
from memorymap.entry import manager

NOTES = [
    ("Cooking", "The sourdough starter needs feeding with rye flour every morning before the kettle boils."),
    ("Cooking", "Braised lentils taste better when the cumin seeds are toasted in mustard oil first."),
    ("Travel", "The Lisbon tram number twenty eight climbs through Alfama past the cathedral."),
    ("Travel", "Kyoto bamboo grove in Arashiyama is quiet before seven in the morning."),
    ("Work", "The quarterly roadmap review moved the database migration behind the billing rewrite."),
    ("Work", "Kubernetes autoscaling thresholds were lowered after the Tuesday latency incident."),
    ("Garden", "Tomato seedlings went leggy because the grow lamp hung too far above the trays."),
    ("Garden", "Lavender cuttings rooted in gritty compost within three weeks on the windowsill."),
]


def _seed(session) -> list[int]:
    ids = []
    for category, text in NOTES:
        entry = manager.create_entry(session, text, category_name=category)
        ids.append(entry.id)
    session.commit()
    return ids


class ScriptedModel:
    """A provider that files, cites and calls tools correctly, except where told."""

    def __init__(self, wrong_category_for: str = "", wrong_citation: bool = False, no_tools: bool = False):
        self.wrong_category_for = wrong_category_for
        self.wrong_citation = wrong_citation
        self.no_tools = no_tools
        self.calls = 0

    def is_running(self) -> bool:
        return True

    def chat(self, model: str, messages: list[dict], mode: str | None = None) -> dict:
        self.calls += 1
        user = messages[-1]["content"]
        if "Existing categories" in user:
            note = user.split("Note:", 1)[1]
            for category, text in NOTES:
                if text[:30] in note:
                    if self.wrong_category_for and self.wrong_category_for in text:
                        return {"content": json.dumps({"category": "Misc", "confidence": 50})}
                    return {"content": json.dumps({"category": category, "confidence": 90})}
            return {"content": '{"category": "Misc"}'}
        # An answer task: cite the note whose text holds both terms.
        terms = re.findall(r"“([^”]+)”", user)
        blocks = re.findall(r"\[(\d+)\] <<<data note>>>\n(.*?)\n<<<end data>>>", user, re.S)
        for number, text in blocks:
            if all(term.lower() in text.lower() for term in terms):
                if self.wrong_citation:
                    number = "9"
                return {"content": f"[{number}] {text}", "eval_count": 30}
        return {"content": "I could not find it."}

    def chat_tools(self, model: str, messages: list[dict], tools: list[dict], mode: str | None = None) -> dict:
        self.calls += 1
        if self.no_tools:
            return {"content": "I would search for it.", "tool_calls": []}
        term = re.findall(r"“([^”]+)”", messages[-1]["content"])[0]
        return {"content": "", "tool_calls": [{"name": "find_note", "arguments": {"query": term}}]}


class Models:
    """Routes a model name to its scripted fake."""

    def __init__(self, by_name: dict[str, ScriptedModel]):
        self.by_name = by_name

    def is_running(self) -> bool:
        return True

    def chat(self, model, messages, mode=None):  # noqa: ANN001
        return self.by_name[model].chat(model, messages, mode)

    def chat_tools(self, model, messages, tools, mode=None):  # noqa: ANN001
        return self.by_name[model].chat_tools(model, messages, tools, mode)


def test_the_held_out_set_comes_from_the_notebook_and_is_stable(session):
    ids = _seed(session)
    first = bench.build_set(session, size=6)
    second = bench.build_set(session, size=6)
    assert [item.entry_id for item in first] == [item.entry_id for item in second]
    assert {item.entry_id for item in first} <= set(ids)
    for item in first:
        # Two distinctive words from the note's own sentence: the question is
        # answerable from exactly that note, no model was needed to write it.
        assert len(item.terms) == 2
        assert all(term.lower() in item.sentence.lower() for term in item.terms)
        assert item.category in {c for c, _ in NOTES}


def test_two_models_that_differ_in_one_answer_rank_in_the_right_order(session):
    _seed(session)
    models = Models({"good": ScriptedModel(), "worse": ScriptedModel(wrong_category_for="Lisbon")})
    report = bench.run(session, models, ["worse", "good"], size=8)
    ranked = [row["model"] for row in report["models"]]
    assert ranked == ["good", "worse"]
    assert report["recommended"] == "good"
    good, worse = report["models"]
    assert good["filing"] == 1.0
    assert worse["filing"] == pytest.approx(7 / 8)


def test_the_report_names_the_failing_question(session):
    _seed(session)
    models = Models({"m": ScriptedModel(wrong_citation=True, no_tools=True)})
    report = bench.run(session, models, ["m"], size=4)
    row = report["models"][0]
    assert row["citation"] == 0.0
    assert row["tools"] == 0.0
    kinds = {failure["task"] for failure in row["failures"]}
    assert {"citation", "tools"} <= kinds
    citation = next(f for f in row["failures"] if f["task"] == "citation")
    # The failure says which note and what was asked, so a person can judge it.
    assert citation["entry_id"] in {item.entry_id for item in bench.build_set(session, size=4)}
    assert citation["question"]


def test_a_bench_can_be_stopped_and_respects_its_budget(session):
    _seed(session)
    stop = threading.Event()
    stop.set()
    models = Models({"a": ScriptedModel(), "b": ScriptedModel()})
    report = bench.run(session, models, ["a", "b"], size=8, stop=stop)
    assert report["stopped"] == "stopped"
    assert models.by_name["a"].calls == 0
    clock = iter([0.0] + [1000.0] * 1000)
    report = bench.run(session, models, ["a", "b"], size=8, budget_seconds=60, clock=lambda: next(clock))
    assert report["stopped"] == "budget"


def test_citation_scoring_is_shared_with_the_offline_harness():
    # The harness (tests/eval/scoring.py) imports this, so the two cannot drift.
    assert bench.citation_score({("note", 1), ("note", 2)}, {("note", 1)})[0] == 0.5
    assert bench.citation_score({("note", 1)}, {("note", 1), ("note", 3)}) == (1.0, "")


def test_the_routes_run_report_and_use_a_model(ai_client, fake_ollama, monkeypatch):
    fake_ollama.installed = [{"name": "good", "size": 1}, {"name": "worse", "size": 1}]
    for category, text in NOTES:
        ai_client.post("/entries", json={"content": text, "category": category})
    monkeypatch.setattr(bench, "MIN_NOTES", 1)
    started = ai_client.post("/models/bench", json={"models": ["good", "worse"], "size": 4, "wait": True})
    assert started.status_code == 200, started.text
    state = ai_client.get("/models/bench").json()
    assert state["running"] is False
    assert {row["model"] for row in state["report"]["models"]} == {"good", "worse"}
    used = ai_client.post("/models/chat-model", json={"name": "good"})
    assert used.status_code == 200
    from memorymap.core import deps

    assert deps.get_model_manager().chat_model() == "good"


def test_the_bench_says_why_when_the_notebook_is_too_small(ai_client):
    response = ai_client.post("/models/bench", json={"models": ["llama3.2:latest"], "size": 4})
    assert response.status_code == 409
    assert "notes" in response.json()["detail"]
