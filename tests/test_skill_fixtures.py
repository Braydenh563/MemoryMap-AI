"""The skill fixtures, checked without a model (AGENT_SKILLS_REFORM Phase E).

Every shipped skill has three cases (a notebook, its inputs, the expected
writes) in `tests/fixtures/skills/`; `tests/test_skills_evals.py` runs them
against a real model and reports pass, partial and fail per skill. What can
be known without one is checked here: the set is complete, each case is well
formed, no case is already met before the run (a fixture that passes on an
untouched notebook measures nothing), and the scorer and the run path work
end to end on a fake transport (CLAUDE.md section 4: that proves the
plumbing, not how any real model scores).
"""

from __future__ import annotations

import pytest

from tessellate.ai import skills, tools
from tessellate.core import deps
from tests import _skill_fixtures as fx

FIXTURES = fx.load_all()
SHIPPED = {skill["name"]: skill for skill in skills.builtins(set(tools.TOOLS))}
CASES = [(name, case) for name, data in sorted(FIXTURES.items()) for case in data["cases"]]


def test_every_shipped_skill_has_a_fixture_file_and_no_other_does():
    assert set(FIXTURES) == set(SHIPPED), {
        "missing": sorted(set(SHIPPED) - set(FIXTURES)),
        "unknown": sorted(set(FIXTURES) - set(SHIPPED)),
    }
    for name, data in FIXTURES.items():
        assert data["_path"] == f"{fx.slug(name)}.json"
        assert isinstance(data["small_class"], bool), name


@pytest.mark.parametrize("name", sorted(SHIPPED))
def test_three_cases_each_with_distinct_ids(name):
    cases = FIXTURES[name]["cases"]
    assert len(cases) == 3, f"{name} has {len(cases)} cases; decision 1 says three"
    assert len({case["id"] for case in cases}) == 3


@pytest.mark.parametrize("name, case", CASES, ids=[f"{n}:{c['id']}" for n, c in CASES])
def test_a_case_is_well_formed(name, case):
    notebook = case["notebook"]
    assert notebook and all(str(note.get("content") or "").strip() for note in notebook)
    for note in notebook:
        assert all(0 <= other < len(notebook) for other in note.get("links") or [])
    assert skills.missing_inputs(SHIPPED[name], case.get("inputs") or {}) == []
    expect = case["expect"]
    assert expect and set(expect) <= set(fx.EXPECT_KEYS), sorted(set(expect) - set(fx.EXPECT_KEYS))
    for key in ("linked_pairs", "unlinked_pairs"):
        for a, b in expect.get(key, []):
            assert a != b and max(a, b) < len(notebook)


@pytest.mark.parametrize("name, case", CASES, ids=[f"{n}:{c['id']}" for n, c in CASES])
def test_no_case_is_met_before_the_run(app_state, fake_embeddings, name, case):
    """Seeded and scored with nothing done: never a pass, and every write the
    case expects is still missing (`unchanged` and `notes_kept` hold by
    definition before a run, so they are the two exceptions)."""
    with deps.get_db().session() as session:
        ids = fx.seed(session, case["notebook"])
        before = fx.snapshot(session)
    done = {i: {"state": "done"} for i in range(len(SHIPPED[name]["steps"]))}
    report = fx.score(case["expect"], before, before, "", done, ids)
    assert report["outcome"] != "pass"
    already = [k for k, held in report["checks"].items() if held and k not in ("unchanged", "notes_kept")]
    assert already == [], f"{name}:{case['id']} expects writes the seed already has: {already}"


def test_the_scorer_grades_pass_partial_and_fail():
    before = {"notes": {1: ("a", 1, [])}, "untagged": 1, "tags": set(), "links": set(),
              "reminders": 0, "documents": 0, "categories": set()}
    tagged = {**before, "untagged": 0}
    expect = {"untagged_max": 0, "answer_mentions": ["tagged"]}
    done = {0: {"state": "done"}, 1: {"state": "done"}}
    stalled = {0: {"state": "done"}, 1: {"state": "stalled", "reason": "no tag_note call"}}
    assert fx.score(expect, before, tagged, "I tagged it", done, [1])["outcome"] == "pass"
    partial = fx.score(expect, before, tagged, "", stalled, [1])
    assert (partial["outcome"], partial["failed_step"], partial["reason"]) == ("partial", 1, "no tag_note call")
    assert fx.score(expect, before, before, "", stalled, [1])["outcome"] == "fail"


def test_rates_fold_reports_into_a_table_row():
    reports = [{"outcome": "pass"}, {"outcome": "pass"},
               {"outcome": "partial", "failed_step": 3, "reason": "stalled"}]
    row = fx.rates(reports)
    assert (row["pass"], row["partial"], row["fail"], row["rate"]) == (2, 1, 0, 0.67)
    assert (row["failed_step"], row["reason"]) == (3, "stalled")


def test_a_scripted_run_of_a_fixture_is_scored_end_to_end(ai_client, fake_ollama):
    """The eval's own path, `run_case`, on a fake that does the job: the
    Auto-tag case passes. A fake doing it proves the plumbing only."""
    case = FIXTURES["Auto-tag my notes"]["cases"][1]  # two untagged notes
    fake_ollama.tool_script = [
        [{"name": "list_tags", "arguments": {}}], [],
        [{"name": "list_notes", "arguments": {"untagged": True}}], [],
        [{"name": "get_note", "arguments": {"note_id": 1}}], [],
        [{"name": "tag_note", "arguments": {"note_ids": [1, 2], "add": ["cooking", "recipe"]}}], [],
        [],
    ]
    report = fx.run_case(ai_client, "Auto-tag my notes", case)
    assert report["checks"] == {"untagged_max": True}
    assert report["outcome"] == "pass", report
    assert report["steps"] == 5 and report["first_step_seconds"] is not None


# --- the measured table (decision 2) -----------------------------------------


def test_the_shipped_table_parses_and_names_only_shipped_skills():
    rates = skills.measured_rates()
    assert rates["threshold"] == fx.SMALL_CLASS_BAR
    for table in rates["classes"].values():
        assert set(table["skills"]) <= set(SHIPPED)


RATES = {"threshold": 0.8, "classes": {"small": {"skills": {
    "Fix my links": {"rate": 0.33, "failed_step": 1, "reason": "related_notes was never called"},
    "Find loose ends": {"rate": 0.8},
}}}}


def test_only_a_measured_rate_below_the_bar_holds_a_skill_back():
    reason = skills.larger_model_reason("Fix my links", RATES)
    assert reason.startswith("Finished 33% of test runs on a small model")
    assert "step 2" in reason and "related_notes" in reason
    assert skills.larger_model_reason("Find loose ends", RATES) == "", "at the bar is not below it"
    assert skills.larger_model_reason("Daily review", RATES) == "", "unmeasured is not failing"
    assert skills.larger_model_reason("Fix my links", RATES, "large") == ""


def test_the_skill_list_labels_it_only_in_small_model_mode(client, tmp_path, monkeypatch):
    import json

    table = tmp_path / "rates.json"
    table.write_text(json.dumps(RATES), encoding="utf-8")
    monkeypatch.setattr(skills, "RATES_FILE", table)
    config = deps.get_config()
    config.set_preference("small_model_mode", "on")
    listed = {s["name"]: s for s in client.get("/skills").json()["skills"]}
    assert "33%" in listed["Fix my links"]["needs_larger_model"]
    assert listed["Daily review"]["needs_larger_model"] == ""
    config.set_preference("small_model_mode", "off")
    listed = {s["name"]: s for s in client.get("/skills").json()["skills"]}
    assert listed["Fix my links"]["needs_larger_model"] == ""


def test_the_agent_cannot_run_a_skill_held_back_from_the_small_class(app_state, tmp_path, monkeypatch):
    """OPEN row 557: the label was only in the picker; run_skill ran it anyway."""
    import json

    from tessellate.ai import tools

    table = tmp_path / "rates.json"
    table.write_text(json.dumps(RATES), encoding="utf-8")
    monkeypatch.setattr(skills, "RATES_FILE", table)
    config = deps.get_config()
    config.set_preference("small_model_mode", "on")
    with pytest.raises(tools.ToolError, match="needs a larger model"):
        tools.validate_run_skill({"name": "Fix my links"})
    assert tools.validate_run_skill({"name": "Daily review"})["skill"] == "Daily review"
    config.set_preference("small_model_mode", "off")
    assert tools.validate_run_skill({"name": "Fix my links"})["skill"] == "Fix my links"
