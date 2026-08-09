# Session handover

> **The other four:** [ROADMAP.md](../ROADMAP.md) (live work) · [BACKLOG.md](BACKLOG.md) (§1–§29) · [ANALYSIS.md](ANALYSIS.md) (§30–§34, including the licence constraint — AGPL-3.0 now) · [HISTORY.md](HISTORY.md) (already built).

## Latest session: §47 — a stale "decoration" claim corrected, and the document half of "take me to what changed" built

Continued straight after §46. Full detail in [HISTORY.md §47](HISTORY.md);
short version: Tier 2 item 12 ("linked notes should be clickable, today
they're decoration") was checked before touching anything and found
**already done** — all three link-chip render sites already call
`flashEntry` on click. Corrected in ROADMAP rather than rebuilt.

Item 13 had a real gap: `changeRow` (shared by the chat's "what changed"
list and the autonomous-pass review panel) only ever read `change.note_id`,
never the `change.document_id` that `agent._change_document_id` has
resolved on every write since §21. One more `if`, reusing
`openDocumentFromNote`; verified live with an actual click producing an
actual tab change, not just read from the diff. Reminders/categories still
have no `_change_*_id` resolver at all — named as the real next step for
this item rather than guessed at.

**What's next**: ROADMAP.md's next open item — the reminder/category
`_change_*_id` resolvers named above, the sketch pad's selection tool, or
whichever Tier 2 item reads as next-most-valuable on a fresh read of the
file.

---

## Previous session: §46 — the sketch pad's highlighter and background colour, both fixed and verified live with pixel reads

Continued straight after §45. Full detail in [HISTORY.md §46](HISTORY.md);
short version: the highlighter's `globalAlpha` was `0.05` (needed ~20 passes
to show anything), now `0.35`. Checked first and found already done: a size
control (`#sketch-size`) existed and reached every tool — ROADMAP's own
claim otherwise was stale, corrected rather than rebuilt.

**The background colour is the one worth reading closely if you touch this
file again.** A first pass wired it as a CSS `background` on
`#sketch-bg-canvas` — the same shape the whiteboard's own board-colour
picker uses — and it did *nothing*, because `sketchDrawBackground()`
already paints an opaque `fillRect` into the canvas's own pixels every time
the pad opens, and those pixels sit in front of any CSS background on the
element underneath. **A CSS background on a `<canvas>` is only ever visible
through pixels the canvas itself left transparent** — worth remembering
before wiring any future control this way. Fixed by making the fill colour
itself the chosen one (`sketchBgColor`, persisted in `localStorage`)
instead of a hardcoded white. Verified three ways live: the bg-canvas's own
pixels before/after picking a colour, and the exact composite `saveSketch()`
builds, read back pixel by pixel, to prove the colour survives into what
actually gets saved and not just what's on screen.

**Not built**: the selection tool (still open, and it's the one real
remaining gap — clicking an existing stroke to move/resize/delete it).
**Not verified live**: nobody clicked "Save as note" through the UI
end-to-end this session (a stray toast intermittently overlapped the
button in the test viewport); the save composite was verified by running
`saveSketch()`'s own drawing calls directly, not by clicking through.

**What's next**: the sketch pad's selection tool, or ROADMAP.md's next
Tier 2 item (note-links being clickable through to the notes they name, or
the change-target View button extending past notes).

---

## Previous session: §45 — skill runs get a manual mode, the single most-requested unbuilt thing on the list

Continued straight after §44 in the same session. Full detail in
[HISTORY.md §45](HISTORY.md); short version: `run_skill(..., manual=True)`
now pauses after *every* completed step, reusing the exact `stopped_at`/
`start_at` machinery a failed step already had rather than a second
mechanism — the only new thing is `result.paused`, so the client can tell
"waiting for you" from "something broke". Whatever gets typed in at the
pause (`manual_note`) is folded into the *next* step's own instruction, once,
not repeated into every later one. A "Run skills step-by-step" checkbox
lives in the chat dock's `⚙` panel; the pause renders as a text box +
Continue card, separate from the existing Resume/ran-out-of-rounds one so a
real failure still reads as a failure.

**Not built**: the same pause for a plan run (`opts.plan`) — the backend
already treats a plan and a skill identically, but the pre-existing
Resume-from-failure button was already skill-only before this session, so
extending both to plans is a separate follow-up, not a gap this feature
introduced. **Not verified live**: six new backend tests in `test_skills.py`
cover pause/resume/note-folding through the real streaming endpoint with a
fake model, but the checkbox and the pause card's text box were not driven
in a browser this session.

**What's next**: ROADMAP.md's next Tier 2 item (the sketch pad — the
highlighter opacity, a size control, a background colour, a selection tool)
or the plan-run pause extension named above.

---

## Previous session: §44 — Tier 1's top item done, a real "ran without being enabled" bug fixed live, link reasons extended twice, a mute option — plus three reports that didn't reproduce

Full detail in [HISTORY.md §44](HISTORY.md). Short version and what's still
open:

**Worked ROADMAP.md's own "start here next" first**: the two Tier 1 §8 perf
findings (`tools._graph_neighbours`'s full-table tag scan, `_note_summary`'s
per-row `entry_dates` N+1 inside `list_notes`/`summarize_notes`) — both
fixed, both pinned by new query-count tests in `test_scale_query_counts.py`.

**Then a user report, reproduced live rather than theorised**: *"I get
notifications that the autonomous optimisation completed when I didn't have
it enabled??"* — real bug. `POST /tasks/trigger-autonomous` never checked
the `autonomous_tasks_enabled` master toggle; only the scheduled loop did,
before ever calling in. Confirmed with `curl` against a running server
before touching code (`started: true` on a fresh, disabled profile), then
fixed in the route rather than in `_run_optimization`/`trigger_now` — ten-
plus existing tests call `_run_optimization()` directly and rely on it
staying toggle-agnostic by design, so the guard belongs at the one call site
that was actually missing it. Re-verified live after the fix, both branches.

**Then link reasons, extended on two fronts asked about directly**: `GET
/entries/link-suggestions` now carries the `reason` text a link would get
if approved (the two thresholds are numerically identical, so it's a real
preview, not a guess), and `POST /entries/links/backfill-reasons`
(`manager.backfill_link_reasons`) runs deduction once over every existing
reason-less link — the answer to "is there an easy way to give them all a
reason?", since deduction previously only ran at the moment a link was
first made.

**Then a mute option, asked for directly**: `notifications_muted_except_reminders`
quiets `toast()` and the notifications panel for everything except a due
reminder and real errors.

**Then a graph-toolbar readability fix, reported directly**: the Time
Filter's "All time" read-out and the Similarity/Hide unlinked/Labels toggles
sat in one undifferentiated strip with the same gap; grouped the toggles and
drew a divider using `.chat-tool-group`'s existing convention.

**Three more reports were investigated and correctly left alone rather than
guessed at** — a Capture title-field question (a design decision, not a
bug — see ROADMAP.md's new "Open questions" section), "the dashboard isn't
detecting my name" (the code is correct; likely the nudge working as
designed on a profile with no name saved, not reproduced as a bug), and the
Timeline grid's "text cut off" report (re-driven live with real
measurements; found that `display: -webkit-box` computes to `flow-root` in
this sandbox's Chromium — worth knowing — but could not reproduce actual
clipping with any input tried).

**What was verified live vs. reasoned**: the two perf fixes and the
autonomous-toggle fix were confirmed against a real running server with
`curl`, not just read from the code. The graph-toolbar divider, the
suggestion-reason text, the backfill button and the mute option are CSS/JS
changes reasoned from the DOM and this codebase's own existing conventions
(`.chat-tool-group`'s divider pattern, `list_tags`' `ilike` pre-filter
pattern) but were **not** driven in a browser this session. Full `pytest
tests/` (~1,600+ tests), `ruff check .`, and `node --check frontend/app.js`
all green throughout.

**What's next**: ROADMAP.md's Tier 2 top item (skill runs' auto/manual
mode — still the single most-requested unbuilt thing on the list), or one of
the three open questions above once a decision is made on each.

---

## Previous session: §43, a follow-up burst — the time filter's *real* bug, link reasons grew a confidence score and an editor, notes got optional titles

Continued straight from §42 below, in the same session: rather than another
big unstructured list, the user came back with a run of small, specific asks
in quick succession, each answered as it arrived. Full detail — the exact
`+ "Z"` double-timezone repro, every surface a link reason now reaches, the
title feature's design discussion — is in [HISTORY.md §43](HISTORY.md); this
is the short version and what's still open.

**The time filter slider "still doesn't move"**, reported right after §42
claimed it fixed. It had — for the bug §42 found — and hadn't, for a second,
worse one hiding behind it: `/graph`'s two node dicts did
`e.created_at.isoformat() + "Z"`, and `core/database.DateTime` has said UTC
on its own (`...+00:00`) since before this session — so every single note's
`created_at` on the graph was `...+00:00Z`, two timezone markers in one
string, which `new Date(...)` in JavaScript silently reads as `Invalid Date`.
§42's own testing happened not to catch it because it used notes created
seconds apart, and near-simultaneous *good* dates look the same as
near-simultaneous *invalid* ones on a slider with no range to show. Found by
backdating a note in SQL and reading `/graph`'s raw JSON, not by guessing.
Fixed in both places; two new tests parse the response with
`datetime.fromisoformat()` instead of trusting the shape.

**Link reasons (§42's own feature) grew two things asked about directly:** a
confidence score for the reasons nobody actually wrote — `create_link` now
tries to deduce one from embedding similarity (the same signal
`/entries/link-suggestions` already uses, same 0.55 threshold) whenever it's
given none, and leaves both null rather than guess when it can't — and an
editor, since a reason was write-once before this: `PUT
/entries/{id}/links/{link_id}/reason`, plus a ✎/⊘ pair on the note card's
own link chips (add-or-edit, and clear, kept as two separate controls
because the shared confirm/prompt dialog can't tell "saved empty" from
"cancelled"). Both the graph edge's tooltip and Trace's readout now say
*", NN% confidence, deduced"* when the reason came from the algorithm rather
than a person or the AI, so a guess never reads with the same certainty as
something someone actually said.

**Notes got an optional title** — worked through as a design question first
(does a title cap how many notes fit one topic? no — it's read off the note,
not enforced) and built to what the user confirmed: the leading
`#`–`######` heading line, if the note's first line is one, computed on
every read (`manager.extract_title`) rather than stored, so it can't drift
out of sync with an edited first line. Shown as its own `<p class="entry-title">`
above the card body (`<h3>` leaked this design system's small-caps
section-label styling into it — reverted after a screenshot caught it, not
after a report). **✨ Generate title** / **Regenerate**, and **✕ Remove
title**, both in the note's overflow menu; both refuse a private note
outright (400) because they read the decrypted text and would otherwise
write it straight back to `entry.content`, un-encrypting the note as a side
effect of titling it.

**And two smaller ones:** the app now always boots to Dashboard rather than
whatever tab `localStorage` remembered last (asked for directly); the
glassmorphism blur slider was investigated after being asked whether it
actually scales the effect and found working as built — two screenshots
looked identical to the eye but differ byte-for-byte, so no fix was made
because there was nothing broken.

**Verified live in Chromium:** the manual link → add a reason with ✎ → the
chip's tooltip updates → clear it with ⊘ → the tooltip reverts, the full
round trip through the real `PUT .../reason` endpoint. **Not verified live:**
the *auto-deduced* reason specifically, and its graph-edge tooltip — this
sandbox has no real embedding backend (the standing `sentence-transformers`
constraint), and a same-session live test of two linked notes happened to
land inside the graph's "Uncategorised" cluster supernode (every note here
shares that one category, and semantic-zoom clustering hides individual link
edges behind a cluster node), so the tooltip's pixels specifically were not
seen. The backend path is covered by `pytest` end to end (deduction,
confidence, editing, clearing, the graph edge's own field); say so plainly
rather than claim a screenshot that doesn't exist.

## Previous session: §42, a long unattended run — ten correctness/UX fixes, done and verified; six large asks, triaged and scoped, not built

The user handed over a large, unstructured list overnight and asked for
autonomous work with no check-ins. Ran it as this project's own process
says to: checked the running app before building anything, worked the list
top-down by how cheap-and-real each item was to verify, committed and
pushed after every batch (in case of a usage-limit cutoff mid-session — it
didn't happen, but that's why the history below is several small commits
rather than one large one). Full detail, including exact repro steps and
measurements, is in [HISTORY.md §42](HISTORY.md); this is the short version
and — the part a handover is actually for — what's still open and why.

**Ten fixed, each reproduced first and each with a test:** `recycle_bin_days`
sending `0` and hitting a raw 422; `unknown timezone` on every Windows
request (missing `tzdata` dependency — Windows has no system tz database at
all); the autonomous loop sleeping up to 6h between reading its own
preferences, so toggling battery-saver or the scheduler did nothing until
that sleep ran out; a chat-tab CSS grid bug that was simultaneously "a dark
rectangle behind the header" and "the sidebar collapse button overlaps"
(one `grid-template-rows` never reset for the mobile breakpoint); search
results explaining *why* they matched for exactly one case (connected) and
none of the actual matches; a fourth "Custom…" mode for Improve Writing; the
graph's "Generate Story from Path" button silently refused by both an
undefined CSS token and the app's own CSP; the graph time filter's stale
slider bounds hiding any note added after the graph was first opened; the
trace overlay drawing an invisible flat line on Arc layout specifically;
and a Timeline grid card's missing ellipsis (`line-clamp` unprefixed under
`-webkit-box`, plus a bare `text[:120]` slice server-side with nothing
appended).

**Six items were large asks against small realities, and got scoped rather
than rushed:**

- **The whiteboard** (redo, select/move/rotate/shift-lock, images,
  draw.io-style connection points, precise drop placement, toolbar default
  position) — draw.io + MS Whiteboard + OneNote's combined feature surface
  asked for in one report. Broken into a sequenced list in ROADMAP.md item
  11; nothing built, because a shallow pass at any one piece here (a rotate
  handle with no undo/redo integration, a connection-point system that
  doesn't match how draw.io actually represents fixed-vs-free anchors)
  would cost more to unwind later than it saves now.
- **A widget management hub** — checked first, and the foundation already
  exists (17 widgets, a real `dashboard_layout` preference, inline
  add/remove/reorder). What's missing is a dedicated modal surface, which
  is real but small — scoped in ROADMAP.md item 26, not built this session
  because the whiteboard and search-explainability work took priority as
  the more concretely-reported bugs.
- **An Obsidian-style graph** — Obsidian's graph is a force layout, which
  this app already has; asked what's actually different needs a
  side-by-side screenshot before it's actionable, not a guess. Noted in
  ROADMAP.md item 24.
- **A guided onboarding tour** — added to ROADMAP.md item 19, next to the
  reachability/seeded-notes work already scoped there.
- **Expanding the autonomous agent's capabilities** — "expand" isn't a
  spec; candidates listed in ROADMAP.md item 31, needs a "which of these"
  decision before a session builds any of it.
- **Cleaning up the test suite** — 106 files, fully green, no specific
  duplication pointed at. In ROADMAP.md's Tier 4 with the reason: this
  project's tests are written as narrative (each docstring is a reported
  bug), and a mechanical consolidation pass is exactly how that gets
  flattened into generic assertions nobody can trace back to why they
  exist. Needs a concrete finding (real duplicated fixtures, a file that's
  actually too large) before it's safe to start.

**What could and couldn't be verified:** every fix above was driven in
Chromium (headless, `service_workers: 'block'`, the login/onboarding recipe
this file already documents) except the semantic-match badge — this sandbox
has no `sentence-transformers` installed (CLAUDE.md's own standing
instruction, since it has failed to install cleanly before), so semantic
search always falls back to keywords here. The `match_info` "semantic" and
"hybrid" badge types are covered by a backend test using the suite's fake
embedding backend (`tests/test_chat_api.py::test_semantic_match_carries_its_score`),
which proves the code path is exercised and correct, but the actual pixels
of a semantic badge rendering in a browser were not seen — say so plainly,
per this file's own rule, rather than claim a screenshot that doesn't exist.

## Previous session: §41 Tier 1 (all of it), a live whiteboard redesign, then a security/perf review

Worked §41's Tier 1 list top-down, each reproduced before being fixed, each
with a real test:

1. **Meeting transcription "errors out"**: with faster-whisper actually
   installed (`pip install`, works fine in this sandbox now), a failed
   model download raised inside `voice.transcribe` and fell through to the
   route's catch-all as "Couldn't transcribe that recording" — indistinguish-
   able from a bad clip. Now a distinct 503 naming the model-load failure.
2. **Skill step ticked "done" on an empty turn**: a turn with no answer, no
   tool call and no failure fell through to `state: "done"` in
   `skill_runner.py`. Now reported `failed`, same as the existing
   `ran_out`-of-rounds case. Also added a client-side idle-read timeout to
   `streamChat` (150s, longer than the backend's own 120s Ollama timeout).
4. **A reply to the agent's own question read as small talk**: `ask_user`
   asks "delete this?", the user answers "yes"/"ok", `intent.classify`
   correctly calls that small talk in isolation, and small talk gets no
   tools. New `answering_agent` request flag, set by the client while an
   `ask` card is pending (covers both button-click and free-typed replies),
   forces `intent.NOTES` for that one message.
6. **Embedding-model downloads invisible outside one settings screen**:
   `embedmodels.DownloadState`'s own docstring said "for /tasks and the
   panel" — the panel half existed, `/tasks` never got it. Added, plus
   `taskhistory.record()` on completion so a failed download doesn't vanish.

**Then a live, mid-session redesign of the whiteboard**, driven directly by
the user watching it: a cursor-lag bug ("mouse keeps snapping to an
invisible grid" — a regression from this session's own first pass at a
custom cursor, fixed by switching to a native `cursor: url(svg)` per tool
instead of a JS-tracked div), a missing eraser, Undo (Ctrl+Z), keyboard
shortcuts, an SVG-icon toolbar redesign, a board background colour (also
fixes the generative-art canvas bleeding through), draggable toolbar panels,
and an empty-state hint. Full writeup and the bug found along the way (a
freshly drawn stroke wasn't in `wbState.sketches`, so it couldn't be
deleted until a reload) is in [ROADMAP.md §11](../ROADMAP.md).

**Then item 3** (skills producing network errors): the same disguise problem
as item 2, one layer up — `agent.run_agent`'s `OllamaError` handler turns
"Ollama died mid-round" into a real `answer` event (the correct thing for
ordinary chat, which just renders it like any other reply) but `skill_runner`
had no way to tell that from a genuine answer, so the step was ticked done
and the run repeated the identical failure on every later step. The answer
event now carries `offline: true`; `skill_runner` checks for it and stops
with a real reason, same shape as the `ran_out` case.

**Then item 5** (notifications): audited before building anything, per this
file's own rule — found it was **already done**. `recordNotification` has
exactly three call sites (a stopped run, a due reminder, every finished
background job via `renderTaskHistory`), and the third already picks up
whatever `routes_tasks.collect()` lists, including this session's own
embedding-model addition, with no extra wiring. ROADMAP.md §5 corrected
rather than rebuilt. Item 7 (claim-specificity) is still blocked on real
model output, as originally scoped — nothing to add there.

**Then two background review agents** (security, and backend/graph
perf+correctness), dispatched to cover ground beyond §41 at the user's
request. Findings and what was done with each:

- **XSS, high severity, fixed.** The Command Palette (`Ctrl+K`) rendered the
  streamed chat answer via `innerHTML` with a hand-rolled, unescaped
  `\n`→`<br>`/`**bold**` replace. Worse and better at once: the handler also
  called `/chat` (non-streaming) and parsed the response as `/chat/stream`'s
  NDJSON, so `msg.type` was never `"content"` and no answer had ever actually
  rendered — a "feature that never ran once" that would have gone live the
  moment someone fixed the parsing without also fixing the escaping. Rewired
  to reuse `streamChat`/`renderMarkdown` (the app's one real streaming client
  and its one safe renderer) instead of a second, parallel, broken
  implementation of both. Verified live in Chromium with a payload that
  would have executed under the old code.
- **Private-note leak via `note_ids`, fixed.** `_attached_notes` checked
  `is_deleted` but not `is_private` — the one path into the chat prompt that
  never went through `tools._require_note`. Now excluded, matching that
  guard. No plaintext ever leaked (private content is ciphertext at rest
  either way); the note's id and category were the exposure.
- **`execute_tool`'s exception net too narrow, fixed.** Only `ToolError`/
  `KeyError`/`TypeError`/`ValueError` were caught; anything else (a
  SQLAlchemy error, a filesystem error) propagated through `agent.py`'s tool
  loop — which has no try/except of its own — and killed the whole SSE
  stream mid-turn with no rollback and nothing the model or user ever saw.
  Added a backstop: roll back, log the real exception, return an ordinary
  tool-error result the model can read and try something else with.
- **Two backend perf findings, reproduced but NOT fixed** — see
  [ROADMAP.md §8](../ROADMAP.md), start of Tier 1: `tools.py`'s
  `_graph_neighbours` does an unfiltered full-table `Entry` scan per BFS
  node instead of a SQL tag filter (up to ~12 scans per `related_notes`
  call), and `manager.entry_dates` is an N+1 inside `_note_summary`, hit by
  `list_notes`/`summarize_notes`. Left unfixed deliberately: verifying
  either properly needs a realistic-size notebook, which this sandbox's
  test suite doesn't give a session — start here next, with a synthetic
  large notebook to measure against before and after.
- Also found, while verifying the eraser's undo: a double-delete race
  (re-entrant `mouseenter` on an item already mid-DELETE could pop the
  wrong undo entry). Fixed with an in-flight-id guard.

**What could not be verified**: real-Ollama behaviour, as always (every fix
above is pinned by `fake_ollama`/mocked-network tests, not a live model).
Every UI change this session *was* driven in Chromium with real
measurements (network calls, computed styles, DOM counts, payload
execution checks), not just screenshots — including the XSS fix, verified
by confirming a real script payload did *not* execute.

**Not reached**: the two perf findings above (§8), and anything from
"the user's list for next session" mentioned when this session closed —
ask them what's on it; nothing here names it.

---

## Previous session: the audit, then the reported list

**Read [§41 in ROADMAP.md](../ROADMAP.md#41-the-reported-list-triaged--and-the-ordered-plan)
before deciding anything.** It is the ordered plan in four tiers, and it exists
because this project's recurring failure is not forgetting work — it is a
session picking something interesting from further down the list while a
correctness bug sits at the top. Work top-down.

Two halves to this session. The first audited `fix/Antigravity-Audit` (§40) and
is written up below. The second worked the owner's own reported list.

### What was fixed from the reported list

Each of these was diagnosed in the running app, not from the report:

- **Trace is rebuilt.** The cause of "annoying and pretty much unusable" was
  that `traceModeActive` was set and consulted nowhere, so the map never
  responded to a click and both ends had to be chosen from `<select>` elements
  listing every note by its opening words. Two-click mode now, with Swap, a
  one-step Undo, Escape, and a crosshair cursor.
- **"Automated tasks keeps disabling itself."** Two controls wrote the same
  preference; the one on the skills panel never updated `prefsCache`, so the
  next `savePrefs` rebuilt the object from the DOM and read the other,
  unticked checkbox.
- **"Light/dark stops affecting the background after using the scheme
  selector."** The scheme builder stored one page colour, for whichever mode
  was on, *inline on `<html>`* — which outranks every `[data-mode]` rule.
- Six whiteboard bugs, the skill descriptions clipped to one line, and the
  documents sidebar crushing its own list.

### What was checked and found already correct

Worth knowing so nobody spends a session on it: **password and secret storage
is sound.** bcrypt with a per-password salt, `secrets.token_hex(32)` for
session tokens held in memory and swept on expiry, and private notes encrypted
with a key wrapped by a password-derived key. Nothing is stored in plaintext.
Also: the three sketch swatches reported as identical are three different
colours — the real complaint underneath it is the highlighter at 5% opacity.

### The biggest unbuilt thing on the list

**Skill runs have no manual mode.** It was explicitly requested and never
built; `skill_from_step` is resume-after-failure, not a step-through. The ask
is a pause after each step with a Continue button and a text box, so the user
can add what the agent missed or answer a question it raised. §41 Tier 2,
item 9.

### The traps that will cost you an hour

1. **`waitUntil: "networkidle"` never settles** — the app polls, so `goto` and
   `reload` time out at 30s. Use `domcontentloaded` and an explicit wait. The
   login is one field in two modes: `#lock-password`, `#lock-submit`.
2. **`pkill -f uvicorn` kills your own shell** (same process group, exit 144).
   Start the server with `setsid … &`.
3. **Nine `.modal-overlay` elements sit in the markup permanently with
   `.hidden`.** Any "is a dialog open?" check written as `querySelector
   (".modal-overlay")` is always true. This ate an Escape handler.

### What could not be verified

- **No real model was called.** Every provider test uses a fake transport, so
  the background librarian's plumbing is tested and the *quality* of its
  tagging and linking is unknown.
- **Semantic search ran against the fake embedder only** — the
  mixed-dimension fix is pinned by a unit test over `similar_pairs`, not by a
  real model switch.
- **Meeting transcription was not reproduced.** It is reported as erroring out
  and is Tier 1 item 1; `faster-whisper` is not installed here.
- **Nobody drew on the whiteboard or dragged a card by hand.** The API is
  tested and the layout measured; the pointer interactions are not.

---

## Latest session: auditing a week of another agent's work before it merges

**Read [§40 in ROADMAP.md](../ROADMAP.md#40-the-antigravity-audit) next.** This
session audited `fix/Antigravity-Audit` — 8 commits and ~9,600 insertions from
a different coding agent, with no tests — and brought it to a mergeable state.
The branch is now `claude/branch-audit-refinement-lredrg`.

### The number that frames everything else

`main`: 1,544 passing, 2 failures. The branch: **90 failures, 20 ruff errors.**
CI would not have run. It is now 1,589 passing and ruff clean, with 46 new
tests and 4 new lints.

The two failures on `main` were not the other agent's doing and are worth
knowing about on their own: `test_query_understanding` pinned its fixtures to a
hard-coded date and then read the *real* clock through
`search_manager._user_today`, so it passed only while the wall clock sat within
a week of that date and began failing on its own six days later — with an empty
result set that looked exactly like a retrieval bug. It owns its date now.

### What was kept, and what was reverted

**Kept, after fixing:** the whiteboard, the background librarian, memory
streams, semantic note search, the command palette, the agent activity monitor,
batch `tag_note`/`link_notes`, PageRank node sizing, focus mode, the vectorised
similarity maths, the D3 timeline, and the bulk category-name lookup that
removed a real N+1. All good ideas. See §39 for the three biggest.

**Reverted, one thing:** `POST /chat/stream` had been rewritten as a WebSocket.
Nothing asked for it, the app is local-first on 127.0.0.1, and the NDJSON
stream it replaced already delivered tokens as they were produced. It cost a
Session shared across threads, a leaked producer thread per request, a router
mounted outside `dependencies=locked` with hand-rolled auth, a transport exempt
from the same-origin policy — and ~70 of the 90 test failures.

### The two traps that will cost you an hour

1. **`waitUntil: "networkidle"` never settles against this app.** It polls
   (reminders, model status, tasks), so Playwright waits out the full 30s and
   times out on `goto` and on `reload`. Use `domcontentloaded` and an explicit
   `waitForTimeout`. The login form is one field with two modes — `#lock-password`
   and `#lock-submit`, with `data-mode="setup"` on the overlay on first run —
   not the separate setup/confirm fields you might expect.

2. **`pkill -f uvicorn` will kill your own shell.** The sandbox runs the shell
   in the same process group; it returns exit 144 and takes the session's
   command with it. Start the server with `setsid … &` and leave it running.

### The finding that only a browser could have made

Two settings this branch added — `border-style` and `shadow-intensity` — were
missing from `APPEARANCE_DEFAULTS`, so `applyAppearance` wrote the literal
strings `undefined` and `NaN` into two CSS custom properties on `<html>`.
Neither fails where it is set. They fail where they are *used*: a
`border-style: var(--border-style) !important` rule matching `.card`, `input`,
`textarea`, `select`, `.modal` and `.sidebar`, and the `rgba()` inside
`--glass-shadow`. **Every card, field and dialog in the app rendered flat and
borderless on every fresh profile**, silently, and reading the source did not
find it. One `getComputedStyle` in Chromium did, immediately.

Two more in the same family: `.glass` set `background: var(--bg-glass)` against
a token no theme declares, which erased the background of every
`class="card glass"` element; and five inline `style` attributes were sitting
inside app.js template literals, refused by the CSP exactly as the
thirty-five in index.html were. Each of the three now has a lint.

### Where to start

§40 ends with a ranked list of what is still open. The top two are the ones
worth doing next, and both are about the same thing — a feature that changes
the app's behaviour without showing the user what it did:

1. **A UI for memory streams.** The model can save itself standing
   instructions; the user cannot see, edit or disable them. The `active` column
   exists and nothing ever sets it to false.
2. **A dry-run for the background librarian.** Enabling it lets an agent edit
   the notebook unattended, with no way to preview what it would do.

### What could not be verified this session

- **No real model was ever called.** Every provider test runs against a fake
  transport, as the standing caveat says. The background librarian's *plumbing*
  is tested — scheduling, the guard against concurrent runs, battery mode, the
  blocked tools, failure recording — but no pass has ever run against a live
  Ollama, so the quality of its tagging and linking is unknown.
- **Semantic search ran against the fake embedder only.** `sentence-transformers`
  is deliberately not installed (CLAUDE.md), so the mixed-dimension fix is
  pinned by a unit test over `similar_pairs` with hand-built vectors, not by a
  real model switch on a real notebook.
- **The whiteboard was not driven by hand.** Its API is tested and its two
  canvas layers were measured as correctly overlaid in Chromium, but nobody
  dragged a card, drew a stroke, or panned the canvas.
- **The sketch highlighter is set to `globalAlpha = 0.05`.** That is almost
  invisible — roughly twenty passes to show anything. It looks like a mistaken
  value rather than a choice, but it was left alone because it is a taste call
  the owner should make, not a defect.

---

## Latest session: §37's four remaining clarifying-question items, all four asked and built

Started by checking the running app and git history against the previous
handover before touching anything — confirmed §38 items 3–7 (Arc layout,
Timeline branch/line, meeting notes, onboarding diagnostics) were already
merged (PR #70), and found one real staleness bug in the process: §37C's
density pass (the ⚙ disclosure collapsing the dock to one row) had already
shipped in commit `46df305`, but ROADMAP.md still listed all three of its
sub-items as open and named it "start here next" — corrected in place, and
checking the remaining two sub-items in Chromium found the dock already at a
single 103px-tall row, so no further work was needed there.

That left §37's four items explicitly blocked on a clarifying question
(37G, 37H, 37I, 37K) — the previous handover's own instruction was "ask, then
schedule," so this session did: asked all four in one batch. Three came back
with a build decision; the fourth (37H, llama.cpp) came back "not this
session." All four now closed out or correctly deferred:

- **§37G, both halves.** The sketch pad's canvas is now two layers —
  `#sketch-bg-canvas` for an uploaded image, `#sketch-canvas` for pen strokes
  above it. The Eraser switched from painting white to
  `globalCompositeOperation: "destination-out"`, so erasing a stroke reveals
  the photo underneath instead of punching a white hole through it — checked
  with a pixel read (`alpha: 0` on the stroke layer, the image's own colour
  on the background layer) rather than assumed from reading the canvas code.
  Save composites both layers into one PNG attachment; the *downloaded*
  attachment was fetched back through the real API and visually confirmed to
  show the photo, the stroke, and the eraser gap. Separately: `POST
  /import/document` (`routes_settings.py`, next to the existing markdown
  importer) turns a PDF/Word/slide file into notes via `markitdown` — one
  note per top-level heading when there's more than one, capped at 25 per
  upload. `core/extras.py`'s `documents` extra lost its `unavailable` flag,
  since there's now a real button behind it. Verified two ways: the whole
  suite fakes `markitdown_available`/`convert_to_markdown` (the package isn't
  in CLAUDE.md's install recipe, same as faster-whisper), and separately
  `pip install markitdown` (lightweight, unlike torch/sentence-transformers)
  and a real conversion end to end, both via the API directly and driven
  through the actual Settings → Import & export UI in Chromium.
- **§37I.** `compress_chat` joined `ask_user`/`run_skill`/`make_plan` in
  `ai/tools.py`'s `HANDOFFS` table. Decided with the user: still hand off to
  a human for review rather than auto-apply — the agent's turn ends on a
  `compress_review` SSE event, and `app.js`'s new `onCompressReview` opens
  the *same* `showCompressReview` panel the manual Compress button already
  fills in, so the two paths share one review UI rather than two that could
  drift. The summarising logic moved from `routes_chat.py` into
  `tools.summarise_turns`, shared by both the endpoint and the tool — the
  route's own tests (which pin its exact 502-vs-503 status codes) stayed
  green through the move.
- **§37K.** Decided: the bounded reading (the variation-selector audit), not
  a font swap or an accessibility mode. Swept `app.js`/`index.html` for the
  classic list of emoji with a text-default presentation and added the
  missing U+FE0F wherever one appeared in UI-visible text — left comments
  alone, since a comment rendering as a thin glyph costs nothing.
- **§37H.** Asked directly whether to spend this session on it (a full
  backend session: a new `ai/provider.py` entry, a GGUF file picker); the
  user said no. Still queued, unchanged.

ROADMAP.md's §37 subsections, its own priority-order list, and §38's item 9
are all updated in place to match — a session that reads only the "next
steps" list at the bottom would otherwise see 37G/37I/37K as still open.
Stayed under the 2,000-line lint the whole way by trimming as it went, not by
skipping the correction.

Full `pytest tests/` (~1,600+ tests), `ruff check .`, and `node --check
frontend/app.js` all green. **What's next:** §37H (llama.cpp, still needs its
own session) and §37L (the "full UI audit" umbrella — break into dated
sub-items, don't start a session on the phrase itself). Beyond §37, §38's own
item 8 (the `app.js` module split) is the next standing item — see its own
note below about why "ride in on sub-tabs" may need re-thinking now that §3
turned out to be substantially done a different way.

---

## Continued the same session: an agent-robustness pass, asked for directly

*"design the agent to be more robust. It is still very unreliable."* Asked
what "unreliable" actually meant before touching anything, since this
sandbox has no live Ollama to reproduce against and the standing caveat is
explicit that behaviour has to be checked, not guessed. The answers, in
order: **watched it happen**, on **Ollama with a small (3B–8B) model**,
across **all** of "doesn't finish multi-step jobs," "calls tools wrong,"
"claims things it didn't do," and "just breaks." A first pass down that path
(the tool-call text-recovery regex in `ai/provider.py`) was dropped after
the user corrected it directly: *"the tool calls generally work but it's
how they are used and the agent process that gets screwed up."* That
redirected the session from parsing to orchestration — a fair criticism, the
loop's tool-call recovery is already thorough (small-model prose calls,
`<think>` splitting, string-vs-object arguments); the actual gap was
upstream of that.

A third round narrowed it further: *"loses the plot half way, does actions
that don't make sense, and often says it did or will do something it did or
doesn't do."* That is a description of **skill/plan multi-step runs
specifically** — a single ordinary turn already has a lot of defence
(`EARNED_ROUNDS`, per-error recovery hints, the hallucinated-write net in
`agent.unsupported_claims`), and reading `skill_runner.py` end to end found
the real gap in the one place none of that reaches: **what one step hands
the next.**

### The bug: a step's own narration was all the next step ever saw

`step_history.append({"question": step, "answer": answer[:600] or "(nothing
said)"})` — the model's own prose summary of what it did, clipped, and
*nothing else*. If step 1 was "tag every untagged note" and its own wrap-up
said "Done, I tagged the relevant notes," step 2 ("now link those notes to
the itinerary") had no way to know **which** notes "those" meant — no ids,
just a sentence. It could re-search (and plausibly find a different set —
"does actions that don't make sense") or guess. `agent.py`'s own `change`
events (the same ones already backing the chat UI's View/Undo buttons) carry
the real note id every write tool touched; they were being collected into
the run's `changes` list for the final summary and then **thrown away**
before the next step's turn.

Fixed in `skill_runner.py`: each step now hands the next one the actual ids
its own `change` events named, appended to (not replacing) its prose —
`"Tagged them. [Notes touched this step: #5, #12]"` — truncating the prose
first if the two don't both fit in the existing 600-char budget, since the
ids are the fact the next step needs and the prose is what it can afford to
lose. Verified with a real multi-step run through `test_skills.py`'s
existing `ai_client`/`fake_ollama` harness: tag a note in step 1, assert
step 5's own message history (the one actually sent to the model) contains
`#<that note's id>` — not just that history exists, which the *pre-existing*
test only checked.

### The second bug the read turned up: `change.note_id` was sometimes a lie

Building that fix required looking at where `change` events come from, and
`agent.py`'s own construction was `"note_id": result.get("id")` —
**unconditional**. `create_document`'s own result also has an `"id"` key,
and it is a *document's* id. A skill step that wrote a document produced a
change whose `note_id` was that document's id, and the chat UI's existing
View button (§21/§22 — `changeRow` in `app.js`, already built, already
wired to `change.note_id`) would then take the user to whatever note
happened to share that id, or nowhere. That is exactly "does something that
doesn't make sense," reachable **today**, not hypothetically — any skill
that both creates a document and shows its change list hits it.

`agent._change_note_id(name, result)` now resolves the id from the field
each tool's own result actually uses (`link_notes` says `linked`,
`delete_note` says `deleted`, `create_document` isn't a note at all — `None`
rather than a wrong number) instead of assuming every write's `"id"` means
the same thing. A parallel `_change_document_id` fills in the equivalent for
`create_document`, and `skill_runner._step_answer` now names touched
documents the same way it names touched notes — `"Wrote it up. [Documents
touched this step: #41]"`. `delete_document` is destructive and never
reaches this code path (it's parked for a confirm card, not executed here),
so it needed no entry.

**Reminders, tags and categories still go through the old unconditional
path in spirit** — they were not in scope this pass (no report named them,
and `set_reminder`'s own id is rarely something a *later* step needs to
reference the way a note or document is), but the same `_NOTE_ID_FIELD` /
`_DOCUMENT_ID_FIELD` shape is now the pattern to extend if one shows up.

### What this does not claim to fix

The claim-specificity half of "says it did something it doesn't do" is
still open: `unsupported_claims`'s own docstring already says plainly it is
"a net for fabrication, not an auditor of whether the right note was
edited" — a claim like "I tagged it as Work" when the tool actually applied
a different tag would not be caught, only a claim with **no** matching write
at all. A future-tense-promise check ("I'll do that now" that never gets a
following tool call) was considered and **not built**: the existing net
deliberately excludes future tense ("we could link these" must never read
as a false claim), and distinguishing a genuine dangling promise from a
hedge or a question needs real model output to tune against, which this
sandbox cannot provide. Flagging it here rather than guessing at a regex
that could start crying wolf on legitimate suggestions.

Six new tests (`tests/test_document_tools.py`,
`tests/test_skills.py`) pin both fixes at the unit level (`_change_note_id`,
`_change_document_id`, `_step_answer`'s truncation/dedup/cap behaviour) and
one integration level (a real multi-step run through the streaming
endpoint). Full `pytest tests/` and `ruff check .` green.

**What's next on this thread, if picked back up:** the claim-specificity
gap above, and — if a report ever names it — extending the same
`_NOTE_ID_FIELD`/`_DOCUMENT_ID_FIELD` pattern to reminders. Neither is
guessed at here; both are named so a future session doesn't have to
re-derive that they were considered.

---

## Previous session: four reported bugs, then §38's ranked list worked straight through

Started with three quick user-reported UI bugs, found a second session
mid-edit on the same branch fixing one of them (the web-result buttons) —
resolved by asking the user, who kept this session going and stopped the
other. From there, worked §38's ranked priority list top to bottom without
stopping to ask, per the standing authorisation recorded lower in this file.
Seven commits, each with its own full pytest run, `ruff check .`, and real
Chromium verification (a running `uvicorn` + Playwright with a fake
microphone device where audio was involved) before being pushed.

**The three reported bugs, fixed first:**

1. **Web search result buttons squeezed the title/snippet column.**
   `.web-result-actions` was `display: flex` (row); two buttons made the
   grid's `auto` actions column as wide as both combined. Changed to
   `flex-direction: column; align-items: stretch`, and unified the ↗ link's
   bespoke pill styling with the 💬 button's `.ghost.small` look — the two
   were different radii/padding/weights stacked directly on top of each
   other, which is likely what "need to be better formatted" was pointing at
   in the follow-up round.
2. **Notes sidebar height grew without bound.** `syncNotesSidebarHeight`
   mirrored `main`'s `offsetHeight` into the sidebar's `min-height` via a
   `ResizeObserver` on `main` — but growing the sidebar grows the shared
   grid row (`align-items: stretch`), which grows `main`'s *stretched*
   height, which re-fires the observer with a bigger number. Classic
   self-triggering feedback loop. Deleted the JS entirely; `.layout`'s own
   `align-items: stretch` plus the CSS floor already produces the right
   height with nothing to loop. Verified stable across repeated
   measurements and tab-away-and-back with 25 seeded notes — the exact
   interaction a previous handover flagged as untried.
3. **No back-to-top button on Chat.** The existing button already existed
   app-wide, keyed off `.tab-page`'s own scroll position — but the chat
   page's own `.tab-page` never scrolls (the *messages* pane does), so the
   button was permanently invisible there without ever being in the
   exclusion list. Made the button chat-aware: it now tracks and scrolls
   `#chat-messages` specifically when that tab is active.

**A second round of feedback** (chat dock "bulky", web buttons still
"need better formatting", web panel "a little wider") turned out to already
be written up, reasoned through and ranked in `ROADMAP.md §37C`/`§37D` from
a previous session — built rather than re-derived: a `⚙` disclosure now
holds the answer-length/persona pair (collapses the dock from two wrapped
rows to one at normal widths), the two action buttons `align-items: stretch`
to equal width, and `#web-panel`'s default width moved up a clamp step and
gained a `min-width` floor after profiling showed `flex-shrink` was quietly
pulling it below even its *old* minimum in a moderate window.

**Then §38's ranked list, in order — items 3 through 7:**

- **§9, the graph's Arc layout.** A previous session deliberately did not
  start any new graph layout, flagging the integration risk across drag,
  zoom-to-fit, hover-adjacency, the trace overlay and the physics sliders.
  Built as a third case inside the *existing* `layoutHierarchy`/
  `hierarchyPath`/`frameTree` machinery rather than a new rendering path, so
  it inherited all of that integration the same way tree/radial already
  share it, instead of re-earning it. Scoped to the filing hierarchy
  (category/`parent_id`), matching tree/radial's own convention, not
  `entry_links` — a deliberate departure from BACKLOG.md §9's original "arc
  = links as arcs" line, written up there as such rather than silently
  reinterpreted. Mind map, treemap/sunburst and adjacency matrix are still
  unbuilt; none of them reuse today's static-hierarchy shape for free the
  way Arc did, so each is its own scoping question.
- **§10C, the Timeline's branch/line view.** A `View: Grid / Line` picker;
  the line reuses the grid's own category/tag bands rather than §9's
  separate cluster-detection endpoint — a deliberate scoping call, written
  up in BACKLOG.md §10, over the original sketch's "linked-note cluster"
  option. **Found and fixed a real bug while verifying in Chromium**: the
  spine and branch-stub SVG lines have `fill: none` but are still
  hit-tested along their stroke by default, and a deep band's stub runs
  *past* every shallower lane on its way down — painted later, it silently
  ate clicks meant for their dots. `pointer-events: none` on all three
  decorative line types fixed it. This is the same shape of bug this file's
  own trap list already warns about (a private stacking/hit-testing quirk
  no amount of reading the code would have surfaced) — driving it in a
  browser is what found it.
- **§17, meeting notes.** Record → transcribe → review → save, a new
  `/voice/transcribe-meeting` endpoint (300MB ceiling, vs. the existing
  spoken-note endpoint's 25MB) sharing one `_transcribe_upload` helper with
  it. **Action-item extraction — the feature's other half — was
  deliberately not built**: it needs a real model call parsing free text
  into several structured reminders, and this sandbox has neither
  faster-whisper nor a running Ollama to check a new prompt's behaviour
  against. Verified everything that could be verified without either: the
  full record → (mocked) transcribe → review → save round trip in Chromium
  with `--use-fake-device-for-media-stream`, the timer ticking in real
  time, the graceful "faster-whisper not installed" path (genuinely true
  here), and the saved note existing via the API with the right tag.
- **§27, onboarding diagnostics.** A new "Your setup" slide reports Ollama
  reachability and where the notebook lives/how big it is — needed **no new
  backend**, since `/models/status` and `/storage` already existed and
  already power the header pill and Settings → Data. Placed second (before
  the capture slide), so a first capture landing in `Uncategorised` reads as
  "Ollama isn't on yet" rather than "broken". The former "Explore your
  graph" slide now also names the Timeline's Line view, closing
  ANALYSIS.md's "product differentiation" gap with existing slide
  machinery. Offering to pull a model, a `MEMORYMAP_DATA_DIR` writability
  check, and the name/first-note/model-choice steps are still open —
  BACKLOG.md §27 draws the line precisely.

**What's next, and why this session stopped here rather than continuing
down the list:** §38's remaining two items both genuinely need something
this session couldn't supply itself. **Item 8, the `app.js` module split**,
is a large mechanical refactor of a ~20k-line file with no single
obviously-safe next slice — the roadmap's own sequencing says it should
ride in on the sub-tabs work, which hasn't started as its own initiative.
**Item 9, the rest of §37** (37G sketch image-upload vs. markitdown, 37H
llama.cpp wiring, 37I compress-as-agent-tool, 37K emoji rendering, 37L the
full-UI-audit umbrella) each explicitly need one clarifying question
answered before they can be scoped at all, per §37's own writeup — guessing
at the answer rather than asking would be exactly the kind of ungrounded
work this file's standing caveats warn against.

**What I could not check, unchanged from previous sessions**: anything
involving a real model's actual behaviour (Arc's and the Timeline line
view's *rendering* was verified with real seeded data; the meeting
recorder's *transcription* itself was not, for the reason above), and the
desktop shell.

---

## Same session, continued again: four reported bugs, fixed as a bounded side-trip

After §38's audit and its first three items landed, four real bugs were
reported live against this branch (not `main` — confirmed before touching
anything, since a mismatch there would have meant the fixes were already in
and just unmerged). Treated deliberately as **contained work**, not a new
priority list, given the whole point of this session was that §35–37 kept
doing exactly that. All four are in ROADMAP.md §38a with the full reasoning;
short version:

1. **Notes sidebar gap** — an uncommented `align-self: flex-start` silently
   overrode the "stretch, not start" fix .layout's own comment already
   describes, plus a fixed-height CSS var that couldn't grow past its own
   guess. Fixed with a `ResizeObserver` mirroring `main`'s real height.
2. **Timeline text still cut off** — §37J's column widen wasn't enough
   against a 120-char preview at 2 lines; 13rem + 3 lines gets close to the
   full text instead of a marginal gain.
3. **A tagged note missed because the remembered date was wrong** — "that
   joke... two weeks ago" (actually three) hard-filtered to empty. Added an
   un-dated subject-only fallback, labelled `outside_range` so it's never
   mistaken for an in-window match — deliberately the mirror image of a
   fallback already rejected in the code for good reason (dropping the
   *subject* and keeping the date instead), not a reopening of that decision.
4. **A second O(n²) trap**, found because the user asked for a backend
   sweep after the third fix: `GET /entries/link-suggestions` called a full
   embedding scan once per entry. Rewritten to fetch every vector once and
   compare pairs in memory, matching `routes_graph._similarity_edges`'s
   already-correct shape.

**Storage was also checked** (asked for directly): ARCHITECTURE.md §8 now
has real numbers from `scripts/scale_test.py` — ~350MB at 200,000 notes with
real embeddings, attachments/`entry_revisions`/`audit_log` flagged as the
parts that don't scale with note count and weren't sized this pass.

**Also fixed while checking accuracy**: README.md's "Next up" list was stale
(items already done, like the Library tab work, still listed as pending) and
its Whisper claim was wrong — `faster-whisper` already powers single-note
dictation, it's *longer* transcription that's unbuilt. Corrected in
README.md and the two spots in ROADMAP.md that repeated the same claim.

Full suite green, `ruff` clean, all new/existing tests covering the four
fixes pass. **Next: back to §38's own list** — item 3 (graph layouts,
properly scoped for its own session) or item 4 (Timeline branch/line view).

---

## Same session, continued: the roadmap was re-audited and re-prioritised

The user pushed back, correctly: three sessions in a row (§35 → §36 → §37) had
kept extending the newest polish batch instead of touching the other 34
sections underneath it. Asked for the roadmap to be honestly re-prioritised
and then worked through **without stopping to ask** — treat that as standing
authorisation for this and future sessions to keep pulling from
[ROADMAP.md §38](../ROADMAP.md#38-where-this-actually-stands--the-backlog-audit)
until told otherwise.

**What happened:** a full audit of BACKLOG.md (§1–§29) and ANALYSIS.md
(§30–§34) against the actual code, not the backlog's own prose. Found real
staleness in both directions — §4 (Library tab), §11 (hybrid retrieval), §16
(status bar, listed twice) in BACKLOG.md, and §33/§34 in ANALYSIS.md were all
marked open for things that are built, including the project's own outside
review's #1 recommendation ("finish the agentic loop") being satisfied by
`run_skill`/`make_plan` without ever being marked so. Each is corrected in
place, not just noted in ROADMAP.md. §38 is the new live front door and
supersedes §37's own priority list; **read §38 first**, before anything else
in this file including the section below.

**§38's first item is done too, same session:** the notebook was actually
scale-tested (`scripts/scale_test.py`, a generated fixture up to 50,000
notes), not just flagged as untested. Found two real N+1 query patterns —
`GET /graph` resolving each note's category with its own `session.get()`
call, `search_manager.semantic_search` materialising a full `Entry` ORM
object for every embedded note just to score most of them away — profiled,
not guessed at (10,000 category lookups were 87% of one `GET /graph` call's
time on a 10k-note notebook). Both fixed the same way: score or match against
raw ids first, fetch the real `Entry` rows only for what survives. Real
numbers at 50k notes: `GET /graph` 19s→1.8s, chat's search 6.6s→0.5s, the
`related_notes` agent tool's neighbour-suggestion call ~20s→1.3s. Pinned by
`tests/test_scale_query_counts.py` (a query *count*, not a timing — timing
assertions are flaky under CI load). Full writeup, including what's still
open (`GET /graph?similarity=true` is a real O(n²) — 30 seconds at just 2,000
notes — and is off by default rather than fixed), is in ANALYSIS.md §34,
item 2.

**§38's second item is done too:** a headless Playwright smoke suite,
`tests-e2e/` (own `package.json`, doesn't touch the no-build-step frontend),
wired into `.github/workflows/ci.yml` as a new `e2e` job. Verified locally
against a real running app before being trusted, not just authored — and it
paid off immediately: it caught that "documents" is in `app.js`'s own `TABS`
array but has had no `#tab-btn-documents` in the nav bar since §36F replaced
it with Library, which a test written from the array alone (what a first
draft did) would have silently gotten wrong. Covers every tab actually
reachable from the bar for console errors, uncaught exceptions and
horizontal overflow, plus one real interaction (capture a note, see it in
Browse).

**§38 item 3 (graph layouts) was checked, not built — a deliberate stop, not
a skip.** `renderGraph()` is tightly integrated across drag, zoom-to-fit,
hover-adjacency, the trace overlay and the physics sliders; a new layout
means plugging into all of that, not writing one D3 function. Attempting it
at the tail end of an already long session risked exactly the
half-integrated feature CLAUDE.md warns against, so it's written up in
ROADMAP.md §38 as needing its own session with room to verify visually
against every one of those interactions — the same shape of call as §37E's
design-spike recommendation, not an excuse.

**§38 item 5 (Chat/Agent/Browse) turned out to be substantially done
already**, checked rather than assumed either way: the Ask/Request mode
toggle, the web panel column and `make_plan`'s ticked-step display satisfy
its substance through a different — and per §36G's own reasoning, better —
shape than literal sub-tabs. One small real gap noted in BACKLOG.md §3 (no
user-facing tool-allowlist/max-rounds control in Agent mode) and left
unbuilt as not worth its own session. **Next: §38 item 3 (graph layouts, now
properly scoped) or item 4 (Timeline branch/line view).**

**The corrected order, top of it:** scale-test the notebook past a few
hundred notes (cheap, flagged by the outside review, never done), a headless
Playwright smoke suite in CI (the actual fix for "every layout bug passed a
green run"), graph layouts beyond tree/radial, the Timeline branch/line view,
Chat/Agent/Browse sub-tabs, meeting-notes/transcription, onboarding
diagnostics, then the `app.js` module split riding in on the sub-tabs work.
Full reasoning for each is in §38.

---

## Previous entry in this session: §37's top five, done

Worked §37's own priority list in order, straight through 37B–37E. **37B
decided (no lock-screen Quit button — the LAN-DoS trade-off wasn't worth a
convenience button, decided with the user directly). 37D.1, 37J, 37F and 37E
are built and verified in Chromium** — details and reasoning are in
ROADMAP.md's §37B/§37D/§37F/§37J/§37E, updated in place rather than duplicated
here. **Next up per §37's own ranking: 37C, the chat dock density pass** —
37C's own note says to re-look at it only after 37E ships, which it now has.

**37F had a real surprise worth internalising**: most of "the graph toolbar is
bulky" was already fixed the *day before* that section was written
(`3e77f57`) — the roadmap text describing twelve controls in one row was
stale the moment it was committed. Checking the running app first (not just
grep, an actual look) is what caught it; building against the roadmap
paragraph instead would have redone finished work. The one genuine gap —
Trace as a permanent row — was real and is now fixed.

**37E (zoom) turned out to need less new design than its own write-up
expected**, because a check answered the "which CSS mechanism" question before
any prototype branch was needed: `data-fontsize="small"/"large"` already
scales the root font in production, and control heights/icons are already in
rem, so a root-`font-size` percentage was already proven to reach everything.
The one real design question — zoom fighting Text size over the same
`font-size` property, not zoom fighting density as §37E's write-up predicted —
was solved with one multiplying custom property (`--zoom`, composed via
`calc()`), not a rethink of either control.

**What I could not check:** anything about a real model (unchanged, standing
caveat), and the desktop shell. Everything UI in this session's five items
*was* driven in Chromium — screenshots, a resize drag measured before and
after, root `font-size` measured in the DOM at three zoom levels, full page
reloads to confirm `graph-trace-open`/web-panel-width/zoom persistence
(including via the server-mirrored `ui_state` path, not just `localStorage`),
and a full `pytest tests/` (~1,600 tests) plus `ruff check .` green after each
batch.

---

Written at the end of the session that **deleted three surfaces**, moved web
search out of the chat dock, added embedding-model management, and — in a long
follow-on round the same session — fixed six more reported bugs and triaged a
much bigger list into [ROADMAP.md §37](../ROADMAP.md#37-reported-in-one-session--the-second-big-batch-reprioritised).
Everything here is either a fact you can check or a thing I could not check and
am saying so about.

**Start at [Where to start next](#where-to-start-next--ranked-with-the-reason).**
That section now leads with §37 — read it first, the ranked list below it is
what came before.

---

## Read this before you touch anything

**Every UI fix this session was measured in Chromium first, and the
measurement was the fix each time.** Not a slogan — the record:

| Reported as | What the browser said |
| --- | --- |
| "the ui issue with the bottom dock" | Dock box ending at y=614, composer at y=814. 200px outside the card, Send below the window. |
| "the web search panel dock is squashed ugly" | A search box, a results list and a whole web page inside `min(38vh, 20rem)`. |
| "the graph is out of the main ui panel again" | `min-height: 22rem` under the map + a two-row legend > a 700px window. |
| "the notes sidebar too" (a second sidebar, same day) | Both were 22px too tall. One `calc`, written by hand in three rules, each missing the page's bottom padding. |
| "the embedding model doesn't redownload every time, right?" | Right — those are HuggingFace *metadata* requests, not the weights. |
| "quick sketch's Close button just darkens the background" | Confirm dialog at z-index 55, sketch overlay at z-index 60 — the dialog painted behind it. `elementFromPoint` on the confirm card returned the sketch card underneath it. |
| "before signing in, a popup says failed to load entries" | A stale token in `localStorage` fires a dozen bootstrap requests before unlock; each 401 correctly showed the lock screen *and* was separately toasted. |

A bug reported twice on two different
surfaces is usually one bug in a shared expression (the sidebar heights, both
missing the same padding term), and a bug that darkens a whole screen with no
visible dialog is usually two elements at the same z-index tier fighting over
which paints on top, not something actually broken inside the dialog itself.
`--page-sticky-h` names the first kind now; look for the second kind — a
private `z-index` outside the shared 55/60 tiers — before assuming a reported
"nothing happens" click is a logic bug.

The app runs on localhost and the sandbox has Chromium. **Reproduce first.**

---

## The traps that will cost you an hour each

1. **Any `100vh`/`vh` sum is already wrong.** Unchanged from the last
   handover and it bit twice more this session — `46vh` for the logs list and
   `min(38vh, 20rem)` for the web panel, both of which were guesses at how
   much of the window some *other* furniture was using. **Anything sized
   against the window goes through `--page-viewport` or `--page-sticky-h`.**
   Better still, size it against the box it is actually in: the chat sidebar
   needs no arithmetic at all now, because its grid area is already exactly
   the right height.

2. **A flex parent that can shrink, with children that cannot, does not clip
   — it overflows.** `.chat-dock` was `flex: 0 1 auto` with every child at
   `flex: 0 0 auto`. The box shrank; the contents did not; they drew straight
   through the bottom of the card, and the card's rounded corner cutting
   across the middle of a control is what that looks like. **If a container
   is allowed to shrink, something inside it has to be allowed to shrink too,
   or it must not be allowed to shrink at all.**

3. **A stacking context you cannot see.** `backdrop-filter` creates one. So
   does `position: absolute` with any `z-index`. Fix by lifting the *owning*
   element (`.menu-open`), never the menu. Still true, still the first thing
   to check when a menu is reported behind something.

4. **A lint that slices a fixed number of characters will fail on a
   comment.** `test_frontend_ids.py` did, and a lint that fails on prose is a
   lint people learn to weaken. It slices to the end of the function now.

5. **Two overlays at a private `z-index: 60` will eat a nested confirm
   dialog.** `#sketch-overlay` and `#improve-overlay` both sat above
   `.modal-overlay`'s shared `z-index: 55` — the same tier toasts and popups
   use, for a reason that had nothing to do with either overlay. Any modal
   that might one day open a `confirmDialog()`/`promptDialog()` on top of
   itself has to be at 55, not 60, or the confirm paints underneath it and
   looks like a click that did nothing. **Grep for `z-index: 60` before
   building a new full-screen overlay** — it is currently only toasts, the
   command palette, the notification panel and the AI-status popup, and none
   of those ever open a nested dialog on top of themselves; a new overlay
   that copies the number without copying that property is this bug again.

6. **A per-step `.catch()` in a bootstrap loop will re-report a session-wide
   condition as N separate failures.** `startApp()`'s `step()` helper toasts
   whatever error each parallel request throws, which is right for a request
   that actually failed on its own and wrong for "the token expired," which
   `api()` already announces once by showing the lock screen. **Any error
   that is really "this whole session is in state X," not "this one call
   failed," needs a marker property** (`error.isLockout` is the one example
   now) so a generic retry/report loop can tell the two apart — the loop
   cannot know from the error's `.message` alone.

---

## What is now true that wasn't

### The three panels are gone (§36G) — the first surface this project removed

`#bin-panel`, `#activity-panel`, `#tags-panel`, `renderBin`, `renderActivity`,
`renderTags`, `PANELS`, `showPanel`, the `.panel-close` wiring, the
`#bin-empty` handler and `entryItem`'s `options.bin` branch.

The prerequisite was **reading a binned note in full** (`#binned-overlay`,
`GET /entries/{id}?deleted=true`), which was the one thing the panel could do
that a Library card could not. §36G now records the rule that came out of it:
*a surface may be replaced without being deleted, but only for as long as it
can still do something its replacement cannot — so write that thing down when
the replacement ships, because it is the whole of the remaining work.*

### Web search is a column, not a drawer in the dock

The dock is a control strip and its job is to stay short. A reading surface
inside it had to be capped, and the cap made it unusable — the two symptoms
(pushing the composer off the bottom, then being too small to read) were the
same mistake from either side. As a column beside the conversation it needs no
cap at all, and you can read a source and type about it at once.

**`fitComposerToDock` is the other half.** A hand-dragged composer height is a
preference and is kept as one: only the *applied* height is trimmed to the
room the card has, never `localStorage`, so the box comes back to what you
dragged it to the moment the window is big enough. It iterates, because one
subtraction does not converge — the message list grows into the height the
composer gives back.

### Optional extras and embedding models are one screen

Both are "things downloaded to this machine, with a way to undo it".
`core/extras.py` and `core/embedmodels.py` share a security property that must
survive any change: **the request names an allowlist entry, never a package or
a repo id.** It matters more for models, because removal deletes a directory.
HuggingFace's `org/name` → `models--org--name` flattening is itself the
traversal defence — it looks like formatting, so there is a test saying so.

`unavailable` on an extra greys the button out **and** refuses the request
server-side. The greyed button is a courtesy; the refusal is the rule.

### A 🧭 Plan button, and skills that take you to themselves

`make_plan` has existed since §35K with no way to ask for it. The button sends
what you typed with a sentence asking for a plan — a sentence rather than a
request flag, because the planning path is the model's own tool and a second
route into it could drift from the first.

`startSkill` now switches to the chat tab. It did not, so a skill started from
the dashboard streamed into a tab nobody was looking at.

### A second round: six more reported bugs fixed, a much longer list triaged

The same session, after the handover above was mostly written, took a long
follow-on list of reports. Six were small and clear enough to fix on the spot
(§37A: the sketch close bug, the app-wide select-arrow fix, the notes-list
toolbar heights, the category-actions/count clash, the pre-auth toast noise,
the dashboard-first-load default) and are described with their reasoning in
[ROADMAP.md §37](../ROADMAP.md#37-reported-in-one-session--the-second-big-batch-reprioritised).
The rest — a chat-dock density pass, a resizable/refined web panel, a UI zoom
setting, the graph toolbar, sketch image/document upload, llama.cpp, chat
compression as an agent tool, a real Timeline fix, emoji rendering, and the
"full UI audit" umbrella — is triaged there too, in priority order.

**One deliberate non-decision:** a Quit button on the lock screen was asked
for and is not built. It needs `/shutdown` reachable without the unlock
token, which is a real trade-off (§37B) — building it silently inside a batch
of forty other fixes would have hidden a decision about the auth model that
deserves to be made in the open.

**The roadmap's own top-level "here's what to do" sections had also drifted**,
and this was the session that found it: "Priority map" listed the Library tab
as an open Tier 3 item after it had been built *and* had panels deleted from
it. All three legacy priority sections (`Next session: start here`, `Do these
next`, `Priority map`) now carry a correction note pointing at what's actually
still open, and the fully-closed security-audit tier moved to HISTORY.md so
ROADMAP.md stayed under its own 2,000-line lint.

---

## What I could not check, and you should not assume

1. **Anything involving a real model.** Unchanged, and still the standing
   caveat. The 🧭 Plan button's instruction text has never been tried against
   a running Ollama — the *machinery* is the proven §35K path, but whether a
   7B model reliably reaches for `make_plan` when asked in those words is
   untested. It is one string, `PLAN_PREFIX` in `app.js`.
2. **The embedding-model download itself.** `huggingface_hub` is not
   installed in the sandbox (it arrives with `sentence-transformers`, which
   must not be installed here), so `can_download()` is false and every test
   covers the refusal path, the allowlist and the size calculation. **The
   happy path — `snapshot_download` actually fetching a model — has never
   run.** It is four lines; look there first if a download misbehaves.
3. **SearXNG autostart.** No Docker in the sandbox. The preference, the
   plumbing and the startup hook are wired and the thread is started; the
   container coming up is unverified.
4. **The desktop shell and Windows.** Unchanged.
5. **The graph's new world box.** The clamp that keeps nodes in frame used to
   clamp to the *viewport*, which is wide and short — so repulsion pushed
   outwards, the walls pushed back, and seventeen notes settled into a
   lattice. Reported as *"the graph nodes are like locked into a box"*, which
   is exactly what it was. The world is `1.8 ×` the frame now, so the forces
   decide the shape and the clamp only bounds the endless drift it was written
   for. **The reasoning is solid and I could not observe it** — the sandbox
   reclaimed the server three times at the end of the session. `ruff`, the
   full suite and `node --check` pass; the change is one constant and two
   comparisons in the tick handler. Look at it first if the graph is reported
   wrong, and if 1.8 is too loose the fit will simply start further out.
6. **The Library's ⋯ menu positioning.** Reported this session as "off in
   positioning" on the cards view. I could not reproduce it before the session
   ended — `.menu-wrap` is already `position: relative`, so `right: 0` should
   anchor the menu to the ⋯ button, and what the screenshot shows may be the
   menu correctly covering the card *below* rather than being mispositioned.
   **Not fixed, and not investigated to a conclusion.** Measure it with
   `elementFromPoint` before changing anything.
7. **"The notes sidebar keeps changing its height slightly, increasing the
   gap at the bottom."** Checked and *not* reproduced: `#sidebar`'s height
   measured identically 1.5 seconds apart, idle, on the browse section with
   two categories. That is not the same as confirming there is no bug — it
   means whatever triggers it is an interaction I did not try (switching
   sub-tabs and back, a widget re-render after `loadCategories()`'s
   deliberately-unawaited fetch resolves late, a tag-suggestion refresh). The
   sidebar's own height rule (`height: var(--page-sticky-h)`, fixed this
   session) should make this structurally impossible now regardless of cause
   — it no longer sizes to its own content — but say so only after it is
   re-reported, don't assume it's already covered.

---

## Where to start next — ranked, with the reason

**A second, larger batch arrived after most of this handover was written —
start with that.** It is triaged and ordered in
[ROADMAP.md §37](../ROADMAP.md#37-reported-in-one-session--the-second-big-batch-reprioritised),
at the user's explicit request to reprioritise before doing anything else.
Six items in it are already fixed this session (§37A) and verified in
Chromium; the rest is ranked in §37's own "Priority order for the next
session" list at the end of that section. The short version, so you don't have
to follow the link immediately:

1. **§37B — a five-minute decision with the user**, before anything else: does
   the lock screen get a working Quit button, which means an unauthenticated
   `/shutdown`-equivalent route. The trade-off (local-only vs LAN exposure) is
   written out in full there. Two other things are blocked on the answer.
2. **§37D.1** — make the web panel resizable. `makeSidebarResizable()` already
   does this for three sidebars; the web panel isn't in that function's list
   yet, and it doesn't size itself the way the other three do (a `flex` clamp
   rather than a grid column), so it needs the drag-handle treatment adapted
   rather than a one-line addition.
3. **§37J — the Timeline.** Genuinely broken, not merely unpolished: clipped
   two-line chips in ~88px columns, showing raw `**markdown**` syntax via
   `textContent` instead of `renderMarkdown`. **One correction to make before
   starting:** the overlapping-labels screenshot in that same report is the
   *Graph* tab, already fixed this session by widening the simulation's world
   box (below) — don't re-diagnose it as a Timeline bug.
4. **§37F — the graph toolbar.** Four bands of chrome (heading+search,
   layout/colour, trace row, legend) before the map on the one tab whose job
   is the map. Same grouping technique §36B already proved twice.
5. **§37E — a UI zoom setting.** The single highest-leverage item on the list
   (asked for because a 13" laptop needs ~80% browser zoom to see the app
   comfortably) but it needs a real design spike first — `zoom` vs a root
   `font-size` percentage vs `transform: scale`, each with different
   interactions with `--page-viewport`/`--page-sticky-h`. §37E has the
   trade-offs written out; do the spike before committing to an approach.
6. **§37C — the chat dock, again.** Two sessions have fixed real bugs in it
   without the "bulky" report going away, which means what's left is a density
   pass, not a bug — and §37C says to re-look at it *after* §37E ships, since
   some of "bulky" may resolve once zoom exists.
7. **§37I — compress-as-an-agent-tool.** Needs one design decision first (does
   the agent's own compression skip the human review step the feature was
   built around, or hand off mid-run?) — §37I lays out both sides.
8. **§37G / §37H / §37K** each need one clarifying question answered before
   they can be scoped (sketch image-upload vs the markitdown PDF-importer
   already on the books; llama.cpp wiring, which is a full backend session;
   what "change how emoji render" actually means). Ask, then schedule.
9. **§37L** is the umbrella "full UI audit" ask — deliberately not a task to
   start a session with. Break it into dated sub-items as capacity allows, the
   way §36 itself was built up piece by piece.

### Also still open, from before this batch

#### 1. The document editor, now that it is not a tab

It is reached only from the Library. That frees it to stop being a page laid
out around a list that has left: a wider writing column, and the outline and
"notes it draws on" panels earning their place beside the text instead of
sitting folded shut under a switcher. Asked for directly and still only half
done — the sidebar is fixed, the editor itself is untouched.

#### 2. The Library's ⋯ menu, properly measured

See caveat 6 above. It is a live report and it is unresolved. Half an hour
with `elementFromPoint` settles whether there is a bug at all, which is worth
more than a blind fix.

#### 3. §36G's bookshelf theme, the next two pieces

The spine is built. Next: **shelf rows** with a rule under each group when
sorting by kind, and an **empty state drawn as an empty shelf**. The rule to
hold to is in §36G — anything decorative that makes a card harder to scan
loses to the scan.

#### 4. markitdown, and the sketch pad's image upload — now linked (§37G)

`markitdown` wants a "bring in a PDF as notes" button; §37G's sketch-pad ask
("upload documents and images") may be asking for exactly that button, or for
something scoped inside the sketch pad only — worth confirming with the user
which, since the two are different amounts of work. `llama-cpp-python`'s wiring
is now §37H, with its own scope written out (a new provider, a GGUF file
picker — budget a full session).

#### 5. Two things that are decided, so do not re-derive them

- **Absorbing the Notes tab into the Library: no.** Reasoning in §36G. The
  Library *manages*, the Notes tab *works*.
- **The tab bar is the right length.** It wraps below ~1350px, measured.

#### 6. The largest untouched things

**§9's decorative half** (skins, minimap, PNG/SVG export of the current view)
and **§10's `events` table**, so the Timeline's bands can be events and places
rather than only categories and tags. §37J is a nearer-term Timeline pass and
should probably happen first, since it fixes what's broken before adding what's
missing.

---

## Practical notes for the next session

- **Running the app:** `PYTHONPATH=src MEMORYMAP_DATA_DIR=<scratch> .venv/bin/python -m uvicorn memorymap.api.app:create_app --factory --port 8781`.
  The `PYTHONPATH` is required and is not in CLAUDE.md's recipe. **Restart it
  after any Python change.** Start it with `setsid … < /dev/null &` — a plain
  `&` in this sandbox dies with the shell that launched it, which cost this
  session three restarts.
- **Do not install torch** or `sentence-transformers`. The suite passes
  without both, and `huggingface_hub` is absent for the same reason.
- **Driving it:** a small `drive.js` that launches Chromium, does first-run
  setup and skips the onboarding overlay is the whole harness.
  `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, require
  `/opt/node22/lib/node_modules/playwright`.
- **`fetch()` inside `page.evaluate` will 401.** The app's `apiJson` adds the
  unlock token; a bare `fetch` does not, and a 401 in a probe looks exactly
  like a feature that does not work. Call `apiJson` from the page instead —
  it is a module-scope function and is reachable as a bare identifier.
- **A dragged composer height is mirrored to the server** (`ui_state`), so it
  survives a fresh browser profile. Clearing `localStorage` alone will not
  reset it, which will confuse a screenshot.
- **Graph traps, still true:** press the `.graph-core` circle, not the
  `.graph-node` group; a module-scope `let` is not a property of `window`.
- **`elementFromPoint` is how you prove a stacking bug.**
- **Lints that are load-bearing:** `test_style_scale.py`,
  `test_frontend_ids.py`, `test_frontend_handlers.py`, `test_docs_layout.py`,
  `test_docs_site.py`, `test_ui_state.py`, `test_chat_dock.py`. If one fails
  it has found something — **except** when it has found a comment, which
  happened this session; fix the lint's brittleness, not the prose.
- **`test_docs_site.py` mirrors CHANGELOG/CONTRIBUTING/SECURITY into `docs/`.**
  Editing the root copy fails the build until you `cp` it across.
- **CI runs `ruff check .`** and CodeQL. CodeQL has now found two
  `py/polynomial-redos` in `search/query.py` in consecutive sessions; both
  times the fix was `str.split` and a set. **A character class with `*` or
  `+` next to an anchor is the shape to avoid.**
