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
