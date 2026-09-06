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

import logging
from collections.abc import Iterator
from itertools import chain

from sqlalchemy.orm import Session

from memorymap.ai import agent, skills, tools
from memorymap.ai.model_manager import ModelManager
from memorymap.ai.ollama_client import OllamaClient

logger = logging.getLogger("memorymap.skills")

# Rounds a single step may take before it has to earn more. Lower than a free
# chat turn on purpose: a step is one instruction, and a model still looping
# after this many rounds has misunderstood it rather than run out of room.
STEP_ROUNDS = 4

# …and rounds a step can earn by getting somewhere (agent.EARNED_ROUNDS is the
# same idea for an ordinary turn, and the reasoning is written up there).
#
# This is the reported failure seen from inside a run: *"the agent struggles
# with long tasks like skills, then cuts out half way through."* A step such as
# "tag every untagged note" is one instruction and a dozen tool calls, and four
# flat rounds cut it off in the middle every time — with the step ticked off as
# done, because the runner could only see that the turn had produced text.
# Both halves of that are fixed: a step that keeps doing new things keeps
# going, and a step that runs out is marked stalled rather than done.
STEP_EARNED_ROUNDS = 6

# How much of a step's answer is carried into the next step's history. Enough
# to say what it found, not enough to refill the window each time.
STEP_ANSWER_CHARS = 600

# How many touched-note ids one step's summary names before it just says
# "and N more" — a step that tags a hundred notes must not spend the whole
# STEP_ANSWER_CHARS budget on ids and leave no room for the model's own words.
MAX_TOUCHED_IDS_NAMED = 15


def _touched_ids(step_changes: list[dict], field: str) -> list[int]:
    return sorted({c[field] for c in step_changes if c.get(field) is not None})


def _touched_clause(label: str, ids: list[int]) -> str:
    """`" [Notes touched this step: #3, #9]"`, or `""` if `ids` is empty."""
    if not ids:
        return ""
    named = ids[:MAX_TOUCHED_IDS_NAMED]
    text = ", ".join(f"#{i}" for i in named)
    if len(ids) > len(named):
        text += f", and {len(ids) - len(named)} more"
    return f" [{label} touched this step: {text}]"


def _step_answer(answer: str, step_changes: list[dict]) -> str:
    """What the next step's history records for this one: the model's own
    words, plus which notes and documents it actually touched, if any did.

    **Reported, in the shape of "the agent loses the plot half way through a
    job":** a step's own narration ("tagged the relevant notes") is a prose
    summary the model wrote about itself, not a record of what happened —
    and it is *all* the next step saw. A later step that needed "those notes"
    had nothing but that sentence to work from: too vague to act on, so it
    either re-searched (and could easily find a different set) or guessed.
    The ids in `step_changes` (`agent.py`'s own `change` events, the same
    ones that already back the chat UI's View/Undo buttons) are the ground
    truth of what this step did — appending them is handing the next step
    the same fact a human reading the transcript would have.

    Ids are the right thing to carry between steps even though the system
    prompt tells the model never to show one to the *user* — that rule is
    about what appears in an answer, not about how steps refer to things
    internally, which is exactly how every id-targeting tool (`edit_note`,
    `tag_note`, `link_notes`...) already works.
    """
    summary = _touched_clause("Notes", _touched_ids(step_changes, "note_id")) + _touched_clause(
        "Documents", _touched_ids(step_changes, "document_id")
    )
    if not summary:
        return (answer[:STEP_ANSWER_CHARS] if answer else "") or "(nothing said)"
    # Truncate the model's own words first, not the ids — a next step that
    # cannot see what happened is guessing; the prose is what it can afford
    # to lose.
    base = answer[: max(0, STEP_ANSWER_CHARS - len(summary))] if answer else ""
    return (base or "(nothing said)") + summary


def _record_run(
    session: Session,
    skill: dict,
    changes: list[dict],
    stopped_at: int | None,
    steps: int,
    paused: bool,
) -> None:
    """Write one audit row for a finished skill run.

    **Nothing in this app ever wrote one, and the Library's AI Skills tab has
    a log panel that reads them.** Reported as "I dont think the skill logs
    work in the ai skills section in the library??" — correct, and not because
    the panel was broken: `renderSkillLogs` filters `/audit` for
    `entity_type === "skill"`, and a grep for a `log_action` call with that
    entity type returns nothing at all. The panel could only ever say "No
    skill execution logs found". The "features that never ran once" shape from
    CLAUDE.md, one layer down: the reader ran, and the writer did not exist.

    Best-effort and never raises: a run that did real work must not fail at
    the last line over its own bookkeeping. Committed here rather than left to
    the caller, because the caller is a streaming route whose session may be
    closed by the time the generator is exhausted.
    """
    from memorymap.entry.manager import log_action

    outcome = (
        "paused"
        if paused
        else "completed"
        if stopped_at is None
        else f"stopped at step {stopped_at + 1}"
    )
    detail = f"{outcome} · {len(changes)} change(s)"
    if steps:
        detail = f"{outcome} · {steps} step(s) · {len(changes)} change(s)"
    try:
        log_action(session, "ran", "skill", None, f"{skill.get('name') or 'skill'} — {detail}")
        session.commit()
    except Exception:  # noqa: BLE001 — bookkeeping must not fail a finished run
        logger.warning("couldn't record the skill run", exc_info=True)
        session.rollback()


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
    start_at: int = 0,
    manual: bool = False,
    manual_note: str | None = None,
) -> Iterator[dict]:
    """Yields the agent's own event types, plus three of its own:

    {"type": "plan", "skill", "steps", "tools"}     — before anything runs
    {"type": "step", "index", "state", "text"}      — running | done | failed
                                                      | stalled | earlier
    {"type": "result", "changes": [...], "stopped_at": int|None, "paused": bool}
                                                    — what actually changed,
                                                      and where it stopped

    The first event is either "unsupported" (the model can't call tools, so
    the caller should fall back to plain Q&A) or "plan" — the same contract
    `run_agent` has, so the route's fallback works unchanged.

    `start_at` resumes: steps before it are marked `earlier` and not re-run.
    That is the answer to "it cuts out half way through and has to restart" —
    restarting a six-step run to reach step four means doing steps one to three
    again, and every one of them writes to the notebook.

    `manual` is the other half of that same request, asked for directly and
    explicitly, and never built until now: **"skills producing network
    errors, or models that cannot run them" and "a manual mode"** — a pause
    after every completed step with a Continue button, so a person can add
    what the agent missed or answer a question it raised before the next
    step starts, rather than the run barrelling on regardless. Reuses the
    exact same stop-and-resume machinery `start_at` already has for a
    failure — a pause is not a new code path, it's the same one with
    `result.paused = True` so the caller can tell "stopped because it's
    waiting for you" from "stopped because something went wrong" and render
    each one differently. `manual_note` is what the user typed at that
    pause; folded into the very next step's own instruction (not into
    history, which the model may or may not weigh — this is read as part of
    what it's being asked to do right now).
    """
    steps = skill.get("steps") or []
    allowed = skill.get("tools") or None
    plan = {
        "type": "plan",
        "skill": skill["name"],
        "steps": steps,
        "tools": skill.get("tools") or [],
        # Which shape of run this is, so the UI can title it. A saved skill and
        # a plan the model drew for one request (§35K) both run through here.
        "kind": skill.get("kind") or "skill",
        "start_at": max(0, start_at),
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
            # A run may not start another run. A skill that *declares* its
            # tools is already safe (`skills.NEVER_IN_A_SKILL` refuses these at
            # save time), but a skill with no allowlist — and every ad-hoc plan
            # — is offered the whole registry, `make_plan` included. A plan
            # step that plans again would nest runs with fresh rounds each.
            blocked_tools=tools.RUN_STARTERS,
            max_rounds=STEP_ROUNDS if steps else agent.MAX_ROUNDS,
            earned_rounds=STEP_EARNED_ROUNDS if steps else agent.EARNED_ROUNDS,
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
        # No steps to resume from, so no `stopped_at`: a stepless skill is one
        # turn, and re-running it is the only way to continue it. The turn's
        # own `limit` event is still there, and the chat's Continue button
        # reads that.
        _record_run(session, skill, changes, None, 0, False)
        yield {"type": "result", "changes": changes, "stopped_at": None, "steps": 0, "paused": False}
        return

    step_history = list(history or [])
    started = False
    stopped_at: int | None = None
    paused = False
    resume_from = min(max(0, start_at), len(steps))
    for index, step in enumerate(steps):
        if index < resume_from:
            # Done in the run this one is resuming, so it is neither re-run nor
            # claimed as this run's work. The plan card shows it ticked in a
            # quieter state, because a step somebody watched succeed ten
            # minutes ago is not the same as one this run just did.
            if not started:
                yield plan
                started = True
            yield {"type": "step", "index": index, "state": "earlier", "text": step}
            continue
        instruction = skills.step_instruction(skill, values, index)
        # Folded into the instruction, not appended to `step_history`: this is
        # what the user is asking for as part of *this* step, not a fact about
        # an earlier one, and a history entry is something the model may or
        # may not weigh against everything else in the window.
        if manual_note and index == resume_from:
            instruction = (
                f"Before this step, the person running this added: "
                f"“{manual_note}”\n\n{instruction}"
            )
        events = turn(
            instruction,
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
            stopped_at = index
            break
        if not started:
            yield plan
            started = True
        yield {"type": "step", "index": index, "state": "running", "text": step}

        said: list[str] = []
        failures: list[str] = []
        ran_out = False
        ran_any_tool = False
        went_offline = False
        # Where this step's own changes start in the run's running list, so
        # they can be told apart from every earlier step's — see _step_answer.
        changes_before = len(changes)
        for event in _collect(chain([first], events) if first else events, changes):
            if event["type"] == "answer":
                said.append(event["delta"])
                if event.get("offline"):
                    went_offline = True
            elif event["type"] == "tool":
                ran_any_tool = True
                if not event.get("ok"):
                    failures.append(str(event.get("error") or event.get("label")))
            elif event["type"] == "limit":
                # The step used every round it had and was still calling tools.
                # Whatever it says next is a stopping notice, so it must not be
                # read as the step's result.
                ran_out = True
            yield event

        answer = "".join(said).strip()
        if went_offline:
            # **Tier 1 §3.** Ollama died mid-round, and `agent.run_agent`'s own
            # answer for that is a real sentence of prose ("Ollama doesn't
            # seem to be running…") — which used to satisfy the "did this step
            # say something" check below and get ticked done. The run then
            # quietly repeated the identical failure on every later step,
            # since the notebook did not get any less offline between them.
            # Named and stopped here instead, the same way `ran_out` is.
            yield {
                "type": "step",
                "index": index,
                "state": "failed",
                "text": step,
                "reason": "Ollama isn't reachable — check Settings → Models and try again.",
            }
            stopped_at = index
            break
        if ran_out:
            # **Stalled, not done.** This is the half of the reported failure
            # that made the other half invisible: the runner could only see
            # that the turn produced text, and the "I ran out of rounds" notice
            # is text — so a step that was cut off mid-job was ticked green and
            # the next step ran on top of half-finished work. It stops here
            # instead, and `stopped_at` is what Resume picks up from.
            yield {
                "type": "step",
                "index": index,
                "state": "stalled",
                "text": step,
                "reason": (
                    "ran out of rounds before finishing — Resume continues "
                    "from here, or split this step into two smaller ones"
                ),
            }
            stopped_at = index
            break
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
            stopped_at = index
            break
        # **The other half of the reported bug.** A turn can end with no
        # answer, no tool call and no failure at all — a model that replies
        # with empty content and no tool calls produces exactly this, and it
        # used to fall straight through to "done" below because nothing here
        # checked for *nothing happening*. That is what made the skill's own
        # progress list lie: a step ticked green though the model never
        # actually said or did anything ("the AI fails to respond… and the
        # skill step counted as done"). Reported the same way `ran_out` was:
        # stop and let Resume pick it back up, rather than hand the next step
        # a "done" step with nothing in its history to build on.
        if not answer and not ran_any_tool:
            yield {
                "type": "step",
                "index": index,
                "state": "failed",
                "text": step,
                #: **Say what to do about it, not only what happened.**
                #: Reported: *"skills are too hard for small ais and things go
                #: wrong often."* A small model producing one empty turn is the
                #: single most common way a run stops, and it usually passes on
                #: the next attempt — which the Resume button already does,
                #: from this step, without re-running the ones before it. A
                #: reason that does not say that leaves the reader with a dead
                #: run and no move.
                "reason": (
                    "the model didn't respond — no answer and no tool call. "
                    "Resume picks up from this step; a smaller model often "
                    "gets it on the second attempt, and Manual mode lets you "
                    "steer each step."
                ),
            }
            stopped_at = index
            break
        yield {"type": "step", "index": index, "state": "done", "text": step}
        step_history.append(
            {"question": step, "answer": _step_answer(answer, changes[changes_before:])}
        )
        # Manual mode: the same stop-and-resume machinery `stopped_at` already
        # gives a failed/stalled step, used deliberately here instead of a
        # second mechanism — the difference is only `paused` below, so the
        # client can render "waiting for you" rather than "something broke".
        # Nothing to pause for after the last step; that's just the run ending.
        if manual and index + 1 < len(steps):
            stopped_at = index + 1
            paused = True
            break

    if not started:  # every step failed before producing anything
        yield plan
    _record_run(session, skill, changes, stopped_at, len(steps), paused)
    # `stopped_at` is the index the run did not get past — None when it
    # finished. The client turns it into "Resume from step N", which is the
    # difference between carrying on and doing the first half again. `paused`
    # tells it which reason: waiting for the user (manual mode) rather than a
    # failure — Resume becomes Continue, and it's not reported as an error.
    yield {
        "type": "result",
        "changes": changes,
        "stopped_at": stopped_at,
        "steps": len(steps),
        "paused": paused,
    }


def _collect(events: Iterator[dict], changes: list[dict]) -> Iterator[dict]:
    """Pass events through, keeping the changes for the result."""
    for event in events:
        if event.get("change"):
            changes.append(event["change"])
        yield event
