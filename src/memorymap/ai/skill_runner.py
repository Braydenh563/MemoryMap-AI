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

**A step is a goal, not a turn** (AGENT_SKILLS_REFORM.md, Phase A). One turn per
step fixed "the model did all four instructions at once"; it did not fix the
report that followed it — *"I ran a skill and it ran no tools… the models often
dont even properly complete a step before they are prompted for the next
step."* The cause was that this file decided a step was over when the model
stopped emitting, so a small model narrating "Here is the result of step 2…"
was indistinguishable from one that had done it. A step now carries a contract
(`skills.STEP_EXPECTS`), and a step that has not met it is re-prompted with a
nudge naming the tool rather than ticked off. A step declaring no contract — a
plain string, which is every skill anyone has saved by hand — behaves exactly
as it did before.

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


#: Event types that mean the turn handed over to somebody else rather than
#: finishing. `ask_user` is the one that reaches a skill run: it stops the turn
#: to put a question to the person, so the step is waiting rather than
#: unfinished, and neither the "nothing happened" branch nor a contract retry
#: should fire on it.
_HANDOVERS = frozenset({"ask", "confirm"})


def _unmet_reason(spec: dict) -> str:
    """One sentence naming the contract that was not met, for the step event.

    Phase D asks for "why did this stall?" in one sentence; this is that
    sentence, and it is written now because the information only exists here.
    """
    named = ", ".join(spec.get("tools") or [])
    if spec.get("expects") == "notes_changed":
        return (
            f"this step had to change something with {named} and nothing changed"
            if named
            else "this step had to change something and nothing changed"
        )
    if spec.get("expects") == "answer_only":
        return "this step had to answer in words and nothing was said"
    return (
        f"this step had to call {named} and it wasn't called"
        if named
        else "this step had to call a tool and none were called"
    )


#: How much of a tool's own result the carried state remembers. One line, so a
#: later step can see *what* the last call came back with without the whole
#: payload being resent on every round of every step after it.
STATE_RESULT_CHARS = 200

#: How many ids or tags the state tracks in total. The state line itself names
#: fewer (see `skills.MAX_STATE_IDS`); this is the ceiling on what a long run
#: accumulates in memory before it starts forgetting the oldest.
MAX_STATE_TRACKED = 40

#: Argument names that carry tags. A name rule rather than a per-tool table for
#: the same reason `tools.call_example` builds itself from the schema: a tool
#: added later is covered without anyone remembering to come back here.
#:
#: `new` is deliberately **not** in this list, though `rename_tag(old, new)`
#: puts a tag there: `rename_category` has the same argument and puts a
#: category name in it, and this state is read back to the model as fact. A
#: tag that is missing costs a little precision; a category listed as a tag is
#: a wrong fact in the prompt, which is the more expensive of the two. See
#: `_tag_arguments` for the narrow case where `new` is read after all.
_TAG_ARGUMENT_KEYS = ("tags", "tag", "add")


def _tag_arguments(event: dict) -> tuple[str, ...]:
    """Which of a tool call's arguments name tags, for this particular call."""
    if "tag" in str(event.get("tool") or ""):
        # `rename_tag`, `delete_tag`, `tag_note` — the tag tools, where `new`
        # is a tag by definition.
        return (*_TAG_ARGUMENT_KEYS, "new")
    return _TAG_ARGUMENT_KEYS


def _remember(state: dict, key: str, value) -> None:
    """Add one value to a list in the state, keeping order and no duplicates."""
    seen = state.setdefault(key, [])
    if value in seen:
        return
    seen.append(value)
    if len(seen) > MAX_STATE_TRACKED:
        del seen[0]


def _absorb(state: dict, event: dict) -> None:
    """Fold one tool event into the run's structured state.

    **The third structural cause of the reported failure** (see this module's
    header and AGENT_SKILLS_REFORM.md): only prose used to cross a step
    boundary, so a step told to act on "those notes" got a sentence about them
    rather than their ids, and either re-searched — finding a different set —
    or guessed. What a tool actually touched is already on the event, because
    the chat transcript needs it for the same reason; this keeps it.
    """
    if event.get("type") != "tool":
        return
    for item in event.get("touched") or []:
        if not isinstance(item, dict) or not isinstance(item.get("id"), int):
            continue
        if item.get("kind") == "document":
            _remember(state, "document_ids", item["id"])
        else:
            _remember(state, "note_ids", item["id"])
    arguments = event.get("arguments")
    if isinstance(arguments, dict):
        for key in _tag_arguments(event):
            value = arguments.get(key)
            for tag in value if isinstance(value, list) else [value]:
                if isinstance(tag, str) and tag.strip():
                    _remember(state, "tags", tag.strip())
    if not event.get("ok"):
        # A failed call touched nothing and read nothing. Recording it as
        # "last tool run" would tell the next step a lie in one word.
        return
    if event.get("tool"):
        state["last_tool"] = event["tool"]
    summary = event.get("result_summary")
    if isinstance(summary, str) and summary.strip():
        state["last_tool_result"] = summary[:STATE_RESULT_CHARS]


def _absorb_change(state: dict, change: dict) -> None:
    """The ids a *write* touched, kept apart from the ids a read merely saw."""
    for field, key in (("note_id", "note_ids"), ("document_id", "document_ids")):
        if isinstance(change.get(field), int):
            _remember(state, key, change[field])
            _remember(state, "touched", change[field])


def _contract_met(spec: dict, called: set[str], changed: list[dict], answer: str) -> bool:
    """Has this step done what it declared it would?

    The one judgement worth writing down here: a **failed** call still counts
    for `tool_called`. The contract is "you reached for the tool", and a model
    that called it and got an error is not the failure this exists to catch —
    that model is already handled, by the recovery hints the agent loop feeds
    back and by the run's own "no answer and a failure" branch. Re-prompting
    it would spend two more rounds re-running the same broken call. What this
    catches is the model that wrote *about* the tool and never called it.
    """
    expects = spec.get("expects")
    if not expects:
        return True  # a plain string step: unchecked, exactly as before
    if expects == "answer_only":
        return bool(answer)
    if expects == "notes_changed":
        return bool(changed)
    named = set(spec.get("tools") or [])
    return bool(called & named) if named else bool(called)


def _step_tools(spec: dict, allowed: list[str] | None, small_model: bool) -> list[str] | None:
    """Which tools this one step is offered.

    Ordinarily the skill's whole allowlist, which is already narrow. In
    small-model mode it is **only what the step's contract names** — Phase B:
    a 4B model handed five schemas for a step that needs one picks the wrong
    one often enough to be the reported failure, and every schema not sent is
    room the notes and the question get back. Falls back to the skill's list
    when the step names nothing, because offering no tools at all would make a
    `tool_called` contract impossible to meet.
    """
    if not small_model:
        return allowed
    named = [name for name in (spec.get("tools") or []) if allowed is None or name in allowed]
    return named or allowed


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
    small_model: bool | None = None,
) -> Iterator[dict]:
    """Yields the agent's own event types, plus three of its own:

    {"type": "plan", "skill", "steps", "step_specs", "tools", "small_model"}
                                                    — before anything runs
    {"type": "step", "index", "state", "text"}      — running | retrying | done
                                                      | failed | stalled
                                                      | earlier
    {"type": "result", "changes": [...], "stopped_at": int|None, "paused": bool,
     "state": {...}}                                — what actually changed,
                                                      where it stopped, and the
                                                      ids the run gathered

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

    `small_model` is Phase B of the skills reform: one tool per step and a
    worked example of the call. None means "decide from the model", which is
    read off the chat model's own name — see `model_manager.parameter_count`,
    and note that an unrecognised name means *off*.

    **The step contract is Phase A**, and it is the difference between this
    and what was here before: a step is over when its declared condition is
    met, not when the model stops emitting. A step that has not met it is
    re-prompted with a nudge naming the tool, up to its own `retries`, and
    only then marked `stalled`. It is never silently `done` — that was the
    reported bug, and the reason a run "ran no tools" and still ticked green.
    """
    steps = skill.get("steps") or []
    specs = skills.step_specs(skill)
    allowed = skill.get("tools") or None
    if small_model is None:
        # "Auto": the model's own name is the only size hint available before a
        # request is made, and it is free. `chat_model_is_small` answers None
        # when the name says nothing, and None means off — narrowing a capable
        # model's toolbox on a guess is the worse mistake of the two.
        small_model = bool(model_manager.chat_model_is_small())
    plan = {
        "type": "plan",
        "skill": skill["name"],
        # Strings, for ever: `plan.steps` is rendered straight into `<li>`
        # textContent by the frontend, so anything else here is a plan card
        # full of "[object Object]". The contracts travel beside it.
        "steps": steps,
        "step_specs": specs,
        "tools": skill.get("tools") or [],
        "small_model": bool(small_model),
        # Which shape of run this is, so the UI can title it. A saved skill and
        # a plan the model drew for one request (§35K) both run through here.
        "kind": skill.get("kind") or "skill",
        "start_at": max(0, start_at),
    }
    changes: list[dict] = []
    # What the run knows so far, as ids rather than as prose — carried into
    # every later step's instruction and returned with the result.
    state: dict = {}

    def turn(
        question: str,
        turn_history: list[dict],
        note: str | None,
        offered: list[str] | None = allowed,
    ) -> Iterator[dict]:
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
            allowed_tools=offered,
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
        for event in _collect(chain([first], events), changes, state):
            yield event
        # No steps to resume from, so no `stopped_at`: a stepless skill is one
        # turn, and re-running it is the only way to continue it. The turn's
        # own `limit` event is still there, and the chat's Continue button
        # reads that.
        _record_run(session, skill, changes, None, 0, False)
        yield {
            "type": "result",
            "changes": changes,
            "stopped_at": None,
            "steps": 0,
            "paused": False,
            "state": state,
        }
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
        spec = specs[index]
        offered = _step_tools(spec, allowed, small_model)
        example = (
            tools.call_example(spec["tools"][0])
            if small_model and spec.get("tools")
            else None
        )
        attempts = spec.get("retries", skills.DEFAULT_STEP_RETRIES) + 1
        attempt = 1
        nudge: str | None = None
        outcome: str | None = None  # set when the step is over, either way
        while outcome is None:
            instruction = skills.step_instruction(
                skill, values, index, state=state, only_tools=offered, example=example
            )
            # Folded into the instruction, not appended to `step_history`: this
            # is what the user is asking for as part of *this* step, not a fact
            # about an earlier one, and a history entry is something the model
            # may or may not weigh against everything else in the window.
            if manual_note and index == resume_from:
                instruction = (
                    f"Before this step, the person running this added: "
                    f"“{manual_note}”\n\n{instruction}"
                )
            if nudge:
                # First, and on its own line: this is a correction, and a
                # correction buried under three paragraphs of restated context
                # is one a small model reads as more context.
                instruction = f"{nudge}\n\n{instruction}"
            events = turn(
                instruction,
                step_history,
                f"I couldn't finish step {index + 1} — I used every round it had "
                "without reaching an answer.",
                offered,
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
                outcome = "failed"
                break
            if not started:
                yield plan
                started = True
            if attempt == 1:
                yield {"type": "step", "index": index, "state": "running", "text": step}

            said: list[str] = []
            failures: list[str] = []
            ran_out = False
            called: set[str] = set()
            ran_any_tool = False
            handed_over = False
            went_offline = False
            # Where this step's own changes start in the run's running list, so
            # they can be told apart from every earlier step's — see
            # _step_answer, and the `notes_changed` contract.
            changes_before = len(changes)
            for event in _collect(chain([first], events) if first else events, changes, state):
                if event["type"] == "answer":
                    said.append(event["delta"])
                    if event.get("offline"):
                        went_offline = True
                elif event["type"] == "tool":
                    ran_any_tool = True
                    if event.get("tool"):
                        called.add(event["tool"])
                    if not event.get("ok"):
                        failures.append(str(event.get("error") or event.get("label")))
                elif event["type"] == "limit":
                    # The step used every round it had and was still calling
                    # tools. Whatever it says next is a stopping notice, so it
                    # must not be read as the step's result.
                    ran_out = True
                elif event["type"] in _HANDOVERS:
                    # `ask_user` ends the turn by handing the question to the
                    # person. It never reaches here as a tool event, so a
                    # contract check would see a step that called nothing and
                    # re-prompt a model that is correctly waiting for an
                    # answer only the user can give.
                    handed_over = True
                yield event

            answer = "".join(said).strip()
            step_changes = changes[changes_before:]
            if went_offline:
                # **Tier 1 §3.** Ollama died mid-round, and `agent.run_agent`'s
                # own answer for that is a real sentence of prose ("Ollama
                # doesn't seem to be running…") — which used to satisfy the
                # "did this step say something" check below and get ticked
                # done. The run then quietly repeated the identical failure on
                # every later step, since the notebook did not get any less
                # offline between them. Named and stopped here instead, the
                # same way `ran_out` is. Not retried either: the notebook will
                # not come back online between two attempts a second apart.
                yield {
                    "type": "step",
                    "index": index,
                    "state": "failed",
                    "text": step,
                    "reason": "Ollama isn't reachable — check Settings → Models and try again.",
                }
                stopped_at = index
                outcome = "failed"
                break
            if ran_out:
                # **Stalled, not done.** This is the half of the reported
                # failure that made the other half invisible: the runner could
                # only see that the turn produced text, and the "I ran out of
                # rounds" notice is text — so a step that was cut off mid-job
                # was ticked green and the next step ran on top of half-finished
                # work. It stops here instead, and `stopped_at` is what Resume
                # picks up from.
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
                outcome = "stalled"
                break
            # A step that ran no tools and said nothing did not happen. Anything
            # else is reported as done — the model's own words are the record,
            # and calling a step failed because a tool errored mid-way would be
            # wrong when it recovered on the next call.
            if not answer and failures:
                yield {
                    "type": "step",
                    "index": index,
                    "state": "failed",
                    "text": step,
                    "reason": failures[-1],
                }
                stopped_at = index
                outcome = "failed"
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
            #
            # Deliberately *not* folded into the contract retry below: this is a
            # model that produced nothing at all, not one that did the wrong
            # thing, and the two want different words. Retrying it would also
            # change a failure the UI already explains ("Resume picks up from
            # this step") into two more silent rounds first.
            if not answer and not ran_any_tool and not handed_over:
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
                outcome = "failed"
                break
            if handed_over or _contract_met(spec, called, step_changes, answer):
                yield {"type": "step", "index": index, "state": "done", "text": step}
                step_history.append(
                    {"question": step, "answer": _step_answer(answer, step_changes)}
                )
                outcome = "done"
                break
            if attempt < attempts:
                # **Re-prompted, not skipped.** The single highest-yield change
                # in the reform: a small model that narrated the step instead of
                # doing it is told, literally, which call to make. The step stays
                # open and the UI shows it retrying rather than ticked.
                attempt += 1
                nudge = skills.contract_nudge(spec, attempt, attempts)
                yield {
                    "type": "step",
                    "index": index,
                    "state": "retrying",
                    "text": step,
                    "attempt": attempt,
                    "of": attempts,
                    "reason": _unmet_reason(spec),
                }
                continue
            # Out of attempts. Stalled — never `done`, which is the whole point.
            yield {
                "type": "step",
                "index": index,
                "state": "stalled",
                "text": step,
                "reason": (
                    f"{_unmet_reason(spec)} after {attempts} attempt(s). Resume "
                    "continues from here — or, if there was genuinely nothing "
                    "to do in this step, skip past it by resuming from the next."
                ),
            }
            stopped_at = index
            outcome = "stalled"
        if outcome != "done":
            break
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
        # The ids the run gathered, so whatever picks it up next — a Resume, a
        # follow-up question, Phase C's run view — can talk about "those notes"
        # with the same precision the steps did.
        "state": state,
    }


def _collect(events: Iterator[dict], changes: list[dict], state: dict) -> Iterator[dict]:
    """Pass events through, keeping the changes and the state for the result."""
    for event in events:
        if event.get("change"):
            changes.append(event["change"])
            _absorb_change(state, event["change"])
        _absorb(state, event)
        yield event
