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

### Phase D — recovery (½ session)

- Resume from a stalled step (the state is already recorded).
- Edit a step's text and re-run just that step.
- "Why did this stall?" — the contract that was not met, in one sentence.

## Acceptance

- A five-step built-in skill run against a 4B local model completes every step
  or reports precisely which contract failed — no step marked done without its
  contract met.
- The activity panel opens on a run list, not a wall of text.
- Tool calls are visible in the chat transcript for all three paths.

## Built — Phases A and B, backend only

**What landed.**

- **A step has a contract.** A skill step may now be a plain string (unchanged,
  and every saved skill and ad-hoc plan is one) or a dict with `expects`
  (`tool_called` | `notes_changed` | `answer_only`), `tools` and `retries`.
  `skills.normalise` validates it and returns a canonical `step_specs` list
  **beside** `steps`, which stays a list of strings — `plan.steps` goes
  straight into `<li>.textContent` and the skill editor joins it into a
  textarea, so changing that shape would have broken the plan card and the
  settings screen. Contracts survive a re-`normalise`, which `catalog()` does
  to everything stored.
- **The runner enforces it.** `skill_runner` checks the contract before
  advancing; a step that has not met it is re-prompted with a literal nudge
  naming the tool ("You did not call \`list_tags\`. Call it now…"), up to
  `retries` (default 2), emitting `{"type":"step","state":"retrying",
  "attempt","of","reason"}` each time. Out of attempts it is `stalled`, never
  `done`. The existing states, and the existing terminal branches (offline,
  out of rounds, a failure with no answer, an empty turn), are untouched — an
  empty turn is deliberately still `failed` rather than retried, because a
  model that produced nothing is a different failure from one that narrated.
- **Structured state across steps.** A per-run `state` (`note_ids`,
  `document_ids`, `tags`, `touched`, `last_tool`, `last_tool_result`) is filled
  from tool events and change events, appended to every later step's
  instruction as "State so far — notes #3, #9; tags: …", and returned on the
  `result` event.
- **Small-model mode.** `run_skill(small_model=…)`; `None` means auto, which
  reads the parameter count off the chat model's own name
  (`model_manager.parameter_count`, `< 8B` is small) — free, offline, and
  provider-agnostic, where `/api/show` is Ollama's alone. **A name with no size
  in it (`llama3.2`, `mistral-nemo`) means "no idea", and no idea means off**:
  narrowing a capable model's toolbox on a guess is the worse mistake. In that
  mode a step is offered only the tools its contract names (falling back to the
  skill's list), plus a one-line worked example built from the tool's own JSON
  schema (`tools.call_example` — generic, never a per-tool table, so it cannot
  go stale when an argument is renamed).
- **The built-ins are atomic.** Every shipped step names at most one tool and
  declares an `expects`; steps that did two things are two steps. Two lint
  tests hold that. `notes_changed` is used once on purpose (Auto-tag's tagging
  step): a contract that demands a change stalls a run over a notebook with
  nothing to change, which is honest but is not what somebody wants to read, so
  steps that may legitimately be a no-op are `answer_only` and say so in their
  own text.
- **The setting.** `small_model_mode` (`auto` | `on` | `off`, default `auto`)
  on `PUT`/`GET /preferences`, read by the chat route and passed to the run.
  Backend only — no toggle in the settings UI yet; the settings screen is
  hand-written HTML rather than schema-driven, so surfacing it is a frontend
  change and belongs with Phase C.

**What was NOT verified, and cannot be from here.**

- **Whether any of this makes a real small model behave.** Every test runs
  against the fake transport, which narrates or calls exactly what a script
  tells it to. That the nudge is sent, names the right tool, and that a call on
  the second attempt is accepted is proven; that a 4B model *responds* to the
  nudge by calling the tool is exactly the standing caveat in CLAUDE.md, and
  the acceptance criterion above ("a five-step built-in against a 4B local
  model") is still open.
- **The worked example's wording.** Whether small models copy this shape better
  than another phrasing is a claim from the research, not a measurement.
- **The contract choices in the built-ins.** Which steps ought to be
  `tool_called` versus `answer_only` is a judgement made by reading each step;
  it has not been watched against a real run over a real notebook.
- **Nothing in the UI.** No frontend file was touched. The new `retrying` state
  and the `step_specs` / `state` / `small_model` fields on the plan and result
  events are additive and ignored by today's `app.js`; how a retrying step
  *renders* is Phase C and was not looked at in a browser.

## Built — Phase C, the run as a readable object

Driven in a real Chromium against a real socket, not reasoned about: the app
ran on `localhost:8792` pointed at `scratchpad/fake_openai_server.py` (a stdlib
`http.server` speaking the OpenAI `/v1` dialect, tool calls included) and was
driven by `scratchpad/ui-sweeps/phasec.js`. Every claim below is something that
script printed or measured.

**What landed.**

- **The activity panel is a run list.** `#agent-monitor` was a live tail of
  every `memorymap.*` log record, opened by the arrival of a line — one agent
  turn writes its context budget, its prompt composition and its tool budget,
  which is the reported "bunch of text dump in your face". It is now one row
  per run, **collapsed**: name · step *k* of *n* · a thin progress bar ·
  running/done/failed/stalled/paused. Opening a row shows its steps; opening a
  step shows its tool calls with their arguments and results. Three levels.
- **It is the chat transcript's own components, not a fourth one.** A run row
  is `details.agent-step.step-plan` (the skill plan card), a step is
  `details.agent-step.step-thinking` (the Thinking disclosure), a call is
  `toolChip()`. The new CSS is a container, a three-part summary line and the
  colours for one state — roughly 60 lines in
  `frontend/css/07-whiteboard-misc.css`, all on the token scale.
- **The full log stays one click away**, unchanged: "Show log" in the panel's
  header swaps the run list for the same lines, same 50-line cap, same
  formatting. Measured after a three-run session: 20 log lines still there.
- **Log lines no longer open the panel; runs do.** And not every run: a chat
  run is drawn step by step in the transcript already, so it opens the panel
  only when the reader is on another tab. A background job always does.
- **A way back in.** `#status-activity` in the status bar ("3 runs") appears
  once a run exists and toggles the panel — needed precisely *because* log
  lines no longer open it, or a finished run would be unreachable the moment
  the idle timer closed the panel.
- **Background jobs are runs too.** `/tasks` already reports label, detail and
  a fraction, so an autonomous pass gets a row with a real progress bar
  alongside the chat's runs, and its row ends when the job leaves the list.
- **Toasts.** Measured over a full skill run (three steps, two contract
  retries, a stall, six tool calls) watched in the Chat tab: **zero toasts**.
  There were no per-step toasts to remove — the per-step noise was the panel
  opening itself on log lines, which is what changed. One notice was *added*
  and it is the only one a chat run raises: when a run ends while the reader
  is on another tab, `agentActivityNotice` says "Finished: …" / "Stopped: …".
  Both switches were re-checked live: with "Panel only" and with mute, that
  notice raises no toast and is still recorded in the notifications centre.
- **`retrying` renders in both places, in the same words.** Caught live, twice,
  in the same run: the chat's plan card reads "Find the notes I saved in the
  last 7 days. — retrying, attempt 2 of 3 — this step had to call list_notes
  and it wasn't called", and the panel's step row reads the same with its
  number. `stepStateWords()` is the single source of that sentence.
- **The small-model toggle.** Settings → Tools it can use → "Small model mode",
  a three-way Auto/On/Off select beside "How many are offered at once", bound
  to the `small_model_mode` preference Phase B added and nothing could reach.
  Round-trip measured: `off` → select `on` → `GET /preferences` says `on` →
  re-render of the section still says `on`.

**The three paths, verified for real (Phase C's own acceptance criterion).**

All three render tool calls in the chat transcript. Counted as
`.tool-chip`/`.tool-chip-wrap` elements inside `#chat-messages`:

| Path | Result |
| --- | --- |
| Plain chat (Ask) with tools enabled | 1 chip — `ph:list Listed your tags`, inside a "Finished 1 step" group |
| Agent mode | 2 chips, one per round |
| A built-in skill run (*Summarise my week*) | 5–8 chips, filed under the plan card's steps |

**Nothing needed fixing on any of the three** — `toolChip()` was already
reached by all of them. That was the open question in the Phase C plan
("whether every path reaches it was not confirmed"), and the answer is yes.

**Half of CLAUDE.md's standing caveat is now closed.** The stand-in server
streams tool calls the way OpenAI does — index 0 with the `id` and
`function.name` on the first fragment only, then `function.arguments` split
across several chunks carrying nothing else — over a real socket, and
`OpenAICompatClient.chat_tools_stream` / `_accumulate_tool_calls` reassembled
them correctly on every run: the app called `list_tags`, `search_notes`,
`list_notes` and `get_note` with parsed arguments, and a run in small-model
mode completed all three of its steps. **Covered**: `/v1/models` discovery,
`POST /models/provider` switching the live app, non-streaming and streamed
tool calls, fragment reassembly, a tool result going back up as a `tool`
message, and the second round answering in prose. **Still not covered**: real
inference (the stand-in returns a canned answer and a scripted call, not a
model's own output), two concurrent tool calls in one turn (index 1+), and
Ollama's native dialect, which has its own path.

**What was NOT verified.**

- **A real small model.** Unchanged from Phase B: whether a 4B model responds
  to a nudge is still the standing caveat, and the acceptance line "a five-step
  built-in against a 4B local model" is still open. What is now proven is the
  *machinery* around it — the retry is emitted, worded and rendered, and
  small-model mode narrows the toolbox enough that a stand-in which always
  calls the first tool it is offered completes every step.
- **Dark theme and narrow widths.** Every measurement above was taken at
  1440×900 in the light theme. The panel's own mobile rule
  (`max-width: 600px`, which shrinks the log to two lines) was not re-checked
  against the run list, and neither was `body.has-agent-monitor`'s scroll
  buffer, which is sized against the panel's old height.
- **A background job's row end-to-end.** The rows are built from `/tasks`
  payloads and the code path is shared with the chat runs, but no autonomous
  pass or model download was run in the browser to watch one appear, progress
  and finish.
- **The audit log and Phase D.** Resume-from-stalled, editing a step and
  re-running it are Phase D and untouched. The panel keeps twelve runs for the
  session and nothing more — reopening the app forgets them, by design, since
  Library → AI Skills holds the real history.
