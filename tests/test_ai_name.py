"""The notebook's AI is called Atlas, once, at the head of each prompt.

INBOX 225, decision taken: a name is a *theme*, not a persona. One constant
(`memorymap.ai.AI_NAME`) and one clause at the head of each prompt that
speaks as the app: the chat and Ask librarian, the agent, and the in-app
help chat. No backstory, no tone instructions, no other prompt growth.

The two things worth testing are the two things that go wrong with a name:
it appears twice (because two layers both prepend it, and the model is then
told who it is in a way no human writes), or it quietly costs context (the
persona is the half of the prompt nothing trims, `PROSE_BUDGET_CHARS`).
"""

from __future__ import annotations

from memorymap.ai import AI_NAME, agent, help_chat, librarian

CLAUSE = f"You are {AI_NAME},"


def test_the_name_is_written_down_once():
    assert AI_NAME == "Atlas"
    # The constant, not the string: a second literal somewhere is how the
    # name ends up half changed the next time someone renames it.
    assert AI_NAME in librarian.DEFAULT_PERSONA
    assert AI_NAME in help_chat.SYSTEM_PROMPT


def test_the_librarian_says_it_once():
    assert librarian.SYSTEM_PROMPT.startswith(CLAUSE)
    assert librarian.SYSTEM_PROMPT.count(AI_NAME) == 1


def test_the_help_chat_says_it_once():
    assert help_chat.SYSTEM_PROMPT.startswith(CLAUSE)
    assert help_chat.SYSTEM_PROMPT.count(AI_NAME) == 1


def test_the_agent_says_it_once(app_state):
    """The agent's own system message, built the way a real turn builds it."""
    messages = agent.build_agent_messages("what did I write about the roof?", notes=[])
    system = messages[0]["content"]
    assert system.startswith(CLAUSE), system[:120]
    assert system.count(AI_NAME) == 1, system


def test_a_user_persona_is_not_decorated_with_it(app_state):
    """A persona the user wrote is the user speaking, not the app. Prepending
    a name to it would both contradict what they asked for and pay for the
    name twice in the one place nothing trims."""
    messages = agent.build_agent_messages(
        "what did I write about the roof?",
        notes=[],
        persona_prompt="You are a blunt editor. Say what is wrong and stop.",
    )
    system = messages[0]["content"]
    assert AI_NAME not in system, system[:200]
    assert system.startswith("You are a blunt editor."), system[:120]


def test_the_name_did_not_cost_the_prompt_budget():
    """The persona is resent on every round of every turn and is never
    trimmed to the window, so a name that pushed this over would be paid for
    by a 3B model's context on every single message. It does not: the clause
    is shorter than the sentence it replaced."""
    prose = f"{librarian.DEFAULT_PERSONA} {agent.AGENT_GROUNDING} {agent.TOOLS_GUIDE}"
    assert len(prose) <= agent.PROSE_BUDGET_CHARS, len(prose)
    assert len(librarian.DEFAULT_PERSONA) <= 60, librarian.DEFAULT_PERSONA
