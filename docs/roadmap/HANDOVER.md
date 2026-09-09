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
| UI_MODERNISATION_PLAN | Phases 0 to 10 (tooling, mass, components, type and glass, motion, per-surface, states, dock grammar, responsive, the Liquid Glass adoptions) | Phase 11, the phone done properly; the items in `agent-remaining/responsive.md`, `consistency.md` and `docks.md` |
| GRAPH_PLAN | Phases 1 to 6 (canvas and drag, the space, colour rules and groups, utility part one, backend, the node panel) | Phase 4 part two, 6b the minimap, the local pane |
| DOCUMENTS_PLAN | Phases 0, 1 and 2 in full (the chrome, then CodeMirror 6 as the surface: Live as decorations, findings, undo, search, folding) | Phases 3 to 8; `agent-remaining/documents-engine.md` and `documents-batch.md` |
| MINDMAP_PLAN | Phases 1 to 5 and the previews | §12, Coggle-level controls (INBOX 93) |
| AGENT_SKILLS_REFORM | Phases A to C | Phase D (recovery); the verifier and paging inside a step (CHAT_PLAN Phase 4) |
| WHITEBOARD_PLAN | One surface per panel, the Arrange section, the marquee and the export fixes | Phases 1 to 4: the rail and keys, the context bar, the export dialog and handles, the mind map regressions and Tidy |
| CHAT_PLAN | The header and badge, citation numbering, the Sources panel, angle-bracket links (as bug fixes, not phases) | Phases 1 to 4 |
| TIMELINE_PLAN | Audit and plan only | Phases 1 to 4 |
| WORLD_CLASS_PLAN / SESSION_BRIEFS | Brief 1; parts of 3 and 10; Brief 18 section A | Briefs 2 to 15; Brief 18 sections B onward |

### State of the branch (`claude/epic-ramanujan-8xocc0`, PR #144)

**Now (2026-09-09 12:40 UTC, Opus orchestrating, no agents running):**
CI and CodeQL green on every head today, all sixteen CodeQL review threads
resolved. Every agent worktree with commits has been merged; the last four
agents (the settings help popovers, the whole-app visual pass, the escaped
menu, the Documents batch) have reported and stopped. INBOX is at one item,
77's per-model context size, which the entry itself assigns to the next
session.

The done-when checklist above is at eight of nine, and the ninth is the
owner's: run the updated build once. Item 7 is ticked with the local run
this PR gets. The changelog header is cut ("[0.3.0] - 2026-09-09" in both
copies, a fresh empty Unreleased above it), so what remains before the
merge is the owner's build check; after the merge, `git tag v0.3.0` and
push the tag, per docs/RELEASING.md.

The last fix of the session was a dialog that could not scroll: `.modal-card`
capped every dialog at 88vh with `overflow-y: visible`, so anything a
dialog rendered from script past that cap had no route to it. The keyboard
shortcuts overlay was carrying 1925px of content in a 790px card with
`scrollTop` stuck at 0. Worth remembering how it hid: measuring the markup
as it stands in `index.html` shows 790 in 790 and nothing wrong. The fault
only appears once the dialog's own opener has filled it, which is the
difference between `modalscroll.js` (walks every overlay, reports clean)
and `shortcuts.js` (runs `openShortcuts()` first, reports the fault).

Three things this session learned the hard way, all now enforced rather
than remembered:

- **A worktree can be cut from an older base than the branch.** Two agents
  reported that `scripts/gate.sh` and half the lint set "did not exist";
  neither was wrong about its own tree, and six em-dashes reached the branch
  through the gap. Every brief says "merge the branch into your worktree
  first" now.
- **Never pipe a `git merge` into anything in a loop that relies on
  `set -e`.** The pipeline's exit status is the last command's, so a
  conflicted merge looks like a success, and the `git add -A` that follows a
  gate will commit the markers. That happened, and
  `tests/test_plan_hygiene.py` now fails on a conflict marker in any tracked
  text file.
- **Counting distinct `top` values does not detect wrapping.** A `nowrap`
  row whose children are baseline-aligned reports several distinct tops and
  has not wrapped. Test whether a child's top is at or below the first
  child's bottom.

The owner's rules stand: commit and push per step, five-line reports, no
em-dashes, no exclamation marks, tokens not px, the `[data-glass="off"]`
list for any new glass surface, measure before claiming, and never run the
full pytest suite as routine.

**Previous (2026-09-09 01:05 UTC):** two Opus agents in flight: DOCUMENTS Phase 2
steps 2 to 4 (worktree agent-a02238762ae6136e9) and GRAPH Phase 6 node
panel + Library image cards + whiteboard bottom bar (agent-a39e62953a9e53b63).
Merge, gate, push each as it reports. Fable this hour: INBOX 49 to 58 (glass
scope with the art frosted, Performance mode, launcher %0 after SHIFT,
splash marquee, gravity pull, empty capture box, whole-turn copy; 54 and 57
not reproduced at head). Open for the next slot: INBOX 60 (dashboard start
section), 45 (Ask redesign), the graph local pane, UI Phase 9, SKILLS D.

**Previous (2026-09-09 00:50 UTC):** after the reset Fable took the owner's
direct asks itself: DOCUMENTS Phase 1 (a6dc021, the chrome: five controls
at one height, the menu rows unfilled, the strip opt-in), GRAPH Phase 3
(f58ad7c, colour rules and groups), GRAPH Phase 4 (lasso, selection dock,
right-click menu, session hide, 2x PNG export with the legend, Play on the
time slider; only the local pane is left) and GRAPH Phase 5 (degree, age
and map ids on every node, the structure cache, the payload gate). Two traps found and
guarded: the launcher tests ran the real uninstaller in the repo and
deleted the venv (scratch copies now, plus a fixture that fails the
module if the repo's .venv changes); the suite ran a real pip install of
torch through the embedding auto-installer (an autouse fixture now makes
`extras.subprocess.Popen` refuse). In flight: Opus on the mind map
previews and Phases 4 to 5 (worktree agent-a9bcd9a1e1857d891); Sonnet on
INBOX 47 gzip and the docs leftovers (worktree agent-a22cd38556273db70).
INBOX 49 is done (glass only where something scrolls under it or floats;
Performance mode in Effects & accessibility, auto-on for 4 cores or 4 GB or
fewer; blurred area at rest 6 to 10% per tab, gate in
`tests/test_perf_mode.py`). Queue after them: the graph's local pane
(Phase 4's last item); DOCUMENTS Phase 2 (CodeMirror 6, CSP first); INBOX
48 (lazy modules); UI Phase 9 remainder; SKILLS
Phase D; WHITEBOARD Phase 1. The owner's order for the rest of
this session stands: **finish the phases of the plans already in
progress; TIMELINE, WHITEBOARD, CHAT, WORLD_CLASS and the Briefs wait for
the next session.** Queue, two agents at a time, each merged and gated
before the next starts:

1. GRAPH_PLAN Phase 2 (running), then Phases 3 to 5.
2. DOCUMENTS_PLAN Phase 1 (Opus, next free slot): the chrome; INBOX 18's
   "squashed" report did not reproduce at 1440 (see inbox.md), retest
   with the Outline panel open and a long title.
3. UI_MODERNISATION Phase 9 remainder (`agent-remaining/responsive.md`).
4. AGENT_SKILLS_REFORM Phase D, recovery.
5. MINDMAP_PLAN Phases 4 to 5 and `agent-remaining/mindmap.md`.
6. `agent-remaining/help-popovers.md` and `timeline.md` bug items (Sonnet),
   then WORLD_CLASS 12 S7 (LIKE escaping, one helper, 18 sites, Sonnet).

INBOX open items ride with the phase that owns them (the owner column in
INBOX.md). The full-transcript scan of 14:10 added INBOX 21 to 26.

- CI, ruff and CodeQL green as of `315825a`; the merge commit `dca50c6`
  (six agents' work) is pushed and its checks are running.
- Merged this night: the hero restored and refined; the primary start
  tile tinted; arrow keys on every tablist; the Files reading shown in
  full in place; sidebar toggle centred; the `data-help-for` popover
  wiring and the Model backend section; the timeline audit scripts and
  numbers; and the six agents' committed work below.
- New plan files: `WORLD_CLASS_PLAN.md` (start there), `SESSION_BRIEFS.md`
  (one brief per session). `ROADMAP.md` opens with the table that says
  which of the fifteen roadmap files are live.

### The agents (worktrees under `.claude/worktrees/agent-<id>`)

Each is cut from main and merged with the branch; each has its own
server port and data dir. Their committed heads are merged as of
`dca50c6`; anything they commit after that is merged with
`git merge worktree-agent-<id>`, then the lints, then push. If one is
dead (usage limit, container restart), its worktree keeps its commits:
merge those and re-brief the rest from its brief.

| Worktree id | Brief | Port | State at hand-off |
| --- | --- | --- | --- |
| `a9ca1fcf2f7eb318b` | Phase 8 docks: Chat, Dashboard, Library sub-tabs | 8799 | 7 commits merged; finishing |
| `a7b3e667c203e7caf` | Documents Phase 0 | 8800 | **Done**, 8 commits merged; editor.js sweep 89/89; six bugs found by measuring (report in its transcript) |
| `a1fb06af7bc117427` | Phase 9 responsive by device | 8801 | 5 commits merged (one column below 820, sidebars as sheets); working |
| `a97f8374639e599f8` | Graph Phase 1 canvas renderer | 8802 | 3 commits merged (worker, fixture, Canvas 2D renderer); working |
| `a01201cb4507e3030` | Menus, summaries, one-bar docks, icon alignment, footers, toggle rows, meta chips (`08-consistency.css`) | 8815 | 3 commits merged; working |
| `a12f6d594c4b9c730` | Mindmap bugs (selection box, text selection, map-as-note, node picker, dangling edges), previews, boards widget, Phases 4 to 5 | 8816 | 2 commits merged (a map is no longer a note); working |
| `abcdedfb8d9f9f2bf` | Timeline redesign | 8817 | **Paused** to save usage after the audit; resume with SESSION_BRIEFS Brief 5 |
| `a228ba0fe38c417dc` | Paragraphs to '?' popovers | 8818 | **Paused**; 54 paragraphs left; resume with Brief 4 |

### The whole-app visual pass, 2026-09-09

Run once, at the end, because every batch this session was measured in its
own area and none against the others. `scratchpad/ui-sweeps/finalqa.js`.

Covered: dashboard, notes and its four sub-tabs, chat, graph, library and
its eight sub-tabs including an opened board and an opened document,
timeline, reminders, and all seventeen settings sections, at 1440 and 1024
in both themes, so four full passes, plus five menus at both widths.

**Zero console, JavaScript and HTTP errors in all four passes.**

One real finding, written down rather than fixed: the Library's Contents
dock wraps to two lines at 1024 in both themes (row tops 162 and 206, with
Collapse all, refresh and help pushed under the four-way segment). `.dock`'s
`flex-wrap: wrap` is a deliberate recipe, so narrowing the segment against
moving the actions behind a kebab is a design call rather than a small fix.
The boards dock met the same shape today and took the kebab, which is the
answer this one should take too.

The pass also independently observed the kebab's first click and the chat
header holding up, which were the two "reasoned, never observed" items.

### The section 6 review of this branch, run 2026-09-09

CLAUDE.md section 6 names four shapes to look for in work that came from
somewhere else, and this branch is now mostly work that came from somewhere
else: five agents' worth. Run against the whole diff from the branch point.

- **A feature that never ran once.** 287 new top-level frontend functions;
  eight had no `name(` call site, and all eight are wired by reference
  instead (`addEventListener(..., fn)`, an update listener, a `filter`
  predicate, a `setTimeout`). 131 new Python functions; ten are never
  referenced by name and all ten carry a route decorator immediately above
  them. Nothing dead. **The grep that finds this is worth keeping**: search
  for `name(` first, then re-check every hit for a bare-name reference,
  because a handler passed by reference looks exactly like dead code.
- **A policy silently refusing the work.** No inline `style=` attribute was
  added to any HTML or JS on this branch, so nothing is being refused by the
  CSP unnoticed. (One was written today, in a sweep, and the CSP refused it
  on the first run: `page.addStyleTag` fails the same way, and
  `readmeshots.js` records it.)
- **A working thing rewritten into a riskier thing**, and **a guard removed
  while the shape around it was kept**: both need reading rather than
  grepping, and the merges were reviewed one at a time as they landed. The
  one deliberate rewrite is the graph's drag, which reverses a decision the
  code defended at length; GRAPH_PLAN carries the reversal and the reason.

### Two traps an agent worktree sets (2026-09-09, both hit for real)

1. **A worktree can be cut from an older base than you think.** Two agents
   this session reported that `scripts/gate.sh` and half the lint set "do not
   exist", and one could not measure a feature because its checkout predated
   it. Neither was wrong about its own tree. **Put "merge
   `origin/claude/epic-ramanujan-8xocc0` into your worktree before you start"
   in every brief**, and treat "that lint does not exist here" as a signal to
   merge rather than as a reason to substitute a weaker check. The visible
   cost of missing it: six em-dashes reached the branch because the agent's
   tree had no `tests/test_no_em_dashes.py` to catch them.
2. **`scripts/gate.sh` used to resolve python and ruff from
   `<worktree>/.venv`**, which a linked worktree does not have, so its ruff
   step failed on a tree with nothing wrong. Fixed: it falls back to the main
   checkout, found through `git rev-parse --git-common-dir`.

### Merge recipe (every time, no shortcuts)

The whole recipe below is `scripts/gate.sh --changed` plus
`BASE=<port> scripts/gate.sh --sweeps` against a fresh server; the steps
are listed so a failure can be read. The full suite is not part of a
merge: CI runs it on the push; locally it runs once before a large
agent task's final report and once before the PR closes (done-when
item 7), never per step or per merge.

1. `git merge --no-edit worktree-agent-<id>`; on a conflict in
   `07-whiteboard-misc.css` keep BOTH sides (both append), then run
   `tests/test_css_braces.py`: the last merge left one block unclosed and
   only that test saw it.
2. `for f in frontend/*.js; do node --check $f; done`, `.venv/bin/ruff check .`,
   the lint set in `SESSION_BRIEFS.md` §0 step 6.
3. Restart the 8781 server (`setsid`, never `pkill`), run
   `scratchpad/ui-sweeps/errors.js` (takes over two minutes: run it in
   the background) and the sweep the brief names.
4. Commit the merge, push, read the CI result when it arrives; CodeQL
   comments are bug reports: fix, push, resolve the thread.

### The owner's flagged list, and where each stands

- Em-dashes everywhere: sweep script ready (`scratchpad/emdash.py`), run
  it LAST, after every agent has merged (Brief 1). Not run yet.
- Paragraphs to '?' buttons: wiring merged; 54 left (Brief 4).
- Sub-tab arrow keys: done. Sub-tabs stay left-aligned (decision).
- Mindmap: selection box, text selection, "test" map as a note (fixed),
  node picker rows, dangling edge: with the mindmap agent.
- Line numbers drifting: fixed (Documents Phase 0, measured 0.0px).
- Docks as one bar, menus not stacks of buttons, icon alignment, capture
  footer with the FAB over Save, toggle rows, meta chips: with the menus
  agent.
- Timeline line and table views: audited, paused (Brief 5).
- Responsive by device: with the Phase 9 agent.
- Graph fullscreen square corners: with the graph agent (Phase 2 item).
- Files reading only first line: done.
- New note tile colours: done. Hero: restored and refined (owner's call).
- Sidebar toggle clash when collapsed: done.
- llama.cpp in the project: no; dev-only script planned (WORLD_CLASS §9).

### After the agents: the order

`SESSION_BRIEFS.md` Briefs 1 to 14 in order. Brief 1 (the em-dash sweep)
only after every agent above has merged, or their diffs conflict on every
line that carried a dash.

### Traps found this night

- A merge of two appended CSS sections can drop a `}`; the braces test is
  the only guard.
- `kill $(pgrep ...)` in the same shell line as a `setsid` start kills the
  shell; separate the commands.
- The Bash tool times out at 120s; `errors.js` needs the background flag.
- CodeQL reads `scratchpad/` too: lazy `.*?` regexes over argv paths,
  unclosed `open()`, and case-sensitive tag filters were all flagged there.

---

# Handover

**Next: [`PLAN.md`](PLAN.md)** — the scoped professional-grade plan (whiteboard, documents, backend, agent harness, performance), in ship order with measurements. Written by direct instruction; start there.

## Earlier sessions

The session-by-session record that used to follow here (12k lines) is in HISTORY.md under "HANDOVER archive, 2026-09-09". This file is the current state only.
