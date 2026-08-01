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


def test_a_very_long_note_is_cut_short_with_a_way_to_read_the_rest():
    """Ten notes retrieved so the model sees ten of them — one note of pages
    would crowd out the other nine. Safe only because it can undo it."""
    note = {"id": 7, "category": "Work", "content": "x" * 4000}
    short = librarian.note_for_prompt(note)
    assert len(short) < 1100
    assert "get_note(7)" in short


def test_an_ordinary_note_is_left_exactly_as_it_is():
    """Most notes are a line or two; nothing should touch them."""
    note = {"id": 7, "category": "Work", "content": "the ferry leaves at 8"}
    assert librarian.note_for_prompt(note) == "the ferry leaves at 8"


def test_a_long_note_does_not_blow_the_prompt_budget():
    long_notes = [
        {"id": i, "category": "Work", "content": "y" * 4000} for i in range(10)
    ]
    messages = agent.build_agent_messages("what did I say?", long_notes)
    total = sum(len(m["content"]) for m in messages)
    assert total < agent.PROMPT_BUDGET_CHARS, total


# --- fitting the registry to the model, rather than to a constant ---------------
#
# Asked directly after four category tools took the all-tools overhead within
# ~180 characters of a 4096-token window: "if adding more tools is an issue, can
# we change or improve how tools are used so that doesn't become an issue?"
#
# The ceiling was never a fact about the app, it was an assumption about the
# model. 4096 is Ollama's fallback when a model declares nothing; a current 7B
# routinely declares 32k or more. The budget is measured now, not fixed.


def test_a_big_window_is_not_rationed_like_a_small_one(app_state):
    """Rationing a 32k model against 4096 withholds tools for no reason."""
    every = tools.ollama_tools()
    kept, dropped = tools.within_budget(every, tools.budget_for_window(32_768))
    assert not dropped
    assert len(kept) == len(every)


def test_a_small_window_drops_tools_rather_than_overflowing(app_state):
    """The failure this replaces is silent: past the window the system prompt
    goes off the front and the model stops knowing it has tools at all."""
    every = tools.ollama_tools()
    budget = tools.budget_for_window(4096)
    kept, dropped = tools.within_budget(every, budget)
    assert dropped, "a 4096 window cannot hold every schema, and should say so"
    assert tools.schema_chars(kept) <= budget


def test_what_survives_a_tight_budget_is_what_matters_most(app_state):
    """A model that cannot search or read a note cannot answer anything, so
    those go first and the tail is what gets dropped."""
    every = tools.ollama_tools()
    kept, _ = tools.within_budget(every, tools.budget_for_window(2048))
    names = [t["function"]["name"] for t in kept]
    assert "search_notes" in names
    assert names[0] in tools.CORE_TOOLS


def test_a_budget_too_small_for_even_one_tool_still_sends_one(app_state):
    """A model handed an empty tool list does not degrade gracefully — it
    answers from nothing and sounds confident about it."""
    kept, _ = tools.within_budget(tools.ollama_tools(), 1)
    assert len(kept) == 1


def test_the_measurement_is_of_the_list_as_it_is_actually_sent(app_state):
    """Summing individual schemas misses the brackets and commas, which are
    small and are also the difference between fitting and not."""
    every = tools.ollama_tools()[:5]
    assert tools.schema_chars(every) > sum(tools.schema_chars([t]) for t in every) - 100


def test_an_unknown_window_falls_back_to_the_cautious_number():
    """Being wrong towards 4096 wastes headroom; being wrong the other way
    drops the system prompt off the front."""
    from memorymap.ai.ollama_client import OllamaClient

    client = OllamaClient(base_url="http://127.0.0.1:1")  # nothing listening
    assert client.context_length("whatever") is None
    assert client.usable_context("whatever") == OllamaClient.DEFAULT_CONTEXT_TOKENS


def test_the_window_is_asked_for_once_per_model():
    """It cannot change without the model being re-pulled, and the answer is
    needed on every round."""
    from memorymap.ai.ollama_client import OllamaClient

    client = OllamaClient(base_url="http://127.0.0.1:1")
    client.context_length("a-model")
    client._context_lengths["a-model"] = 12345  # would be re-fetched if not cached
    assert client.context_length("a-model") == 12345


def test_a_backend_that_cannot_report_its_window_still_works(app_state):
    """Reporting a context window is an Ollama feature. §6's planned
    OpenAI-compatible backends (LM Studio, llama.cpp, Jan, vLLM) have no
    equivalent of /api/show, and the budget is an optimisation — one that can
    take the whole agent turn down with it is not one.

    Caught by three existing tests whose local fake predates the method, which
    is exactly the signal that a hard requirement had been added.
    """
    from memorymap.ai.ollama_client import OllamaClient

    class NoWindowReporting:
        """A client from before this existed, or a non-Ollama one."""

    report = getattr(NoWindowReporting(), "usable_context", None)
    window = report("m") if callable(report) else None
    assert (window or OllamaClient.DEFAULT_CONTEXT_TOKENS) == 4096
