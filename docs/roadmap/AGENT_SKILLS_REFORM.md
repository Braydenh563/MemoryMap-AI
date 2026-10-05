# The agent and skills reform, a dev plan

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
   model stops emitting, not when the step's *objective* is satisfied, so a
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

### Phase A: a step has a contract (1 session)

Give each step an explicit, machine-checkable completion condition, and stop
advancing without it.

- Extend the skill schema with, per step: `expects` (one of `tool_called`,
  `notes_changed`, `answer_only`), optional `tools` (the ones that satisfy it),
  and `retries` (default 2).
- The runner checks the contract before advancing. A step whose contract is not
  met is **re-prompted**, not skipped, with a short, literal nudge naming the
  tool it was supposed to call, the single highest-yield change for small
  models, and the one the report is really asking for.
- After `retries`, the step is marked `stalled` as it is today. Never silently
  `done`.
- Carry structured state, not prose: a `state` dict per run (`note_ids`,
  `tags`, `last_tool_result`) that the next step's instruction can reference by
  name, so "those notes" resolves to ids.

### Phase B: small-model mode (1 session)

- **One tool per step, offered explicitly.** When the model has fewer than N
  parameters (or the user ticks "small model mode"), send only the tools that
  step's contract names, not the whole set. The tool-count work already in
  Settings → "How many are offered at once" is the same idea one level down.
- **Rewrite the built-in skills into atomic steps.** Every built-in step that
  contains "and" becomes two. Measured target: no built-in step names more than
  one tool.
- **A worked example in the prompt**, per step, showing the exact call shape.
  Small models copy structure far more reliably than they follow description.
- Verify against a real local model, this is the standing caveat in CLAUDE.md
  and the reason this phase cannot be called done from tests alone.

### Phase C: the run as a readable object (1 session)

This is the "text dump in your face" half.

- **The activity panel becomes a run list, not a log.** One row per run: skill
  name, step *k* of *n*, a progress bar, state. Collapsed by default.
- **Opening a row shows the steps**; opening a step shows its tool calls and
  their results. Three levels, each collapsed until asked for, the same shape
  the chat transcript already uses for Thinking.
- **The full log stays one click away**, unchanged, for when it is needed.
- Toasts announce only *start*, *finished* and *failed*, never per-step
  chatter. (The mute and "Panel only" switches are already honoured as of
  v0.2.2.)
- **Verify tool calls render in the chat transcript.** `toolChip()` exists and
  `agent-step step-tool` is styled; whether every path reaches it was not
  confirmed this session. Check the plain-chat tool path as well as the agent
  and skill paths.

### Phase D: recovery

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

Built, the audit included, 2026-10-05: moved to HISTORY.md, "Moved from the
plans, 2026-10-05 (the harness does the arithmetic)". The rule stands as the
decision: a tool argument is intent (the model's) or a fact the app can
compute (never asked of the model).

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
- ~~The activity panel opens on a run list, not a wall of text.~~ Built in
  Phase C (HISTORY.md, "Built: Phase C").
- ~~Tool calls are visible in the chat transcript for all three paths.~~
  Built in Phase C: plain chat, agent mode and a skill run each draw their
  chips (HISTORY.md, "The three paths, verified for real").

## Built: Phases A and B, backend only

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", AGENT_SKILLS_REFORM.md) on 2026-09-09: a plan holds open work only.

## Built: Phase C, the run as a readable object

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", AGENT_SKILLS_REFORM.md) on 2026-09-09: a plan holds open work only.

## Placed from INBOX, 2026-10-03 (INBOX 268)

268. **Mid-work drop, 2026-09-20, verbatim (the owner), with two
    screenshots.** "what is the difference between the exe and msi installer??
    also Cut off after 3 skill steps with barely any tool calls and skills are
    just messy, overcomplicated, not built well so the ai doesn't have all the
    things it needs to complete the actions, maybe to rigid?? Idk but skills
    are just a mess and only semi work. also the empty minimap goes behind the
    top bar and sits right in the corner with no gap. the mini map probably
    shouldnt even appear when the graph is empty."
    The skill screenshot is "Reorganise my categories": steps 1 to 3 ticked,
    the model wrote a proposal and stopped; steps 4 to 9 (the ones that
    actually change anything) never ran. Three things: (1) a skill run that
    stops after the read-only steps, (2) the skill format itself, which the
    owner reads as over-specified and under-supplied, (3) the minimap on an
    empty graph. Decided with the owner the same day: Windows gets an `.msi`
    built with WiX, unsigned for now (an unsigned MSI raises the same
    SmartScreen prompt an unsigned `.exe` does; only an Authenticode
    certificate removes it), and the idle memory work is lazy imports rather
    than idle suspend. Open.
    **Checked 2026-09-23.** (3) built: an empty graph lays the minimap out of
    the way (`graph.js`, the comment quoting this entry;
    `scratchpad/ui-sweeps/graphminimap.js`). (1) and (2) are
    AGENT_SKILLS_REFORM's, whose Phase D was verified against a real small
    model on 2026-09-20; what that plan still holds is its evals breadth.

## Harness robustness, 2026-10-04 (INBOX 527)

The owner, verbatim: "use the available agentic harness skills to make sure
the agentic harness is world class and unbelievably robust, good at its job,
capable and more" / "just improve and refine the agentic harness to make sure
it is the best the world has ever seen". And: "does the ai know that it can
have images in its response??"

**How it was measured.** A real model this time, not only fakes:
Qwen2.5-1.5B-Instruct Q4_K_M under llama-server `--jinja` (the dev build in
`/tmp/memorymap-llama`), four contended cores, 20 to 100 s a turn.
`tests/test_harness_evals.py` (`evals`; tool choice, finishing, argument
validity, picture placement over ten everyday requests),
`scratchpad/harness_probe.py` (one turn printed: tools offered, calls,
answer), `scratchpad/harness_argmeasure.py` (no model: argument errors,
coercion, malformed JSON). The built record, with every before and after, is
in HISTORY.md, "Moved from the plans, 2026-10-04 (the harness)".

**Ranked defects, highest impact first.** All sixteen are fixed; the rows
stay here only as the audit's index, one line each.

| # | Defect | Where | Evidence |
| --- | --- | --- | --- |
| 1 | A small model's toolbox held one write (`create_note`) whatever was asked | `agent._prepare_turn` | 1.5B, "Pin my dentist note": no `pin_note` offered, wrote a duplicate note, then "has been created and pinned" |
| 2 | A reminder's date-time without an offset was stored as UTC | `tools._set_reminder` | 9:00 fires at 19:00 at UTC+10 |
| 3 | Reminder arithmetic left to the model (decided 2026-09-21, unbuilt) | `set_reminder` schema, `TOOLS_GUIDE` | "two hours before midnight" a day out (owner's transcript) |
| 4 | No matching note was told to the model as an empty notebook | `agent.build_agent_messages` | 1.5B with four notes: "There are no notes in your notebook" |
| 5 | Malformed tool JSON silently became `{}` | `provider.normalise_tool_calls` | 0 of 5 ordinary slips read |
| 6 | No argument check before a handler; errors named nothing | `tools.execute_tool` | 11 of 31 named the missing parameter; `pin_note` read "false" as true; `{"id": 1}` failed |
| 7 | A claimed act with no call got a heads-up and no second chance; the passive voice was missed | `agent.run_agent`, `unsupported_claims` | 1.5B: "I've made a new note for you", no call |
| 8 | A long reply announcing an act was never nudged | `agent.announces_unacted_tool` | 1.5B wrote the note out as markdown, then "I will call the tool" |
| 9 | Running out of rounds ended with no answer | end of `run_agent` | a small model, capped at four rounds, said only "I stopped after 4 rounds" |
| 10 | The tools-on prompt never said which notes have pictures | `agent.build_agent_messages` | the owner's question; Chat and Ask had it (526) |
| 11 | The agent's OpenAI-dialect path did not retry a 5xx, and sent `tools: []` | `openai_client.chat_tools_stream`, `_payload` | llama-server answers 503 while a model loads |
| 12 | A tool result over the turn's budget was dropped whole | `agent._dispatch_call` | a 20-note page with 3,000 characters left: nothing read, tools withdrawn |
| 13 | Calls in one reply parked each other; web reads ran in series | `agent._dispatch_call` (the 430 guard) | the second search of "search X and Y" parked; three pages 1.2 s |
| 14 | Schema words a 1.5B misreads | `pin_note`, `tag_note` | unpinned when asked to pin; "I can't tag" with `tag_note` offered |
| 15 | A small model answered most imperatives in prose | first round of `run_agent` | "Make a note", "Remind me", "Tag": no call; with `tool_choice: "required"` llama-server answered `create_note` |
| 16 | "Add X to my Y note" cued no edit tool | `tools.focus_detail` | 1.5B rewrote the note in prose, saved nothing |

**Audited and sound, no change.** Streamed calls by index, an indexless
fragment included (`openai_client._accumulate_tool_calls`); six text dialects
of a call (`provider.extract_text_tool_calls`); doom loops (identical-failure
interception, `MAX_TOOL_FAILURES`, earned rounds, the duplicate-write and
fresh-read interceptions); approval (destructive tools park,
`MAX_PARKED_CONFIRMS`, `undo` on every change event); injected text fenced
(`fence.fence_result`); the window budget (`context.plan`) and its log lines;
a run's token and time budget (`ai/budget.py`); Stop closes the generator and
the stream with it. The plan tracker exists for `make_plan` and skills
(`chat-agent.js` `startPlan`/`markStep`), and since H1 for every multi-step turn.

**What the real model says now, honestly.** Before (the ten cases): a right
first tool 2 of 10, finished 2 of 10, arguments valid 2 of 2, a picture
placed 0 of 3. After the toolbox and nudges: still 2 of 10 first calls (the
1.5B answers most requests in prose), but the case the harness had made
impossible now runs (`pin_note` offered and called), and a claimed note is
caught and asked for. With the forced first call (the real system prompt and
tools, `scratchpad/harness_forced.py`): 2 of 3 imperatives answered with a
call, `tag_note {"note_id": 1, "add": ["urgent"]}` exactly right, against 0
of 3 unforced. The full ten-case rerun after every change was stopped: on
these cores one turn ("Make a note") ran 948 s to the 2,048-token reply cap
and made no call, the model rambling past the grammar; that cap is H4's.

**Not verified.** Every real-model number is one 1.5B on contended cores; 3B
and 4B were not run (none on disk). Ollama's native dialect and concurrent
calls at index 1+ have no real-model eval. The wrap-up answer and the claim
retry were not looked at in a browser (no UI changed: they are answer text).

**Phases, open (Opus-sized, tests first).**

- **H1 to H3** are built: HISTORY.md, "Moved from the plans, 2026-10-04
  (harness H1 to H3)".
- **H4. Evals breadth.** The same ten cases at 3B and 4B, and the
  required first call measured over twenty imperatives and ten questions,
  with a tighter reply cap on a small model's tool rounds (one ran 948 s to
  2,048 tokens on these cores); Ollama's native
  dialect; two calls in one reply on a real model; picture placement over
  ten tries. Done when: each has a number in this section.

  **Measured 2026-10-04, Qwen2.5-3B-Instruct Q4_K_M** (llama-server
  `--jinja`, started in under two minutes with `scratchpad/llama-dev.sh
  serve`; four contended cores, 4 to 400 s a round):
  - The ten cases (`scratchpad/harness_probe.py`): a right first tool 9 of
    10 ("Make a note" opened with `get_current_time`, then made the note),
    finished 10 of 10, every turn ended in
    words. Two of them then made a copy of the note they had just pinned or
    edited (one with the prompt's fence markers in it): fixed, a copy is now
    refused (`agent._copies_what_was_read`).
  - The required first call (`scratchpad/harness_firstcall.py`): the rule
    forces 20 of 20 imperatives and 0 of 10 questions; forced, a right first
    tool 14 of 20 (3 of the misses were `save_user_preference`, now offered
    to a small model only when the request is about the user); unforced
    questions 10 of 10.
  - Two calls in one reply: 2 of 20 imperatives and 1 of 5 two-part requests
    ("Make a note ... and remind me ..." gave `create_note` and
    `set_reminder` in one reply, both right).
  - Picture placement: 0 of 3 in the eval before the H3/H4 picture fix (one
    probe placed the note on a whiteboard instead); 5 of 5 after, each time
    as the note's own `![alt](/media/...)`, which the bubble draws as an
    image (checked in the browser), never as `[picture N]`.
  - The reply cap (H3) never fired at 3B: no tool round wrote past 2,400
    characters (the largest round was 129 tokens).
  - **Not run:** 4B (only 1.5B and 3B on disk; at 3B a full ten-case pass took
    about 50 minutes on these cores, so a 4B pass was left for a quieter
    machine); Ollama's native dialect (no Ollama binary in the sandbox;
    installing one was not attempted); ten picture tries (five were run).
  - **The first round, fixed 2026-10-04** (a forced round took a harmless
    read, a question was offered writes): HISTORY.md, "Moved from the
    plans, 2026-10-04 (the first round)". 3B, forced first rounds of the
    eleven note-targeting imperatives, two tries each: a right first tool
    17 of 22 before, 20 of 22 after.
  - **The two misses that were left, fixed 2026-10-05** (fake transport):
    HISTORY.md, "Moved from the plans, 2026-10-05 (the first round, second
    pass)".
  - **A real 3B pass over them, 2026-10-05** (whole turns through
    `/chat/stream`, `scratchpad/harness_probe.py`, llama-server `-t 2` on
    four cores at load 14 to 22, 2 to 12 minutes a round): seven imperatives,
    a right first tool 6 of 7 and a turn that ended telling the truth 5 of 7.
    The three faults it showed are fixed: HISTORY.md, "Moved from the plans,
    2026-10-05 (H4, the 3B pass)". Re-run on those three after the fixes:
    filing right and said right; the move read the notes and asked before
    editing (no false claim); the pin right first, then the server was
    killed by the sandbox's memory limit mid-answer, so its ending was not
    measured.
  - **Brief 13's evals, built and run once**: `tests/test_skill_evals.py`
    (`evals`), the seventy-note loose-ends fixture with eight planted and the
    zero-invalid-calls count over the built-in skills. The 3B named 2 of 8
    loose ends in 55 minutes, having written `list_notes({...})` into prose
    instead of calling it; that shape is recovered for a read now (CHAT_PLAN
    Phase 4 has the run). The re-run after the fix did not start: the model
    server had been killed by the sandbox's memory limit (eight agents).
  - **Still open**: 4B (none on disk); Ollama's native dialect on a real
    Ollama (no binary; the dialect now runs over a socket against
    `scratchpad/fake_ollama_server.py`, WORLD_CLASS_PLAN row 19); the
    built-in skills pass, hours on these cores.


## Placed from INBOX, 2026-10-05 (OPEN.md triage)

- **A skill run's own Undo** (brief7-event-log; Brief 13). `POST /events/undo`
  and the Recent activity widget's "Undo what Atlas did" are built. Brief: the
  run's stop line in Chat gets an Undo that calls it with the run's actor and
  first event id; board items stay "not undoable", said in the row. Opus, S.
