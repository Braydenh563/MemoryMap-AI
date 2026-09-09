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

**Done when.** `grep -rc '—' frontend src | grep -v ':0'` prints nothing;
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
3. `node --check` every `frontend/*.js`; `.venv/bin/ruff check .`.
4. Run `python -m pytest -q tests/` (7 to 8 minutes). Tests that asserted a
   string with an em-dash now fail; fix the expected strings in the tests,
   never the code, unless the code's new string is wrong.
5. Grep the results for lines that now read badly: `git diff | grep "^+" |
   grep -E ": [a-z]|, [A-Z]" | head -50` and fix by hand.
6. Add `tests/test_no_em_dashes.py`: walk `frontend/` (excluding `vendor/`)
   and `src/`, assert no file contains `—`, with the message "an
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
- `tests/test_keymap.py`: find `const KEYMAP = {` in `frontend/app.js`
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
bare `fetch(` outside `frontend/app.js`'s `api` block; no `innerHTML =`
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
1. `grep -o 'localStorage.getItem("[^"]*")' frontend/*.js | sort -u` gives
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
   Move the 13 raw `fetch` sites (`grep -n 'fetch(\`\|fetch("' frontend/*.js`)
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
   sites (`grep -n "setInterval(" frontend/*.js`) move onto it. The
   reminder poll and the model-status poll get `whileHidden: false`.
6. `scratchpad/audit/idle.js`: count network requests over 60s idle,
   visible and hidden; numbers in the report and in HANDOVER.

**Traps.** The Graph's `/graph` payload is not a list and is out of scope
(GRAPH_PLAN Phase 5's `?since=` cursor). `EmbeddingRecord` scans in
`routes_entries.py` (lines ~688, ~817, ~1038) are Brief 11's, not this
one's.

---

## Brief 7 (Thu, Opus): the event log (B1)

**Goal.** Every write through the managers records one event in the same
transaction; a note's history can be listed and a version restored.

**Done when.** `tests/test_events.py` proves: every public write function
in `src/memorymap/entry/manager.py` and `routes_whiteboard.py`'s manager
records exactly one event; replaying a note's events rebuilds its current
content and tags; `/entries/{id}/history` lists them; `POST
/entries/{id}/restore/{event_id}` restores and records a `restored`
event; the UI shows a History sheet from the note's "..." menu.

**Decisions made.** Do NOT add a new table: `AuditLog` (`database.py`
~1189: action, entity_type, entity_id, detail, created_at) already exists
and `manager.log_action` (line 45) already writes it from one call site.
Extend it with two columns via the existing ALTER-at-startup path
(`database.py` ~1742): `actor` (`user`, `ai:<tool or skill>`,
`system:<job>`) and `payload` (JSON, the fields that changed, before and
after). `EntryRevision` (line ~742) keeps working and becomes a view over
`payload` for content changes; do not delete it this session.
"Rebuild by replay" means applying `payload.after` in order, which is why
`payload` carries whole-field values, not diffs.

**Steps.**
1. Test file first, with the enumeration test: it imports `manager`,
   lists functions whose name starts with `create_|update_|soft_delete_|
   restore_|archive_|unarchive_|purge_|link_|unlink_|record_`, calls each
   on a fixture entry inside a session, and asserts the `audit_log` row
   count went up by exactly one with a non-empty `payload`.
2. Columns + `log_action(session, action, entity, payload, actor)`
   signature (keep the old positional call working for one release).
3. Thread `actor` from the request: the API sets `deps.current_actor`
   (`user`), tool calls set `ai:<tool>` (`src/memorymap/ai/tools/_common.py`
   is where every tool enters), background jobs set `system:<kind>`.
4. `/entries/{id}/history` (paginated, Brief 6's helper) and restore.
5. The History sheet in `app.js`: rows = time, actor chip, action, a
   one-line diff summary; "Restore" per row; the same modal recipe as the
   rest.
6. `/events?since=<id>` for the Dashboard activity feed (replace the scan
   that builds "Recently added" if one exists; grep `recent` in
   `dashboard.js`).

**Traps.** SQLite `ALTER TABLE ADD COLUMN` cannot add a NOT NULL column
without a default; give `actor` the default `'user'`. Do not write events
from inside `_hard_delete` per row for a purge; one `purged` event with
the id list is the contract.

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

**Goal.** One index over every kind, three signals, every hit explained;
similarity no longer loads every vector.

**Done when.** `tests/test_search_engine.py`: a 5,000-entry fixture
answers a keyword query in < 50ms and a hybrid query in < 200ms (on the
sandbox, recorded as before/after); every hit carries `scores: {bm25,
cosine, graph}`; boards' node text, documents, file readings and
bookmarks are found. The Notes list's "why this result" line renders the
three scores as words ("matched title", "similar meaning", "linked to the
open note").

**Decisions made.** FTS5 already exists for entries (`database._ensure_fts5`
~1393); extend the same virtual table with a `kind` column and index the
other kinds into it through the event log (Brief 7) rather than triggers
per table. Vectors: a process-level float32 matrix built from
`EmbeddingRecord` at startup and updated by events; top-k by one matmul;
`sqlite-vec` is a later option, not this session. Graph proximity = 1 /
(1 + hops) from the open note over the link tables, capped at 2 hops,
computed for the top 200 candidates only. Weights `0.5, 0.35, 0.15`,
constants in one place. `search/query.py`'s `understand()` stays the
parser; add the operators from WORLD_CLASS_PLAN §5.1 to it.

**Steps.** Fixture builder; the engine module `src/memorymap/search/engine.py`
with `search(session, q, ctx) -> list[Hit]`; FTS5 kind column and
indexing; the vector matrix; the three `.all()` scans in `routes_entries.py`
replaced; `/search` route returning hits with scores; the frontend line.
One commit each.

**Traps.** Keep the fake embedding backend the tests use; the matrix must
work with it. FTS5 rebuild on a big notebook is a job (Brief 9), not a
request.

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

**Goal.** A skill run plans, acts, verifies its own postcondition, repairs
at most twice, stays inside a budget, and learns from corrections.

**Done when.** `pytest -m evals` on the eval fixtures: ≥ 80% of built-in
skills complete with zero invalid tool calls under small-model mode; every
run shows plan, steps, verification and an Undo (via Brief 7's events);
a moved auto-filed note produces a `correction` event and the next filing
prompt for that category includes it.

**Decisions made.** `skill_runner._contract_met` (line ~292) is the hook:
after the last step, run the skill's `verify` block (a tool call plus a
predicate, declared in the skill's Markdown; add the field to
`skills.normalise`). Budget = tokens and wall time per run in the
settings, defaults 20k tokens / 90s, enforced in `agent.run_agent`.
Corrections: `manager.update_entry` records `correction` when
`category_id` changes on an entry with `filing_state == 'auto'`; the
librarian prompt builder (`ai/librarian.py`) appends the last five for the
target category.

**Steps.** The `verify` field and its test; the verifier step; the budget;
the correction event and prompt; the evals run against
`scratchpad/fake_openai_server.py` plus, when available, the dev model
(WORLD_CLASS_PLAN §9).

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
**Report** five lines plus `agent-remaining/launcher.md`.

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
Phase 6 responsive · Phase 7 as written. Then 62/98: the selection
toolbar becomes the formatting UI and the strip default is revisited.

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
UI_MODERNISATION Phase 9 (responsive by device) · AGENT_SKILLS Phase D
(resume a stalled step, edit and re-run a step, "why did this stall") ·
WORLD_CLASS 1.1 lints for the consistency contract, §9 llama.cpp dev
script, §12 flaw classes S7 (LIKE escaping) · PLAN.md and REDESIGN.md are
superseded by the eleven plans (ROADMAP's opening table); FABLE_BRIEF is
absorbed into MODERNISATION_AUDIT. INBOX 48 lazy modules. TIMELINE_PLAN
in full.

### The gates that do not move
Lint set green after each step; the full suite once per merge; errors.js
at four widths; contrast.js; docks.js; touch.js; weight.js under 10%
blurred at rest with the art off; every number in the plan's Built block;
no em-dashes, no exclamation marks, sentence case; commit trailers;
push per batch.

## Brief 19 (Opus agent): DOCUMENTS Phase 2 steps 2 to 4, the engine

Relaunch text, verbatim, when the agent dies (its worktree survives:
`git worktree list`, resume with the same words). Read CLAUDE.md, then
DOCUMENTS_PLAN "Phase 2" and "Built, Phase 2 step 1", then DESIGN.md.
Own worktree, commit per working piece, never push, five-line report,
`agent-remaining/documents-engine.md` before stopping.

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
65 and GRAPH_PLAN "Phase 6 — the node panel". Own worktree, commit per
item, never push, five-line report, `agent-remaining/visual-c.md`. Do not
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

