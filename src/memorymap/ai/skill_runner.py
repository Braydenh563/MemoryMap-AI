"""Running a skill: one step at a time, with progress and a result.

The difference between this and handing the model a numbered list is the
difference between a plan and a job. A list inside one request is a plan the
model is free to ignore — and a 3B model given four instructions at once
reliably does the first, narrates the rest, and reports success. Here each
step is its own bounded agent turn, so:

- the app **knows** which step is running, and the UI ticks them off;
- a step that fails is named, instead of a run that quietly did less than it
  said (roadmap §21's "a skill that fails halfway should say which step");
- each turn carries one instruction and the skill's own few tool schemas
  rather than everything at once, which is what makes this work on the small
  models it is aimed at (§11a);
- what changed is collected as it happens, with the call that would undo it.

A skill with no steps is one turn — exactly what it was before the rebuild.

**Everything here has to stay lazy.** The events are consumed by a streaming
NDJSON response, so anything that materialises the iterator holds the whole
step back and releases it in one block. That was a real bug (§35H): putting
the first event back with `[first, *events]` looks harmless and is not — the
`*` runs the generator to exhaustion before the list even exists, so a step's
prose, tool chips and all arrived together once the step had finished. Reported
as "the steps don't stream visually as they are written and are instead dumped
once each section of the response is finished". `chain` is the version of that
line which does not.
"""

from __future__ import annotations

from collections.abc import Iterator
from itertools import chain

from sqlalchemy.orm import Session

from memorymap.ai import agent, skills
from memorymap.ai.model_manager import ModelManager
from memorymap.ai.ollama_client import OllamaClient

# Rounds a single step may take. Lower than a free chat turn on purpose: a
# step is one instruction, and a model still looping after this many rounds
# has misunderstood it rather than run out of room.
STEP_ROUNDS = 4

# How much of a step's answer is carried into the next step's history. Enough
# to say what it found, not enough to refill the window each time.
STEP_ANSWER_CHARS = 600


def run_skill(
    session: Session,
    skill: dict,
    values: dict | None,
    notes: list[dict],
    model_manager: ModelManager,
    ollama: OllamaClient,
    style: str = "friendly",
    profile: str = "",
    history: list[dict] | None = None,
    persona_prompt: str | None = None,
) -> Iterator[dict]:
    """Yields the agent's own event types, plus three of its own:

    {"type": "plan", "skill", "steps", "tools"}     — before anything runs
    {"type": "step", "index", "state", "text"}      — running | done | failed
    {"type": "result", "changes": [...]}            — what actually changed

    The first event is either "unsupported" (the model can't call tools, so
    the caller should fall back to plain Q&A) or "plan" — the same contract
    `run_agent` has, so the route's fallback works unchanged.
    """
    steps = skill.get("steps") or []
    allowed = skill.get("tools") or None
    plan = {
        "type": "plan",
        "skill": skill["name"],
        "steps": steps,
        "tools": skill.get("tools") or [],
    }
    changes: list[dict] = []

    def turn(question: str, turn_history: list[dict], note: str | None) -> Iterator[dict]:
        return agent.run_agent(
            session,
            question,
            notes,
            model_manager,
            ollama,
            style=style,
            profile=profile,
            history=turn_history,
            persona_prompt=persona_prompt,
            allowed_tools=allowed,
            max_rounds=STEP_ROUNDS if steps else agent.MAX_ROUNDS,
            exhausted_note=note,
        )

    if not steps:
        # No steps declared: one turn on the whole instruction, as before.
        events = turn(skills.run_instruction(skill, values), list(history or []), None)
        first = next(events, None)
        if first is None:
            yield plan
            return
        if first.get("type") == "unsupported":
            yield first
            return
        yield plan
        for event in _collect(chain([first], events), changes):
            yield event
        yield {"type": "result", "changes": changes}
        return

    step_history = list(history or [])
    started = False
    for index, step in enumerate(steps):
        events = turn(
            skills.step_instruction(skill, values, index),
            step_history,
            f"I couldn't finish step {index + 1} — I used every round it had "
            "without reaching an answer.",
        )
        first = next(events, None)
        if first is not None and first.get("type") == "unsupported":
            if not started:
                # Nothing has been shown yet, so the caller can still fall
                # back to a plain answer. Once a step has run, it cannot.
                yield first
                return
            yield {
                "type": "step",
                "index": index,
                "state": "failed",
                "text": step,
                "reason": "The model stopped being able to use tools part-way through.",
            }
            break
        if not started:
            yield plan
            started = True
        yield {"type": "step", "index": index, "state": "running", "text": step}

        said: list[str] = []
        failures: list[str] = []
        for event in _collect(chain([first], events) if first else events, changes):
            if event["type"] == "answer":
                said.append(event["delta"])
            elif event["type"] == "tool" and not event.get("ok"):
                failures.append(str(event.get("error") or event.get("label")))
            yield event

        answer = "".join(said).strip()
        # A step that ran no tools and said nothing did not happen. Anything
        # else is reported as done — the model's own words are the record, and
        # calling a step failed because a tool errored mid-way would be wrong
        # when it recovered on the next call.
        if not answer and failures:
            yield {
                "type": "step",
                "index": index,
                "state": "failed",
                "text": step,
                "reason": failures[-1],
            }
            break
        yield {"type": "step", "index": index, "state": "done", "text": step}
        step_history.append(
            {"question": step, "answer": answer[:STEP_ANSWER_CHARS] or "(nothing said)"}
        )

    if not started:  # every step failed before producing anything
        yield plan
    yield {"type": "result", "changes": changes}


def _collect(events: Iterator[dict], changes: list[dict]) -> Iterator[dict]:
    """Pass events through, keeping the changes for the result."""
    for event in events:
        if event.get("change"):
            changes.append(event["change"])
        yield event
