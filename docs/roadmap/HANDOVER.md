# HANDOVER

## 2026-09-08, the third night: read this block first, whoever you are

**If you are the Opus continuation of the Fable session** (same session,
same branch, the owner's Fable window closed): the standard is the one
in `SESSION_BRIEFS.md` §0 and it does not drop. Measure before claiming,
tests first, one commit per step, push after every merged batch, no
em-dashes, report in five lines. When unsure, the decision is already
written in `WORLD_CLASS_PLAN.md` or a plan file; find it, do not remake
it.

### If Opus is the orchestrator (no Fable available)

This is the expected case for most of the week. Everything Opus needs is
already written; the rule is to work it, not to redesign it.

1. **Open with:** read `CLAUDE.md`, this block, `ROADMAP.md`'s opening
   table, the "Now" line below, `INBOX.md`, then the file the Now line
   names. Nothing else before the first commit.
2. **Order of work** is the standing orders' order: INBOX bugs (Sonnet
   for the named-fix ones, Opus for the design ones), `agent-remaining/*.md`
   (Opus), `SESSION_BRIEFS.md` Briefs 2 to 15 (by the specialty split),
   then the plan phases in ROADMAP order (TIMELINE, WHITEBOARD, CHAT,
   DOCUMENTS, GRAPH, MINDMAP), each against its plan's gates and, for the
   backend, its spec tests (remove a strict-xfail marker only when the
   test passes on its own).
3. **Decisions are not remade.** Every plan carries a "Decisions made"
   section; a session that finds itself choosing between two designs
   looks there first, and if the answer is missing, records the question
   in `INBOX.md` under "Design and feature requests" with a one-line
   recommendation and takes the recommendation. Fable's next window
   reviews those entries.
4. **Review is Opus's job too.** Before merging any agent branch: read
   the diff for the four failure shapes in `CLAUDE.md` (a working thing
   rewritten riskier; a feature that never ran; a guard removed; a policy
   silently refusing), run the lint set and the sweep the brief names,
   and refuse a merge whose report has no numbers.
5. **No new plan documents.** There are eleven; a new need becomes a brief
   row in the plan it belongs to, or an INBOX entry. `HANDOVER.md`'s Now
   line and this table are the only status surfaces; keep them true.
6. **Agents:** at most two, by the specialty split below, each with its
   own worktree, port and data dir, committing per step and writing its
   remaining list before it stops.
7. **The hourly check-in** (`send_later`) is re-armed at the end of every
   turn; it carries the standing orders in its prompt, so a session that
   went idle resumes itself.

The opening prompt that does all of this: "Read CLAUDE.md, then the top
of docs/roadmap/HANDOVER.md, and continue."

### PR 144 is done when (the owner's checklist, 2026-09-09 05:30 UTC)

Tick these in order; the PR merges on the last tick. Everything added to
the plans this session (DOCUMENTS Phase 8, MINDMAP §12, GRAPH 6b, INBOX
100 to 104, CHAT and TIMELINE in full) is the next session's, not this
PR's.

- [x] 1. Documents Phase 2 steps 2 to 4 merged (2026-09-09;
      `tests/test_doc_surface.py` carries no xfail marker): the CodeMirror surface is
      the editor, Live as decorations, findings, undo, search, folding;
      `tests/test_doc_surface.py` has no xfail markers left; doctype.js
      under 30 ms; the vendor bundle absent at boot.
- [x] 2. Graph Phase 6 merged: the node panel on the new recipe, measured
      at 1440, 1024 and 390; graph4b.js passes. (Panel 416x439 to 448x348 at
      1440 and 1024, three groups of three to nine buttons in one row,
      shortest control 28 to 36px, no page scroll, and a 362x442 sheet at
      390. Its header and its action footer were fixed later the same day:
      close button back at 0,0 with an ellipsised title, and the actions as
      a centred band 446px wide in a 448px panel.)
- [x] 3. Library image cards and the whiteboard bottom bar and properties
      panel merged (INBOX 52, 56, 64, 65), with their numbers. (Card 651.6
      to 371.8px, font sizes 4 to 3, usage lines 2 to 1, scrim 3.6:1 to
      6.8:1; whiteboard own backgrounds 16 to 1 and 15 to 3, overlapping
      pairs 4 to 0, bar and pill both 46px, surface 0.549 to 0.96 opaque.
      The Arrange group was restructured later the same day into three
      named rows, 192px wide in a 200px panel.)
- [x] 4. The owner's section-A bugs closed or ruled out at head: INBOX 66,
      69, 70, 73, 77, 81, 83, 84, 86, 88, 89, 96 (each fixed and moved to
      HISTORY, or marked "not reproduced" with the measurement). Eleven of
      the twelve are in HISTORY with their numbers. 77 is the exception and
      is half done on purpose: the badge is fixed and measured, the
      per-model context size is the half the entry itself assigns to the
      next session, and INBOX says so. It is the only item left in there.
- [x] 5. The three "not verified in a browser" fixes measured: INBOX 75
      (kebab first click), 82 (settings rows), 91 (chat header), plus
      Ctrl+S and the profile group; errors.js, contrast.js, docks.js,
      touch.js and weight.js green on the head.
      **Where this stands, 2026-09-09.** Ctrl+S is measured and fixed (the
      visible section had no reachable Save button, all six in the document
      laid out at zero height). errors, contrast, docks and touch all passed
      on the merged head. 82 is clean as far as it was checked: two settings
      rows carrying both a field and a button, zero height mismatches, which
      is thin coverage rather than a result. 91 is measured by the wrap
      sweep, which took the answer header from three fragmented lines at
      1280px to two clean rows. 75 is measured now
      (`scratchpad/ui-sweeps/kebabfirst.js`): 58 kebab wraps on the Notes
      tab, the first click opens exactly one menu at 375px tall, the second
      closes it. The earlier probe reported "no kebab found" because it
      looked for `[aria-haspopup]`; the recipe is `kebabMenu()`, which builds
      a `.menu-wrap` around a `.action-menu` and a `smallButton`, so the wrap
      is what to look for. Worth writing down: the same wrong selector would
      fail the same way next time.
      A note on the metric, so the next attempt does not repeat it: counting
      distinct `top` values among a row's children does **not** detect
      wrapping. A `nowrap` row whose children are baseline- or
      centre-aligned reports several distinct tops and has not wrapped. Test
      whether a child's `top` is at or below the first child's `bottom`.
- [x] 5b. The README's screenshots recaptured, last of all. The owner:
      "I think the screen shots on the readme need an update from all the ui
      changes." Eight of them in `docs/images/` (chat, dashboard, documents,
      graph, library, notes, reminders, timeline). Capture them only once
      every UI batch has merged: taken mid-session they are stale within the
      hour, which is how they got stale in the first place.
- [x] 6. Mind map previews (INBOX 68) acceptable in the dashboard widget
      and the Library gallery (the board's real shapes at its aspect, no
      inner scrollbar). (Whiteboard card 5 blocks at one size to 5 at four
      sizes with 5 of 5 labels inside their shapes; map card 0 of 6 labels
      inside to 6 of 6, worst contrast 3.82:1 to 4.77:1; dashboard
      thumbnail 293.2 square to 40.5 square with the widget's body no
      longer scrolling, where it was 602 against 320.)
- [x] 7. The full suite green on the final head (the one local run this
      PR gets; CI covers every push in between); ruff and CodeQL green;
      **Run, 2026-09-09:** `PYTHONPATH=src .venv/bin/python -m pytest
      tests/` on the head, exit code 0, no F or E in the progress line, the
      xfails still xfail. Worth knowing before the next reader thinks the
      run was cut short: with `addopts = -q` from `pytest.ini`, the totals
      line does not survive being read out of a redirect on a run this
      long, while a single-file run prints it normally. The exit code is
      the result. All sixteen CodeQL review threads on the PR are resolved,
      the sweeps (errors, docks, contrast, touch) pass on the head, and
      the branch is mergeable.
      **Note, 2026-09-09:** `.github/workflows/ci.yml` runs `python -m
      pytest` with no selection, so CI *is* the full suite, on every push,
      and it has reported no failing suite on every head today. CodeQL has
      come back green on each one it has finished. The local run this item
      asks for is therefore a second opinion rather than the only evidence,
      which is exactly why the owner's "not as routine" rule costs nothing.
      no open CodeQL threads; the branch mergeable.
- [x] 8. Documentation: every Built block of the merged phases in
      HISTORY (the lint holds it), INBOX holding open items only, the
      README's numbers passing `test_readme_freshness.py`, CHANGELOG's
      "Since 0.2.2" carrying one line per merged item, this Now line
      rewritten as "PR 144 merged; next: Brief 18 section A onward".
- [ ] 9. The owner has run the updated build once: `start-desktop.bat`
      launches, the splash reads right, the glass frosts the art.

Then: tag the release (`__version__` is already 0.3.0, a minor bump by
RELEASING.md's rule: new features, not fixes; rename "## [Unreleased]" to
"## [0.3.0] - <date>" in both CHANGELOG copies, `git tag v0.3.0`, push the
tag, watch the release workflow), merge PR 144, restart the branch from main for the next session
(the branch rule at the top of the session prompt), and open with "Read
CLAUDE.md, then the top of docs/roadmap/HANDOVER.md, and continue".

### Fable's working notes for Opus (2026-09-09 05:10 UTC)

What made this session's fixes land first time, written down so the method
survives the model change. Use it verbatim.

**The method, per report.** (1) Find the code by grep before reading any
file whole; the sites below are already found. (2) Write a 20-line
Playwright probe (`scratchpad/ui-sweeps/lib.js` `boot()`, then
`page.evaluate` returning numbers: rects, computed styles, counts) and run
it against `serve.sh 8784 /tmp/mm-8784`; never screenshot-and-look. (3)
Fix the cause, not the symptom (the shape that recurs here: a handler
re-renders over what it just opened; a rule set on the wrong class; a
value measured while hidden). (4) Re-run the probe, then the lint set,
`node --check`, ruff; errors.js in the background. (5) One commit per
report with the measured numbers in the message, the INBOX line marked
"Fixed" with the numbers, push. (6) Say "not verified" when a browser did
not confirm it. Never widen a lint; a failing lint found something.

**Where each open section-A item lives** (INBOX number: file, area,
diagnosis):
- 66 lightbox in graph fullscreen: `frontend/app.js` lightbox mount (grep
  `lightbox`), `#graph-card` is the fullscreen element; mount the dialog
  inside `document.fullscreenElement` while it is set.
- 69 agent panel rows: `frontend/app.js` ~35850 (`agent-run-summary`,
  `agent-run-name`); the caret's toggle handler is per-row and lost on
  re-render; delegate it on the panel.
- 70 notifications combobox: the panel's outside-click guard closes on a
  click inside `.select-menu` (enhanceSelect at `app.js` ~18359); exclude
  it.
- 73 mute toggle resets: `frontend/settings.js`, grep `mute`; write the
  value into `prefsCache` before the save round-trip, not after.
- 74 profile panels and Ctrl+S: `frontend/index.html` "About you
  (optional)" group; a `keydown` on `#settings-modal` for Ctrl/Cmd+S that
  clicks the visible section's Save.
- 77 token badge: `frontend/index.html` ~1238 `.chat-subline`; the pill's
  padding is asymmetric and its text is `x% of window`; centre with
  `inline-flex; align-items:center; line-height:1`.
- 81 web links: the answer renderer's link rule (grep `renderMarkdown` in
  `app.js`), accept `<https://...>` autolinks; number web sources after
  the notes in the Sources list.
- 83 Tools paragraphs: `frontend/index.html` Settings > Tools, "How many
  are offered at once" and "Small model mode"; one line each, the rest
  behind `data-help-for` (pattern at index.html ~5321).
- 84 marquee behind objects: `frontend/whiteboard.js`, the selection
  rectangle is drawn on the object canvas; draw it on the overlay canvas
  (the one the guides use).
- 86 zoom popup under dialogs: the zoom indicator's z-index (grep
  `zoom-indicator` in CSS) is below `.modal-overlay`'s; raise it.
- 88 fullscreen graph glass: `:fullscreen .graph-card` paints over
  `--page` with nothing behind it; give it `--modal-bg` on purpose and a
  comment.
- 89 glass sliders: measure `--glass-blur` on `header#top-bar`'s computed
  backdrop-filter, `--glass-opacity` on `.card` background alpha (palette
  override order in `00-tokens-shell.css` 131/628/677), sheen on
  `:root[data-glass-sheen="on"] .card` (3389); the card blur is off unless
  `data-bg-art="on"` (INBOX 49), which is why "blur does nothing" on a
  still page.
- 96 drag without pin: `frontend/graph-canvas.js` drag end (grep `fx =`
  and `gcTogglePin`); on drop set `x/y`, clear `fx/fy`, reheat at
  alpha 0.1; pin only on Shift+drag or the menu.
- 67 gravity: `frontend/graph-worker.js` `tuning()`; `pull` is 0.25x to
  3.25x; if still spread at 100 on the owner's build, raise to 5x and add
  the component ring.

**The two agent briefs**, verbatim, are SESSION_BRIEFS Briefs 19 and 20 so
an agent that dies can be relaunched by anyone with the same words.

**What Opus should not do:** redesign what a plan decided; touch
`documents.js`/`editor.js` while the documents agent runs; merge a report
without numbers; run pkill on uvicorn; install torch; use inline
`style=`; add a glass surface without the `[data-glass="off"]` list.

### Standing orders for this session (whoever the model is)

The owner will say "continue", or paste a batch of issues, possibly
after a usage reset. Either way, without asking anything:

1. **"Continue"** means, now and after every brief is done: read
   `CLAUDE.md`, this block, `ROADMAP.md`'s opening table and `DESIGN.md`
   (token-efficiently: first screens, then only what the next item
   needs); merge any agent worktree that has commits not on the branch
   (table below, recipe below); then take the next unfinished item in
   this order: the owner's flagged items (this block and
   `agent-remaining/*.md`, deferred not dropped), `SESSION_BRIEFS.md`
   Briefs 1 to 15 in order, WORLD_CLASS_PLAN §11's quarter, then
   `ROADMAP.md`'s live list and `BACKLOG.md` top-down by impact and
   quality. Scan for bugs, flaws and stale docs on the way and fix or
   record them. Keep `HANDOVER.md`, `ROADMAP.md` and `BACKLOG.md` true as
   you go. Commit per step, push per batch, five-line reports. Never
   wait for a prompt; never ask permission for work inside the plans.
1a. **The "Now" line.** The first line under "State of the branch" below
   always says what is in flight and what its gate is. Update it when a
   step starts and when it ends. A session that resumes after a pile-up
   reads it before the pile.
1b. **Things the owner drops in mid-work** (a screenshot, a complaint, a
   feature, "X% usage") are not a change of task: finish the step in
   hand, add the new item to the task list with the owner's words, place
   it by impact (a bug in something just built goes next; a new feature
   goes into the relevant plan or BACKLOG with a brief row), and say in
   one line where it landed. The mechanism is `INBOX.md`: append
   verbatim on arrival, triage only at a step boundary, in one pass. A
   usage figure means: commit and push now, then continue more tersely.
   Never finish a step early, never drop quality, never lose the "Now"
   line to the pile: the owner has said this is the recurring failure.
2. **A batch of issues** means: for each one, reproduce it in the running
   app first (Chromium, `scratchpad/ui-sweeps/lib.js`), fix it to the
   standard (measured, a sweep check added where one exists), commit it
   on its own with the owner's words in the message, and push the batch.
   One that cannot be reproduced gets a line saying exactly what was
   driven and what was seen, never "works for me". One that is bigger
   than a fix gets a row in the relevant `agent-remaining` file or a
   SESSION_BRIEFS brief, and the owner is told which.
3. **Agents, by specialty, at most two at once** (the owner's rule):
   **Sonnet** takes the mechanical and the verifiable: lints (Brief 2),
   copy moves and popovers (Brief 4), docs condensation (Brief 14), test
   fixture edits, sweeps, and bugs whose fix is already named in
   `INBOX.md`; **Opus** takes anything with a design judgement in it:
   frontend layout and visual fixes, the one-bar and alignment work, plan
   phases (DOCUMENTS, GRAPH, TIMELINE, WHITEBOARD, CHAT, MINDMAP) and the
   backend moves (Briefs 6 to 13), each against its spec tests
   (`tests/test_events.py`, `test_search_engine_spec.py`,
   `test_harness_verifier_spec.py`: strict-xfail, remove the marker as
   each passes); **Fable**, when available, writes plans and specs,
   reviews merges line by line and root-causes the invisible bugs. Each
   agent works in its own worktree cut from the branch with its own port
   and data dir, commits per step, and writes its remaining list before
   stopping. The orchestrator merges, gates, pushes.
4. **Never stop on a red**: CI, CodeQL and review comments are fixed the
   same hour; the hourly check-in re-arms itself (`send_later`), and the
   subscription on PR #144 stays.
5. **Quality does not drop with the model.** Tests first, measure before
   claiming, no em-dashes, no scope creep, the four failure shapes checked
   in every diff. If a decision seems needed, it is already written in a
   plan file; find it.

### How far each plan actually is (honest, as of 2026-09-08 late)

The owner: "many of the plan and ui redesign and modernisation documents
are only just begun or half done." True; this table is the state.

| Plan | Done | Left |
| --- | --- | --- |
| UI_MODERNISATION_PLAN | Phases 0 to 10 (tooling, mass, components, type and glass, motion, per-surface, states, dock grammar, responsive, the Liquid Glass adoptions) | Phase 11, the phone done properly; the items in `archive/agent-remaining/responsive.md`, `consistency.md` and `docks.md` |
| GRAPH_PLAN | Phases 1 to 6 (canvas and drag, the space, colour rules and groups, utility part one, backend, the node panel) | Phase 4 part two, 6b the minimap, the local pane |
| DOCUMENTS_PLAN | Phases 0, 1 and 2 in full (the chrome, then CodeMirror 6 as the surface: Live as decorations, findings, undo, search, folding) | Phases 3 to 8; `archive/agent-remaining/documents-engine.md` and `documents-batch.md` |
| MINDMAP_PLAN | Phases 1 to 5 and the previews | §12, Coggle-level controls (INBOX 93) |
| AGENT_SKILLS_REFORM | Phases A to C | Phase D (recovery); the verifier and paging inside a step (CHAT_PLAN Phase 4) |
| WHITEBOARD_PLAN | One surface per panel, the Arrange section, the marquee and the export fixes | Phases 1 to 4: the rail and keys, the context bar, the export dialog and handles, the mind map regressions and Tidy |
| CHAT_PLAN | The header and badge, citation numbering, the Sources panel, angle-bracket links (as bug fixes, not phases) | Phases 1 to 4 |
| TIMELINE_PLAN | Audit and plan only | Phases 1 to 4 |
| WORLD_CLASS_PLAN / SESSION_BRIEFS | Brief 1; parts of 3 and 10; Brief 18 section A | Briefs 2 to 15; Brief 18 sections B onward |

### State of the branch (`claude/epic-ramanujan-8xocc0`, PR #144)

**A trap this session paid for, keep it.** In the shared worktree,
`git add <file>` stages the *whole* file, including whatever an agent has
half-written in it. Doing that to `frontend/index.html` committed an
agent's mid-step removal of `#entry-document` without the matching handler
removal in `app.js`, so a top-level `addEventListener` on a null element
aborted the whole of `app.js`: `initAuth` never ran, the lock overlay never
came out of `.hidden`, and the E2E suite failed on
`waitForSelector("#lock-password")` with the element present but hidden 35
times over 15 seconds. The app did not boot at all on that head. Stage by
hunk, or commit only files no agent holds, and run `scripts/gate.sh
--staged`, which exists because of this: it runs the lint set against the
index rather than the working tree. `test_frontend_ids.py` was already in
the lint set and already checks that every `$("id")` exists in the markup;
it passed, because the gate was reading the working tree, where the pair
was still whole. Proven on the same shape afterwards, with the break staged
and the working tree clean: `lints` passed and `staged-lints` failed,
naming the missing id.

**And its twin, learned the same hour, in the other direction.** A staged
file is not yours either: `git add` leaves it in the index, and the next
agent to run a plain `git commit` in the shared worktree takes it. The
`--staged` change above landed inside an agent's commit `3ef6b9b` ("The
line numbers go away with the box they number") for exactly that reason,
which is why that commit also carries `scripts/gate.sh`, `CLAUDE.md` and
this file. The content is right and the attribution is not; rewriting a
shared branch's history to fix that would cost more than it is worth.
**Stage and commit in one step, and never leave the index populated.**
In practice that means `git commit -m ... -- <paths>`, which commits
those paths directly and leaves the index alone, rather than `git add`
followed by `git commit`. It happened three times in one evening before
the habit changed, each time putting the orchestrator's work inside an
agent's unrelated commit: `scripts/gate.sh` went in with a preview
gutter fix, and `ai/learning.py` with a picture-card note. Nothing was
lost either time, and the history now says things it does not mean,
which is its own slow cost when the next session reads it. The same three symptoms in the
console are the signature: one real error, then `X is not defined` and
`Cannot access Y before initialization` from everything declared after it.

## How to proceed after PR 144 (the owner asked, 2026-09-14)

The full answer is `docs/ROADMAP.md`, "How to proceed after PR 144",
rewritten today to 147 lines: the plan table with where each plan stands,
the ordered queue (speed budget H7, the professional-use block BACKLOG
115, `agent-remaining/OPEN.md` surface by surface with each plan's open
phase, UI Phase 11, then WORLD_CLASS_PLAN 18's horizon H1 to H8), and the
rules that do not change. In one breath: every open item now lives in
exactly one of INBOX (the owner's reports), `OPEN.md` (what the agents
left, 134 bullets by surface), a plan's open phase, or BACKLOG; nothing
open lives in HANDOVER or HISTORY. A session starts by reading CLAUDE.md,
this file's standing orders and Now line, INBOX, then `OPEN.md` and the
plan for the surface in hand. Brief 33 in SESSION_BRIEFS is the next
session's brief.

**Now (2026-09-19 night, Opus alone, the owner asleep): PR #149 is open,
CI running, and the whiteboard works again.** The owner's week of outside
changes came in as one commit, `b387b17`. It ran a regex codemod over
`whiteboard.js` (committed beside it as `fix_wb.js`, with a hardcoded
`c:\Projects\...` path) and deleted **ten live functions** along with the
two it meant to replace: `WB_KIND_INFO` (26 call sites), `wbItemTransform`
(14, and it is what positions every card), `wbBeginTextEdit` (9),
`wbStableDragContainer` (6), `wbAngleFromCenterDeg` (3) and five more. The
board threw on its first render and drew nothing. Reverted whole; its three
sound ideas re-applied properly.

Built tonight, each measured, each its own commit:
the Windows console-window flag on every spawn plus a lint
(`tests/test_subprocess_no_window.py`); the Tesseract registry and
LOCALAPPDATA probe; **`tests/test_frontend_symbols.py`**, which catches a
call to a function that does not exist and found three live ones nobody had
seen (`loadAllNotes`, `loadChatHistory`, `openEntryEditor`); INBOX 238 in
all three parts; INBOX 232's code fences and link chips; INBOX 226
reproduced and named at last (the dashboard art widget at 59 fps, ignoring
Reduce motion and Performance mode, now 0 fps under both); the note list's
load on four thousand notes from 1.8 s to 0.9 s; the Docker probe cached;
the settings search cached; Settings, Extras' sideways scroll; a group's
selection box around rotated cards; and alignment guides for a group drag.

Open in INBOX after tonight: 213, 220, 225 (frontend copy half), 228, 246,
253, plus 256 to 259 filed tonight (four test-only helpers, eighty inert
class names, right-drag to pan as a recommendation, and one unreproduced
NaN the error sweep can now name if it returns). OPEN.md's row 232 was
stale and is corrected in place: tables, callouts, task lists and images
all already render in the Live view, measured, so nobody rebuilds them.

**Now (2026-09-14 midday, Fable orchestrating): PR #144 waits on the
owner's go-ahead to merge; CI on the head is the last gate.** Every agent
landed: docs, chrome, boot, backend2, mapux, chrome2 (`284f440`: 230, 231,
233, 234, 236) and notes (`942fdc6`: 239, 240, 241, and the citation
inventory fix). The owner's afternoon reports 242 to 253 are filed; all
but 246 (boards and maps on notes) and 253 (one-click recovery, placed in
WORLD_CLASS_PLAN H6) are fixed and in HISTORY. Open in INBOX: 213, 220,
225 (frontend copy half), 226 (not reproduced), 228, 232, 238, 246, 253.
**The release blocker found today:** the packaged Windows build has no
console, uvicorn's formatter read `sys.stderr.isatty()` on None, and the
app died at launch; `_ensure_std_streams` (`4ed7456`) is the fix and the
next tag carries it. **After the merge:** tag `v0.3.0`, which builds the
installers; the owner's brother needs that installer. **Next PR:**
`docs/roadmap/agent-remaining/OPEN.md`, "What is left after PR 144", is
the whole list in build order (the owner's reports, the plan tails, the
horizon); `docs/ROADMAP.md`, "How to proceed after PR 144", is the method. Traps this session: a search-and-replace that
rewrites a function's own body (`fetchDashStats` recursed), an early
return above the branch meant to handle the case (`startBgArt`),
`DOMContentLoaded` in a file that loads on demand (nine wirings never
ran), a lazy bundle taking the note editor's focus listener with it (the
graph popup opened raw), a `const` in a later script read at load
(`AI_NAME`, the app did not boot; lint added), pytest's capture swapping
`sys.stdout` back between a fixture and the body, Tesseract's OpenMP
oversubscription (42 s to 0.28 s with one thread), and `tail -1 &&` or
`grep &&` chains that commit on a failed gate (read the failed line;
four times this session).

**Now (2026-09-14 early, Fable orchestrating): four more agents on the
owner's night reports and the audit.** INBOX 195 to 199, 211 and the aurora
half of 210 landed (`ea7b370`, `6437125`, `3440988`); chrome, mapux, backend2
and boot run on the rest, each pushing to `origin/agent/wip-<name>` after
every commit. **Their briefs and the resume recipe are in
`agent-remaining/briefs-2026-09-13-night.md`** with `agent_common.md` beside
it; the hourly routine merges each as it reports. Done when their lists are
empty, the sweeps and `boottime.js` are re-run on the merged head, and the
owner is told to merge.

**Now (2026-09-13 night, Fable orchestrating): PR #144 is ready to merge.**
All six agents finished their lists and were merged with `--no-ff` (backend
`e7bd26f`, chat `112aac1`, phone `4d4a632`, documents `303db81`, graph
`c2b4f01`, mind map `28068cf`); CI is green on `0e88c93` on all seven checks
(three Python suites, ruff, CodeQL, Analyze, E2E) and the PR is mergeable
clean. Local on that head: `errors.js` 0 errors and 0 layout findings at
1440/1024/820/390 in both themes, `contrast.js`, `docks.js` and `touch.js`
clean in both themes. INBOX holds seven older batches with every sub-report
marked; no Fixed items. What each agent could not verify or left is in its
`agent-remaining` file (mindmap, ui-phase-11, documents-phases, graph,
chat-timeline-skills, chat-popup-agent, backend-probe); the app.js split
(gzip bound raised to 700 KB), the graph options panel's height, `.segmented-
control` radii and F3/F7/F10 are the named leftovers, all placed. **After the
merge: Brief 33** (SESSION_BRIEFS), in the owner's words. The `agent/wip-*`
branches on origin are merged and can be deleted from the GitHub UI (the git
proxy here refuses deletes).

**Now (2026-09-13 evening, Fable orchestrating, the owner at 97% usage: "when
the agents cut off because of usage, make sure they all pick back up again
after, and everything else continues. FINISH THE PR").** Six Opus agents run in
their own worktrees and push after every commit to `origin/agent/wip-<name>`
(mindmap, phone, documents, graph, chat, backend); the seventh (Sonnet, backend
hygiene) is merged (`799066b`). Their briefs are the shared rules in the session
scratchpad (`agent_common.md`: token rule, save rule, push rule) plus one list
each, drawn from `agent-remaining/{mindmap,ui-phase-11,documents-phases,graph,
chat-timeline-skills,backend-probe}.md` and INBOX 181 to 192 (each entry names
its owner). **Resume recipe, for this session or a fresh one:** for each
`agent/wip-<name>` on origin, read its `agent-remaining` file's last "done/next"
lines, relaunch one Opus agent per branch in a worktree cut from that branch
with the same rules and "continue from next"; when an agent reports, review
against CLAUDE.md section 6, `git merge --no-ff`, `scripts/gate.sh --changed`,
push the PR branch, delete the wip branch. Done when: every list empty or its
leftovers recorded as not-verified, INBOX under twenty with no Fixed items, the
merged head swept (`errors`, `contrast`, `docks`, `touch` at four widths, both
themes) and full-suite green once, CI green, then tell the owner to merge.
Brief 33 (SESSION_BRIEFS) is the PR after this one.

**Now (2026-09-13 midday, Opus orchestrating, the owner's order: "Assign
agents to finish all the rest of the plan and all the bug fixes regardless of
the agent cap").** Five agents are running at once, which is the first time
the two-agent rule has been lifted and it was lifted deliberately. Each was
given an explicit list of files it owns, because five writers in one worktree
is the stale-index hazard at five times the rate: mind map node styling
(whiteboard.js, 07-whiteboard-misc.css, routes_whiteboard.py), UI Phase 11 the
phone (10-responsive.css, 08-consistency.css), DOCUMENTS Phases 5 to 8
(documents.js, 09-editor.css, routes_documents.py), GRAPH Phase 4's local pane
(graph.js, graph-canvas.js, 02-chat-graph.css) and the remaining bug lists
(ai/, core/, routes_timeline.py, tests/).

**The git rule every one of them carries, and the reason:** a commit built
from an index read earlier silently reverted another agent's work five times
today. `git read-tree HEAD` freezes every path in that index, so a commit from
it rewrites the frozen copy of anything not re-added. The protocol is now:
read HEAD, stage your own hunks and commit in one shell command, then check
`git show --stat HEAD` lists only paths you own, and if it does not, restore
the other file and push the restore at once.

**Landed by the orchestrator since the previous Now line**, each measured: the
board preview's labels kept on the paper and board exports posted as direct
uploads so they are described and read (INBOX 174); the picture card's tick
fading in rather than sitting on every card at full strength; a connector no
longer swallowing a drag-select, which was the cause of "I cant drag highlight
to select shapes" (INBOX 180); a link tool on a map joining the tree rather
than laying a decorative cross-link over a node that is still loose; a map's
branches drawn as tapered ribbons; the radial ring naming the slot under the
pointer; describing and reading a file shown as background processes (INBOX
111); the suggested-links row given one control height (INBOX 110); and the
minimap's size toggle with its fade when the whole graph already fits (GRAPH
6b). The old Now block follows, for the traps in it.

**Previously (2026-09-13 morning to midday):** moved to HISTORY.md, "Moved from HANDOVER, 2026-09-13 night".

## Earlier sessions

The session-by-session record that used to follow here (12k lines) is in HISTORY.md under "HANDOVER archive, 2026-09-09". This file is the current state only.
