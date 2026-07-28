"""The agent's fixed overhead has to stay inside a small model's window.

Asked for directly: make sure the agent system prompt doesn't get too heavy
for local models like granite4.1:3b or llama3.2:3b.

The trap is that it drifts upward invisibly. Every tool added and every
sentence added to TOOLS_GUIDE costs the same budget, both look harmless in
review, and nothing else in the suite notices — right up until a 3B model
overflows its window and, because the overflow is dropped from the *front*,
stops knowing it has tools at all. That failure looks like "the AI won't use
tools", not like "the prompt got long", which is why it is worth a test.
"""

from __future__ import annotations

import json

import pytest

from memorymap.ai import agent, librarian, tools

# Ollama defaults to a 4096-token window unless the model declares otherwise,
# and ~4 characters per token is close enough to reason with.
CHARS_PER_TOKEN = 4


def _system_prompt() -> str:
    """The static part of what agent.run() builds, without the per-turn bits
    (the clock, the style hint, the profile) which are short and variable."""
    return f"{librarian.DEFAULT_PERSONA} {agent.AGENT_GROUNDING} {agent.TOOLS_GUIDE}"


def _fixed_overhead(app_state) -> int:
    return len(_system_prompt()) + len(json.dumps(tools.ollama_tools()))


def test_the_fixed_overhead_stays_inside_the_budget(app_state):
    overhead = _fixed_overhead(app_state)
    assert overhead <= agent.PROMPT_BUDGET_CHARS, (
        f"The agent's fixed overhead is {overhead} characters "
        f"(~{overhead // CHARS_PER_TOKEN} tokens), over the "
        f"{agent.PROMPT_BUDGET_CHARS} budget. That is resent on every one of "
        f"{agent.MAX_ROUNDS} rounds, before the question, the notes or the "
        "history. Either trim it, or raise PROMPT_BUDGET_CHARS deliberately "
        "and say why in the comment above it."
    )


def test_the_overhead_leaves_room_for_an_actual_conversation(app_state):
    """A budget that fills the window is not a budget."""
    tokens = _fixed_overhead(app_state) // CHARS_PER_TOKEN
    assert tokens < 4096 * 0.85, (
        f"~{tokens} tokens of overhead leaves almost nothing of a 4096-token "
        "window for the user's question and their notes."
    )


def test_turning_tools_off_actually_shrinks_what_is_sent(app_state):
    """Settings → Tools is the escape hatch when a model is too small for the
    full registry, so it has to reach the wire, not just the executor."""
    everything = len(json.dumps(tools.ollama_tools()))
    app_state.set_preference(
        "disabled_tools", ["list_documents", "get_document", "search_chat_history"]
    )
    fewer = len(json.dumps(tools.ollama_tools()))
    assert fewer < everything


# --- what one turn is actually offered (§11a) --------------------------------


def _offered(question: str) -> set[str]:
    return {t["function"]["name"] for t in tools.ollama_tools(tools.focus_for(question))}


def test_an_ordinary_question_is_not_sent_the_whole_toolbox(app_state):
    """The §11a win: 26 schemas went up whether the question was "how many
    notes do I have" or "remind me to call mum"."""
    everything = len(json.dumps(tools.ollama_tools()))
    asked = len(json.dumps(tools.ollama_tools(tools.focus_for("what did I save about sailing?"))))
    assert asked < everything / 2


def test_the_reading_core_and_create_note_are_always_there(app_state):
    """A cue that fails to fire costs the user the thing they asked for, and
    the worst case is create_note: the model then describes a note it did not
    save, which is the exact failure the honesty net exists for."""
    for question in ["hey", "what?", "", "asdf"]:
        offered = _offered(question)
        assert {"search_notes", "get_note", "count_notes", "create_note"} <= offered


@pytest.mark.parametrize(
    "question,wanted",
    [
        ("remind me to call mum tomorrow at 9", "set_reminder"),
        ("don't let me forget the dentist", "set_reminder"),
        ("tag my untagged notes", "tag_note"),
        ("link the notes about the trip", "link_notes"),
        ("delete that note about the old car", "delete_note"),
        ("fix the typo in note 4", "edit_note"),
        ("what did we talk about last time?", "search_chat_history"),
        ("summarise my week", "summarize_notes"),
        ("what's in my documents about the lease?", "list_documents"),
        ("make me a skill for this", "save_skill"),
    ],
)
def test_a_request_that_names_something_gets_the_tools_for_it(app_state, question, wanted):
    assert wanted in _offered(question)


def test_a_vague_request_to_do_something_gets_everything(app_state):
    """"Tidy up my notebook" is exactly the request whose tools cannot be
    guessed, so guessing is not attempted."""
    assert tools.focus_for("tidy up my notebook") is None
    assert tools.focus_for("go through my notes and sort them out") is None


def test_the_user_can_turn_the_focus_off(app_state):
    """A keyword rule's honest failure is a phrasing it doesn't know, so the
    escape hatch has to be reachable without editing code."""
    from memorymap.ai import agent as agent_module

    assert agent_module._focus("what did I save?") is not None
    app_state.set_preference("tool_focus", "all")
    assert agent_module._focus("what did I save?") is None


def test_focusing_never_blocks_a_tool_from_running(app_state, session, fake_ollama):
    """Unlike a skill's allowlist, this is an economy and not a policy: a tool
    left out because a cue didn't fire must still work if it is called."""
    from memorymap.ai import agent as agent_module
    from memorymap.core import deps

    fake_ollama.tool_script = [
        [{"name": "list_reminders", "arguments": {}}]  # no cue for this question
    ]
    events = list(
        agent_module.run_agent(
            session,
            "what did I save about sailing?",
            [],
            deps.get_model_manager(),
            fake_ollama,
        )
    )
    ran = [e for e in events if e["type"] == "tool"]
    assert ran and ran[0]["ok"] is True


def test_the_guide_does_not_repeat_what_a_tool_result_already_says(app_state):
    """Anything said in both places is paid for twice on every round.

    The preview warning travels with every list result (`tools._READ_MORE`),
    so the guide does not need its own copy of it.
    """
    guide = agent.TOOLS_GUIDE.lower()
    assert "clipped previews" not in guide
    assert tools._READ_MORE.lower() not in guide


def test_the_clock_in_the_prompt_is_stable_across_a_tool_loop(monkeypatch):
    """Ollama's prefix cache keeps the tokens before the first difference, and
    this line sits above the history and the notes. At microsecond precision
    it differed on every round of every turn, so each round re-read the whole
    prompt. The rounds of one tool loop are seconds apart, so a clock to the
    minute is the same string for all of them."""
    from datetime import datetime, timedelta, timezone

    from memorymap.core import config

    base = datetime(2026, 7, 28, 18, 55, 10, 123456, tzinfo=timezone.utc)

    def system_at(moment):
        monkeypatch.setattr(config, "user_now", lambda _cfg: moment)
        return agent.build_agent_messages("q", [])[0]["content"]

    first = system_at(base)
    # Three seconds later — a plausible gap between two rounds of one loop.
    assert system_at(base + timedelta(seconds=3, microseconds=8)) == first
    # A minute later it is allowed to change; the clock still has to be right.
    assert system_at(base + timedelta(minutes=1)) != first
    assert "18:55:00" in first and ".123456" not in first
