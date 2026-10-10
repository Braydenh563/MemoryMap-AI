# Session briefs: the week's work, written so a smaller model cannot lose the thread

**Status: written by direct instruction as the execution companion to
[WORLD_CLASS_PLAN.md](WORLD_CLASS_PLAN.md) §11.** Each brief below is
complete on its own: the goal, what "done" means, the decisions already
made (do not re-decide them), the exact files and functions, the tests to
write first, the steps in order with the commands, the traps, and what to
report. A session takes ONE brief, reads §0, reads the brief, and starts.
Nothing here needs a design judgement; where one was needed it is written
down, with the reason, so it does not get remade worse under time
pressure.

Back to [../ROADMAP.md](../ROADMAP.md).

---

## 0. The operating protocol (read every session, it is short)

1. **Start.** `git fetch origin claude/epic-ramanujan-8xocc0 && git checkout
   claude/epic-ramanujan-8xocc0 && git pull` (or the branch you were given).
   Read `CLAUDE.md`, then `HANDOVER.md`'s first 100 lines, then this file's
   §0 and your brief. Nothing else before the first commit.
2. **Check the running app before building.** Start it
   (`bash scratchpad/ui-sweeps/serve.sh 8781 /tmp/mm-<brief>`), drive it with
   Playwright (`scratchpad/ui-sweeps/lib.js`, `boot({viewport})`, password
   `testpassword123`, `THEME=dark` for dark; `waitUntil: "domcontentloaded"`
   plus `waitForTimeout`, never `networkidle`). Grep for the feature. If it
   exists, your job is "make it meet the brief", not "rebuild it".
3. **Tests first.** Every brief names its tests. Write them, watch them fail
   for the right reason, then build. A test that passes before you build
   is a test of nothing.
4. **One step, one commit.** Commit after every numbered step with the
   trailer lines the repo requires (see any recent commit). The container
   can restart; uncommitted work is gone.
5. **Measure, do not look.** A claim about the UI needs a number from
   `page.evaluate` (`getComputedStyle`, `getBoundingClientRect`,
   `scrollHeight` vs `clientHeight`) or from `scratchpad/pngpixel.py`. A
   screenshot is for you, not for the report.
6. **Gates before push.** `.venv/bin/ruff check .`, `node --check` on every
   JS file touched, the brief's named tests, then the lints:
   `python -m pytest -q tests/test_style_scale.py tests/test_ui_signatures.py
   tests/test_css_braces.py tests/test_frontend_ids.py
   tests/test_frontend_handlers.py tests/test_dock_grammar.py
   tests/test_docs_layout.py tests/test_asset_cache_busting.py`, then
   `scratchpad/ui-sweeps/errors.js` (0 console errors at 1440, 1024, 390).
   Restart the server after any Python change.
7. **Scope.** The brief is the scope. Something adjacent that is broken
   goes in your report's "found, not fixed" list with the file and line,
   unless it blocks the gate.
8. **Copy.** Sentence case. No em-dashes anywhere (a lint will fail you).
   No "Oops", no exclamation marks. One line of description per section;
   longer help goes behind a `data-help-for` '?' button.
9. **When blocked** (a tool you cannot install, a test that cannot pass on
   the sandbox), do every step that does not depend on it, say exactly
   what blocked you and how you verified that it did, and stop. Never
   skip, disable or weaken a test to get green.
10. **Report** in five lines: status, commits, numbers measured
    (before/after), what could not be verified and why, found-not-fixed.
    Then add the same to `HANDOVER.md` under a dated heading, at the top.

The four failure shapes reviewers look for first (from `CLAUDE.md`), so
you can check your own diff for them: a working thing rewritten into a
riskier thing; a feature that never ran once (grep the call site of
anything new); a guard removed while the shape around it was kept; a
policy silently refusing the work (inline `style=` is rejected by the CSP;
use `el.style.x =` or a class).

---

## Brief 1 (Mon, Sonnet): the em-dash sweep and its lint

**Status: done on 2026-09-08 (sweep 7b9ed67, lint `tests/test_no_em_dashes.py`, suite green in CI). Start at Brief 2.**

**Goal.** Zero em-dashes in `frontend/` and `src/`, with a lint that keeps
it so, and no test broken by the change.

**Done when.** `grep -rc ', ' frontend src | grep -v ':0'` prints nothing;
`tests/test_no_em_dashes.py` exists and passes; the full suite is green.

**Decisions made.** The replacement rules are in `scratchpad/emdash.py`
(bullet, pair, short-lead colon, long-lead comma). Do not invent new rules;
if a line reads badly after the sweep, fix that line by hand and note it.
`docs/` is not in scope (comments and plans may keep their dashes; the
owner's complaint is the app's own copy).

**Steps.**
1. `git merge` any open agent branches first if told to; otherwise start.
2. `python3 scratchpad/emdash.py frontend src tests` and read the printed
   per-file counts.
3. `node --check` every `frontend/js/*.js`; `.venv/bin/ruff check .`.
4. Run `python -m pytest -q tests/` (7 to 8 minutes). Tests that asserted a
   string with an em-dash now fail; fix the expected strings in the tests,
   never the code, unless the code's new string is wrong.
5. Grep the results for lines that now read badly: `git diff | grep "^+" |
   grep -E ": [a-z]|, [A-Z]" | head -50` and fix by hand.
6. Add `tests/test_no_em_dashes.py`: walk `frontend/` (excluding `vendor/`)
   and `src/`, assert no file contains an em-dash, with the message "an
   em-dash in <path>:<line>; rewrite the sentence (colon, comma or full
   stop)".
7. Commit: "No em-dashes in the app's own files, with the lint that keeps
   it so". Push.

**Traps.** The system prompt of the agent (`src/memorymap/ai/agent.py`) is
budgeted by `PROSE_BUDGET_CHARS`; the sweep shortens it, so the assertion
still passes. `frontend/vendor/` is third-party: exclude it in both the
sweep and the lint.

---

## Brief 2 (Mon, Sonnet): the consistency lints

**Goal.** The five rules of WORLD_CLASS_PLAN §1 become tests that fail the
build. Nothing else changes in this session unless a lint finds a real
violation that is a one-line fix.

**Done when.** Five new tests pass on the branch, each with at most three
explicitly listed, justified exemptions.

**Decisions made.** Lints are static (Python over `index.html` and the CSS
files), not Playwright, so CI runs them. A lint that needs the DOM goes in
`scratchpad/ui-sweeps/docks.js` instead.

**Tests to write.**
- `tests/test_surface_budget.py`: parse `frontend/index.html` with
  `html.parser`; fail on an element with class `card` inside another with
  class `card`, `panel` inside `panel`, `glass` inside `glass`, and on any
  `summary` carrying a button class (`btn`, `ghost`, `primary`).
- `tests/test_one_primary.py`: for every element with `data-dock-name` and
  every `.modal`, count descendants with class `primary`; assert ≤ 1.
- `tests/test_meta_is_quiet.py`: for every CSS rule whose selector ends in
  `.chip`, `.meta`, `.badge` or `.tag`, assert no `border:` other than
  `none`/`0`, and that no `:hover` rule targets them (the interactive
  variant `.chip-interactive` is the one exemption).
- `tests/test_keymap.py`: find `const KEYMAP = {` in `frontend/js/app.js`
  (create it in this session by moving the existing `keydown` bindings'
  key strings into one table with a `surface` field; the handlers stay
  where they are and read the table); assert no key is bound twice on the
  same surface.
- `tests/test_menu_recipe.py`: every CSS rule whose selector contains
  `menu-item` or `dock-menu-list button` has `background: transparent` or
  no background at rest.

**Steps.** One test per commit, in the order above; run each against the
branch, list the violations it finds, fix the one-liners, exempt the rest
with a comment naming the brief that will fix them (usually Brief 10 or
11), and move on.

**Traps.** `html.parser` does not give you CSS-selector matching; keep a
class stack as you walk the tree (see `scratchpad/help-audit/count.py`
for the shape). The CSS files are eight numbered files plus
`08-consistency.css` from the menus/bars agent; read them all.

---

## Brief 3 (Tue, Sonnet): `prefs`, `api.stream/upload`, the two `innerHTML`s

**Goal.** Flaw classes F1, F5 and F8 from WORLD_CLASS_PLAN §10 closed with
lints.

**Done when.** No `localStorage.getItem` outside `frontend/prefs.js`; no
bare `fetch(` outside `frontend/js/app.js`'s `api` block; no `innerHTML =`
with `${`; three lints pass; `errors.js` 0.

**Decisions made.** `prefs.js` is a new file loaded before `app.js` (add
the `<script>` with the `?v=` stamp; `tests/test_asset_cache_busting.py`
checks it). Its API is exactly:
`prefs.get(key)`, `prefs.set(key, value)`, `prefs.remove(key)`,
`prefs.subscribe(key, fn)`. A schema object at the top lists every key
with `{ default, version, parse }`; `get` never throws and never returns
`undefined` (it returns the default on a missing, corrupt or old-version
value and writes the default back). Keys keep their current string names
so nothing a user has stored is lost.

**Steps.**
1. `grep -o 'localStorage.getItem("[^"]*")' frontend/js/*.js | sort -u` gives
   the key list (57). Write the schema from it; where a key is read with
   `JSON.parse`, its `parse` is `JSON.parse` wrapped in try; where a key
   is numeric, `Number` with an `isFinite` check. Commit the file and the
   schema alone.
2. Replace reads and writes file by file (`app.js`, `dashboard.js`,
   `settings.js`, `library.js`, `graph.js`, `documents.js`,
   `whiteboard.js`, `editor.js`), one commit per file, running
   `node --check` and `errors.js` after each. `APPEARANCE_DEFAULTS`
   (`settings.js:1104`) stays the source of the appearance keys' defaults:
   the schema imports them, not the other way round.
3. Lint `tests/test_prefs_only.py`: no `localStorage.` outside `prefs.js`
   and `theme-boot.js`/`boot-guard.js` (they run before `prefs.js` and are
   the two exemptions).
4. In `app.js` beside `async function api(path, options)` (line ~292) add
   `api.stream(path, body, onEvent, signal)` (SSE with the same auth
   header and error contract as `api`) and `api.upload(path, formData)`.
   Move the 13 raw `fetch` sites (`grep -n 'fetch(\`\|fetch("' frontend/js/*.js`)
   onto them, one commit per site group. `/chat/stream` last, and drive a
   full chat turn against `scratchpad/fake_openai_server.py` afterwards
   (the recipe is in `CLAUDE.md`'s standing caveat).
5. Lint `tests/test_fetch_goes_through_api.py`.
6. The two `innerHTML` sites (`app.js:10201`, `documents.js:2467`) become
   `setLabel(el, "ph:icon text")`; lint `tests/test_no_innerhtml_interp.py`.

**Traps.** `prefs.subscribe` must not fire synchronously inside `set` for
the same key's own handler (re-entrancy); test it. `boot-guard.js` runs
before everything and must keep working without `prefs`.

---

## Brief 4 (Tue, Sonnet): Settings two-pane, and the last 54 paragraphs

**Goal.** Settings becomes a section list on the left and one section on
the right, searchable; every long paragraph in the app moves behind a '?'
popover using the wiring already merged (`data-help-for`, `.help-body`,
`initHelpToggles` in `app.js`).

**Done when.** `python3 scratchpad/help-audit/count.py frontend/index.html`
prints `TOTAL 0`; `python3 scratchpad/help-audit/countjs.py <each js>`
prints `TOTAL 0`; the section list is a `role="tablist"` (arrow keys come
free); a Playwright script opens every '?' on Settings and asserts each
popover's rect is inside the viewport at 1440 and 390.

**Decisions made.** Keep every setting's id and every event handler where
it is; this is a layout change plus copy moves, not a rewrite of
`settings.js`. The right pane shows one section at a time; the search
field filters the list AND highlights matches inside the shown section.
Danger actions (delete notebook, reset, remove model) go in a red-edged
group at the bottom of their own section, never mixed in.

**Steps.**
1. Baseline: run both count scripts and paste the totals into your report.
2. Markup: wrap the existing settings sections in `<div class="settings-pane">`
   with a `<nav class="settings-nav" role="tablist">` generated from the
   sections' `h2`s (one function in `settings.js`, run once after render).
   CSS at the end of `01-forms-settings.css`: two columns above 900px,
   the nav becomes a select-style menu below. Commit.
3. Paragraphs, section by section, in the order the owner's screenshots
   listed: Model backend (done), Running now, Autonomous background AI,
   Battery-efficient mode, Tesseract OCR (also its one-row head: title +
   status chip + Reinstall/Remove on one row at ≥ 1024), Links head,
   Personas, Templates, Writing suggestions panel, editor footer hint,
   then everything else the counter lists. Each: keep ≤ 70 characters of
   description, move the rest verbatim into `<div class="help-body hidden"
   id="...">`, add the button. One commit per five sections.
4. Toggle rows: one recipe (`.toggle-row`: label + toggle, hairline
   between rows, no filled bars). Replace the lavender-filled rows.
5. The viewport-containment Playwright check, saved as
   `scratchpad/ui-sweeps/help-popovers.js`.

**Traps.** Some Settings sections render lazily; call `initHelpToggles()`
after each lazy render (it is idempotent). The `.help-body` must be a
sibling of the button inside the same card so the popover's `position:
absolute` anchors correctly; see the Model backend section for the
working example.

---

## Brief 5 (Wed, Opus): the Timeline, Phases 1 and 2

**Goal.** The line view and the table view rebuilt on one row model, per
the measured baseline already in the repo.

**Done when.** `scratchpad/ui-sweeps/timeline.js` (you write it) passes:
sticky bucket headers stick; no horizontal scroll at 1440/1024/390; every
note in the line view has a readable title without hover and a keyboard
stop; the table sorts by every column; row click opens the entry; 0
console errors. The docs gate: `TIMELINE_PLAN.md` exists and
`test_docs_layout.py` passes.

**Decisions made (from the measured baseline, do not re-measure).**
The current grid view is 79% empty cells and 8,800px wide; it is removed,
not tuned. The line view's d3 `schemeTableau10` colours are replaced by
the category colour tokens the Library chips use. Both views read one
array from `/timeline` and one search/filter (the dock's). The seed and
audit scripts are `scratchpad/ui-sweeps/seed-timeline.{js,py}` and
`timeline-audit*.js`; the numbers are in their last commit message.

**Steps.**
1. Write `docs/roadmap/TIMELINE_PLAN.md` in the `GRAPH_PLAN.md` shape (what
   exists, why it disappoints with the numbers, target, decisions, phases
   with gates, consistency rules, not verified). Add its row to
   `ROADMAP.md`'s opening table and `CLAUDE.md`'s table. Commit.
2. Row model: one function `timelineRow(entry)` in `app.js` beside
   `renderTimelineBranch` returning `{id, kind, title, snippet, when, tags,
   category, words, links}`; both views render from it.
3. Line view: a vertical spine; day/week/month buckets as sticky
   `<h3>` headers (`position: sticky; top: <dock height>`); each entry a
   compact card (kind icon, title, one-line snippet, time, tag chips);
   density by bucket (day = full card, month = title only). Keyboard:
   arrows move between cards, Enter opens, `.` opens the row menu
   (`.action-menu` recipe). Commit with the sweep's first five checks.
4. Table view: a real `<table>` with sticky `<thead>`, columns date,
   title, kind, category, tags, words, links; click a header to sort
   (client-side, on the row model); row focus with arrows; multi-select
   with the Notes list's selection bar (reuse `#select-btn`'s code path,
   do not fork it). Phone: only date and title columns.
5. Both views: the dock's search filters (does not dim) the row array.
6. The sweep, the lints, `contrast.js` in both themes, `errors.js`.

**Traps.** `#timeline-view` is a hidden select driven by the icon segment
(`data-no-select-enhance`); keep that contract. The page must not scroll
under the dock: only the view scrolls (`.timeline-body { overflow: auto;
min-height: 0 }` in a column flex).

---

## Brief 6 (Wed, Opus): pagination on all 25 lists, and one scheduler

**Goal.** Flaw classes F2 and F6 closed.

**Done when.** `tests/test_lists_paginate.py` walks every router and
asserts each `list_*` route accepts `limit` and `cursor` and returns
`next_cursor`; `scratchpad/audit/idle.js` reports ≤ 2 requests/minute on
an idle Dashboard and 0 timers firing while the tab is hidden.

**Decisions made.** Cursor = the last row's `(sort_key, id)` base64; the
helper `paginate(query, order_col, limit, cursor)` lives in
`src/memorymap/api/paging.py` and is the only implementation. Default
`limit` 50, max 500. Old clients that send neither get the first page,
not everything: this is a behaviour change and is intended. The frontend
list renderers (`renderNotes`, the Library views, Timeline, Reminders,
conversations) page on scroll with an `IntersectionObserver` sentinel.

**Steps.**
1. Write the test first; it fails 22 times.
2. `paging.py` + its unit test (`tests/test_paging.py`: round-trip a
   cursor, stable order across ties, max limit enforced).
3. Routers in this order: `routes_entries.py` (`list_entries` at ~1085 and
   the deleted/archived lists), `routes_library.py`, `routes_timeline.py`,
   `routes_reminders.py`, `routes_conversations.py`, `routes_documents.py`,
   `routes_whiteboard.py`, `routes_files.py`, the rest. One commit per
   router; run that router's existing tests after each.
4. Frontend: one `pagedList(container, fetchPage, renderRow)` helper in
   `app.js`; convert the renderers one commit each, driving each in
   Chromium with a 300-note seed (`scratchpad/ui-sweeps/seed.js` with a
   count argument you add).
5. The scheduler: `frontend/scheduler.js` (loaded before `app.js`) with
   `schedule.every(ms, fn, {whileHidden: false})` on one `setInterval` of
   1s that fans out; pauses on `visibilitychange`; the 9 `setInterval`
   sites (`grep -n "setInterval(" frontend/js/*.js`) move onto it. The
   reminder poll and the model-status poll get `whileHidden: false`.
6. `scratchpad/audit/idle.js`: count network requests over 60s idle,
   visible and hidden; numbers in the report and in HANDOVER.

**Traps.** The Graph's `/graph` payload is not a list and is out of scope
(GRAPH_PLAN Phase 5's `?since=` cursor). `EmbeddingRecord` scans in
`routes_entries.py` (lines ~688, ~817, ~1038) are Brief 11's, not this
one's.

---

## Brief 7 (Thu, Opus): the event log (B1)

**Built.** Moved to HISTORY.md, "From WORLD_CLASS_PLAN.md B1 and
SESSION_BRIEFS Brief 7: the event log". `AuditLog` carries `actor` and
`payload`, `core/events.py` is the only writer, every public write in
`entry/manager.py` records exactly one event with a whole-field payload,
`tests/test_events.py` passes with no xfail markers left, and history,
restore and `GET /events?since=` are live. What is still open is in
`docs/roadmap/archive/agent-remaining/brief7-event-log.md`.

---

## Brief 8 (Thu, Opus): `[[` autocomplete and the connections rail

**Goal.** Typing `[[` in the capture, edit or document editors offers
matching notes with keyboard selection and inserts a link; every open note
shows a connections rail (backlinks, links, related, in the same map).

**Done when.** On a 2,000-note fixture, matches appear within 150ms of
the third character (measured with `performance.now()` in the page); the
rail renders for every note in a 50-note walk; the FAB never intersects a
primary button (Playwright rect check on Capture at 1440/1024/390).

**Decisions made.** Link syntax stays what the app uses today (grep
`[[` in `src/memorymap/entry/paths.py` and `routes_entries.py` for the
parser; do not add a second syntax). The autocomplete is one component,
`frontend/autocomplete.js`, used by all three editors; it positions from
the caret using the mirror-div technique (a hidden div with the
textarea's computed font metrics). The rail is `.connections-rail`, right
of the note on desktop (min 16rem), a bottom sheet below 900px; sections
in this order: Backlinks, Links, In these maps, Related. Related comes
from the existing `/entries/{id}/related` (or the similarity endpoint;
grep `related` in `routes_entries.py`).

**Steps.**
1. Seed 2,000 notes (`seed.js` count argument from Brief 6, or a Python
   loop over `create_entry`).
2. `autocomplete.js` with a unit-testable core (`matchNotes(query,
   index)` over a client-side title index fetched once from
   `/entries?fields=id,title&limit=5000`, refreshed on the event feed) and
   the caret positioning. Commit with a Playwright test that types
   `[[te`, presses Down, Enter, and asserts the textarea now contains the
   link.
3. Wire into capture, edit form, documents editor (three commits).
4. Backend: `/entries/{id}/connections` returning the four lists in one
   call (backlinks via the existing link tables; maps via
   `board_ids`/`attachedBoards` from the mindmap work).
5. The rail, then the sheet below 900px, then the FAB rule (hide
   `#scroll-top` while `.capture-footer` is within the viewport; an
   `IntersectionObserver`).

**Traps.** The edit form is built detached and mounted later
(`mountGutterFor` fix in HANDOVER): initialise the autocomplete on first
attached frame, as the gutter does. Do not fetch on every keystroke; the
index is local and the fetch happens once.

---

## Brief 9 (Fri, Opus): the job runtime (B2) and thread isolation

**Goal.** Long work becomes durable, resumable and observable through one
runtime, and threads stop sharing sessions.

**Done when.** `tests/test_jobs.py` proves: a job survives a simulated
crash (kill the worker mid-job, restart, it resumes from `progress`),
cancel works, progress streams over `/jobs/stream`, and `Thread(` appears
only in `src/memorymap/core/jobs.py` and the two allowed places
(`__main__.py` server thread, `logbuffer.py`). The "Running now" panel
renders every job kind with one row recipe.

**Decisions made.** A `jobs` table (`id, kind, state, progress, payload,
result, error, attempts, run_after, heartbeat, created_at, updated_at`),
one worker thread per process started from `create_app`, leasing by
`UPDATE ... WHERE state='queued' ... RETURNING`. `@job("kind")` decorates a
function `(ctx, payload) -> result`; `ctx.progress(n, total, note)` and
`ctx.cancelled()`; each job gets a fresh session from the factory and
returns plain dicts. The existing `bgtasks.py` cancel table becomes the
`cancel` implementation; `taskhistory.py` keeps recording latency. Job
kinds to migrate, in order: re-index, embed backfill
(`embeddings.backfill_missing`), OCR, caption, auto-file (`autonomous.py`
loop body), skill run, import, backup, model pull.

**Steps.**
1. Table + `jobs.py` + `tests/test_jobs.py` (crash test uses a job that
   sleeps in 10 steps and a worker you stop between steps).
2. `/jobs`, `/jobs/{id}`, `/jobs/{id}/cancel`, `/jobs/stream` (SSE).
3. Migrate kinds one commit each; delete the thread each replaced; keep
   its cancel entry.
4. The panel: one row recipe (kind icon, title, progress bar, note,
   Cancel); replace the "Running now" section's current rendering.
5. The lint `tests/test_threads_only_in_jobs.py`.

**Traps.** `autonomous.py` has its own loop thread (`_loop_thread` ~681);
make the loop a periodic job-enqueuer, not a job. The embedding warmup
(`embeddings.start_warmup`) loads a model; it stays a job with
`heartbeat` so a restart does not double-load.

---

## Brief 10 (Fri, Sonnet): Library one card recipe, Dashboard widget frame

**Goal.** Dossiers D4 and D1 from WORLD_CLASS_PLAN §3.

**Done when.** Card height is uniform per Library view (± 4px, measured
over every visible card); every Dashboard widget renders inside
`.widget` (title, optional count, optional "more" link, body); recipe
count on Dashboard ≤ 8 (`scratchpad/audit/recipes.js`); lints green.

**Decisions made.** Card = preview at 16:10, title (one line, ellipsis),
two meta lines, actions in a `.action-menu` "..." (the menu recipe from
`08-consistency.css`). Image and file cards open a detail sheet instead
of expanding in place ("Show more" goes away; the sheet shows caption,
readings, usage, actions). The widget frame is one function in
`dashboard.js`; the 24 widgets call it; the layout editor keeps only
add/remove and reorder.

**Steps.** Measure heights first (script in report). Library: All,
Documents, Boards & maps, Images, Files, Links (one commit each).
Dashboard: the frame, then widgets in batches of six.

**Traps.** `CARD_KINDS` in `app.js` is the one registry of card kinds;
add to it, do not fork it. Board previews now come from the mindmap
agent's miniature renderer; use it, do not draw a second one.

---

## Brief 11 (Sat, Opus): the retrieval engine (B3), with explanations

**Built.** Moved to HISTORY.md, "From WORLD_CLASS_PLAN.md B3 and
SESSION_BRIEFS Brief 11: the retrieval engine". One index over every kind
(`search/index.py`), one `search()` with three scores and an explanation per
hit (`search/engine.py`), the operators of §5.1 on the existing parser,
`GET /search`, the Notes list's "why this result" line, and a vector matrix
that ended three per-request scans of every stored vector. Every marker in
`tests/test_search_engine_spec.py` is off. What is left is in
`docs/roadmap/archive/agent-remaining/brief11-retrieval-engine.md`.

---

## Brief 12 (Sat, Opus): per-claim citations in Chat (D3)

**Goal.** Each sentence of an answer carries a source mark; hovering
highlights the source; the "I don't know" state is designed.

**Done when.** On the ten fixture questions in `tests/fixtures/chat/`
(create them), ≥ 95% of answer sentences carry a citation to a source in
the retrieval set; the composer is ≤ 2 rows at rest at 1024.

**Decisions made.** The stream already emits `grounding`, `related`,
`answer` and `stats` events (`routes_chat.py`). Add a `cite` event
`{sentence_index, source_ids}` computed server-side after each answer
chunk boundary by matching sentence n-grams against the retrieved
sources (no second model call; `ai/grounding.py` has the matcher to
extend). Unsupported sentences get a hollow mark and the "I don't know"
copy is triggered when < 50% of sentences are supported. The composer:
one field, a "+" menu (attach, scope, persona, skill), send.

**Steps.** Fixtures; the matcher test; the event; the marks in `app.js`'s
answer renderer; the composer; the empty and unsupported states.

---

## Brief 13 (Sun, Opus): the harness verifier, budget and corrections (B5)

**Built, 2026-09-12.** Moved to HISTORY.md, "Moved from the plans,
2026-09-12". All four markers in `tests/test_harness_verifier_spec.py` are
off. Decisions recorded in CHAT_PLAN 10a to 10f. What is left (the `evals`
marker and its fixture set, which wants the dev model from WORLD_CLASS_PLAN
9; a `verify` control in the skill editor; verify blocks on the other
read-only built-ins; the page cap over a large notebook; `filing_state` on
the recategorise path) is in
[`archive/agent-remaining/brief-13-harness.md`](archive/agent-remaining/brief-13-harness.md).

---

## Brief 14 (Sun, Sonnet): the docs, condensed

**Goal.** `HANDOVER.md` under 300 lines; `ROADMAP.md` status table true;
`BACKLOG.md` §116 updated; a `FABLE_BRIEF.md`-style prompt for the next
Fable window written as `NEXT_FABLE_WINDOW.md`.

**Done when.** `test_docs_layout.py` passes; `HANDOVER.md` has: state of
the branch, what was measured this week (the §6 metrics table filled in),
what could not be verified, traps found, where to start.

**Steps.** Move everything in `HANDOVER.md` older than this week to
`HISTORY.md` under a dated heading (append, do not rewrite HISTORY);
rewrite the top; update tables; write the next-window prompt from
WORLD_CLASS_PLAN §11's last paragraph.

---

## Brief 15 (any day, Opus): network hardening before LAN mode

**Goal.** WORLD_CLASS_PLAN §12 items S1, S2, S3, S5 closed, proven by a
test that runs the app bound to 0.0.0.0.

**Done when.** `tests/test_lan_mode.py` passes: media URLs carry a
short-lived media token, not the session token, and the session token in
`?token=` is refused; five wrong unlocks from one client address do not
throttle another; `import_directory` returns 403 when the bind is not
loopback; a bookmark or clip of `http://127.0.0.1:8781/` and of
`http://10.0.0.1/` is refused by `assert_public_url()`; uvicorn access
logs contain no `token=`.

**Decisions made.** Media token = HMAC-SHA256 over `path|expiry` with a
per-process key, 10 minutes, minted by `/media/token?path=` and cached by
`mediaSrc`; the session token stays a header. Throttle keyed by
`request.client.host` with the global list kept as a ceiling. The
outbound guard lives in `core/security.py` and reuses `websearch.py`'s
resolver (~689). Settings gets "Allow other devices on this network"
only after this brief merges.

**Steps.** Test file first (subprocess app on a free port, bound
0.0.0.0); S1; S2; S3; S5; the log scrubber; the Settings toggle last.

**State 2026-09-24.** S1, S2, S3, the rest of S5, S6's redirect half and
`/debug/health`'s paths are built, each with its own test (HISTORY.md, "Moved
from the plans, 2026-09-24"). Two of the decisions above were taken
differently, and are recorded here rather than silently: S1 is an HttpOnly,
SameSite=Strict cookie scoped to `/media` and `/files` holding a ticket that
names the session, not an HMAC token in the URL, because a ticket in the URL
is still a credential in history, logs and pasted text and `mediaSrc` is
synchronous at fifty call sites; S3 confines `import_directory` to home and
the data folder (with symlink escapes checked) rather than refusing it off
loopback, which holds on loopback too. **2026-09-26:** `tests/test_lan_mode.py`
passes (the real launcher on 0.0.0.0, reached over this machine's network
address), with the switch's route, the launcher's bind and a Host guard
against DNS rebinding (HISTORY.md, "Moved from the plans, 2026-09-26"). Left:
the Settings toggle, built the same night (Account and security, "Allow
other devices on this network").

---

## The quarter's briefs (shorter; expand each into the shape above when
its session starts)

- **GRAPH_PLAN Phases 2 to 5.** Decisions are in that file. Gate numbers
  from `scratchpad/graph-fixture.js`. Phase 5 is backend and pairs with
  Brief 7's events for `?since=`.
- **DOCUMENTS_PLAN Phases 1 to 7.** Phase 2 (CodeMirror 6 vendored) needs
  the CSP check first: load CM6 from `frontend/vendor/` and confirm no
  inline style or eval is required; if it is, the decision in
  DOCUMENTS_PLAN §4 says to keep the backdrop bridge and stop.
- **MINDMAP_PLAN Phases 4 to 5.** After the bug-fix agent's merge; its
  sweeps are the gate.
- **B4 knowledge kernel.** `ai/entities.py` (`extract_entities_pass`) and
  `ai/tensions.py` (`compare_pair`) exist; the kernel is the scheduler
  that runs them as jobs (Brief 9) over changed entries (Brief 7), stores
  `claims` and `tensions` with a `computed_by` stamp, and the Tensions
  widget reads the table. Gate: deterministic rebuild on the fixture.
- **D5 properties, D6 daily notes.** `properties` JSON column on `Entry`
  plus a generated `properties_text` for FTS; `Ctrl+D`; the calendar
  strip in the Timeline dock.
- **D9 clipper and the PWA shell.** `manifest.json` + `sw.js` (exists)
  with a share target; `/links/clip` with a vendored readability
  extractor (MIT); a bookmarklet generator in Settings.
- **B6 sync.** Design doc first (event export/import, LWW per field,
  folder transport), then a two-instance test.
- **B8 extensions.** The tool registry (`ai/tools/__init__.py`,
  `CORE_TOOLS`) served over `/tools`; a user skills folder watched for
  changes.
- **F12 the store.** `state.js` with `get/set/subscribe` per slice;
  convert the notes list first, measure "did not refresh" reports after.
- **Packaging.** PyInstaller build already exists (`database._migrations_root`
  handles frozen); add the model-included first-run spike sized honestly.

---

## What "quality" means for a smaller model here, in one paragraph

Quality is not cleverness; it is not skipping steps. Every brief above is
ordered so that the test exists before the code, the measurement exists
before the claim, and the commit exists before the next step. A session
that follows the order, keeps to the scope, and reports the numbers will
produce work indistinguishable from a larger model's. A session that
reads the goal, guesses the shape, and writes the code in one go will
produce the four failure shapes, every time, whatever the model.

## Brief 16 (any day, Sonnet): the documentation, refined

**Goal.** Every reader-facing document reads as one professional product's
documentation: accurate to the code, one voice, no em-dashes, no stale
claims, no duplicated material.

**Scope.** `README.md`, `docs/INSTALL.md`, `docs/TROUBLESHOOTING.md`,
`docs/SECURITY.md`, `docs/PRIVACY.md`, `docs/MODELS.md`, `docs/RELEASING.md`,
`docs/CONTRIBUTING.md`, `docs/CHANGELOG.md`, `docs/ARCHITECTURE.md`,
`docs/DESIGN.md`, `docs/index.html` (the docs landing page), and the two
expansion files in `docs/` (`memorymap-ai-expansion-gemini.docx`,
`memorymap-ai-expansion-perplexity.md`: read, fold anything still true
into ANALYSIS.md 114 with a one-line pointer, then delete them from the
tree; a binary in a docs folder is not documentation).

**Done when.** Every feature claim in README and INSTALL is checked against
the running app (start it, drive the feature once, screenshot it for
`docs/screenshots/` where a screenshot exists today); every command in
INSTALL and TROUBLESHOOTING runs; `docs/` has 0 em-dashes (extend
`tests/test_no_em_dashes.py` to `docs/` and `README.md`, excluding
`docs/roadmap/HISTORY.md` and `ANALYSIS.md`, which are archives);
ARCHITECTURE.md describes the stack as it is after this week (eight CSS
files plus `08-consistency.css`, the canvas graph with the worker, the
dock grammar, the help popovers, the event log spec), with a one-paragraph
map per module; DESIGN.md carries the consistency contract from
WORLD_CLASS_PLAN 1 as its first section and drops any rule the code no
longer follows; CHANGELOG has an entry for this branch written from
`git log` in user-facing language; CONTRIBUTING points at CLAUDE.md's
operating rules and the lints; SECURITY names the LAN-mode caveats from
WORLD_CLASS_PLAN 12 plainly.

**Decisions made.** Sentence case everywhere. The README's structure:
what it is (three sentences), a screenshot, install (two paths), what it
does (a table of surfaces with one line each), privacy (three sentences),
docs links, licence. No feature list longer than the table. No marketing
adjectives; the numbers from the audits may be cited where they are true.

**Traps.** Screenshots must be taken in the light theme at 1440 on the
seeded notebook (`scratchpad/ui-sweeps/seed.js`) so they match each other;
do not commit PNGs over 400 KB (optimise or crop). `test_docs_layout.py`
pins cross-links between the roadmap files; keep them.

## Brief 17 (any day, Opus): the launchers, the uninstallers and the splash, made impressive

By direct instruction (2026-09-08): "upgrade the start.bat/sh, uninstall,
and start-desktop files ... majorly improve the function and learnability
of the splash ... make them impressive and with lots of utility." Read
before touching anything: the four scripts, `scripts/splash.ps1`, the
`_LOADING_HTML` window and `_close_launch_splash` in
`src/memorymap/__main__.py`, `#boot-splash` in `frontend/index.html` with
its rules in `00-tokens-shell.css` and `hideBootSplash` in `app.js`,
`tests/test_desktop_launcher.py`. What exists is good and careful; this
brief extends it, it does not rewrite it. Every comment in those files
records a failure that was real; keep them.

**Goal.** One launcher contract on both platforms, a doctor mode that
turns "it did not start" into a table with a fix per row, an uninstaller
that shows what it will remove and can export the notes first, and one
splash design on all three surfaces (the pre-Python window, the Python
loading window, the browser boot splash) that shows the steps, the time,
what to do if it is slow, and a way out.

**Done when.**

1. `start.sh` and `start.bat` accept the same flags, and `--help` on each
   lists the same set in the same order: `desktop`, `--port N`,
   `--no-browser`, `--no-update`, `--reinstall` (rebuild `.venv`),
   `--doctor` (checks only, exit 0 or 1), `--logs` (open the log folder),
   `--shortcut` (create a desktop shortcut: a `.lnk` via PowerShell on
   Windows, a `.desktop` entry on Linux, an alias on macOS), `--version`,
   `--help`. Unknown flags print help and exit 2. `MEMORYMAP_DATA_DIR` is
   respected and printed.
2. `--doctor` prints a table, one row each with a tick or a cross and,
   for a cross, one line saying what to do: Python (version and path,
   3.11 to 3.13), `.venv` health (imports fastapi and sqlalchemy), free
   disk on the data drive, port free (or "already running, open it"),
   git remote reachable (5s cap, the same low-speed flags the pull uses),
   Ollama at its configured URL with the model count, the model provider
   if not Ollama, data folder path and size, the last launcher log's last
   error line. A fast subset (port, disk, venv) runs before every start
   as a preflight and turns the three commonest failures into a sentence
   instead of a traceback; "port in use by MemoryMap" opens the running
   app instead of failing.
3. Every run is logged to `<data>/logs/launcher-<date>.log` (tee, both
   platforms); on any failure the last lines and the path are printed with
   "what to try" (from the doctor row that failed).
4. `start-desktop.sh` exists (it does not today) and `start-desktop.bat`
   passes its arguments through (`%*`).
5. Uninstallers: `--dry-run` lists what would be removed with sizes;
   `--export PATH` writes the notes as the app's own Markdown export
   before `--delete-data` (add a `python -m memorymap --export PATH` entry
   that calls the same function `routes_settings.export_markdown` uses; the
   route stays); `--shortcuts` removes what `--shortcut` created; caches
   (`__pycache__`, `.pytest_cache`, the install marker) go with `.venv`;
   a running instance is detected on the port and the script says so
   and stops rather than deleting under it; sizes before and after are
   printed; `.env` is kept unless `--delete-data`.
6. **The splash, one design, three surfaces.** The status file protocol
   becomes structured: each line is `step|total|title|detail|state` with
   state in `active|done|failed` (the last line is current; earlier lines
   are history, so a window can render every step). `scripts/splash.ps1`
   renders: the mark and name (as now), a step list (Update, Python,
   Dependencies, Desktop window when in desktop mode, Start) with done
   ticks, the active step's elapsed seconds, and pending steps muted; the
   detail line; a real progress bar at steps done over total (the
   marquee only inside the active step); a rotating tip every 6s from a
   fixed list of five (the notes never leave this machine; Ctrl+K opens
   the command palette; the Capture box files a thought for you; first
   run installs about 300 MB once and later starts take seconds; the data
   folder path); a footer with three buttons: **Details** (toggles the
   last eight log lines inline), **Copy diagnostics** (the doctor table to
   the clipboard), **Cancel** (writes `__cancel__` to a control file the
   launcher polls between phases and honours). A step that exceeds its
   usual time (Dependencies 5 minutes, Update 30 seconds) shows a hint
   line under it. On `failed`, the window becomes an error card: the
   message, the log path, **Open log** and **Try again** (re-runs the
   launcher). The Python loading window (`_LOADING_HTML`) renders the same
   step list, seeded from the file's history so the handoff shows Update,
   Python and Dependencies already ticked, then its own phases from
   `_STARTUP_PHASE_PERCENT`; same palette, same mark, same tips. The
   browser boot splash stays short (it is seconds) but gains the tip line
   and, after 8 seconds, "Still loading: reload" (boot-guard.js already
   has the reload path). Linux: zenity's progress dialog gets the same
   step text and percentage; macOS: one notification per step, and the
   terminal narrates the step list with ticks. Reduced motion respected on
   every surface.
7. Tests: `tests/test_launcher_scripts.py` (static, runs on Linux CI):
   both scripts' help lists the same flags in the same order; every phase
   in both scripts writes a protocol line; `bash -n start.sh
   uninstall.sh start-desktop.sh`; a Python parser
   `memorymap/core/launch_status.py` (used by `__main__.py` to seed the
   loading window) parses and rejects malformed lines; `--doctor` on the
   sandbox exits 0 or 1 with the table (run it). `test_desktop_launcher.py`
   stays green. PowerShell and cmd cannot run in the sandbox: say so in
   the report, and keep every cmd rule the file header states (no
   parentheses inside an ECHO within an IF block).

**Decisions made.** Files, not pipes, remain the splash protocol (cmd can
write a file and nothing else). The doctor is the launcher's, not the
app's: it must work with no Python at all on Windows (cmd checks first,
then asks Python for the rest once it exists). No new dependency. No
telemetry. Copy in sentence case, no exclamation marks, no em-dashes.

**Traps.** A `.bat` is read by byte offset while running: the self-update
relaunch guard (`MM_CHILD`) must survive every new flag. `set -o pipefail`
is why `tee` reports pip's failure. The splash's `MaxMinutes` backstop
stays. `zenity` may be absent; `notify` and terminal are the fallbacks.
The frontend boot splash must never wait on anything that the CSP or an
offline machine can block.

**Size** L, one session, Opus. **Commits** per step with the trailers.
**Report** five lines plus `archive/agent-remaining/launcher.md`.

## Brief 18 (the next session, Fable orchestrating): the complete open scope

Written 2026-09-09 04:40 UTC at the owner's ask: "fully outline everything so
nothing is missed". Every open item in every plan, in the order to work it.
INBOX numbers are the owner's own reports; each has an owner and a decision
there. Two agents at a time, merged and gated per batch, pushed as they go.

### A. Bugs and fixes first (INBOX, Fable or Sonnet, one day)
66 lightbox in graph fullscreen · 67 max gravity retest · 69 agent panel
dropdowns · 70 notifications combobox · 73 mute toggle resets · 74 profile
panels and Ctrl+S · 75 kebab needs two clicks · 77 token badge · 81 web
links as Markdown and numbered · 82 settings row wrap (Tesseract, BGE) ·
83 Tools paragraphs to popovers · 84 marquee behind objects · 85 "m"
prefix with a hint · 86 zoom popup under dialogs · 87 settings scroll
reset · 88 fullscreen graph glass · 89 glass sliders measured · 91 chat
header wrap · 95 streaming icon · 96 drag without pin · 54 and 57 if they
recur after the update.

### B. Documents (DOCUMENTS_PLAN), the owner's first priority
Phase 2 steps 2 to 4 (the engine: adapter, Live as decorations, findings,
undo, search, folding; tests-first file is in, strict-xfail) · Phase 3
blocks (tables, callouts, footnotes, math, embeds, properties, columns) ·
Phase 4 connected document (backlinks with context, block refs, outline
drag, command palette, daily notes and templates) · Phase 5 review and AI
(comments, version history UI, AI diff preview, focus mode, print) ·
Phase 6 responsive · Phase 7 as written · Phase 8 one editor everywhere
(capture, inline note edit, the graph's popups, Write with the AI, the
whiteboard's note cards, all on the Phase 2 surface; the owner's ask,
2026-09-09). Then 62/98: the selection toolbar becomes the formatting UI
and the strip default is revisited.

### C. Graph (GRAPH_PLAN), the owner's second priority
Phase 6 node panel (INBOX 59, the brief in the plan) · 6b minimap (78) ·
the local pane (Phase 4's last item) · 66, 88, 96 above · 76 citation
accuracy evaluation feeds the graph's trace too.

### D. Chat (CHAT_PLAN), folded with the owner's reports
45 Ask redesign · 63 Ask, Write with the AI and Capture · 71 web search
panel, extraction UI, agent tools · 72 popup agent panel · 80 citation
preview popover · 90 user bubbles · 77 token window setting (Auto or a
number per model) · 76 citation accuracy · CHAT_PLAN's own phases after.

### E. Whiteboard (WHITEBOARD_PLAN Phase 1) and mind maps (MINDMAP §12)
52, 64, 65 (the bottom bar, the properties panel, the panels' recipe) ·
57 View menu if it recurs · 84 marquee layer · 68 previews · 93 the
Coggle-level map controls (two sessions, its own brief in MINDMAP_PLAN).

### F. Library, dashboard, settings
56 image cards · 79 Files rows and the name link · 60 dashboard start
section · 92 suggested links panel · 74 preferences panels · 97 RapidOCR
as a Packages option · 94 background animations.

### G. The plans' own remainders
UI_MODERNISATION Phase 9 (desktop and tablet in this PR; the phone is
Phase 11, its own session or two, the owner's call) · AGENT_SKILLS Phase D
(resume a stalled step, edit and re-run a step, "why did this stall") ·
WORLD_CLASS 1.1 lints for the consistency contract, §9 llama.cpp dev
script, §12 flaw classes S7 (LIKE escaping) · PLAN.md and REDESIGN.md are
superseded by the eleven plans (ROADMAP's opening table); FABLE_BRIEF is
absorbed into MODERNISATION_AUDIT. INBOX 48 lazy modules. TIMELINE_PLAN
in full.

### The gates that do not move
Lint set and targeted tests green after each step (`scripts/gate.sh
--changed`); the full suite in CI on push, locally only once before a
large agent task's final report and once before the PR closes, never per
step or per merge; errors.js
at four widths; contrast.js; docks.js; touch.js; weight.js under 10%
blurred at rest with the art off; every number in the plan's Built block;
no em-dashes, no exclamation marks, sentence case; commit trailers;
push per batch.

## Brief 19 (Opus agent): DOCUMENTS Phase 2 steps 2 to 4, the engine

Relaunch text, verbatim, when the agent dies (its worktree survives:
`git worktree list`, resume with the same words). Read CLAUDE.md, then
DOCUMENTS_PLAN "Phase 2" and "Built, Phase 2 step 1", then DESIGN.md.
Own worktree, commit per working piece, never push, five-line report,
`archive/agent-remaining/documents-engine.md` before stopping.

Decisions (not remade): the bundle loads on demand via `loadCodeMirror()`
(script-inject `/vendor/codemirror/codemirror.min.js`, no `?v=`), the
textarea stays as the fallback; one adapter `docSurface()` (text get/set,
`selection()`, `setSelection`, `replaceRange`, `onChange`, `coordsAt`,
`focus`, `scrollTop`, `lineAt`) is the only thing documents.js and
editor.js touch (the 18 `.value` reads, listeners at ~3081, 3097, 3113,
3116, 3573; editor.js's 8); the view mounts in `#doc-source-wrap` as
`#doc-editor`; Live = the same view with a decorations Compartment on,
Source = off; `setDocView` (~200) keeps its contract; `renderDocLive`
(~1504) and the `.lp-*` CSS are deleted once acceptance passes; Live
decorations in value order (headings with hidden markers, inline marks
with markers hidden until the caret enters, links as chips, task boxes
that toggle, quotes and callouts, images as widgets, `[[wiki]]` chips via
`layerDocWikiLinks`), computed from the lezer tree over
`view.visibleRanges`; findings (docProseFindings ~4187,
docBackdropFindings ~4437, docFindingAtOffset ~5201, docOpenSuggestFor
~5258) become `cm-finding cm-finding-<kind>` marks, the backdrop layer
retired; undo = CM6 history, the docUndo* stack (~6260 to 6440) retired
after the editor.js sweep gate passes; find/replace = CM6 search panel
restyled by CSS; folding on headings with the gutter preference; line
numbers via CM6 for the document, `mountGutterFor` (~1139) stays for the
other textareas; the `/` menu, `[[` autocomplete (~4819 to 4940), the
toolbar (wrapDocSelection ~2359, wireMarkdownToolbar ~3301,
wireMdFormatShortcuts ~3379) and selection to chat re-point at the
adapter; styling via `EditorView.theme` from tokens plus a new
`frontend/css/09-editor.css` linked with `?v=`; dark via
`dataset.mode`; code files get their language (js/ts, py, css, html,
json, yaml, stream modes), unknown plain.

Tests first: `tests/test_doc_surface.py` is on the branch, strict-xfail;
remove each marker as it passes. Gates: doctype.js under 30 ms keydown to
paint in Live at 20k words; editor.js undo gate; documents-chrome.js
unchanged; errors.js clean at four widths; zero `securitypolicyviolation`;
the bundle absent from the boot request list. Serve on 8786; never pkill
uvicorn; CSP rejects `style=`; no em-dashes; commit trailers.

## Brief 20 (Opus agent): graph node panel, Library image cards, whiteboard panels

Relaunch text, verbatim. Read CLAUDE.md, DESIGN.md, INBOX 59, 56, 52, 64,
65 and GRAPH_PLAN "Phase 6: the node panel". Own worktree, commit per
item, never push, five-line report, `archive/agent-remaining/visual-c.md`. Do not
touch documents.js or editor.js.

Item 1, the graph node panel (grep "Favourite" and "Trace" together in
graph.js/app.js and the panel in index.html): header (title, one category
chip, confidence as a small muted mark), one muted meta line, the
attachment as a compact row, the content editor four lines minimum and
autogrowing, tags, one primary Save shown only when changed; actions as
one icon toolbar row in three hairline-divided groups: read (Open,
Similar, Trace), shape (Grow, Focus, Link, Remind), keep (Favourite; Bin
last, ghost); Open the one filled button; the panel scrolls inside.
Measure at 1440, 1024 and 390 (buttons per row, scrollHeight vs
clientHeight, nothing under 36px, nothing clipped); graph4b.js passes.

Item 2, Library image cards (library.js ~5271 `.library-image-tile`, CSS
in 05 and 07): thumbnail with the file name as a scrim caption, one line
"Used in <chip>" or "Not used yet", the description clamped to three
lines with a "More" ghost button, OCR text under one disclosure,
provenance as one muted foot line "Described by X · read by Y", edit and
delete controls unchanged. Measure card height before/after with a long
description, three font sizes per card, nothing clipped at 1024.

Item 3, whiteboard panels: the bottom tool bar (`.whiteboard-floating-
panel.bottom-center`, zoom pill `.bottom-right`, CSS in 07): one surface,
hairline dividers, no per-control background except the active tool, the
zoom pill on the same recipe and height; the properties panel (INBOX 64):
sections Style, Guides, Arrange, Notes; Arrange as one icon toolbar row
(align x3, distribute x2, group/ungroup pair) with tooltips; Extract notes
as the section's one text button; no two control rects intersect; the
panel scrolls inside. Measure: elements with their own background inside
the bar, bar height equals the zoom pill, touch.js and docks.js
unchanged, errors.js clean. Serve on 8788. Every new glass surface goes on
the `[data-glass="off"]` list. Sentence case, no em-dashes, tokens only,
commit trailers.

## Brief 21 (Opus agent): UI_MODERNISATION Phases 9 and 10, the rest of the plan

Relaunch text, verbatim. Read CLAUDE.md, DESIGN.md (the recipe index and
"Taken from Liquid Glass and the HIG"), UI_MODERNISATION_PLAN Phase 9
(the breakpoint table and its rules), Phase 10 and its placed items
(INBOX 60, 94, 100 to 104), and `archive/agent-remaining/responsive.md`. Own
worktree, commit per step, never push, five-line report,
`archive/agent-remaining/responsive.md` rewritten before stopping.

Scope rules, because two other agents are running: every new CSS goes in
a new `frontend/css/10-responsive.css` linked after 08-consistency.css
with `?v=` (tests/test_asset_cache_busting.py); edits to existing CSS
files only when a rule must be removed; do not touch documents.js,
editor.js, whiteboard.js, library.js, graph.js or graph-canvas.js (their
owners are mid-flight); app.js and index.html edits kept to the tab bar,
the sidebars, the docks' responsive behaviour and the scroll-edge
listener.

Phase 9, in the plan's order: the four breakpoints as stated once
(≥1100, 820 to 1100, 600 to 820, <600) with what changes app-wide;
`--target-min` steps up in the 820 block; safe-area insets; sidebars
collapse to icons then become sheets; docks keep identity, search, Filter
and the primary under 820 with the rest in ⋯; two-up grids on iPad
portrait; on the phone every tab gets the Phase 5 rules (strips scroll,
one control row, the primary pinned bottom-right, bottom docks above the
keyboard), the tab bar pinned to the bottom. Gate: errors.js and touch.js
at 1440, 1024, 820, 600 and 390; no horizontal page scroll at any width;
docks.js unchanged at desktop; the numbers per width in the commit.

Phase 10, each with its own commit and measurement: 100 the scroll edge
effect (`data-scrolled` set by one listener, a 16px gradient under
`.dock`, the sub-tab strips and the top bar; absent at scrollTop 0;
contrast.js on a scrolled list); 101 `--radius-inner` and the
test_style_scale rule; 102 `.glass-clear` with `--glass-scrim` for the
panels over the art and `--text-on-glass` on every blurred surface
(contrast.js over aurora and constellation); 103 menus morphing from
their opener (`kebabMenu`, `details.dock-menu`; off under Reduce motion)
and sheets inset by `--space-3` then `--modal-bg` at full height (menus.js,
touch.js); 104 the phone tab bar receding on scroll down, back on scroll
up, never hidden; then 94 (the background animations: a measured frame
cost per style, still under Performance mode, no seams, the intensity
slider visible at every step) and 60 (the dashboard start section per its
decision). Every new glass surface goes on the `[data-glass="off"]` list
(tests/test_ui_recipes.py). Serve on 8790; never pkill uvicorn; sentence
case; no em-dashes; tokens only; commit trailers.


## Brief 22 (Opus agent): the three Notes sub-tabs, Capture, Write with AI and Ask

**Built.** Moved to HISTORY.md, "From SESSION_BRIEFS Brief 22: the three
Notes sub-tabs". Capture's controls are two heights (36 for the head row and
the formatting strip, 40 for everything you act on) with the note box inside
the composer's own surface at last; Write with AI is two of the same column,
both 472.6px with both boxes 330.3px; the Ask card sits on one 9.6px step;
and the three owner reports that came in with it (INBOX 119's preview gutter
and menu gap, 120's duplicated suggestion rows) are fixed with their numbers
in HISTORY's "INBOX resolved". What is left is in
`docs/roadmap/archive/agent-remaining/notes-subtabs.md`.

---

## Brief 23 (Opus agent, backend first): the corrections loop and resurfacing

WORLD_CLASS_PLAN 15, I7 and I9, plus I4. The two largest unbuilt specs left
on this branch: `tests/test_learned_spec.py` (15 strict-xfail markers) and
`tests/test_resurface_spec.py` (7). Own worktree, commit per step,
`scripts/gate.sh --changed` per step, never push, five-line report,
`archive/agent-remaining/learning-loop.md` before stopping.

**Read this before writing a line of it.** A part of I7 already exists, in a
different shape from the one the spec names, and rebuilding it is this
project's most expensive recurring mistake (CLAUDE.md section 1). What is
there, found 2026-09-12: `ai/librarian.py` from line 908, "filing
corrections", records a correction as an `AuditLog` row with
`action="correction"` and a payload of `{from, to, excerpt}`, written by
`entry/manager.update_entry` when a note the AI filed is moved by hand, and
read back by `filing_corrections`, `corrections_note` and `filing_prompt`,
which put the last five into the next filing prompt. It has its own
constants (`CORRECTIONS_REMEMBERED = 5`, `CORRECTION_EXCERPT_CHARS = 80`).

The spec asks for `ai/learning.py` with `record`, `corrections`, `boosts`,
`filing_evidence`, `centroid_excluded`, `decayed` and `MAX_BOOST`, over a
`corrections` table and a derived `learned_boosts`. **Decide, in the first
commit, one of two things, and write the reason into the plan:** either the
`learning` module owns the store and `librarian`'s three functions become
readers of it (the `AuditLog` rows migrating once), or the `AuditLog` row
stays the store and `learning` is the layer over it. Whichever you choose,
there must be exactly one place a correction is written and one place it is
read. The spec's own header allows the second: "a session that needs a
different shape changes the test in the same commit, with the reason."

Order, because the later work depends on the earlier:

1. **I7, the store and the boosts** (`test_learned_spec.py`, the first five
   tests). `record`/`corrections`/`boosts`/`decayed`/`MAX_BOOST`, bounded
   and halving in 30 days, plus `POST /learned/corrections`.
2. **I7's three consumers.** Filing (`filing_evidence` returns the matching
   corrections *and* the nearest filed notes; `centroid_excluded` stops a
   category two refiles have moved away from), search
   (`search_manager.retrieve` reorders on an `open_after_ask` boost), and
   link suggestions (a dismissed pair never returns from
   `/entries/link-suggestions`).
3. **I4, resurfacing** (`test_resurface_spec.py`, all seven).
   `ai/resurface.py` with `compute_scores`, `ranked`, `for_context`, a
   `note_scores` table written nightly, `GET /resurface` and
   `POST /resurface/compute`. The endpoint is under 50 ms on 500 notes
   because the scores are precomputed; the daily three are stable within a
   day (`?as_of=`) and differ across days; a notebook of five notes returns
   nothing rather than the same three forever; a `dismiss_resurface`
   correction is honoured across restarts, which is why this comes after 1.
4. **I9, the Settings section**, last and only if the frontend is free: ask
   the orchestrator before touching `index.html` or `app.js`, two agents are
   usually in them. Every derived row listed with its source span, model and
   time; edit (never overwritten after), delete (never re-derived), reset,
   a switch per runner and a master switch, "forget everything" leaving
   notes and revisions byte-identical (the spec hashes the tables), a
   private note's facts never listed, and a readable JSON export.

Remove a strict-xfail marker only when its test passes on its own, and never
weaken a test to make it pass: if a test is wrong, change it in the same
commit and say why in the message. No em-dashes; sentence case; commit
trailers; never `pkill -f uvicorn`; own port through
`scratchpad/ui-sweeps/serve.sh` if you need a server at all.

## Brief 24 (Opus agent, backend only): the derived facts pipeline (I9)

The ten strict-xfail markers left in `tests/test_learned_spec.py`, after
Brief 23 built I7 and I4. Written 2026-09-12 by the orchestrator, from
`archive/agent-remaining/learning-loop.md`, which is the file to read first: it says
what exists, and it is the reason this is a brief of its own.

**The finding that makes it one.** I9 reads like a Settings section in
WORLD_CLASS_PLAN 15. It is not. Every one of the ten tests drives a pipeline
that does not exist yet: a night pass that derives facts from notes, a table
for them carrying provenance, an edit and delete and reset lifecycle with
tombstones, and a switch per runner. The screen is the last hour of the work,
not the first.

**Decisions, made here, so the session does not remake them:**

1. **The night pass is a fourth task in `ai/autonomous.py`**, not a new
   runtime. That module already has the scheduler, the cancel and snooze
   protocol, `_enabled_tasks` reading a preference per task, and the
   `system:librarian` attribution that answers "who did this". A new
   scheduler beside it would be a second answer to every one of those.
2. **The derived rows get their own table**, unlike corrections, which stayed
   in `AuditLog` (Brief 23's decision, and its reason was that a store with
   the index, retention and compaction already existed). A derived fact needs
   columns `AuditLog` has no room for and must carry: `entry_id`, `kind`,
   `text`, `span_start`, `span_end`, `model`, `confidence`, `computed_at`,
   `edited_by_user`, `original_text`, `deleted_at`. The last two are the
   lifecycle: an edited row is never overwritten by a re-run, a deleted row
   is never re-derived, and both have to survive `force=True`.
3. **A delete is also a correction.** `test_a_deleted_fact_is_not_rederived`
   asserts a `delete_fact` kind in `GET /learned/corrections`, so the
   tombstone is the derived table's own `deleted_at` *and* a
   `learning.record` row: the first stops the re-derivation, the second is
   what the loop learns from.
4. **Private notes are filtered at the read, not at the write.** The spec
   makes a note private *after* its facts are derived and expects them gone
   from the listing. Filtering only on the way in would leave them listed.
5. **"Forget everything" touches the derived tables only.** The spec hashes
   `entries` and `entry_revisions` before and after and requires them byte
   identical, which is the whole promise: what the app learned is separable
   from what you wrote.

**Tests first**, in this order, removing a marker only when its test passes on
its own: list with span, edit survives a re-run, delete is not re-derived,
reset, the per-runner switch, the master switch, forget everything, private
notes, export. Never weaken a test to make it pass; if one is wrong, change it
in the same commit and say why.

**Files.** `src/memorymap/ai/autonomous.py` (the fourth task),
`src/memorymap/ai/facts.py` (new: derive, store, lifecycle),
`src/memorymap/core/database.py` (the table and its index),
`src/memorymap/api/routes_learned.py` (the routes: `POST /night/run`,
`GET /learned`, `GET|PATCH|DELETE /learned/{id}`, `POST /learned/{id}/reset`,
`GET|PUT /learned/switches`, `DELETE /learned`, `GET /learned/export`), and
`tests/test_learned_spec.py`. `ai/extractor.py` and `ai/tensions.py` already
pull statements out of a note's text and are where to look before writing a
third way to do it. The frontend is not in this brief: ask the orchestrator
before touching `index.html` or `app.js`, and expect the answer to be no
while the documents and whiteboard agents hold them.

**Traps.**

- The specs run on `ai_client` and `fake_ollama`, so whatever the fake
  transport returns *is* the model's answer. Read `tests/fakes.py` before
  designing the prompt: a pipeline that only derives facts from a real
  model's phrasing cannot pass its own tests.
- The span is asserted against the note's own text
  (`content[span[0]:span[1]].endswith("?")`), so the derivation has to carry
  offsets out of the text it read, not re-find the sentence afterwards.
- `budget` is a real limit, not decoration: `POST /night/run` takes one and
  the pass has to stop inside it.
- Standing order 4 (CLAUDE.md): own port and data dir if a server is needed,
  never `pkill -f uvicorn`, `git commit -- <paths>` and never `git add`, no
  em-dashes, commit trailers, `scripts/gate.sh --changed` per step, the full
  suite once before the final report, never push.
- Before stopping: `archive/agent-remaining/learning-loop.md` updated to the state it
  is actually in, and a five-line report.

## Briefs 25 to 31: the plans the owner asked to see finished

The owner, 2026-09-13, after the flagged-bug batch was closed: *"after all
these fixes, can you put agents on finishing all of these?? DOCUMENTS Phases
5 to 8, CHAT Phases 2 to 3, TIMELINE 1 to 4, UI Phase 11's bottom tab bar and
sheets, GRAPH 4b/6b, MINDMAP section 12, SKILLS Phase D."*

Seven briefs, one per plan, written so an agent can take one without reading
the conversation that produced it. They are in the order they should be taken:
the two that unblock other work first, then the surfaces, then the ones that
can ship alone. Two agents at a time, which is the cap and the reason for it
(a third starts colliding on the same CSS files, and this session proved it:
three agents' edits were swept into other sessions' commits).

**Every one of these inherits the standing constraints** in section 0 and in
CLAUDE.md: do not rebuild what exists (grep every id and class first), new UI
comes from DESIGN.md's recipe index, no em-dashes, sentence case, no inline
`style=` (the CSP refuses it), every id a handler looks up exists in
index.html, `node --check` after each JS edit, `bash scripts/gate.sh --changed`
after each step and never the full suite, `git commit -m ... -- <paths>` and
never `git add`, the two commit trailers, and a measurement rather than a
screenshot for every claim.

### Brief 25 (Opus): TIMELINE Phases 1 to 4

The whole plan is open; nothing is built. `docs/roadmap/TIMELINE_PLAN.md` has
the phases, the gates and the row model. Phase 1 is the foundation everything
else sits on (`timelineRow`, bucket sections with sticky headers, density by
scale, the dock's search and filter applied to the array, the grid view and
the popup removed), so it is one agent's whole first pass. **Gate:**
`scratchpad/ui-sweeps/timeline.js` at 1440, 1024 and 390: sticky headers
stick, 0 horizontal scroll, every row has a title readable without hover and a
tab stop, arrows move focus in document order, Enter opens the split panel,
search reduces the row count, `contrast.js` both themes, `errors.js` 0.

### Brief 26 (Opus): CHAT Phases 2 and 3

Phase 1 (grounding and marks) and Phase 4 (skills that finish) are built;
2 and 3 are open. Decisions 5 to 9 and 11 are already made in
`docs/roadmap/CHAT_PLAN.md` section 4 and are not to be re-made. **Note what
this session already changed underneath this brief:** the composer and the
dock controls now have phone rules in `frontend/css/04-chat-dock-appearance.css`
(dock 168px of 844 at 390, one scrolling control line, the text on its own
row), and the answer head is one line at every width with any model name
(`08-consistency.css` family 8, `setAnsweredBy` in app.js). Phase 2's gate
still asks for the composer at two rows at rest at 1024 and one at 1440;
measure before changing anything, because part of it is done.

### Brief 27 (Opus): UI Phase 11, the phone

`docs/roadmap/UI_MODERNISATION_PLAN.md` Phase 11. The decisions are made
there. What this session did is the floor, not the phase: 320 to 1024 has no
sideways scroll, every touch target on 16 surfaces is 44px, the chat dock is
20% of the window rather than 38%, and `errors.js` reports 0 findings at 390.
What Phase 11 asks for and nobody has built: the five-item bottom tab bar that
recedes to icons on scroll down and returns on scroll up, More as a sheet, and
every panel becoming a sheet rather than a column. That is the brief.

### Brief 28 (Opus): DOCUMENTS Phases 5 to 8

Phases 0 to 3 are built and Phase 4 was in flight when its agent was cut off
by a rate limit; its breadcrumbs landed (`#doc-crumbs`, `renderDocCrumbs`), so
**confirm what Phase 4 actually shipped before starting Phase 5** and move its
Built block to HISTORY. Then Phase 5 (review, history and AI), 6 (responsive,
which is mostly done by UI Phase 9 and this session's work: measure first), 7
(export and interchange) and 8 (one editor everywhere, the owner's own ask).

### Brief 29 (Opus): GRAPH Phase 4 part two, the local pane

**6b is built** (2026-09-13, `scratchpad/ui-sweeps/minimap6b.js`): the drag,
click-to-jump, wheel zoom and cluster colours landed earlier, and the size
toggle and the fade-when-everything-fits landed with the measurement. Of
Phase 4's second half, **Play on the time slider and the 2x PNG export of the
visible frame with the legend are also built** (`#graph-time-play`,
`gcExportPng(2)`).

So this brief is one item: **the graph beside an open note or document**, the
same renderer at `size: "pane"`. Read this before starting, it is the whole
difficulty and the reason it was left: `graph.js` keeps the renderer's state
in module-level singletons (`graphDims`, `graphSvg`, `graphZoom`,
`graphNodesRef`, `graphMinimapProjection`), so a second live instance beside a
note would fight the tab's own. Two honest routes:

1. Lift those into a context object the renderer is called with, the tab
   passing the one it already has. Correct, and it touches every function in
   the file that reads them.
2. Give the pane its own module-level set behind a `size` switch, which is a
   second copy of the state with all that implies.

Recommendation, and take it unless measurement says otherwise: route 1, in its
own commit, with no behaviour change to the tab, proved by the existing graph
sweeps passing unchanged before the pane is written at all.

### Brief 30 (Opus): MINDMAP section 12

`MINDMAP_PLAN.md` section 12, "the map as its own tool" (INBOX 93). Phases 1
to 5 and the previews are built. Note that this session added the board-kind
switch (`#wb-board-kind`, whiteboard.js), which is the control section 12's
"a map is a first-class thing" argument was missing.

### Brief 31 (Opus or Sonnet): SKILLS Phase D, recovery

`AGENT_SKILLS_REFORM.md` Phase D. Phases A, B and C are built. Backend work
against its own spec tests, so it is the one brief here a Sonnet agent can
take: the fix is named in the plan and verifiable without design judgement.

## Brief 33 (the PR after #144, Fable orchestrating): the rest of WORLD_CLASS_PLAN, every untouched plan, then professional use

> **Not for PR #144.** The owner, 2026-09-13, while seven agents were finishing
> that PR: *"I want to cover the rest of the world class plan and any other
> untouched plan after this pr. and after this pr I intend to do a full lot of
> fixes and refinements for professional use as well."* Recorded here so the
> next PR starts from a line the owner wrote rather than from a guess; nothing
> below is started from a "take the next brief" instruction while #144 is open.

**Goal.** Three passes, in this order, each its own PR or its own gated batch:

1. **WORLD_CLASS_PLAN.md, the rest.** Walk sections 3 (the fifteen dossiers
   D1 to D15), 4 (B1 to B8), 5 (abilities without AI), 6 (measuring
   professional) and 7 (the small things) row by row; for each row, `grep` the
   running app first (section 1 of CLAUDE.md), mark what is built with its
   commit, and brief an agent per dossier for what is not. Section 8's
   execution order governs. The consistency contract (section 1) is the gate
   for every merge: a lint per rule already exists; a rule without one gets it
   in the same commit.
2. **Every plan with an open section.** At that session's start, list the
   eleven plans (ROADMAP.md's opening table) and every phase, "Not verified
   until built" line and "Placed from INBOX" row not marked built; then
   agent-remaining/*.md "left" lists; then ROADMAP's live list and BACKLOG by
   impact. Brief 32 (templates) stays in BACKLOG 4b until the owner says
   otherwise.
3. **Professional use: fixes and refinements.** The owner's own list, dropped
   into INBOX as it comes (standing order 2), plus the measures in
   WORLD_CLASS_PLAN section 6 run against the merged head: every surface at
   the four widths in both themes with `errors.js`, `contrast.js`, `docks.js`,
   `touch.js`; the full suite once; a real model driven through the map, help
   chat and skills paths that section 4 of CLAUDE.md says no fake transport
   covers.

**Done when.** Each of the three has a five-line report (status, commits,
numbers, not verified, found-not-fixed), the plans hold open work only, and
the owner has said which PR to merge.

**Decisions made.** Nothing here reopens a plan's "Decisions made" section.
Agents by specialty as standing order 4, with the cap lifted only when the
owner lifts it again.

## Brief 32 (Opus): templates and base layouts, for boards, maps and documents

> **Not for this PR.** The owner, an hour after asking for it: *"put the
> templates idea in the roadmap, not for this pr"*. It is a feature, this PR is
> a release, and the difference matters. Kept here in full because the research
> below is what stops it being built a fourth time; the standing backlog row is
> in BACKLOG.md section 4b. Do not start it from a "take the next brief"
> instruction.


The owner, 2026-09-13, looking at a board an agent had built to photograph for
the README: *"add the ability to save whiteboard templates and base layouts, Im
inspired by this example whiteboard png the agent took and it can be like canva
templates, same with the mindmap and documents."*

**Read this before designing anything, because most of it is built.** The idea
is one step from three existing mechanisms and must not become a fourth:

- **Notes** already have templates: `BUILTIN_TEMPLATES` in app.js, a "Yours"
  group beside a "Built-in" group, offered through the `#entry-template` select
  on the capture panel. That grouping is the shape the owner is describing, and
  it is the precedent for what "mine" versus "shipped" looks like.
- **Documents** already have "new from template" with `{{date}}` and `{{title}}`
  substitution (documents.js), and DOCUMENTS_PLAN Phase 5 item 5 already
  specifies the gallery: templates stored as documents tagged `template`,
  offered with a preview. Build that, do not invent a second scheme.
- **Boards and maps** can already be copied whole:
  `POST /whiteboard/boards/{board_id}/duplicate`. A template is that, plus a
  flag saying "this board is a starting point" and a gallery to pick from.
  `BoardOut` already carries `preview_items`, `preview_edges` and
  `preview_aspect`, which is exactly what draws the board cards in the Library
  today, so the gallery's thumbnails are a solved problem.

**The decision to make first, and to record in the plan before building**
(standing order 3): where a board template lives. The cheapest answer that fits
this codebase is the one maps already use, `board_settings` on the board's own
note (see `_board_settings` in routes_whiteboard.py, which stores `type` and
`layout` as JSON and degrades every unknown value to a default). A
`template: true` there, plus the existing duplicate route, is most of the
feature. Weigh that against a separate table and write down why you chose what
you chose.

**Scope, in build order.** Boards first, because the request came from a board
and the duplicate route already exists; then maps, which are the same object
with `type: "map"`; then documents, which has its own plan row waiting. Ship
boards end to end before starting maps: three half-built galleries would be
worse than one that works.

**What "like Canva templates" has to mean here, concretely:** a gallery you
open when making a new board, showing a preview of each; a handful shipped with
the app (the screenshot's own shape is a good first one: a titled banner, three
labelled columns, a few coloured cards); "save this board as a template" on an
existing board; and your own templates listed beside the shipped ones, the way
the note picker already groups "Yours" and "Built-in".

**Ship with:** the decision written into WHITEBOARD_PLAN (and DOCUMENTS_PLAN
for its half) before the code; a test that a template survives a round trip and
that using one leaves the template itself unchanged; the gallery on DESIGN.md's
recipe index or a new recipe plus its lint in the same commit; and measurements
in Chromium for the gallery at 1440, 1024 and 390.

## Brief 34 (Opus, two agents): characters, the faces, the companion and Atlas, to the end

**Why this brief exists.** The owner, 2026-09-24, after a day of requests
about faces: "scope out and plan the whole thing with the avatars and
companions now then leave it at that for the agents". This brief is the whole
of that scope. The orchestrator does not add to it; the two agents below work
it to the end, and anything new the owner asks about characters becomes a row
in section 6 here, not a new thread of work.

**Goal.** Every face in the app is a designed character rather than a disc
with things stuck on it; a person can keep a small companion on screen that
feels alive, reacts to what they do, and is never in the way; Atlas is the
best-drawn character in the app. All of it cheap enough for a student laptop.

**Where it stands (read the commits, not this line):** built and merged:
`nameMood` (name reading), the faces, the viewer, pointer-follow, Shuffle and
per-part overrides (`avatar_style`), the corner companion with its menu,
persona faces per chat message, Atlas moods on chat events. Built in agent
worktrees, not yet merged: the character interface (`characterFor`,
`registerCharacter`, 4741aa8), one-silhouette generated characters (d1e74fd),
perches, surfaces and edges, the behaviour picker, drag and drop onto the UI
(4b4f1d4, 39bdb09), Atlas in `frontend/js/atlas.js` (in progress).

### 1. Decisions made (do not remake)

1. One character interface (`characterFor(seed)`, `registerCharacter`, in
   avatars.js above `nameMark`). Every surface draws through it. Atlas is a
   registered character in `frontend/js/atlas.js`.
2. One silhouette per character: head flows into body, chibi proportions
   (head 55 to 60% of height), one outline rule for all parts, features
   placed on the shape, animals with their own ear, snout and tail cues.
   Under 40px a head-only mark, still not a flat disc.
3. The companion is off by default (Appearance, "Corner companion"), shows
   only when unlocked, is either you or the chat persona (Atlas when the
   persona is the default voice).
4. Behaviour is a game-AI picker: one decision every 4 to 12s from a single
   `setTimeout`, weighted by context (perch type, idle time, time of day,
   recent events, persona mood), with cooldowns. Every behaviour is a class
   plus transform/opacity keyframes. No `requestAnimationFrame` loop of its
   own; pointer proximity reuses the pointer-follow tick.
5. Perches are computed from the real UI per tab (a bar's top edge to sit on,
   the header's underside to hang from, a card's top to stand on, a panel's
   edge to peek from), validated against controls it must never cover (back
   to top, chat composer and jump pill, docks, dialogs). A dragged-and-dropped
   spot is remembered per tab, relative to the surface it landed on.
6. Sound reactions only from what a page can know: this app's own audio and
   video elements, text-to-speech and the Media Session state. Never the
   microphone, never other apps.
7. Cost: nothing runs while the companion is hidden, the window is hidden or
   the app is locked; reduced motion keeps poses without loops; animation off
   gives still poses. Target under 1ms of main thread per idle minute beyond
   the face animation already there.

### 2. Done when

- Every face site renders through the interface: persona list, chat picker,
  chat bubbles, profile head, the Settings head button, dashboard mark,
  greeting persona picker, viewer, companion, welcome card.
- A sheet of 12 generated names and Atlas in every expression, at 104px and
  28px, light and dark, has been screenshotted and judged against real
  mascot work, and the judgement is written in the commit or report.
- The companion: turns, sits and dangles its legs, hangs two-handed,
  one-handed and by the feet, peeks shyly from behind a panel edge and ducks
  when the pointer comes near, walks or hops between perches on a tab change,
  reacts while carried and lands on the nearest surface when dropped.
- Context reactions: drowsy at 3 idle minutes, asleep at 8 (z bubbles), wakes
  with a stretch; headphones and a head bob while this app plays sound;
  reading glasses while a long answer streams; a nightcap after 23:00; a
  cheer on a saved note; a startle on an error toast; a bell when a reminder
  is due; an unplugged cable when offline; a wave when the window regains
  focus after a while.
- Atlas: at least 12 expressions mapped to app events, its node ring part of
  its body, an idle layer (breathing, blinks, halo orbit), every companion
  pose and reaction in Atlas's own style, and a readable 16 to 24px head.
- Measured and reported: idle main-thread cost with the companion on and off,
  per 10s with Atlas visible, old against new.
- `tests/test_name_mood.py` still passes; the lints (motion tokens,
  reduced-motion, cheap animations, icon gap, ui recipes) pass; no inline
  `style=`.

### 3. Files

`frontend/js/avatars.js` (the interface, generated characters, companion,
picker, perches), `frontend/js/atlas.js` (Atlas), `frontend/css/08-consistency.css`
(the `nm-`, `nmb-` and Atlas rules), `frontend/index.html` (script tags with
`?v=`, Appearance rows), `frontend/js/settings.js` (Appearance defaults),
`tests/test_name_mood.py`, plus the SCRIPTS lists in tests that name
avatars.js.

### 4. Agents

- **Companion agent** (the generated characters, the companion, the picker,
  perches, drag and drop, context reactions, prop slots). Documents the prop
  slots (head-top, face, hand-l, hand-r) in the interface comment.
- **Atlas agent** (atlas.js). Merges the companion agent's commits as they
  land (merge, not rebase) and draws Atlas's own version of every pose, prop
  and reaction.
- The orchestrator merges, gates and pushes; it does not take on character
  work itself.

### 5. Traps

- A face below 28px must not loop or follow the pointer (the chat bubble
  marks): cost for nothing visible.
- The companion's bubble uses `--modal-bg-opaque`; `--bg` is transparent in
  some looks and made a blank bubble.
- Measure overlaps with `offsetLeft/Top`, not a rect read mid-transition.
- `pkill -f "port N"` kills the calling shell here; run it alone.
- The app.js gzip bound (750KB): character code stays out of app.js.

### 6. Rows added after this brief (the owner's later asks land here)

1. Attention, not pointer-follow (the owner, 2026-09-24: "if the companion
   is sleeping they dont move with every mouse movement but stay still
   unless they get moved very fast ... like realistic npcs"). The companion
   holds a look target with a saccade then a head turn, re-targets only on
   a far move or something salient, ignores the pointer asleep (a close
   flick or click may stir it, sometimes wake it, groggy after), and has a
   slow mood (energy, curiosity, sociability) that leans the picker; poked
   too often it is grumpy for half a minute, ignored long it waves.
   Companion agent. Built: see the commit "Companion: attention, stirring,
   grogginess and a slow mood".
2. Caching (the owner: "can caching be used to reduce the load of
   companion, bg, and other animations??"). Faces drawn once, cut into
   parts, cached as pictures and moved on the compositor; the logo emblem
   already was (a canvas turned by CSS). Built: "Faces are drawn once and
   moved on the compositor".
3. Movable at all times, settling after a drop, calmer (every 20 to 60s,
   which replaces decision 4's 4 to 12s), a shy peek that never flashes,
   and discoverability (catalogue, Help, tour card, one nudge). Built: the
   two commits after row 2.

- The owner, 2026-09-24, with four generated reference sheets: Atlas
  redesigned as a glossy gel water-drop spirit (teardrop head flowing into a
  swept crest, almond eyes, blush, chest star, one or two orbiting rings,
  short constellation tail, star-dust inside the body), plus a male and a
  female version of Atlas and of the companions, chosen in Appearance. With
  the Atlas agent.

- The owner, 2026-09-24 evening, verbatim in parts, for the companion
  agent: "the surfaces I can drag atlas onto are either at the top or
  bottom and nowhere else ... why can atlas only be on some panels or hang
  from some areas and not on other areas of the page or other panels??";
  "I can only drag atlas around by the head, not the body"; "the x button
  being on the companion the whole time is kinda annoying. keep it in the
  right click or hold popup menu"; "let the companions appear smoothly not
  just appear suddenly in different locations"; "atlas startles a lot and
  it's kinda distracting at times because I navigate through the notebook
  so fast"; "the popup menu when right clicking on the companion doesnt
  appear next to the companion or cursor"; "atlas and the companions need
  better ai and behaviour and abilities. they need to be cleaned and
  refined." Built (companion agent): every surface on the tab, the whole figure
  as the handle, no x, no teleports, reactions debounced and startles only
  for error toasts, the menu at the pointer or beside it, errands; and
  "I want atlas to be a companion option regardless": Appearance, Corner
  companion, Atlas. See the commits "Companion: every surface ..." and
  "Atlas is a companion option of its own".

- The owner, 2026-09-24 late, for the companion agent (next free slot):
  "I want the companion to be able to interact with more surfaces. also it
  is still a little jarring with how it moves so much across pages. can it
  be like delayed ... if you are just flicking around pages, it stays on the
  one you've most recently been on the longest, and then if you spend long
  enough on a page, the avatar will get up and teleport to be on your
  current page smoothly and maybe with a slight effect ... smooth,
  unintrusive and clean, maybe even walking from the edge of the screen or
  climbing up a panel to get on top so as to not distract the user ...
  smoother, more life like and better ux so it is a thing that is fun to
  have, not something ... jarring me mentally every time I switch pages."
  Plan: a dwell rule (it stays with the page you spent longest on recently;
  it follows only after about 8 to 12s settled on a new page, never during
  flicking), an arrival that is out of the way (it walks in from the nearest
  screen edge along the bottom bar, or climbs up a panel's side to its top,
  or a soft sparkle-fade in at a quiet perch, chosen by distance and what is
  free), no motion at all while the pointer or typing is active nearby, and
  more surfaces (list rows, cards in grids, chips rows, sidebars, dialogs'
  edges while open).
  The owner, later the same evening, on how it should feel: "like if a user
  is on one page mainly the companion will chill there, maybe entertain
  itself, meditate, fish off a panel, sleep ... if the user goes to a
  different or other different pages it will start to feel left out and
  might want to move to the new page, or if it was sleeping or meditating
  maybe it'll just stay on the other page a bit longer, unless it is
  disturbed by the user in which it'll move over. if the user stays on the
  new page long enough atlas or the companion will make its way onto the
  new page ... flying in, walking or jumping from the side of a screen,
  coming from the roof of the screen, teleporting in etc. whatever matches
  the character traits."
  Plan, added: a settled page gets idle pastimes, cheap and sprite-level
  (meditate, fish off a panel edge, doze, fidget, look around); leaving it
  raises a "left out" need that grows with time on the new page, so the
  follow delay is 8 to 12s awake, longer (about 25 to 40s) while asleep or
  meditating, and immediate when the user disturbs it (click, drag, or
  pointer dwell on it); a small visible cue that it noticed (a glance, an
  ear or crest flick) before it leaves; the arrival picks from the
  character's own set by trait (a flyer flies in, a light one jumps in from
  the side, a climber comes down from the top edge or up a panel, a mystic
  one teleports with a soft fade), never across the user's work area.
  The owner, next: "I dont just want it constantly teleporting or fading
  instantly to a different part of the screen as it is distracting. maybe
  there can be an astral or ghost mode for it to be less obvious that it is
  there?? and it can be dynamically togglable and intent recognition driven
  if the dynamic toggling is on?? it needs a full professional ai behaviour
  design and system ... that is still cheap and affordable."

  Behaviour system design (the spec the companion agent builds to):
  - What exists (avatars.js): one timer (`nameMarkBuddyTick`, every 20 to
    60s), a weighted utility pick (`nameMarkBuddyDecide`) over
    `NAME_MARK_BUDDY_ACTS` shaped by a slow mood (energy, curiosity,
    sociability), drowsy and sleep by idle time, and `nameMarkBuddyCue`
    for app events. Keep all of it. The fault is placement: every tab
    change re-places it after 450ms and 1400ms, and `nameMarkBuddyCheck`
    moves it whenever the tab differs. That goes.
  - Three layers, each a pure function with its own tests:
    1. Perception: counters updated from events the app already fires
       (keydown in an editor, pointer move and dwell, scroll, tab reveal,
       chat streaming, focus mode, `visibilitychange`). They are passive
       listeners that bump a number and read no layout.
    2. Intent (`nameMarkBuddyIntent(signals, now)`), one of: `focus`
       (about 20 or more keys in 30s in an editor or the chat box, or
       Documents focus mode), `reading` (scrolling, little typing),
       `browsing` (3 or more tab changes in 20s), `idle` (no input 60s),
       `away` (hidden or no input 5 min), `engaged` (pointer on the
       companion, drag, click, its menu open). Hysteresis: an intent
       holds at least 5s, and `focus` ends 5s after typing stops.
    3. Behaviour: the existing utility pick for acts, plus a small
       location machine: `settled` (pastimes: meditate, fish off a panel
       edge, doze, fidget, look around) -> `restless` (the noticed cue:
       glance toward the new page, crest or ear flick) -> `travelling` ->
       `arriving` -> `settled`.
  - Home page by dwell: each page keeps a decayed score of time spent on
    it (half-life about 3 minutes); home is the top score. A new drive,
    belonging, rises while the user is off home: full rate awake, 0.3x
    meditating, 0.15x asleep. It follows when belonging is past the
    threshold AND the current page's score is at least 1.5x home's. In
    practice that is 8 to 12s awake, 25 to 40s asleep or meditating,
    never while `browsing`, and at once when `engaged` (a disturbance).
    At most one move every 2 minutes unless disturbed. Covering a
    control still gets a step aside on the same page, never a page jump.
  - Presence, a setting under Appearance > Companion with three values
    (and in its right-click menu): Always visible; Fades while you work
    (the default: astral while the intent is `focus` or `reading`,
    visible otherwise); Always astral. Astral: about 30% opacity, tinted
    toward the palette's violet, a faint rim glow, breathing only (no
    pastimes), `pointer-events: none` so it never catches a click, and
    back to full on hover or on `engaged`. The switch is a 600ms opacity
    and filter transition, never a pop.
  - Travel, never a jump across the screen: the route runs along the
    screen edges and the bottom bar, away from the focus region (the
    focused element's box, the caret's pane, the hovered pane). It
    travels in astral form when presence allows, so the trip is barely
    visible. Arrival is chosen by the character's traits: a flyer flies
    in, a light one hops in from the side edge, a climber comes down from
    the top or up a panel side, a mystic one reforms with a slow 800ms
    dissolve. Only a mystic one ever teleports, and only when the edge
    route is blocked. Travel takes 1.5 to 4s.
  - Cheap by construction: one timer, no rAF except while travelling or
    during an arrival, transform and opacity only, layout read only at a
    decision (at most one per tick), nothing at all while the document is
    hidden. Low power (`hardwareConcurrency <= 4` or `saveData`): half the
    pastimes and presence fades without the glow. Reduced motion: no
    travel animation, an opacity cross-fade only.
  - Tests first, on the pure functions with a fake clock: intent from
    signal sequences; follow timing (awake, asleep, meditating,
    disturbed); no move while browsing; at most one move in 2 minutes.
  - Done when (measured in a Playwright probe, with the numbers in the
    report): flicking across 6 tabs for 60s gives 0 relocations; settled
    12s awake gives 1; asleep, none before 25s; typing 40 keys in the
    editor gives astral within 2s and visible within 6s of stopping; 0
    instant repositions (every move has a travel or arrival phase); tick
    main-thread time under 1ms and no long tasks from the companion.
- The owner, 2026-09-24 evening, verbatim: "refine the avatar generation as
  it is still a little messy and I'm not happy with what is generated when
  I put in my name 'Brayden' or 'Sushicraft563, SushiLord' etc", then "I
  still dont like my hair for 'Brayden' and I want a better aesthetic",
  then "they look a bit too mundane now, they are boring, really common".
  Built (the generated characters, avatars.js): a cue budget (words drive
  at most two cues, one per head, face, held and body slot), people with
  natural skin and hand-drawn hair (twenty styles), presentation chosen in
  Face looks and Your look and never read from a name, and two traits per
  face from its hash. The rules are in `nameMood`'s header; the sheets come
  from `scratchpad/ui-sweeps/facesheet.js`. See the commits "Faces: ...".
  Open: `namemarks.js` finds one pair of 23 names under its 15% floor
  (13.9%), since neighbouring natural skin tones differ less than the gel
  colours did.

## Briefs 35 to 42 (2026-10-10, Fable orchestrating): the owner's list, the engine, the direction

Shared rules for all eight: `docs/roadmap/agent-remaining/agent_common.md`
plus the 2026-10-10 additions in HANDOVER's top block (effort by task; Sonnet
and Haiku for well-defined and mechanical work). Every item below is the
owner's, verbatim where quoted; the complete 2026-10-10 list is placed in each
plan under "Placed from the owner's list, 2026-10-10" by Brief 40. ROADMAP's
"Direction, 2026-10-10" is the thesis these serve.

### Brief 35 (Opus, high): the Gemini branch triaged
Goal: boot works with no new dependencies; unused vendoring gone; grounded
back to 1.0 on the showcase; credits file. Facts and decisions: ROADMAP
Direction policy 1 and the agent's own brief (the orchestrator's prompt,
2026-10-10). Files: `src/memorymap/vendor/`, `ai/composer.py`,
`ai/question_noise.py`, `ai/composer_tables.py`, `ai/intent.py`,
`ai/lexical_filing.py`, `ai/presets.py`, `ai/tools/__init__.py`,
`api/routes_chat.py`, `frontend/js/skills.js`, `requirements.txt`,
`tests/_composer_eval.py`. Numbers: grounded 1.0 to 0.25 (Gemini head), to
1.0; import time 1.08 s to under 0.5 s; vendor 15 MB to under 1 MB; lints
green. Running as the `triage` agent.

### Brief 36 (Opus, high): whiteboard and mind map
Goal: the fifteen board and map items of the owner's list (edge arrows,
port anchors, vertical text, note sidebar clipping, ghost preview and the
clipped frame, comments edited and with links, sticky versus text box, slash
menus in boxes and nodes, the icon library findable, the empty Boards state
and auto-naming, rounded rectangles on the map, branch colour and spacing on
insert, Enter as newline, appearance options) with WHITEBOARD_PLAN "Placed
from INBOX, 2026-10-07". Files: `whiteboard.js`, `whiteboard-map.js`,
`07-whiteboard-misc.css`. Sweeps: wbregress.sh, wbrotatelinks.js, wbports.js,
mapcore.js, mindmap.js. Running as the `boardmap` agent.

### Brief 37 (Opus, high): Chat, Ask, first run and the owner's UI bugs
Goal: model gating per CHAT_PLAN decision 22; the first-run queue with zero
overlapping panels; the tour handoff (INBOX 745 (d)); 32 chat, Ask, notes and
settings items from the owner's list (token pill popover, histories cleared,
source kinds, searching indicator, similarity numbers, composed bubble label
and fade, web sources and retry, the no-model tag-suggestion tracebacks,
questions list, packages progress, OCR in quick access and palette, logs of
background tasks, suppressed suggestions list, metadata rows). Running as
the `chatui` agent.

### Brief 38 (Opus, high): the graph, topics first-class, note properties
Goal: view switches end fitted; the first paint fitted (INBOX 738); even fit
margins; Shape gated to Force; topics renamed, dragged as a group and shown
on the note; the local map redraw; custom note properties. Files:
`graph.js`, `graph-canvas.js`, `note-properties.js`. Running as the `graph`
agent.

### Brief 39 (Opus, high): the deterministic engine
Goal: CHAT_PLAN Phase 6, decisions 30 to 40, steps 1 to 10 in order, each a
commit with the eval numbers. Starts when Brief 35 has merged (same files).
Files: `ai/composer.py`, new `ai/factgraph.py`, `ai/realise.py`,
`ai/commands.py` (from `git show origin/wip/composer-acts:src/memorymap/ai/commands.py`
and its test), `ai/composer_tables.py`, `ai/question_noise.py`, `ai/when.py`,
`ai/facts.py`, `api/routes_chat.py`, `frontend/js/chat-agent.js` (the bubble
label, the quotation style, the web source list), `tests/_composer_eval.py`
and `tests/fixtures/composer/`. Numbers: grounded 1.0 on every set;
first_line 25/25; openers_distinct and lead_in_repeats over a 20-turn
session; measured-sentence accuracy 1.0; import time under 0.5 s. Traps: a
rewrite rule that changes meaning (test pairs for every rule); a measured
sentence whose number cannot be re-derived from the fixture (the lint);
quoting with quote characters (offsets).

### Brief 39b (Opus, high): filing and the taxonomy
Goal: WORLD_CLASS_PLAN section 23, steps 1 to 5. Starts when Brief 35 has
merged. The pack is at the orchestrator's scratchpad
(`up/final/MemoryMap_Final/`) until step 2 lands it under
`src/memorymap/ai/data/taxonomy/`. Files: `ai/lexical_filing.py`,
`ai/janitor.py`, `ai/taxonomy.py` (replaced), `frontend/js/tidy.js`,
`tag-suggest.js`, Settings. Numbers: top-1 accuracy on the 120-note fixture
with and without the embedder, before and after each step; the "Study" bug
reproduced then gone.

### Brief 40 (Sonnet, medium; Haiku for the placement pass): research and placement
Goal: (a) place every item of the owner's 2026-10-10 list (the orchestrator's
`owner-1010.txt`) that Briefs 35 to 39b do not already carry into its plan
under "Placed from the owner's list, 2026-10-10", verbatim, one line of
recommendation each, bugs first; INBOX stays under twenty. (b) Research,
recorded in ANALYSIS.md under "Repositories and libraries read, 2026-10-10":
for each of the owner's forks (storytold's wordcraft, designcraft, deckcraft,
gridcraft, photocraft, lightcraft, pdfcraft, soundcraft, filmcraft; jgraph's
drawio) the licence, stack, size, and the three things worth taking as
ideas or formats; haifengl/smile (Java) the algorithms worth re-implementing
small; candidate vendorable libraries (pure Python or plain JS, offline,
licence, size, what it would replace: for example symspell as an algorithm
not a package, parsedatetime versus `when.py`, KaTeX, mermaid, Pyodide size,
ruff-wasm, eslint-linter-browserify, sql.js, transformers.js) each with a
keep or drop and why; NLTK and WordNet's size against a trimmed table.
(d) The gap matrix of ROADMAP's parity programme: one table per surface in ANALYSIS.md, from each fork's README, feature list and command catalogue (WebFetch; the forks are public), each row checked against the running app. (c) Answers, each as a plan row or BACKLOG row with a recommendation: a
Docker image (a `Dockerfile` and compose file, offline model volumes,
measured image size); reusing the system Python's packages
(`--system-site-packages` as a setup choice with its risks); whether the MCP
server works (run it, list its tools, say what is broken); the phone over
HTTPS (self-signed trust flow on iOS Safari and Brave, the "connection was
lost" cause, a QR code and a one-page trust guide, mkcert-style local CA as
an option); whether a first install needs the internet and where the app
says so. Files: ANALYSIS.md, BACKLOG.md, the plans, `scratchpad/` for any
probe. Numbers: counts placed; image size; the MCP tool list.

### Brief 41 (Opus, high): UI density, refinement and WCAG 2.2
Goal: UI_MODERNISATION_PLAN Phase 12, steps 1 to 7. Invoke the
ui-ux-pro-max skill for the research step and record the ten rules taken in
DESIGN.md first. Files: `00-tokens-shell.css`, `08-consistency.css`,
`01-forms-settings.css`, `sheets-selects.js`, `timeline.js`,
`notecardmeta`-related CSS, DESIGN.md. Numbers: the census before and after
(control heights, gaps, radii, hover boxes, topbar height), the wcag22 sweep
counts per surface, contrast minima. Traps: a token change that flattens a
card (`NaN` once did); glass-off list; help moves with every control.

### Brief 42 (Opus, high): documents
Goal: DOCUMENTS_PLAN section 21 (the code editor to VS Code standard, writing
checks everywhere) and the owner's items: INBOX 735 (p5 sketch kind; code
completion on code documents), 736 (output panel height; Stop state),
highlights on pages ("I want to be able to highlight sections on pages like
key passages and references"), comments with bookmarks and links, embedded
link cards with a viewer ("a way to embed and render embedded links and a
special viewer for them"), the long-form preference at first run
("when the user logs in, they should be able to choose their preferred style
of taking notes"), and the idea in the owner's list of labelled and linked
sections inside a document with a local graph embedded (a Phase row in
DOCUMENTS_PLAN with decisions, built only after the rest). Files:
`documents.js`, `documents-code.js`, `documents-prose.js`, `09-editor.css`,
`frontend/vendor/codemirror`. Numbers: doctype.js under 30 ms; the
completion switch measured on a .js document; highlights persisted and
re-rendered.

The owner, 2026-10-10, on the code editor: "it leaves a lot to be desired
and just sucks compared to vs code and other IDEs. make sure to make full
use of the vendored repositories and libraries, are there any others that
should be vendored??" Brief 42 therefore starts from ANALYSIS.md's
"documents (code) against VS Code" parity table and DOCUMENTS 21, and
evaluates these against ROADMAP policy 1 (plain JS or WASM, offline, small,
lazy-loaded, licence beside it), each with a measured size and a keep or
drop before any is vendored: the CodeMirror 6 packages not yet in
`frontend/vendor/codemirror` (lint, merge for a diff view, more `lang-*`
modes and lezer grammars, indentation markers, the search panel's
replace), `ruff-wasm` (Python lint and format), `eslint-linter-browserify`
(JS and TS lint), `js-beautify` or `prettier` standalone (formatting, the
smaller first), `KaTeX` (maths in prose and code comments), `mermaid`
(already decided in BACKLOG), Pyodide only as an optional package through
the packages system (too large to ship), and a tree-sitter WASM grammar
only if the outline and symbol navigation cannot be had from lezer. The
editor's bar is VS Code's everyday feel: bracket pairs and guides, active
line and gutter, multi-cursor, find and replace with regex, go to line and
symbol, folding, minimap off by default, format on demand, diagnostics
pinned to their line, completion that knows the language, a command
palette inside the editor, and a diff view against the last saved version.

### Brief 34 continues (Opus, high): Atlas and the companion
INBOX 742 and 743 and the owner's list ("atlas's arm movements on both
versions need a lot better animating as they are basically permanently in a
downward arc except for when hanging"; "experiment with more tail behaviour
and movement as well, and give the rings, as well as nebular flow and lower
body subtle animations that are all cheap"; "the companion doesn't really have
any variation in how it moves around at various distances"; "more mouse
interaction with the companion like rubbing its head, flipping it upside
down"; "the behaviour of the companion is not often reflected in the enlarged
view"). Numbers: mood changes per session before and after; layouts and
paints per second at rest (companionperf.js); the arm's angle range over a
walk cycle.


### Brief 43 (Opus, high; Sonnet medium for the fixes it names): the expert audit
The owner, 2026-10-10: "I have only given you everything I have noticed but I
am not an expert ... fix, improve and extend and add everything I have missed
or havent thought of." The things a notebook of this kind must get right that
no report has asked for, each a measured probe with its command, fixed when
small, else a BACKLOG row with the number:
1. **Data safety**: a backup made, the data dir deleted, the backup restored,
   every note, board, map, document, reminder, tag and setting compared
   (`backupbundle.js`; a Python round-trip test over a 500-note fixture);
   every export (markdown, HTML, docx, PDF, JSON) re-imported and diffed;
   the alembic chain from 0.3.0's schema to head on a copied database.
2. **Old hardware**: boot to interactive under 2.5 s with the CPU throttled
   4x in Chromium, idle CPU under 1 percent (`idlecpu.js`), memory under 300
   MB with 5,000 notes seeded (`seed-timeline-bulk.py`), every list paged,
   the graph worker's frame under 16 ms at 2,000 nodes, no layout thrash on
   typing (`autogrowfast.js`), the service worker's cache honouring the
   version stamps.
3. **Offline and privacy**: a run with the network blocked (Playwright
   `route` abort) makes zero requests to anything but localhost and shows no
   broken surface; every outbound call (model pulls, web search, updates)
   behind an explicit setting with its own line in Settings, Network.
4. **Keyboard and screen reader**: every surface completed by keyboard alone
   (`keyboard.js`, `dockeyboard.js`, `keyreach`), axe clean (`axe.js`), names
   on every control (`a11yname.js`), focus never lost after a dialog closes.
5. **Error and empty states**: every API error path renders a designed
   notice with a way out (WORLD_CLASS_PLAN 21): kill the server mid-session
   and count the surfaces that fail silently; the empty state of every tab
   and widget measured against the recipe.
6. **Search quality**: a 60-query relevance set over the showcase notebook
   (lexical, semantic, hybrid) with precision at 5 recorded; typos and
   synonyms from the noisy set included.
7. **Security**: CodeQL clean, the CSP without unsafe-inline, auth on every
   write route (a test that walks the router), rate limits on the lock
   screen, the LAN mode's cert (Brief 40's findings), uploads type-checked.
8. **Upgrade path**: the app updated from the previous tag with data in
   place; the release notes rendered; the launcher's rollback.
9. **Tests**: the suite's slowest 20 tests and any flaky one (three runs of
   the frontend lints), the xfail markers still honest.
Report the numbers per item; fixes under one hour land in the brief; the
rest become BACKLOG rows "Expert audit, 2026-10-10" ranked by user impact.

### Brief 44 (Sonnet high for the catalogue and converter; Opus high for the editor phases): the draw.io programme
The owner, 2026-10-10: "deep analyse and catalog everything in draw.io as
well, use, replicate, take and implement it and then build on it and make it
the best editor the world has ever seen." draw.io is Apache-2.0 (inbound to
AGPL is fine, notices kept). Part 1 (Sonnet): read the fork
(Braydenh563/drawio, upstream jgraph/drawio: `src/main/webapp/js/diagramly`,
`grapheditor` (Format.js, Actions.js, Menus.js, Sidebar*.js, EditorUi.js,
Graph.js), `stencils/*.xml`, `templates/`, `shapes/`) and write
WHITEBOARD_PLAN "The draw.io programme, 2026-10-10": a complete catalogue in
tables by area (Format panel: Style, Text, Arrange tabs, every control;
Arrange menu; Edit style and edit data; edge styles, waypoints, jumps,
routing, arrowheads, labels on edges; connection points and constraints;
layers and pages; shape libraries and the stencil XML format; templates;
find and replace; outline and navigation; keyboard shortcuts; selection and
grouping, containers and swimlanes; images, math, embedded links and
tooltips; export formats; the sidebar search; what collaboration or cloud
features are out of scope), each row: feature, MemoryMap has it (checked),
how draw.io does it (one line, file named), how MemoryMap would do it on its
canvas model (one line), cost. Then the converter: `scratchpad/stencils/`
`convert_stencils.py` turns a stencil XML library into the board's shape
JSON (paths, fills, text regions, connection constraints), run on the basic,
flowchart, arrows, UML and network libraries; the count converted, the ones
that fail and why, five rendered in Chromium beside draw.io's PNG of the same
shape, measured. Part 2 (Opus, after Brief 36 merges): the programme's
phases in WHITEBOARD_PLAN order, each gated by wbregress.sh and the matrix
rows, starting with the Format panel's three tabs and edge routing.

The owner, 2026-10-10, on part 2: "its not just draw.io's catalogue but all
the ways tools, and functions and other things work and function and how
refined it is." So part 2 is **mechanics parity, measured**, not a feature
list: for every tool and gesture the board has, a behaviour spec taken from
draw.io's own handlers (Graph.js, mxGraphHandler, mxVertexHandler,
mxEdgeHandler, mxRubberband, mxPanningHandler, the Sidebar's drop and hover
code) in one table: the gesture (select, multi-select, rubber band, move,
resize with and without aspect, rotate, snap to grid and to guides, connect
by hover port, drag a connector end, add and move a waypoint, double-click
to edit text, pan with space and with the wheel, zoom to the cursor, undo
granularity, copy and paste placement, keyboard nudge and its step sizes,
duplicate with offset, group and ungroup, z-order, lock); draw.io's exact
behaviour (thresholds in pixels, modifier keys, timing, cursor, what the
guides show, what the preview draws); MemoryMap's today (driven in
Playwright, frame by frame where it matters); the gap; the fix. Every
mechanic lands with a sweep that measures it (pixel thresholds, handle
sizes, snap distances, guide appearance, undo steps), and the phase is
done when the table has no gap marked "worse". The same table shape is
then written for the mind map (against the best of the plan's references)
and the documents editor (against VS Code and wordcraft) in Briefs 36 and
42, so refinement is measured on every surface, not asserted.

### Brief 45 (Sonnet medium for the census; Opus high for the review): structure and complexity
The owner, 2026-10-10: "find all the missing utility and features, sub par
implementations, issues, poor design or structural or programmatic
decisions, high complexity." Part 1 (Sonnet): a census, written to
WORLD_CLASS_PLAN "## 24. Codebase census, 2026-10-10": per file the lines,
functions, longest function, functions over 80 lines, cyclomatic complexity
(an ast walk for Python; branch counting for JS), duplicated blocks (a
normalised 8-line shingle scan across frontend/js and src), functions never
referenced anywhere (dead code candidates, with the grep that found none),
globals defined in the 27 classic scripts and read by other files (the
coupling map), TODO and FIXME counts, the ten largest files, the backend
routes with no test naming them, the frontend ids with no handler and
handlers with no id (the lints' own lists), the CSS selectors used by no
markup, console errors by surface (errors.js). Numbers only, with the
script under scratchpad/census/ kept as a sweep. Part 2 (Opus): the review
that the numbers point at: split whiteboard.js (19.8k lines) and
whiteboard-map.js along their seams with no behaviour change (the lints and
wbregress.sh prove it), the duplicated blocks folded into recipes, the dead
code removed, the structural decisions named and judged (the 27-script
global scope against modules; the per-tab CSS files; the route layout;
the event bus), each as a decision row with its measurement, and the
"missing utility" list: for every surface, the actions a professional
tool offers that this one lacks, from the parity tables.

## Briefs 46 to 55 (2026-10-10, Fable): the whole app against world class

All from WORLD_CLASS_PLAN section 25 (the table, decisions 46 to 54, the
phases with gates); shared rules as Briefs 35 to 42. Brief 46 runs first and
alone, because every other brief here builds against a number it produces.

### Brief 46 (Sonnet, medium): measure the table
Section 25.2's "today" column, row by row, with the command or sweep that
produced each number: paint time of the notes list at 5,000 notes, search
latency at 5,000 notes, boot to first paint and first interaction, board open
at 500 objects, document open at 50,000 words, the dashboard widgets' use
(which open, click or act), the settings keys with no help line, the
shortcuts outside `DEFAULT_SHORTCUTS`, the undo implementations, what
`routes_search` already indexes, what `versioning.py` keeps, what the bundle
export contains. Writes the numbers into 25.2 and 24.6; no fixes.

### Brief 47 (Opus, high): search everywhere (25a, decision 46)
`frontend/js/search.js` (new, lazy), `routes_search.py`, `search_manager.py`;
the recipe is the command palette's list (`palette.js`); help popover, Guide
topic and manual parity in the same commit. Gate: 25.4.

### Brief 48 (Opus, high): import and export round trip (25b)
`entry/app_import.py`, `routes_import.py`, `routes_backups.py`, a new
`entry/export_folder.py`; the import report page from the job line
(`core/jobruns`). Gate: 25.4.

### Brief 49 (Opus, high): first run and the manual (25c)
`first-run.spec.js`, `dashboard.js` (`gettingStartedCard`), `routes_help.py`,
a manual page built from `help_chat.py` and `help_topics_more.py`. Gate: 25.4.

### Brief 50 (Sonnet, high): the PWA shell (25d, decision 49)
`frontend/sw.js`, `manifest.webmanifest`, `app.py` (`_stamp_for`), a share
target into capture. Gate: 25.4; the two-stamp staleness test.

### Brief 51 (Opus, high): never lose a note (25e, decision 48; rule 1.8)
`routes_backups.py`, `core/database.py` (the boot integrity check),
`api/versioning.py`, `status.js` (`pushUndo`), the six undo folds. Gate:
25.4 and `test_undo_contract.py`.

### Brief 52 (Opus, high): settings as a product (25f, decision 52)
`settings.js`, `settings-panes.js`, `settings-wiring.js`,
`routes_settings.py`. Gate: 25.4.

### Brief 53 (Sonnet, high): budgets per interaction (25g, decision 54)
`tests/test_budgets.py`, `routes_bench.py`, the README performance table.
Gate: 25.4.

### Brief 54 (Opus, high): skill reliability (AGENT_SKILLS_REFORM Phase E)
`ai/skill_runner.py`, `ai/tools/verify.py` (new), `tests/fixtures/skills/`,
`tests/test_skills_evals.py`. Gate: the plan's.

### Brief 55 (Opus, high): the calendar view (TIMELINE_PLAN Phase 5)
`timeline.js`, `routes_timeline.py`, `routes_reminders.py`, the view
segment; `scratchpad/ui-sweeps/calendar.js` (new). Gate: the plan's table.

## Briefs 56 to 59 (2026-10-10, Fable): the design review

From UI_MODERNISATION_PLAN Phase 13 (the principles table, the surface
table, decisions 9 to 22, the phases). Brief 56 first and alone.

### Brief 56 (Sonnet, medium): measure the design review
Phase 13.0: `scratchpad/ui-sweeps/hierarchy.js` (new): per page at 1440 and
390, visible buttons, visible `.primary`, visible inputs and selects, docks
and their item counts; the 15 dialogs classified (dialog or sheet); every
icon-only button without a label, markup and JS-built; `wcag22.js` and
`contrast.js` per surface; confirms counted. Writes numbers into 13.1 and
13.2; no fixes except the unlabelled buttons.

### Brief 57 (Opus, high): the stylesheet's grammar (13a)
`frontend/css/*.css`, `tests/test_style_scale.py`, a new
`tests/test_hover_focus_pairs.py`; decisions 9 to 17 with a ratchet each.

### Brief 58 (Opus, high): the stylesheet's structure (13b)
`08-consistency.css` and `10-responsive.css` dissolved into the component
files; the 236 unused selectors removed; decisions 18 and 19 with ratchets.

### Brief 59 (Opus, high): the surfaces (13c)
`index.html`, `status.js`, `capture-ask.js`, `notes-list.js`, `chat.js`,
`phone-shell.js`, the CSS they own; decisions 20 to 22; help moves with the
UI in the same commits.

## Briefs 60 to 63 (2026-10-10, Fable): the backend review

From WORLD_CLASS_PLAN 26 (the layer table, decisions 55 to 62, the phases)
and 27 (features and popups; its rows name Briefs 42, 47 to 55 and 59).

### Brief 60 (Sonnet, medium): measure and the three ratchets (26.0, 26a)
Import times, resident memory with and without the embedder, the index
audit, the 54 untested routes, the 21 swallows, the 32 thread sites; then
`tests/test_no_silent_except.py`, `tests/test_routes_named.py`, the
background registry lint and ruff `T201`, each seeded with today's list.

### Brief 61 (Opus, high): services for whiteboard and files (26b)
`api/routes_whiteboard.py` to `whiteboard/service.py`, `api/routes_files.py`
to `files/service.py`; no behaviour change; route tests prove it.

### Brief 62 (Opus, high): data out of code (26c)
`ai/question_noise.py`, `ai/composer_tables.py`, the help topics and the
taxonomy as JSON under `src/memorymap/data/`, lazy and cached;
`tests/test_import_time.py`; the composer eval unchanged.

### Brief 63 (Opus, high): the runners and the embedder (26d)
`ai/agent.py` `run_agent` and `ai/skill_runner.py` `_run_one_step` as state
machines; `ai/embeddings.py` lazy load and idle unload with its setting;
`ai/tools/` one file per family.

## Briefs 64 to 68 (CHAT_PLAN "The deterministic foundation")

### Brief 64 (Sonnet, medium): measure the foundation (F0)
Count the files compiling date-word or unit patterns outside
`ai/recognise.py` and `entry/timewords.py` (a script in `scratchpad/`, its
number into CHAT_PLAN section 3's ratchet); re-run the probe tables in
`agent-remaining/engine-probe-1010.md` on the merged head; the variety
metric (twenty asks of ten questions from `showcase_725`, distinct openers)
and the maxims count (facts per sentence, unsourced numbers) with
`tests/_composer_eval.py`. Numbers into sections 2 and 3; no fixes.

### Brief 65 (Opus, high): the recogniser and the reading (F1)
`ai/recognise.py` and `ai/reading.py` per CHAT_PLAN section 3, decisions
46 to 48. `when.resolve`, `reminder_parser.parse_relative`,
`entry/timewords.find`, `search/query` date filters and the composer's
utility branches delegate, signatures kept. Fixture
`tests/fixtures/composer/recognise_1010.json` (200 rows, from the probe's
date, reminder and None phrases outward) at 1.0; `tests/test_one_reader.py`
ratchet. Coordinate with Brief 39's engine agent: `ai/composer.py` stays
theirs; land the modules first, the delegation second.

### Brief 66 (Opus, high): quick add and the palette (F2)
Decision 50. One grammar (`frontend/js/quickadd.js`, lazy) for the quick
note sheet, the reminders input, the meeting date field, timeline entries
and `app-palette.js`: chips for date, time, recurrence, place, person, tag
under the field; a missing slot asks once; Enter saves what the chips say.
Server side through `/api/read` (the reading, decision 47). Sweep
`scratchpad/ui-sweeps/quickadd.js`: chips within 150 ms, saved equals chip,
60 phrases at 1.0. Help moves with the UI (standing order 13).

### Brief 67 (Opus, high): the realiser, the validators and the acts (F3)
`ai/realise.py` from `composer._pick` (protected spans, salt, variety floor
measured), `ai/validate.py` (source_check, grounding, the maxims lint, slot
completeness, decision 54's computed rule), `ai/acts.py` seeded from
`origin/wip/composer-acts` `commands.py` with preview, run, inverse and a
help line per act; chat and Ask become clients. Decisions 51 to 54.

### Brief 68 (Opus, high): the surfaces (F4, after 65 to 67)
CHAT_PLAN section 2's rows outside chat, one commit each with its measure:
the note editor's offers, the dashboard digest, documents' counts, the
whiteboard and mind map acts, the graph, library and settings filters,
import recognition, the Guide's generated act topics, the agent's tools,
and system copy through the realiser surface by surface (decision 55).

## Briefs 69 to 71 (DOCUMENTS_PLAN 23: the IDE; after Brief 42)

### Brief 69 (Opus, high): run, preview and test (I1)
DOCUMENTS 23 decisions D1, D4 to D7 and D9. Files: `documents-code.js`
("Run, and its output"), new `frontend/js/run/*.js`, `api/run_sandbox.py`,
`core/extras.py`, `09-editor.css`. Each vendored file measured gzipped and
decided before it lands (sucrase, sql.js, pytest wheel). Numbers: a `.ts`,
`.sql`, `.css`, `.svg` and p5 document each run or preview in the sweep;
tests listed with state and time; Python `input()` answered from the panel.

### Brief 70 (Opus, high): the debugger (I2)
D2 and D3. Files: `api/run_sandbox.py` (the two headers), the Python
sandbox worker, new `frontend/vendor/js-interpreter`, `frontend/js/run/debug-*.js`,
the breakpoint gutter in `documents-code.js`. Numbers: a scripted session
per language hits a breakpoint, steps three times, reads a watched value and
stops on an exception; the time from Debug to the first stop.

### Brief 71 (Opus, high): the IDE shell (I3)
D8 and the shell rows of DOCUMENTS 23. Files: `documents-code.js`,
`09-editor.css`, `help_chat.py`, `help_topics_more.py`, `test_manual_parity.py`.
Numbers: palette command count; every keybinding on the sheet exercised by
`scratchpad/ui-sweeps/code-keys.js`; the four panels' heights remembered
across a reload.

## Briefs 72 to 74 (WORLD_CLASS_PLAN 28: the trust contract)
Brief 72a (Opus, high): deepen, per decision 71, the documents editor, code editor, whiteboard, mind map, OCR workspace and the audio set (meeting notes, transcription, live captions, translator). Brief 72b (Opus, high): the timeline, reminders and notifications (decision 69), calendar, the agent and its harness, the deterministic features, the statistics, utilities, chat access, the Guide, the palette and Find anything. Each writes measured "Deepened 2026-10-10" blocks into the plans, no code. Brief 73 (Opus, high): rules 4, 5 and 14 built (the Activity panel, model stop, error contract, Health page). Brief 74 (Sonnet, high): the three sweeps of T0 and the numbers into 28.1.

### Brief 75 (Sonnet, high): every vendored library at full use (INBOX 751)
The owner: "make sure all the vendored repositories are made full use of. I want maximum utility." For each entry in `docs/THIRD_PARTY.md`: exports available against exports called (a script, `scratchpad/vendor_use.py`), the unused capabilities ranked by what they would give a surface, each placed as a row in that surface's plan with its measure; `tests/test_vendor_utilisation.py` ratchets the called count. No code beyond the script and the test.
