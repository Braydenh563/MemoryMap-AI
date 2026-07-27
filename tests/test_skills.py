"""Skills as jobs rather than saved sentences (roadmap §21).

Reported: "the way skills are used currently … are closer to just presaved
mini prompts. I keep on trying to get the AI to make me some skills in the
chat but it doesn't recognise that it needs to use tools." A skill was
`{name, prompt}`, so `save_skill` had nowhere to put steps and no way to say
which tools a job needs. These tests pin the new shape, and the two things it
buys: a small model that is *told* which tools to use, and a run that carries
four tool schemas instead of twenty-six (§11a).
"""

from __future__ import annotations

import json

import pytest

from memorymap.ai import agent, skills, tools


def _known() -> set[str]:
    return set(tools.TOOLS)


def _stream_events(client, question, **body):
    with client.stream(
        "POST", "/chat/stream", json={"question": question, **body}
    ) as response:
        assert response.status_code == 200
        return [json.loads(line) for line in response.iter_lines() if line]


# --- what a skill is now -----------------------------------------------------


def test_a_prompt_only_skill_still_works():
    """Nothing is lost: the old shape is a one-step skill."""
    skill = skills.normalise({"name": "Weekly", "prompt": "Summarise my week."})
    assert skill["steps"] == [] and skill["tools"] == [] and skill["inputs"] == []
    assert skills.is_action(skill) is False
    assert "Summarise my week." in skills.run_instruction(skill)


def test_a_skill_carries_steps_tools_and_inputs():
    skill = skills.normalise(
        {
            "name": "File my inbox",
            "prompt": "File everything tagged {{tag}}.",
            "steps": ["Find every note tagged {{tag}}", "Give each one a category"],
            "tools": ["search_notes", "edit_note"],
            "inputs": [{"name": "tag", "label": "Which tag?"}],
        },
        _known(),
    )
    assert skill["steps"][0] == "Find every note tagged {{tag}}"
    assert skill["tools"] == ["search_notes", "edit_note"]
    assert skills.is_action(skill) is True

    instruction = skills.run_instruction(skill, {"tag": "inbox"})
    assert "{{tag}}" not in instruction
    assert "Find every note tagged inbox" in instruction
    assert "1." in instruction and "2." in instruction
    # Named in the text as well as narrowed on the wire: a small model that is
    # told "use edit_note" reaches for it, which is the reported failure.
    assert "search_notes, edit_note" in instruction


def test_a_placeholder_with_no_input_behind_it_is_refused():
    """Otherwise the model is handed a literal {{tag}} and invents a value."""
    with pytest.raises(skills.SkillError, match="doesn't declare"):
        skills.normalise({"name": "Broken", "prompt": "File everything in {{tag}}"})


def test_a_tool_that_does_not_exist_is_refused_by_name():
    with pytest.raises(skills.SkillError, match="tag_everything"):
        skills.normalise(
            {"name": "Nope", "prompt": "Do a thing", "tools": ["tag_everything"]},
            _known(),
        )


def test_a_required_input_with_nothing_behind_it_is_reported():
    skill = skills.normalise(
        {
            "name": "Catch up",
            "prompt": "Everything about {{topic}}",
            "inputs": [{"name": "topic", "required": True}],
        }
    )
    assert skills.missing_inputs(skill, {}) == ["topic"]
    assert skills.missing_inputs(skill, {"topic": "sailing"}) == []
    # A default counts as an answer.
    with_default = skills.normalise(
        {
            "name": "Catch up",
            "prompt": "Everything about {{topic}}",
            "inputs": [{"name": "topic", "default": "work"}],
        }
    )
    assert skills.missing_inputs(with_default, {}) == []
    assert "work" in skills.run_instruction(with_default, {})


def test_the_built_in_skills_are_valid_and_name_real_tools():
    """They moved out of app.js, where nothing could check them."""
    for skill in skills.builtins(_known()):
        assert skill["builtin"] is True
        for name in skill["tools"]:
            assert name in tools.TOOLS


def test_a_stored_skill_that_no_longer_validates_is_kept_as_a_prompt(app_state):
    """Losing someone's skill because a field went stale is worse than running
    it with fewer powers than it asked for."""
    app_state.set_preference(
        "skills", [{"name": "Old", "prompt": "Do the thing", "tools": ["gone_tool"]}]
    )
    catalog = skills.catalog(app_state, _known())
    mine = [s for s in catalog if not s["builtin"]]
    assert [s["name"] for s in mine] == ["Old"]
    assert mine[0]["tools"] == []


# --- the model writing one ---------------------------------------------------


def test_the_model_can_save_a_skill_with_steps_and_tools(client, session, app_state):
    """The reported failure, from the other end: there was nowhere to put the
    steps, so "make me a skill that files my inbox" saved another sentence."""
    result = tools.execute_tool(
        session,
        "save_skill",
        {
            "name": "File my inbox",
            "prompt": "File the notes I tagged inbox.",
            "steps": ["Find notes tagged inbox", "Give each one a category"],
            "tools": ["search_notes", "edit_note"],
        },
    )
    assert result["steps"] == 2
    assert result["tools"] == ["search_notes", "edit_note"]

    saved = app_state.get_preference("skills")[0]
    assert saved["steps"] == ["Find notes tagged inbox", "Give each one a category"]
    assert saved["useTools"] is True


def test_the_model_is_told_when_it_names_a_tool_that_is_not_there(session, app_state):
    result = tools.execute_tool(
        session,
        "save_skill",
        {"name": "Nope", "prompt": "Do a thing", "tools": ["make_coffee"]},
    )
    assert "make_coffee" in result["error"]


def test_the_model_cannot_shadow_a_built_in_skill(session, app_state):
    name = skills.BUILTIN_SKILLS[0]["name"]
    result = tools.execute_tool(
        session, "save_skill", {"name": name, "prompt": "Something else"}
    )
    assert "built-in" in result["error"]


# --- the settings path uses the same rules -----------------------------------


def test_the_skills_endpoint_serves_built_ins_and_your_own(client, app_state):
    client.put(
        "/preferences",
        json={"skills": [{"name": "Mine", "prompt": "Do my thing"}]},
    )
    body = client.get("/skills").json()
    names = [skill["name"] for skill in body["skills"]]
    assert "Mine" in names
    assert len(names) == len(skills.BUILTIN_SKILLS) + 1
    assert body["limits"]["steps"] == skills.MAX_STEPS


def test_only_the_skills_that_write_are_marked_as_changing_your_notes(client, app_state):
    """A marker on all ten says nothing. Nearly every skill uses tools; the
    question the user is asking is which ones act."""
    listed = {skill["name"]: skill for skill in client.get("/skills").json()["skills"]}
    assert listed["🏷 Auto-tag my notes"]["changes"] is True  # tag_note
    assert listed["🧹 Find loose ends"]["changes"] is False  # reads only
    assert listed["🗂 Tidy suggestions"]["changes"] is False  # proposes, never applies


def test_saving_a_skill_naming_an_unknown_tool_is_refused(client, app_state):
    response = client.put(
        "/preferences",
        json={"skills": [{"name": "Bad", "prompt": "x", "tools": ["nope_tool"]}]},
    )
    assert response.status_code == 422
    assert "nope_tool" in response.json()["detail"]


def test_steps_and_inputs_round_trip_through_preferences(client, app_state):
    body = {
        "skills": [
            {
                "name": "Catch up",
                "prompt": "Everything about {{topic}}",
                "steps": ["Search for {{topic}}", "Summarise what you find"],
                "tools": ["search_notes"],
                "inputs": [{"name": "topic", "label": "Which topic?"}],
            }
        ]
    }
    saved = client.put("/preferences", json=body).json()["skills"][0]
    assert saved["steps"] == body["skills"][0]["steps"]
    assert saved["inputs"][0]["label"] == "Which topic?"
    assert saved["useTools"] is True


# --- running one -------------------------------------------------------------


def test_a_skill_run_offers_only_the_tools_it_declared(app_state):
    """Roadmap §11a, measured: 28 schemas go up on every round of every turn
    whether the question needs them or not."""
    everything = tools.ollama_tools()
    narrowed = tools.ollama_tools(["search_notes", "tag_note"])
    assert {t["function"]["name"] for t in narrowed} == {"search_notes", "tag_note"}
    assert len(json.dumps(narrowed)) < len(json.dumps(everything)) / 3


def test_a_disabled_tool_stays_disabled_inside_a_skill(app_state):
    """A skill declaring a tool must not re-enable one the user turned off."""
    app_state.set_preference("disabled_tools", ["tag_note"])
    offered = tools.ollama_tools(["search_notes", "tag_note"])
    assert {t["function"]["name"] for t in offered} == {"search_notes"}


def test_the_agent_refuses_a_tool_the_skill_did_not_declare(
    ai_client, session, fake_ollama, app_state
):
    """The allowlist is a safety property, not only a prompt — a model that
    calls something it was never offered doesn't get to run it."""
    from memorymap.core import deps

    fake_ollama.tool_script = [
        [{"name": "create_note", "arguments": {"content": "sneaky"}}]
    ]
    events = list(
        agent.run_agent(
            session,
            "run the skill",
            [],
            deps.get_model_manager(),
            fake_ollama,
            allowed_tools=["search_notes"],
        )
    )
    refused = [e for e in events if e["type"] == "tool"]
    assert refused and refused[0]["ok"] is False
    assert "isn't part of this skill" in refused[0]["label"]
    assert ai_client.get("/entries").json() == []


def test_running_a_skill_sends_its_instruction_not_its_name(ai_client, fake_ollama):
    events = _stream_events(ai_client, "🏷 Auto-tag my notes", skill="🏷 Auto-tag my notes")
    assert [e for e in events if e["type"] == "plan"][0]["steps"]

    sent = fake_ollama.tool_rounds[-1][-1]["content"]
    assert "Follow these steps in order" in sent
    assert "tag_note" in sent


def test_running_a_skill_narrows_the_tools_on_the_wire(ai_client, fake_ollama, session):
    """The point of the allowlist, end to end."""
    captured = {}
    original = fake_ollama.chat_tools

    def spy(model, messages, offered):
        captured["names"] = {t["function"]["name"] for t in offered}
        return original(model, messages, offered)

    fake_ollama.chat_tools = spy
    _stream_events(ai_client, "🏷 Auto-tag my notes", skill="🏷 Auto-tag my notes")
    assert captured["names"] == {"list_notes", "get_note", "list_tags", "tag_note"}


def test_a_skill_with_a_missing_input_is_refused_rather_than_run_blank(ai_client):
    response = ai_client.post(
        "/chat/stream", json={"question": "x", "skill": "🔎 Catch up on a topic"}
    )
    assert response.status_code == 422
    assert "topic" in response.json()["detail"]


def test_a_skill_input_reaches_the_model(ai_client, fake_ollama):
    _stream_events(
        ai_client,
        "🔎 Catch up on a topic",
        skill="🔎 Catch up on a topic",
        skill_inputs={"topic": "sailing"},
    )
    sent = fake_ollama.tool_rounds[-1][-1]["content"]
    assert "sailing" in sent


def test_running_a_skill_that_does_not_exist_says_so(ai_client):
    response = ai_client.post(
        "/chat/stream", json={"question": "x", "skill": "Not a skill"}
    )
    assert response.status_code == 404


def test_an_action_skill_acts_even_with_agent_mode_off(ai_client, fake_ollama):
    """The frontend used to tick the agent-mode box on the user's behalf and
    leave it ticked. A skill that acts brings its own permission."""
    events = _stream_events(
        ai_client,
        "🏷 Auto-tag my notes",
        skill="🏷 Auto-tag my notes",
        use_tools=False,
    )
    assert any(e["type"] == "plan" for e in events)
    assert fake_ollama.tool_rounds, "the agent never ran"
