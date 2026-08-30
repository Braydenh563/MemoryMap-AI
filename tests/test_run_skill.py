"""The agent can start a saved skill (roadmap §33, "worth building" item 1).

Before this, the model could *see* a job it was perfectly capable of doing and
had no way to begin it: `list_skills` said what existed, `when_to_use` said
which one fitted, and starting one was a click only the user could make. The
model's best available move was to describe the skill and hope.

`run_skill` closes that, and it deliberately reuses the two mechanisms that
were already there rather than inventing a third:

- **`ends_turn`**, built for `ask_user`. The agent's turn stops and the skill
  runner takes over — which is honest, because a run is not a tool result the
  model should carry on reasoning about. It is the rest of the work.
- **the allowlist**, built for the chip UI. A run started by the model offers
  exactly the tools the skill declared, enforced at execution, the same as one
  started by hand.

The property most of these tests are really about: **starting a skill this way
is indistinguishable from the user starting it.** Same resolution, same plan,
same ticked steps, same Undo on every change — because it is the same code
path, reached by the client sending the skill's name back down `/chat/stream`.
That is why there is no server-side parked state here, exactly as there is
none for `ask_user`.
"""

from __future__ import annotations

import json

import pytest

from memorymap.ai import skills, tools
from memorymap.core import deps


def _events(client, question, **body):
    with client.stream("POST", "/chat/stream", json={"question": question, **body}) as r:
        return [json.loads(line) for line in r.iter_lines() if line.strip()]


def _save(skill: dict) -> None:
    """Put one skill in the user's own list, the way the settings route does."""
    config = deps.get_config()
    config.set_preference("skills", [*skills.stored(config), skill])


# --- resolving what the model asked for -------------------------------------


def test_a_built_in_skill_resolves_by_name(app_state):
    catalog = skills.catalog(deps.get_config(), set(tools.TOOLS))
    wanted = catalog[0]["name"]
    event = tools.validate_run_skill({"name": wanted})
    assert event["type"] == "run_skill"
    assert event["skill"] == wanted


def test_decoration_in_a_skill_name_may_be_dropped(app_state):
    """A model asked to pass a skill's name back drops the punctuation in it,
    changes the case, or both — the single most likely mistake, and free to
    recover from.

    This used to reach into the catalogue for a built-in whose name began with
    an emoji, because every audit skill was named "🏷 Auto-tag my notes". The
    emoji are gone app-wide (a skill name lands in an `<option>`, which cannot
    hold an icon element), so there is no such built-in left and the lookup
    raised StopIteration. The behaviour under test never depended on emoji
    specifically — it is about forgiving decoration of any kind — so the test
    now makes its own decorated skill instead of borrowing one.
    """
    _save({"name": "★ Weekly tidy-up!", "prompt": "Tidy the notebook."})
    stripped = "Weekly tidy up"
    assert tools.validate_run_skill({"name": stripped.lower()})["skill"] == "★ Weekly tidy-up!"


def test_an_exact_name_wins_over_the_forgiving_match(app_state):
    """Two skills differing only in punctuation must both stay reachable."""
    _save({"name": "Weekly review", "prompt": "Summarise the week."})
    _save({"name": "Weekly-review", "prompt": "Something else entirely."})
    assert tools.validate_run_skill({"name": "Weekly-review"})["skill"] == "Weekly-review"
    assert tools.validate_run_skill({"name": "Weekly review"})["skill"] == "Weekly review"


def test_an_unknown_skill_names_the_ones_that_exist(app_state):
    """A dead end is a wasted round. The error carries the names, so the
    model's next move is a working call rather than another guess."""
    with pytest.raises(tools.ToolError) as exc:
        tools.validate_run_skill({"name": "Do my taxes"})
    message = str(exc.value)
    assert "Do my taxes" in message
    assert "list_skills" in message
    first = skills.catalog(deps.get_config(), set(tools.TOOLS))[0]["name"]
    assert first in message


def test_a_missing_name_is_refused(app_state):
    with pytest.raises(tools.ToolError, match="name of a skill"):
        tools.validate_run_skill({"name": "  "})


# --- the inputs a run needs -------------------------------------------------


def test_a_required_input_left_blank_is_named_not_guessed(app_state):
    """The same rule `_resolve_skill` enforces with a 422: a run with a blank
    {{topic}} searches the whole notebook for nothing and reads to the user as
    having been ignored."""
    _save(
        {
            "name": "Topic digest",
            "prompt": "Summarise everything about {{topic}}.",
            "inputs": [{"name": "topic", "label": "Which topic?", "required": True}],
        }
    )
    with pytest.raises(tools.ToolError) as exc:
        tools.validate_run_skill({"name": "Topic digest"})
    assert "topic" in str(exc.value)
    assert "Which topic?" in str(exc.value)  # the label, so the model can ask it


def test_a_supplied_input_is_carried_through(app_state):
    _save(
        {
            "name": "Topic digest",
            "prompt": "Summarise everything about {{topic}}.",
            "inputs": [{"name": "topic", "required": True}],
        }
    )
    event = tools.validate_run_skill({"name": "Topic digest", "inputs": {"topic": "beans"}})
    assert event["inputs"] == {"topic": "beans"}
    assert "beans" in event["label"]


def test_an_input_the_skill_never_declared_is_dropped(app_state):
    """An invented key is noise, not a mistake worth spending a round on —
    and `fill` leaves undeclared placeholders alone anyway."""
    _save({"name": "Tidy up", "prompt": "Tidy the notebook."})
    event = tools.validate_run_skill({"name": "Tidy up", "inputs": {"nonsense": "x"}})
    assert event["inputs"] == {}


def test_inputs_sent_as_a_json_string_are_recovered(app_state):
    """A quoting mistake should not cost a run. Same recovery as `validate_ask`
    makes for options sent as "yes, no"."""
    _save(
        {
            "name": "Topic digest",
            "prompt": "About {{topic}}.",
            "inputs": [{"name": "topic", "required": True}],
        }
    )
    event = tools.validate_run_skill(
        {"name": "Topic digest", "inputs": json.dumps({"topic": "beans"})}
    )
    assert event["inputs"] == {"topic": "beans"}


def test_a_default_satisfies_a_required_input(app_state):
    _save(
        {
            "name": "Recent digest",
            "prompt": "Summarise the last {{days}} days.",
            "inputs": [{"name": "days", "required": True, "default": "7"}],
        }
    )
    assert tools.validate_run_skill({"name": "Recent digest"})["skill"] == "Recent digest"


# --- what the event tells the UI --------------------------------------------


def test_the_event_says_whether_the_run_will_change_notes(app_state):
    """`changes_notes` was built for `list_skills` so the model could choose on
    something better than a name. The handover carries it too, so the UI can
    say what is about to happen rather than only that something is."""
    _save(
        {
            "name": "Read only",
            "prompt": "Summarise my notes.",
            "tools": ["search_notes", "get_note"],
        }
    )
    _save({"name": "Writes", "prompt": "Tag my notes.", "tools": ["tag_note"]})
    assert tools.validate_run_skill({"name": "Read only"})["changes_notes"] is False
    assert tools.validate_run_skill({"name": "Writes"})["changes_notes"] is True


def test_the_label_names_the_skill(app_state):
    _save({"name": "Tidy up", "prompt": "Tidy the notebook."})
    assert "Tidy up" in tools.validate_run_skill({"name": "Tidy up"})["label"]


# --- it cannot be run like an ordinary tool ---------------------------------


def test_the_tool_is_marked_as_ending_the_turn():
    assert tools.TOOLS["run_skill"].ends_turn is True


def test_running_it_directly_fails_loudly(session, app_state):
    """The handler exists because every ToolSpec has one, and it raises for the
    same reason `_ask_user` does: a path that bypasses the agent loop must not
    be able to "start" a run with no plan drawn and no steps ticked off."""
    with pytest.raises(tools.ToolError, match="cannot"):
        tools.TOOLS["run_skill"].handler(session, {"name": "Tidy up"})


def test_the_confirm_endpoint_will_not_run_it(ai_client):
    """`POST /chat/tools/execute` is the other way into a tool, and it must not
    be a back door into starting a run the user never saw begin."""
    response = ai_client.post(
        "/chat/tools/execute",
        json={"name": "run_skill", "arguments": {"name": "Tidy up"}},
    )
    assert response.status_code >= 400


# --- no skill may start a skill ---------------------------------------------


def test_a_skill_cannot_declare_run_skill(app_state):
    """A skill holding `run_skill` could start itself: each run brings its own
    fresh rounds, so the per-turn budget that bounds an ordinary loop would
    never bind. Refused at save, not at execution — the allowlist would only
    catch it once the run was already going."""
    with pytest.raises(skills.SkillError, match="never have to stop"):
        skills.normalise(
            {"name": "Loop", "prompt": "Run yourself.", "tools": ["run_skill"]},
            set(tools.TOOLS),
        )


def test_a_skill_run_is_not_offered_run_skill(app_state):
    """The allowlist is the second line of the same defence: whatever a stored
    skill claims, a run only ever sees the tools it declared."""
    offered = {t["function"]["name"] for t in tools.ollama_tools(["search_notes", "tag_note"])}
    assert "run_skill" not in offered


# --- end to end, through the agent loop -------------------------------------


def test_the_agent_ends_its_turn_with_a_run_skill_event(ai_client, fake_ollama, app_state):
    """The whole point, in one assertion: the model calls `run_skill`, the turn
    stops there, and the client is handed the name to start."""
    _save({"name": "Tidy up", "prompt": "Tidy the notebook.", "tools": ["search_notes"]})
    fake_ollama.tool_script = [
        [{"name": "run_skill", "arguments": {"name": "Tidy up"}}]
    ]
    events = _events(ai_client, "please tidy up my notebook using a skill", use_tools=True)
    handover = [e for e in events if e["type"] == "run_skill"]
    assert len(handover) == 1
    assert handover[0]["skill"] == "Tidy up"


def test_nothing_after_the_handover_is_run(ai_client, fake_ollama, app_state):
    """`ends_turn` means the run replaces the rest of the turn. A second call
    in the same round must not also fire — the skill is about to do the work,
    and a stray write beside it would be outside the plan the user sees."""
    _save({"name": "Tidy up", "prompt": "Tidy the notebook.", "tools": ["search_notes"]})
    fake_ollama.tool_script = [
        [
            {"name": "run_skill", "arguments": {"name": "Tidy up"}},
            {"name": "create_note", "arguments": {"content": "should never exist"}},
        ]
    ]
    events = _events(ai_client, "tidy up my notebook with a skill", use_tools=True)
    assert any(e["type"] == "run_skill" for e in events)
    assert not any(e.get("type") == "tool" and "note" in str(e.get("label", "")) for e in events)


def test_a_bad_skill_name_is_recoverable_rather_than_fatal(ai_client, fake_ollama, app_state):
    """A named skill that doesn't exist is a mistake the model can fix inside
    the same turn — so the loop hands back the reason and carries on, rather
    than ending on a tool that was supposed to end it."""
    # One scripted round, then the fake runs dry and gives its text answer —
    # which is the point: the turn carries on rather than ending on a tool
    # that was supposed to end it.
    fake_ollama.tool_script = [[{"name": "run_skill", "arguments": {"name": "No such skill"}}]]
    events = _events(ai_client, "run a skill for me please", use_tools=True)
    assert not any(e["type"] == "run_skill" for e in events)
    failed = [e for e in events if e["type"] == "tool" and not e.get("ok")]
    assert failed and "No such skill" in failed[0]["error"]
    # And the turn still finished with words, rather than dying on the error.
    assert any(e["type"] == "answer" for e in events)


def test_an_unhandled_error_before_the_first_event_still_answers(
    ai_client, fake_ollama, app_state, monkeypatch
):
    """Reported directly: a skill run that "failed before even completing the
    first step ... no answer and no tool call" — the stream just ended with
    nothing rendered. The route's own outer `next(agent_events, None)` had
    nothing catching an exception raised before the runner's first yield, so
    it killed the generator and FastAPI just closed the connection. This is
    not about what raised (skill_runner.run_skill itself is a thin wrapper;
    almost anything under it could) — it's that whatever does must still
    reach the user as a real event, not silence."""
    from memorymap.ai import skill_runner

    _save({"name": "Tidy up", "prompt": "Tidy the notebook.", "tools": ["search_notes"]})

    def _boom(*args, **kwargs):
        raise RuntimeError("simulated failure before the first event")
        yield  # pragma: no cover — makes this a generator function

    monkeypatch.setattr(skill_runner, "run_skill", _boom)
    events = _events(ai_client, "ph:lightning Tidy up", skill="Tidy up", use_tools=True)
    answers = "".join(e["delta"] for e in events if e["type"] == "answer")
    assert "simulated failure before the first event" in answers
    assert events[-1]["type"] == "done"


def test_an_unhandled_error_mid_run_still_reaches_done(
    ai_client, fake_ollama, app_state, monkeypatch
):
    """Same failure, later: something breaks after the plan/first step has
    already streamed. The stream must still end cleanly rather than cutting
    off with the rest of the run rendered as if it simply stopped."""
    from memorymap.ai import skill_runner

    _save({"name": "Tidy up", "prompt": "Tidy the notebook.", "tools": ["search_notes"]})

    def _boom(*args, **kwargs):
        yield {"type": "plan", "skill": "Tidy up", "steps": [], "tools": []}
        raise RuntimeError("simulated failure mid-run")

    monkeypatch.setattr(skill_runner, "run_skill", _boom)
    events = _events(ai_client, "ph:lightning Tidy up", skill="Tidy up", use_tools=True)
    assert any(e["type"] == "plan" for e in events)
    answers = "".join(e["delta"] for e in events if e["type"] == "answer")
    assert "simulated failure mid-run" in answers
    assert events[-1]["type"] == "done"


def test_list_skills_no_longer_tells_the_model_it_cannot_start_one(session, app_state):
    """The note used to read "You cannot start a skill yourself". Leaving that
    in place while shipping the tool would be worse than either state: a model
    that believes it cannot act will narrate instead of calling."""
    note = tools.TOOLS["list_skills"].handler(session, {})["note_to_model"]
    assert "cannot start" not in note.lower()
    assert "run_skill" in note
