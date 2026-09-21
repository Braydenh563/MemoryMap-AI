# The agent and skills reform — a dev plan

> Companions: [ROADMAP.md](../ROADMAP.md) · [HANDOVER.md](HANDOVER.md) ·
> [UI_MODERNISATION_PLAN.md](UI_MODERNISATION_PLAN.md) (the UI half of the same
> instruction) · [ANALYSIS.md](ANALYSIS.md) · [BACKLOG.md](BACKLOG.md)

## The instruction, verbatim

> the way skills work is waaayyy too strict on smaller models. as in I ran a
> skill and it ran no tools, the blinking cursor bubbles at the end of the text
> stayed at the end of each paragraph and didnt disappear. the models often
> dont even properly complete a step before they are prompted for the next
> step. its an absolute mess. the whole system needs a reform.

And, on how a run is surfaced:

> also make a better way to view and access agent model activity and logs that
> appear in the agent activity toast panels then how they appear now, they just
> spawn in and its a bunch of text dump in your face and just gets annoying. it
> should still be accessible though. also idk if tool calls actually show in the
> chat rn.

The caret half of that first report is **fixed** (v0.2.2: a finished answer
step drops `is-streaming` when the next one starts). Everything else here is
open.

## What the code actually does today

`src/memorymap/ai/skill_runner.py` (466 lines) runs a skill as a fixed list of
prose steps. Per step it opens a tool loop with a round budget, then closes the
step on one of five outcomes: `done`, `stalled` (ran out of rounds), `failed`
(a tool errored and there was no answer), a no-op (`not answer and not
ran_any_tool`), or an Ollama-unreachable stop. Only a truncated slice of the
step's own answer is carried into the next step's history.

Three structural properties explain every symptom in the report:

1. **A step is a turn, not a goal.** The runner decides a step is over when the
   model stops emitting, not when the step's *objective* is satisfied — so a
   small model that narrates ("Here is the result of step 2…") without calling
   anything is treated as having completed the step. That is exactly "it ran no
   tools" and "dont even properly complete a step before they are prompted for
   the next step".
2. **The step list is authored for a capable model.** Steps are written as
   compound instructions ("read related notes and report the ones that can't
   both be right"), which a 4B model reads as a request for prose. There is no
   per-step declaration of *what must be true when this step is finished*.
3. **Only prose crosses the step boundary.** Tool results are summarised into
   the next step's history as text, so a step that must act on "those notes"
   gets a sentence about them rather than their ids.

## The reform, in phases

### Phase A — a step has a contract (1 session)

Give each step an explicit, machine-checkable completion condition, and stop
advancing without it.

- Extend the skill schema with, per step: `expects` (one of `tool_called`,
  `notes_changed`, `answer_only`), optional `tools` (the ones that satisfy it),
  and `retries` (default 2).
- The runner checks the contract before advancing. A step whose contract is not
  met is **re-prompted**, not skipped, with a short, literal nudge naming the
  tool it was supposed to call — the single highest-yield change for small
  models, and the one the report is really asking for.
- After `retries`, the step is marked `stalled` as it is today. Never silently
  `done`.
- Carry structured state, not prose: a `state` dict per run (`note_ids`,
  `tags`, `last_tool_result`) that the next step's instruction can reference by
  name, so "those notes" resolves to ids.

### Phase B — small-model mode (1 session)

- **One tool per step, offered explicitly.** When the model has fewer than N
  parameters (or the user ticks "small model mode"), send only the tools that
  step's contract names, not the whole set. The tool-count work already in
  Settings → "How many are offered at once" is the same idea one level down.
- **Rewrite the built-in skills into atomic steps.** Every built-in step that
  contains "and" becomes two. Measured target: no built-in step names more than
  one tool.
- **A worked example in the prompt**, per step, showing the exact call shape.
  Small models copy structure far more reliably than they follow description.
- Verify against a real local model — this is the standing caveat in CLAUDE.md
  and the reason this phase cannot be called done from tests alone.

### Phase C — the run as a readable object (1 session)

This is the "text dump in your face" half.

- **The activity panel becomes a run list, not a log.** One row per run: skill
  name, step *k* of *n*, a progress bar, state. Collapsed by default.
- **Opening a row shows the steps**; opening a step shows its tool calls and
  their results. Three levels, each collapsed until asked for — the same shape
  the chat transcript already uses for Thinking.
- **The full log stays one click away**, unchanged, for when it is needed.
- Toasts announce only *start*, *finished* and *failed* — never per-step
  chatter. (The mute and "Panel only" switches are already honoured as of
  v0.2.2.)
- **Verify tool calls render in the chat transcript.** `toolChip()` exists and
  `agent-step step-tool` is styled; whether every path reaches it was not
  confirmed this session. Check the plain-chat tool path as well as the agent
  and skill paths.

### Phase D — recovery

Built, 2026-09-13: see HISTORY.md, "Moved from the plans, 2026-09-13". Two of
the three were already standing when the phase was opened (resume, and the
one-sentence reason on a stalled step); the third, editing a step and running
just that step, is `skill_only_step`/`skill_step_text`.

**Its gate, 2026-09-20: `tests/test_skills_evals.py`,** four `evals` tests
run against a real local model through `scratchpad/llama-dev.sh`
(WORLD_CLASS_PLAN 9) and skipped without one, beside a fifth test that needs no
model and holds the seam in place. Record, with the run that judged them, in
HISTORY.md, "Moved from the plans, 2026-09-20".

**Still open in this phase:** nothing in the mechanism, which the gate found
sound. What is left is breadth, and it belongs to WORLD_CLASS_PLAN 9 rather
than here: one model, one skill and one quantisation have been through this
gate, and the rest of CLAUDE.md section 4's list (concurrent tool calls at
index 1 and beyond, Ollama's native tool-call dialect) still has no eval of
its own.

**And one measurement this gate produced, which is not a bug and is worth
keeping:** on Qwen2.5-1.5B-Instruct Q4_K_M, a run of the five-step "Auto-tag
my notes" stalled on **step 1**, whose contract is one `list_tags` call, with
that tool the only one offered and a worked example in the prompt (Phase B's
small-model mode, working as specified). The runner did the right thing, it
said which contract failed rather than ticking the step, which is the
acceptance line. What it says about the reform is that at 1.5B the remaining
gap is the model, not the scaffolding: the next thing worth measuring is the
same run at 3B and 4B, which is the size Phase B was written about.

## The harness does the work the model is worst at: decided 2026-09-21

The owner, after being shown a prompt patched to teach a model what day it
is: "that's bad harness design. the harness and skills need to be flawless.
for all ai features, they need to be lightweight and insanely good, fast,
good quality, not too context heavy and more."

He is right, and the codebase convicts itself. **This app already owns a
deterministic time resolver and does not use it where it matters most.**
`entry/timewords.py` turns "tonight", "next Friday" and "in three days" into
real instants with regular expressions and arithmetic against the user's own
clock, and its own docstring explains why it is deterministic: it runs on
every note saved, including with no model running. `ai/reminder_parser.py`
does the same job for a typed reminder. And yet `set_reminder`, the tool the
model calls, takes a raw `due_at` and does `datetime.fromisoformat` on it, so
the single place where a small model is weakest, date arithmetic, is the one
place the harness insists the model do it alone.

The result is in the owner's transcript: asked for a reminder two hours
before midnight, the model reasoned "midnight for today, September 21st, is
2026-09-22T00:00, two hours before midnight is 2026-09-22T22:00", keeping the
midnight's date and changing only the time, and set the reminder for the
wrong night.

**The rule, which is what this section exists to state.** A tool argument is
either something only the model can supply, which is intent, or something the
app can compute, which is a fact. Intent belongs in the schema. A fact the
app can compute does not, and asking for it converts a deterministic answer
into a probabilistic one. "Remind me two hours before midnight" is intent;
`2026-09-22T22:00` is a computation, and the app is better at it than any
model it will ever run, for free, offline, every time.

Three consequences, each of which also makes the prompt lighter, which is the
owner's other point:

1. `set_reminder` takes a phrase and resolves it with `timewords`, keeping
   the ISO field as an escape hatch for a model that genuinely has one. Every
   other tool taking a computed value is found and given the same treatment;
   two take an ISO date-time today.
2. The prompt stops teaching arithmetic. The weekday and week-ahead lines
   added on 2026-09-21 are **interim**, worth their 245 characters only until
   the tool stops needing them, and they come out in the same commit that
   lands 1. A prompt that grows every time a model gets something wrong is a
   prompt that will keep growing.
3. A skill's steps get the same audit. A step that asks the model to compute
   something the app knows is the same fault at a larger scale, and skills
   run unattended, where a wrong answer is not caught by the person reading
   it.

**Gate.** A test that asks for a reminder in the shapes people actually use,
"two hours before midnight", "Friday night", "tomorrow morning", with a fake
model that returns only the phrase, and asserts the resolved instant. It must
pass with no model reachable at all, which is the proof that the arithmetic
left the model.

**Not verified.** How many other tool arguments are computations rather than
intent: two take an ISO date-time, and the rest of the surface has not been
read with this question in mind. That audit is the first step.

## Decisions made

This plan had no decisions section, which standing order 3 says every plan
has. One decision, recorded on 2026-09-20 so it is not remade:

1. **A real model reaches the tests through two environment variables, not a
   pytest option.** WORLD_CLASS_PLAN 9 guessed at `pytest -m evals --real`. A
   custom option needs a `conftest` hook that every run of the suite then
   carries, and it cannot say *which* model answered. `MEMORYMAP_EVALS_URL`
   and `MEMORYMAP_EVALS_MODEL`, read at import time by the eval module, need
   no plugin, name the model in the failure message, and make "every eval
   skipped" the default rather than a flag somebody has to remember not to
   pass.

## Acceptance

- ~~A five-step built-in skill run against a small local model completes every
  step or reports precisely which contract failed, no step marked done without
  its contract met.~~ **Gated 2026-09-20** by
  `tests/test_skills_evals.py::test_no_step_is_ticked_without_its_contract`,
  green against Qwen2.5-1.5B-Instruct Q4_K_M. Still to run at 3B and 4B.
- The activity panel opens on a run list, not a wall of text.
- Tool calls are visible in the chat transcript for all three paths.

## Built — Phases A and B, backend only

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", AGENT_SKILLS_REFORM.md) on 2026-09-09: a plan holds open work only.

## Built — Phase C, the run as a readable object

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", AGENT_SKILLS_REFORM.md) on 2026-09-09: a plan holds open work only.
