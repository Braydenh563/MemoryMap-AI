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


def test_the_guide_does_not_repeat_what_a_tool_result_already_says(app_state):
    """Anything said in both places is paid for twice on every round.

    The preview warning travels with every list result (`tools._READ_MORE`),
    so the guide does not need its own copy of it.
    """
    guide = agent.TOOLS_GUIDE.lower()
    assert "clipped previews" not in guide
    assert tools._READ_MORE.lower() not in guide
