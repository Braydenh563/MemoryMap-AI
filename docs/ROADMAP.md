# MemoryMap AI — work plan

The live priority list, restructured. §1–§38's full narrative (every reported
bug, every "decided against," every dead end) has been condensed into
[roadmap/HISTORY.md](roadmap/HISTORY.md) rather than kept here — this file is
now *only* what's still open, ranked by what it unlocks. Section numbers in
code comments and tests still resolve via HISTORY.md's index.

**The standing caveat:** every provider test runs against a fake transport —
SSE framing and tool-call parsing are implemented from the spec, not verified
against a running Ollama/LM Studio. UI claims are now checkable (Chromium is
in the sandbox); model *behaviour* claims are not — reproduce or say plainly
you couldn't.

## #0 priority — codebase quality review (this session) — full report, agreed, act on before anything else below

A full dead-code/duplication/complexity pass across backend, `app.js`,
`style.css` and `tests/` (three parallel sub-audits, each spot-verified
against the actual source — grep/line-check, not trusted blind — before
being written up here). Scope at the time of writing: `src/memorymap/`
(~35k lines, 66 files), `frontend/app.js` (29,250 lines), `frontend/style.css`
(14,657 lines), `tests/` (106 files, ~1,577 tests). **Re-verified and
corrected below** (a second session found this section had gone stale: items
1-3 shipped in commit `993e639` the same session this was written, but the
prose was never updated — a fresh session reading only the tables below
would have "discovered" and re-fixed work already merged). Current sizes:
`app.js` 30,754 lines, `style.css` 15,797 lines, `ai/tools.py` 4,240 lines.

**Headline finding:** this codebase is unusually clean for its size. No
`TODO`/`FIXME`/`HACK` markers anywhere, `ruff check --select F401,F811,F841`
is already clean, no orphaned routes, no orphaned Python modules, no stale
`ILIKE`-search remnants after the FTS5 rebuild. The debt that exists is
concentrated in a handful of oversized files and accumulated duplication in
the two huge frontend files — not sprawl.

### Executed this session — a third pass, working the ranked list top-down

Acted on in ranked order (§8), each step verified with the full suite +
ruff before moving to the next, committed incrementally. **Done:** §11
items 1-2 (debounced the Notes search + gated semantic search behind it)
and item 3 (log filter), plus the note-picker search found the same way;
§12 item 1 (pagination ceiling on `/documents` and conversations); §7's
last dead-CSS fragment; §4's `ai/tools.py` split — **partial, by design**:
`_common.py`, `documents.py`, `whiteboard.py`, `categories.py` extracted
and verified (4,240 → 3,352 lines), but the registry/`TOOLS` dict and the
bulk of note-CRUD/agent-orchestration handlers were **left in
`__init__.py`** rather than forced apart — they're the most interleaved,
most load-bearing part of the file (the AI's entire tool-calling surface),
and splitting them further needs its own session, not a continuation of
this one; §2's markdown-renderer merge (`renderInlineMarkdown`/
`appendInline` — verified live in a browser, both code paths); §10 items
1-4 (tag-cloud dedupe, `on_this_day` SQL filter + a private-note leak
found doing it, the `/graph` double entry-fetch) and item 5 (janitor's kNN
filing vectorized); `routes_settings.py` split into `routes_websearch.py`
+ `routes_backups.py` (1,552 → 1,268 lines).

**Deliberately not attempted this session** — both already flagged in §8
as needing to be done alone, and nothing above changed that:
- **`searxng_manager.py`'s split.** Subprocess/timing-sensitive (Docker
  lifecycle, source install, process start/stop, Windows shims) — the
  fake-transport standing caveat means this module's real behaviour isn't
  exercised by the suite the way request/response code is, so a mistake
  here is exactly the kind the tests wouldn't catch before a user did.
- **Extracting `app.js`'s whiteboard block into `whiteboard.js`.** Still
  the single biggest lever on the file (~3,400+ contiguous lines from
  `app.js:26356`), still explicitly "do on its own, not alongside a
  bug-fix session" — this session was already the latter, many times over.

**CSS consolidation — done, on the same "verify live, don't assume" basis.**
§2 now has the full writeup: one real merge (the `.msg`/`.msg.user`/
`.msg.assistant` doubled selectors inside the "chat polish" pass),
verified with a live `getComputedStyle` check in Chromium, and a corrected
finding that the other two `.msg` sections and all 23 of the 720px media
queries are legitimately scoped (per-bug-fix, per-component) rather than
duplicated — merging them would cost the co-location that makes each one
findable, for no rendering change. The `.dash-widget.dash-wide` dead-code
claim was already stale (grepped, doesn't exist anywhere in the frontend).

### 1. Dead code — DONE (`993e639`)

All four items below were deleted the same session this section was
written: `initFloatingFormatMenu()` (was `app.js:28735-28817`),
`showOnlyLogErrors()` (was `app.js:15458`), the unused `debounce()` utility
(was `app.js:21536`), and `#wb-search` (was `index.html:1863`). Confirmed
zero grep hits for all four names in the current tree. Nothing left to do
here — see §7 for the one CSS straggler this pass missed.

Backend: **nothing dead was found**, then or now. Every `_xxx` tool handler
in `ai/tools.py`, every route, every module resolves to a real call site.
Most candidates that looked dead on line-count alone turned out to be
reached via dynamic id/template construction (`` `tab-${tab}` ``,
`` `settings-${section}` ``) or the AI tool registry.

### 2. Duplicate logic

- **Two markdown renderers still coexist**: `renderInlineMarkdown`
  (`app.js:2246`, used by note cards/chat/dashboard) and `appendInline`
  (`app.js:11746`, used only by `renderMarkdown`) — still unmerged, line
  numbers re-verified. Both hand-roll
  near-identical bold/italic/link/image regex parsing with separately
  maintained security gates — and `appendInline`'s own comment admits the
  author *knew* about the duplication ("same guard `renderInlineMarkdown`
  uses for the identical gap"). **Impact:** ~150-200 lines could collapse
  to one shared parser. **Risk:** medium — `renderInlineMarkdown` supports
  search-term highlighting that `appendInline`'s callers don't need, so
  the merge needs an optional param, not a blind delete.
- **33 inline `HTTPException(404, ...)` checks** (was 34, within noise —
  still unfixed) scattered across 9 route
  files instead of a shared `get_or_404` dependency (`routes_conversations.py`,
  `routes_documents.py`, `routes_entries.py`, `routes_files.py`,
  `routes_reminders.py`, `routes_settings.py`, `routes_whiteboard.py`).
  **Impact:** modest (~20-30 lines), mostly readability — low priority.
- **CSS `.msg` styling — checked directly and partly done, partly not real.**
  `.dash-widget.dash-wide` does not exist anywhere in `style.css`/`app.js`/
  `index.html` any more — grepped, not assumed; this line's citation was
  already stale, resolved in some earlier pass with no note left behind.
  `.msg`/`.msg.user`/`.msg.assistant` genuinely were re-opened twice each,
  back-to-back with nothing but a comment between them, inside the "chat
  polish" pass (was `style.css:7534-7579`) — merged into one declaration
  each per selector, verified live: started the app, sent a real chat
  message, read `getComputedStyle` on both `.msg.user` and `.msg.assistant`
  in Chromium, confirmed every property (gradient background, box-shadow,
  border-radius, `animation-name: msg-in`, border-left) still resolves
  exactly as before. **The other two `.msg` sections are not the same kind
  of duplication and were deliberately left alone**: the base rules
  (`:3913`) and a later "assistant message layout" bug-fix block
  (`:11742`, its own "Asked for:" comment) each carry the specific
  reported-bug context that motivated them — collapsing them into one
  block would erase that provenance for no functional gain, and one real
  cascade interaction lives here already (the later block's
  `.msg { max-width: 100% }` currently beats the base's `.msg { max-width:
  82% }` for `.msg.user` specifically, since `.msg.assistant`'s own
  82% at line 3948 has higher specificity and wins there instead) — whether
  that's the intended width for a user bubble is a real question, but a
  behavioural one, out of scope for a pure reorg pass.
- **41 `@media (max-width: …)` blocks, 23 at the 720px breakpoint —
  checked directly, and this is not the duplication it looked like.**
  Read every 720px block, including the two closest together
  (`:5677`/`:5700`, 23 lines apart) and a third pair sharing a file region
  (`:3594`/`:3680`). Each one is scoped to a single component or a single
  reported bug, immediately below the rule it overrides, with its own
  explanatory comment (`.action-menu.submenu` going static below phone
  width, `.dash-widget.wide` collapsing to one column, global touch-input
  sizing) — this is the idiomatic co-location pattern, not copy-paste
  duplication, and DESIGN.md's §120 rule this was measured against
  ("narrow-screen tightening happens once, in a single media query on
  `:root`") is scoped to the shared spacing/gap value specifically, not to
  every component-level responsive rule in the file — rereading it, it
  never claimed the latter. Merging blocks that happen to share a
  breakpoint into fewer blocks would not change what a browser renders
  (there is no per-block parse cost worth chasing) and would only remove
  the co-location that makes each override easy to find next to the rule
  it modifies. **Nothing to do here** — correcting a prior session's
  assumption rather than re-deferring it a third time.

### 3. Unused UI components

- `#wb-search` (whiteboard sidebar search box) — see §1.
- 7 CSS selectors confirmed to target markup that no longer exists (§7) —
  visually dead weight, not a rendering bug, each a UI element removed
  from HTML/JS without its styles following.

### 4. Overly complex implementations

**Backend:** unchanged since this section was written — still all open.
- `src/memorymap/ai/tools.py` — **4,240 lines** (was 4,195; growth is
  immaterial, no split has happened), 110+ top-level functions.
  The single biggest outlier: `ANALYSIS.md` elsewhere claims no MemoryMap
  file exceeds ~1,900 lines (a favorable comparison against a competitor's
  4,032-line "HIGH risk" file) — that claim is **false**. It's wide,
  not deep (40+ independent tool handlers dispatched through one `TOOLS`
  dict at line 2892, was 2859), so the split is mechanical: `tools/notes.py`,
  `tools/whiteboard.py`, `tools/skills.py`, `tools/web.py`,
  `tools/documents.py` + a `tools/_common.py` for shared helpers
  (`_require_note`, `_visible`, `_note_summary`), re-exported into one
  registry. **Risk:** low-medium — shared helpers must land in
  `_common.py` first to avoid import cycles.
- `src/memorymap/search/searxng_manager.py` — 1,734 lines doing four
  unrelated jobs (Docker lifecycle, source install/download, process
  start/stop, `settings.yml` generation incl. Windows shims). Natural
  split: `install.py` / `process.py` / `settings.py` / `docker.py`.
  **Risk:** medium — subprocess/timing-sensitive; don't do this extraction
  in the same sitting as a live bug fix.
- `src/memorymap/api/routes_settings.py` — 1,552 lines (was 1,507), a
  kitchen-sink of preferences/audit-log/exports/embedding downloads/SearXNG
  admin/backups. Lowest-risk of the three to split (independent handlers,
  no shared state).

**Frontend (`app.js`):** the block still exists, still unextracted — but
`app.js` grew ~1,500 lines from unrelated feature work since this was
written (spaces switcher, widget picker, docs chrome), so every citation
below had drifted. Re-anchored:
- `initWhiteboard()` — now at `app.js:26356` (was cited `23446-26879`,
  i.e. "1,433 lines" — that line count was an arithmetic error even at the
  time; the actual span is closer to 3,400 lines). Still the single
  highest-value target.
- `renderGraph()` — now at `app.js:12725` (was `12149`).
- `sendChatMessage()` — now at `app.js:6254` (was `6034`).
- `renderWhiteboard()` (`app.js:28554`), `renderWbObjects()`
  (`app.js:29099`) — same area, same pattern, both downstream of
  `initWhiteboard()` in the same contiguous whiteboard block.

### 5. Legacy code

Nothing found. The FTS5 rebuild (replacing the old `ILIKE` keyword scan)
left no dead code path behind — remaining `ilike` usages are unrelated
tag/document substring filters. No feature flags stuck "temporarily" off.
`.collapse-chevron` CSS (§7) is the one confirmed case of a genuinely
retired feature whose styles weren't cleaned up alongside it.

### 6. Redundant DB queries / API calls — DONE (`993e639`)

The `GET /entries` N+1 this section flagged (`routes_entries.py`, was
line 526) is fixed: `list_entries` now calls `manager.bulk_category_names`,
`entry_dates_bulk`, and two new helpers built for this,
`documents_for_entries_bulk`/`links_for_entries_bulk`
(`routes_entries.py:137-140`, `entry/manager.py:280,303`), one bulk query
per field instead of 4+ per note. Confirmed by reading the current call
site, not just the commit message.

### 7. Abandoned/disconnected files — 10 of 11 done, one straggler left

`.browse-header`/`.browse-tools`, `.dash-widget.dash-wide`,
`.sidebar-tools`, `.chat-empty-icon`, `.graph-path-line.graph-path-tag`,
`.bubble-speak`, `.graph-trace-hint`, `.whiteboard-canvas`,
`.wb-card-sketch`, `.wb-object-image img` — all removed. **Not caught at
the time:** the base `.collapse-chevron` rule was deleted but an orphaned
fragment of it survives inside a media query —
`style.css:2081`, `@media (prefers-reduced-motion: reduce) { .collapse-chevron { ... } }`
— targeting a selector that no longer exists anywhere else in the file.
Trivial, low risk, delete it.

### 8. Technical debt opportunities, ranked — only 2 rows still open

Everything else in the previous version of this table shipped this
session (see "Executed this session" above for exactly what). What's
left, both already flagged as needing their own dedicated session rather
than a continuation of this one:

| # | Item | Impact | Risk | Effort |
|---|---|---|---|---|
| 1 | Extract `app.js`'s whiteboard block into `whiteboard.js` (§4) — its own best-identified module-split candidate, ~3,400+ contiguous lines from `app.js:26356` | High — biggest lever on the 30k-line file | Medium | Large; do on its own, not alongside a bug-fix session |
| 2 | Consolidate duplicate/near-duplicate CSS blocks (§2) | Low-medium | Medium — needs a real browser check | Medium |

`searxng_manager.py`'s split (subprocess/timing-sensitive, deliberately
not attempted — see above) is a third open item, not ranked here because
it was never in the "quick, do it now" tier to begin with.

### 9. Caching/pooling checklist, audited against current code (added post-Antigravity/Gemini session)

Requested as five generic web-app perf tasks (pooling, in-memory cache,
client-side cache, cached reads, inline critical SVGs). Checked each against
this codebase — a single-user, local-first SQLite app, not a multi-instance
web service — before adding anything, per this file's own standing rule.
**Three of five are already built; one item's premise doesn't apply here.**

| # | Ask | Status | Evidence |
|---|---|---|---|
| 1 | DB connection pooling | Already the shape that fits this app | `DatabaseManager.__init__` (`core/database.py:568-599`) creates **one** `Engine` for the process's lifetime and hands out sessions from it — not a fresh engine/connection per request. WAL mode + `busy_timeout` are set so concurrent readers don't block. A traditional sized pool (PgBouncer-style) doesn't apply: this is one process talking to one local SQLite file, not many app instances sharing a remote DB. Nothing to do. |
| 2 | In-memory cache for slow, frequently-read data | Already built for the one thing that needed it | `routes_graph.py:60-105` — pagerank/similarity results cached by a notebook fingerprint, invalidated on notebook change or embedding-model switch (`reset_graph_cache`, `deps.register_cache_reset`). Covered by `test_pagerank_is_not_recomputed_for_an_unchanged_notebook` etc. in `test_antigravity_regressions.py`. Nothing else in the app is both this expensive and this hot. |
| 3 | Client-side request cache | Already built, narrowly scoped | `app.js:203-232` — `apiJson(path, { cacheMs })`, opt-in per call, invalidated wholesale by `clearApiCache()` on any mutating request. Currently used on 4 dashboard call sites (`app.js:10308,10318,10326,10698`), all `GET /entries` at `cacheMs: 4000`. **Real remaining work, if any:** decide whether more read-heavy tabs (Library, Timeline, Graph) should opt in the same way — not build the mechanism, which already exists. |
| 4 | Cache repeated read queries | Partly done, one gap already tracked | Graph derivations: done (#2 above). The other candidate is §6/§8-item-1's `GET /entries` N+1 — bulk helpers (`entry_dates_bulk`, `bulk_category_names`) exist but were never wired into `_to_out`/`list_entries`. That's the real, already-identified item here — see §6, unchanged by this addition. |
| 5 | Inline tiny critical SVGs | Premise doesn't apply | The app's icon system is a vendored Phosphor **webfont** (`vendor/phosphor/style.css` + one `.woff2`), not per-icon SVG files — icons are one shared glyph request, not many. The only standalone SVG is `favicon.svg`, referenced twice (`<link rel="icon">` and `#brand-logo`) and browser-cached after the first fetch. Nothing to inline. |

### 10. Backend algorithmic complexity (Big-O audit)

Scale context: single-user local app, realistic notebooks are hundreds to
low-thousands of notes — nothing below is urgent at that size, but several
are wasteful even cheaply and worth fixing alongside other work in the same
files.

| # | Finding | File:line | Complexity | Impact @ ~2k notes |
|---|---|---|---|---|
| 1 | `manager.all_tags()` loads **every** non-deleted entry (no cap, unlike the `200`-row cap every sibling section of the same response uses) and `json.loads`-decodes its tags column, on every Library tab open | `entry/manager.py:652-660`, called from `routes_library.py:348` | O(n) full scan + parse per request | A few thousand JSON decodes on a screen opened often |
| 2 | `tag_cloud()` independently re-implements finding #1 — a second, separate full-table tag scan instead of reusing `all_tags` | `api/routes_insights.py:247-257` | O(n), duplicated | Same cost, paid twice in two different places |
| 3 | `on_this_day()` loads every non-deleted entry then filters in a Python loop (`created.day == now.day`) instead of a SQL `strftime` WHERE clause | `api/routes_insights.py:260-274` | O(n) in Python where SQL would do O(log n)/indexed | Runs on every dashboard load |
| 4 | `/graph`, `/graph/local`, `/graph/path` each fetch the full `Entry` table once for node serialization, then `paths.build()` independently re-queries the same table for its path index | `api/routes_graph.py:186-188` → `entry/paths.py:144-147` | 2x a full-table read per request | Doubles one query on the app's priciest endpoint |
| 5 | `janitor.py`'s per-save centroid + kNN auto-filing loads all embeddings and does a **Python** `for`-loop cosine similarity (two separate passes: centroid match, then kNN) instead of the vectorized numpy approach `embeddings.similar_pairs()` already uses in the neighboring module | `ai/janitor.py:162-172, 212-219` | O(n) per-row Python vs. O(n) vectorized (much faster constant) | ~10-30ms added to every single note save, grows with notebook size |

Not flagged: `duplicates.find_duplicates` (O(n²) but explicitly capped at
`MAX_SCAN=500`, run on explicit user action, documented tradeoff) and the
graph pagerank/similarity cache (already fixed, see §9 item 2).

### 11. Frontend algorithmic complexity (`app.js` Big-O audit)

Same scale context. Existing large-collection loops already use `Map`/`Set`
correctly (`graphAdjacency`, `applyGraphHighlight`) and no listener leaks
were found in the whiteboard/graph/dialog code checked — the real findings
are all "runs on every keystroke, shouldn't."

| # | Finding | File:line | Impact |
|---|---|---|---|
| 1 | **The main Notes-tab search box is the only search input in the app with no debounce** — `renderEntries()` (full list teardown + rebuild) fires on every keystroke | `app.js:24074-24080` (handler), `2455` (`renderEntries`) | High — felt on every keystroke in the primary view. Library (`22461`), Timeline (`15009`), Graph (`22614`) searches all already debounce ~150ms; Notes doesn't |
| 2 | Same handler also fires an **uncached network + semantic-search request per keystroke** when the semantic toggle is on | `app.js:24074-24076`, `loadEntries()` at `2659-2678` | High — a backend embedding-compare hit per character typed, worse than #1 |
| 3 | Log filter rebuilds up to 1,000 rows per keystroke with no debounce | `app.js:22185` (handler), `renderLogList` at `15989-16010` | Medium — only while Settings → Logs is open |
| 4 | Note-picker modal filters/sorts the entire `allEntries` array per keystroke (render output is capped at 50, the filter/sort cost isn't) | `app.js:22336` (handler), `renderNotePickerList` at `6161-6187` | Low-medium — modal-only |

**Fix for 1-3:** reuse the debounce pattern already established at the
other three call sites (`timelineSearchDebounceTimeout` etc., or the
now-deleted `debounce()` util from §1 — reconsider re-adding it once there
are 4 hand-rolled copies instead of 3, since that's the threshold this
section's own §1 finding used).

### 12. Feature gaps and consistency findings

Checked against HISTORY.md/BACKLOG.md/ANALYSIS.md before writing anything
below, per this file's standing rule — none of these four appear in any of
those three.

1. **A real, silent data ceiling — not just a cleanliness issue.** `GET
   /entries` (`api/routes_entries.py`, `manager.list_entries`) has **no
   limit at all**; `GET /documents` hard-caps at 200 with no offset param
   (`api/routes_documents.py:99`); Library caps each kind at
   `PER_KIND_LIMIT` (`api/routes_library.py:76,107,159,198,236`);
   conversations cap at 50/200. **None of the capped three expose any way —
   UI or API — to reach items past the cap.** Once a notebook passes ~200
   documents, the rest are permanently unreachable through the app. This is
   the concrete, user-visible half of §6/§8-item-2; the query-count fix
   already shipped, the pagination-ceiling bug didn't.
2. **The Notes tab's primary list has no persistent error/retry state.**
   `loadEntries()` (`app.js:2659-2677`) has no `.catch` — a failed reload
   after startup throws uncaught with no UI feedback. Other areas show a
   persistent inline message on failure (`app.js:2797`, `:10591`,
   `:14971`, `:15227`, `:16286`); this one doesn't, and it's the main view.
3. **Whiteboard toolbar accessibility naming is inconsistent with Graph's.**
   Whiteboard: 49 buttons, 71 `title=`, only 2 `aria-label`
   (`index.html:1569-1995`). Graph: 16 buttons, 19 `aria-label`
   (`index.html:1013-1194`). Every whiteboard button does resolve an
   accessible name via the `title` fallback, so this isn't a WCAG failure —
   but `title` tooltips don't render on touch, and the pattern diverges
   from the rest of the app. Minor; BACKLOG §19 covers a11y generally but
   not this specific split.
4. **`GET /documents` has no search/filter param at all** (vs. `/entries`'s
   `?q=`) — the concrete UX consequence of finding #1: past 200 documents
   there is no way to find an older one, not even by name.

**Net effect on the ranked table above:** no new rows. The only genuine
open item this pass surfaces is already §8 row 1 (`GET /entries` N+1) —
restated here so a session picking up "the priority-0 refactor" doesn't
rebuild the graph cache or the client-side GET cache from scratch, the
mistake CLAUDE.md's opening section exists to prevent.

### Test suite consolidation — done, a session later, wider than first scoped

The finding two sessions back (Wave-lettered batch files overlapping domain
files) was executed, and — asked again, explicitly, for the *whole*
directory rather than just the flagged files — extended well past its
original scope. Every `test_wave*.py`/`test_phase*.py` file is gone; each
was either a real grab-bag (split by domain, one section at a time) or
misnamed-but-coherent (renamed with no content move). Organization only —
no test-logic changes, verified by asserting the collected test count held
constant (1811 → 1810) across the whole pass except for one real duplicate
dropped (below).

What moved, by original file:

- `test_waveb_api.py` → `test_notes_extras_api.py` (attachments, threads,
  pins, tag manager, capture templates, saved looks); its two AI-adjacent
  tests moved into `test_duplicates.py`/`test_related_notes.py`.
- `test_wavec_api.py` → `test_conversations_api.py`; its 2 embedding-status
  tests moved into `test_models_api.py`.
- `test_waved_api.py` → gone. Reminders CRUD/Magic-Add split into new
  `test_reminders_api.py` (kept apart from `test_reminder_times.py`'s
  clock-bug narrative rather than merged into it); insights/greeting/tag
  cloud/heatmap/dashboard-layout into new `test_insights_api.py`; the
  digest HTTP+streaming tests folded into `test_digest_structure.py`
  (which already covered the digest's content logic); timezone/timestamp
  tests into new `test_timezone.py`.
- `test_wavee_graph.py`/`test_waveh_voice.py` → renamed only, to
  `test_graph_api.py`/`test_voice_api.py`.
- `test_wavef_api.py` → gone. Markdown export/import into new
  `test_markdown_export_import.py`; backups into new `test_backups_api.py`;
  the core `/websearch` endpoint + DDG parsing + SearXNG hand-off/caching +
  instance detection into new `test_websearch_api.py`; the page reader +
  its SSRF guards into new `test_websearch_reader.py`; SearXNG
  backend-detection and start/stop-via-API tests folded into
  `test_searxng_recovery.py`; its `ensure_settings` JSON-API test folded
  into `test_searxng_install.py`; the log-noise-filter test into
  `test_log_console.py`; tool-gating tests into `test_search_provider.py`;
  three SSRF probe-guard tests into `test_websearch_privacy.py`; one
  stray uploads-folder test into `test_notes_extras_api.py`.
  **One test dropped as a genuine duplicate**, not merged:
  `test_the_source_install_never_shells_out_to_git` asserted the exact
  same guarantee, with weaker mocking, as `test_searxng_install.py`'s
  pre-existing `test_the_install_downloads_an_archive_and_never_shells_out_to_git`.
- `test_waveg_agent.py` → renamed only, to `test_agent_tools_api.py`.
- `test_waven_api.py` → gone. Utility-model tests into `test_models_api.py`;
  improve-writing + generate/remove-title into new
  `test_note_editing_api.py`; link-suggestions + link-reason-deduction
  folded into `test_link_reasons.py` (which already covered the AI audit
  pass over existing reasons — different layer, same domain); job
  cancellation + finished-jobs history folded into `test_tasks.py`; the
  agent-prompt time/reminder-hint test into `test_timezone.py`; tool
  enable/disable toggles into `test_agent_tools_api.py`.
- `test_logs.py` → folded into `test_log_console.py` (misnamed "Wave A",
  not actually distinct from the rest of the log-buffer coverage already
  there).
- `test_round1_chat.py` → folded into `test_chat_api.py`, as originally
  scoped.
- `test_tier1_refinements.py` → split by actual topic: log-buffer tests
  into `test_log_console.py`, SearXNG-attribution tests into
  `test_websearch_diagnosis.py`, worker-count guards into new
  `test_worker_guard.py`, the one graph-physics-slider frontend-source
  check into `test_graph_api.py`.
- Three remaining `"""Phase N: ..."""`-labeled docstrings
  (`test_ai.py`/`test_api_entries.py`/`test_core.py`) rewritten to describe
  actual scope rather than a build-phase number; `test_ai.py` renamed to
  `test_ai_core.py` (too generic a name otherwise, given how many other
  files also cover "ai").
- **Left alone, as before**: `test_antigravity_regressions.py`/
  `test_claimed_work.py` (deliberate one-test-per-audited-bug logs, named
  directly in `CLAUDE.md`), and the fixture-hygiene finding ("no reinvented
  fixture" from the fixture-reuse grep) — that check was about a different
  axis than this one and still holds.

### Frontend refactor path for `app.js` (no bundler, no build step)

Natural seams already match the `// ---` section markers (auth, notes,
ask/chat, dashboard, reminders, graph, timeline, settings, whiteboard,
skills). The blocker to any split: **162 top-level `let` globals** shared
across sections (`allEntries`, `conversation`/`chatConv`, `categoryMeta`)
— a `<script type="module">` split needs these promoted into an explicit
`state.js` (getters/setters), not left as bare closures.

Pragmatic order:
1. **Whiteboard first** (`app.js:23292-28586`, ~5,300 lines) — largest,
   most self-contained, touches `allEntries` in only 4 of 31 uses. Do this
   alone, not mixed with a bug-fix session.
2. **Graph next** (`app.js:11247-13647`).
3. Leave notes/chat/dashboard/settings joined longer — they share
   `allEntries`/`chatConv` most heavily — and only split those after
   `state.js` exists.

### Acted on the same session (not part of the review itself — live fixes for reports that came in mid-review)

Whiteboard properties panel clashing with the top-right panel (`.mid-right`'s
`top` was tuned before the top-right panel could wrap to 2-3 rows); the
fill-none checkbox reading as inverted (missing its "None" label — the
toolbar's identical control already had one); a new paint-bucket fill tool
(`B` key, fills closed shapes / recolours strokes with the current stroke
colour); a delete-confirmation dialog letting a long filename overflow the
card (`.confirm-text` had no `overflow-wrap`). **None of these four were
verified live in a browser** — reasoned from source/CSS and the screenshots
reported, not re-screenshotted after the fix. Verify live before trusting
them fixed.

## Read these two first

| | What's in it |
| --- | --- |
| [roadmap/HANDOVER.md](roadmap/HANDOVER.md) | **The last session's handover.** What changed, what couldn't be checked and why. Read this first. |
| [roadmap/HISTORY.md](roadmap/HISTORY.md) | Everything already built, and every backlog item already closed — with the reasoning, condensed. **Check here before building anything.** Four sessions have rebuilt something that already existed. |
| [roadmap/BACKLOG.md](roadmap/BACKLOG.md) | Standing backlog items not yet promoted to this file's live list. |
| [roadmap/ANALYSIS.md](roadmap/ANALYSIS.md) | Judgements: the odysseus read, and the licence constraint — **this project is AGPL-3.0 now, not MIT**, so §34a's "no code crosses either way" is half-lifted. What was deliberately not taken. Also §59: the claude-obsidian/cognee/graphify read behind items 32–36 below, and §60: a second odysseus read after the repo tripled in size — a real non-atomic-write bug it found, an MCP shape worth copying, and its own admission that the backend isn't better designed. |
| [DESIGN.md](DESIGN.md) | The design system. `tests/test_style_scale.py` enforces it. |

## Next up, ranked by what it unlocks

**One list, four tiers. Work top-down and do not skip.** The failure this
project actually has is not forgetting work — it is a later session picking
something interesting from further down while a correctness bug sits at the
top. If an item is blocked, say so in the handover and take the next one.

The tiers are not equal. Nothing in Tier 2 is worth more than any Tier 1 item.

### Tier 1 — correctness and trust

Things that are wrong, lose work, or make the app feel unreliable.

1. ~~**Meeting transcription errors out.**~~ **Re-confirmed fixed
   (HISTORY.md §50), one step further than before.** §41 already made a
   failed model download raise a distinct 503 instead of the route's
   generic "Couldn't transcribe that recording: <error>" catch-all. This
   session installed `faster-whisper` for real (lightweight — no torch) and
   POSTed a real WAV clip to `/voice/transcribe-meeting` on a live server:
   got back `503 "Couldn't load the Whisper 'base' model... check your
   internet connection"`, not the old mystery error. **Not fully verified**:
   this sandbox's network policy blocks `huggingface.co` (403 at the proxy,
   confirmed via `$HTTPS_PROXY/__agentproxy/status`), so an actual
   successful transcription — real audio in, real text out — still hasn't
   been observed by any session. If it's re-reported, that's the half still
   worth checking, ideally from an environment that can reach Hugging Face.
2. ~~**"The AI fails to respond while still saying it is writing" — and the
   skill step counted as done.**~~ **Found already done (HISTORY.md §50)** —
   checked the code before rebuilding, per this file's own rule, rather than
   trusting that an uncrossed-out item means unbuilt. Both halves are in and
   tested: `frontend/app.js`'s `STREAM_IDLE_TIMEOUT_MS` (150s) races
   `reader.read()` and throws a real, visible error ("The model stopped
   responding...") when nothing arrives at all; `skill_runner.py`'s
   `not answer and not ran_any_tool` branch reports a step `failed` with
   `"the model didn't respond — no answer and no tool call"` instead of
   falling through to `done`, pinned by
   `test_a_step_that_produces_nothing_is_not_ticked_done`. This was §41's
   own work (see HISTORY.md) — ROADMAP.md simply never got the strikethrough.
3. ~~**Skills producing network errors, or models that cannot run them.**~~
   **Found already done (HISTORY.md §50), same staleness.** `went_offline`
   in `skill_runner.py` stops the run and reports `"Ollama isn't reachable
   — check Settings → Models and try again."` rather than repeating the
   same failure on every later step, pinned by
   `test_a_network_failure_mid_step_stops_the_run_instead_of_repeating`. The
   reason names the step (`index`) and the cause (`reason`), and
   `skill_from_step` already resumes from it — also §41's work.
4. ~~**Contradictions in the agent prompt around small talk.**~~ **Found
   already done (HISTORY.md §50), same staleness as items 2/3.** There is no
   contradiction reaching the model: `routes_chat.py`'s stream only calls the
   tool-enabled agent (and thus only sends `TOOLS_GUIDE`) when
   `intent.needs_retrieval(...)` is true, which `SMALLTALK` never is — "Small
   talk never goes near the agent" is the code's own comment at that gate.
   `librarian.build_conversational_messages` (small talk's actual prompt
   path) never references `TOOLS_GUIDE` at all — grepped, not assumed.
   Directly tested: `test_a_bare_yes_is_ordinarily_smalltalk_not_the_agent`
   asserts `not fake_ollama.tool_rounds` for a bare "yes", and is explicitly
   labelled "Tier 1 §4" in its own test file. Likely resolved by the same
   `answering_agent` work HISTORY.md's §41 already documents.
4a. ~~**Eight preferences saved correctly and were honoured correctly, but
    never came back from `GET /preferences`.**~~ **Fixed (HISTORY.md §49).**
    Found live while adding a notifications-mute toggle to the panel: it
    saved, the bell icon should have flipped, and it didn't — because
    `get_preferences()` is a hand-built dict, and the new key wasn't in it.
    Checking whether the same shape existed elsewhere (rather than assuming
    this was the only one) turned up seven more: every Autonomous Background
    Workers toggle, the interval, the model override, battery-efficient
    mode, and smart model routing — all settable, all correctly read by
    `autonomous.py`/`model_manager.py` straight from storage (so the
    *behaviour* was never wrong), but never once echoed back. Every one of
    those Settings checkboxes showed unchecked again the moment the page
    reloaded or the panel reopened, regardless of what was actually saved
    and actually in effect — the exact shape of "keeps disabling itself"
    this project has chased before (§42), from a different cause. Verified
    live: PUT a value, GET it back, on the real running app, not just a
    passing test — the gap survived every test in the suite because nothing
    ever asserted what `GET /preferences` echoes, only what the backend
    that reads it *does*.
5. ~~**Decide what notifications are for.**~~ **Already done** — found stale
   while auditing the list this session (checked before building, per this
   file's own standing rule). The audit itself: `recordNotification` has
   exactly three call sites — a chat/skill run that stopped early
   (`app.js` ~5743), a reminder coming due (~15648, plus folding in anything
   overdue on the server when the panel opens, ~15525), and every finished
   background job via `renderTaskHistory` (~17427), which is *every* job
   `routes_tasks.collect()` lists — including the embedding-model download
   this session added to that list (§6 below), so it reached the
   notification centre automatically rather than needing its own wiring.
   Nothing raises a notification outside those three paths. Verified by
   tracing every call site, not by driving it in a browser — say so plainly:
   if this is re-reported, that is the half still worth checking live.
6. ~~**Background tasks that never appear.**~~ **Found already done
   (HISTORY.md §50).** Did the sweep this item asked for rather than trusting
   the uncrossed-out entry: every `threading.Thread(` call site in
   `src/memorymap` checked by hand against `routes_tasks.collect()`. All
   nine are covered — reindex/pull (`model_manager.py`), embedding warmup
   (`embeddings.py`), the autonomous pass (`autonomous.py`, both the
   scheduler and the manual trigger — correctly keyed off "is a pass
   *executing*", not "is the scheduler thread alive", so an idle scheduler
   sleeping until 3am doesn't falsely show as running), SearXNG's install
   *and* start phases (`searxng_manager.py`; `app.py`'s autostart thread
   calls the same `start()` and shares its state, so it needed no separate
   entry), the embedding-model download (`embedmodels.py` — already carries
   its own "Tier 1 §6" comment at the call site, so this was fixed in an
   earlier pass and just never got the ROADMAP strikethrough), and extras
   install/uninstall (`extras.py`). The one thread genuinely *not*
   registered — `security.py`'s per-request DNS-reachability probe — is
   correctly excluded: it blocks inside the request that spawned it and
   resolves in milliseconds, not a background job a user would come looking
   for on this screen. `tests/test_tasks.py` and `test_embedding_models.py`
   already assert each kind appears, including the exact "the download is
   running but /tasks doesn't know" regression this item describes.
7. **Claim-specificity in the hallucination net.** `agent.unsupported_claims`
   catches a claim with *no* matching write ("I tagged it" when nothing was)
   but not one that mismatches what happened ("I tagged it as Work" when a
   different tag was applied). Needs real model output to tune against, which
   this sandbox cannot provide — named rather than guessed at.
8. ~~**Two backend perf findings.**~~ **Done (HISTORY.md §44).**
   `_graph_neighbours`'s full-table scan is now pre-filtered with `ilike` per
   tag (same pattern `list_tags`/`_count_notes` already used elsewhere in the
   file) before the exact Python check, cutting it from one full-table fetch
   per BFS node to one narrowed query; `_note_summary`'s per-row
   `entry_dates` call is now `manager.entry_dates_bulk`, one `WHERE entry_id
   IN (...)` for the whole page instead of one `SELECT` per row in
   `list_notes`/`summarize_notes`. Both pinned by query-count regression
   tests in `test_scale_query_counts.py` rather than timing, matching that
   file's existing convention.
9. ~~**A "completed" notification for a background pass the user never
   enabled.**~~ **Done (HISTORY.md §44).** Reported directly and reproduced
   live (not guessed at): `POST /tasks/trigger-autonomous` ran a real
   optimisation pass regardless of the `autonomous_tasks_enabled` master
   toggle — only the scheduled loop checked it before ever calling in; the
   "Run optimization now" button being hidden while the toggle is off is a
   UI convenience, not an authorization check. The route now checks the
   toggle itself before calling `trigger_now`.
10. ~~**Every graph layout except Force shows no connections when the Time
    Filter is moved off "All time".**~~ **Fixed and verified live
    (HISTORY.md §50).** Diagnosed, not guessed: `applyTimeFilter`'s edge
    check read `d.source.created_at`/`d.target.created_at`, which only
    holds a real note timestamp once `d3.forceLink` resolves it — true for
    Force, never true for Tree/Radial/Arc, whose edges include synthetic
    category-heading/root nodes (`layoutHierarchy`'s `graphGroupNode`) with
    no `created_at` at all. `undefined || Date.now()` read every heading as
    "created this instant", which failed any cutoff short of "All time" and
    hid the heading *and* every edge touching it (almost all of them — every
    note's filing edge to its category) the moment the slider moved.
    Reproduced first with Playwright (Tree: 14/14 edges → 0/14 the instant
    the slider left "All time"; Force stayed correct at 2/4), then fixed by
    treating `isGroup` nodes as exempt from the time filter — organising
    furniture, not a dated note — and re-verified the same way (Tree:
    14/14 → 4-ish/8, no longer zero, headings stay visible).
11. ~~**Dragging on empty graph canvas sometimes highlights an unrelated
    note.**~~ **Fixed and verified live (HISTORY.md §50).** Reproduced with
    Playwright before guessing: a drag starting and ending on genuinely
    empty canvas (confirmed via `elementFromPoint`, not assumed) — a pan,
    not a node-drag — left a node lit with `.graph-focus` long after the
    cursor moved on. Cause: panning translates the whole canvas under a
    *stationary* cursor, so a node sliding past mid-pan fires a real
    `mouseenter`, and the matching `mouseleave` doesn't reliably fire before
    the button is released. A first fix (clear hover on the zoom's own
    `start`/`end` events) cut the failure rate but left a race — a
    `mouseenter` mid-gesture could re-set the hover after `start` had
    already cleared it. Fixed properly with a `graphIsPanning` flag that
    mutes hover mouseenter/mouseleave for the whole gesture, not just its
    two ends; 6/6 clean Playwright runs after, versus reproducing the stuck
    highlight on the unpatched code every time.
12. ~~**Clicking a whiteboard card or object to select it silently didn't
    work.**~~ **Fixed and verified live (HISTORY.md §57).** Found while
    live-testing mind-map selection, not reported first: `dragStart`'s
    (and `objDragStart`'s) unconditional `d3.select(this).raise()` on
    every pointerdown — including a plain zero-movement click — reappends
    the card as its parent's last DOM child mid-gesture, which is enough
    to stop the browser synthesizing the following `click` event at all.
    Confirmed by instrumenting the card's own click handler, the
    container's "empty canvas" handler, and a plain sketch's own click
    handler (which selects correctly, and never calls `.raise()` in its
    own "start") side by side. Fixed by moving `.raise()` into the drag
    handler, which — unlike "start" — only runs after real movement.
13. ~~**Two features silently shared the same Ctrl+K shortcut.**~~ **Fixed
    (HISTORY.md §57).** The navigation command palette (`openPalette`) and
    a separately-built "ask the agent anything" quick-command overlay both
    bound the identical global Ctrl+K keydown, independently — the second
    sat later in the DOM and silently ate every click meant for the first.
    Found live while testing a new command-palette entry. Rebound the
    "ask anything" overlay to Ctrl+Shift+K.

### Tier 2 — half-built features, cheap to finish

Each is already paid for; a small amount of work turns a frustrating surface
into a good one.

8. ~~**Skill runs: an auto/manual mode.**~~ **Done (HISTORY.md §45).** Reuses
   `stopped_at`/`start_at` — the same resume machinery a failed or stalled
   step already had — rather than a second mechanism: after every step that
   finishes `done`, `run_skill(..., manual=True)` stops there too, with a new
   `result.paused` flag so the client can tell "waiting for you" from
   "something broke" and render each one differently. A `manual_note`
   (`skill_manual_note` over the wire) is folded straight into the *next*
   step's own instruction, not appended to history, so it reads as part of
   what the model is being asked to do right now rather than something it
   may or may not weigh against everything else in the window. A "Run
   skills step-by-step" checkbox lives in the chat dock's `⚙` settings
   panel; the pause renders as a text box + Continue button, not a failure
   notification. **Not built**: the same pause for a plan run (`opts.plan`)
   — the backend already treats a plan identically to a skill, but the
   existing Resume-from-failure button was already skill-only before this
   session, so extending both to plans is one further, separate change, not
   a gap this feature introduced. **Not verified live** — six new backend
   tests (`test_skills.py`) cover the pause/resume/note-folding behaviour
   through the real streaming endpoint with a fake model, but the checkbox
   and the pause card's text box were not driven in a browser this session.
9. ~~**A reason on every link.**~~ **Done, including a confidence score and
   an editor (HISTORY.md §43).** Optional `reason` column on `entry_links` —
   "a note about uni and gym might still be related if they're both about
   scheduling." Writable by `link_notes` and the manual `/entries/{id}/links`
   endpoint; shown on the graph edge as a native SVG tooltip, in Trace's
   readout (`entry/paths.py`'s `Step.how`), and in `related_notes`' own `how`
   field so the model can reason about *why* two notes relate. When nobody
   gives a reason, `manager.create_link` tries to deduce one from embedding
   similarity and attaches a `reason_confidence` (0–1) alongside it — below
   the threshold, or with no embedding to check, it stays as no reason at
   all rather than a weak guess. Editable and clearable by hand afterwards
   (`PUT /entries/{id}/links/{link_id}/reason`, a ✎/⊘ pair on the note
   card's own link chips), which resets any deduced confidence since a
   person's words aren't a similarity score. Turns the graph from "these are
   connected" into "connected *because*" — which is also what makes Trace
   worth reading. **Extended (HISTORY.md §44):** asked directly — a
   suggestion in the Graph tab's "Notes that look related" panel showed a
   bare percentage with no sense of *why*; `GET /entries/link-suggestions`
   now carries the same `reason` text a link would get if approved (the two
   thresholds are numerically identical, so this is a preview of the real
   outcome, not a separate guess). And: *"none of my notes have a linked
   reason yet — is there an easy way to give them all a reason?"* — there
   wasn't, since deduction only ever ran at the moment a link was first made.
   `POST /entries/links/backfill-reasons` (`manager.backfill_link_reasons`)
   runs it once over every existing reason-less link, behind a button next
   to Suggest links. ~~**Asked again this session: "can there be a way to
   visually see link reasons in the graph?"**~~ **Done (HISTORY.md §61).**
   A manual link edge with a reason now carries `.graph-edge-reasoned` —
   visibly distinct weight/colour, not just a hover tooltip — and clicking
   any manual-link edge opens a real management panel: both note previews,
   the reason in an editable textarea, Save and Remove-link. Needed the
   link's own row id, which `/graph`'s edge payload never carried before
   this; added, with the two pre-existing exact-shape tests updated to
   match rather than loosened. **Asked for directly, not yet built:** the
   same backfill as an agent-callable tool/skill, so it can run unattended
   (a manual pass, or folded into the autonomous background worker's own
   task list — see item 31) rather than only a button someone has to click.
   Also asked for: **the deduction should weigh temporal words as well as
   embedding similarity** — two notes both mentioning "next Tuesday" or
   written the same day read as related even when their topics don't
   overlap semantically. `_deduce_reason` today is embedding-only
   (`AUTO_REASON_THRESHOLD`); this needs a second signal folded in (or
   compared against) using `entry.timewords`/`EntryDate`, not a wholesale
   replacement of the embedding check — a note from "next Tuesday" and one
   from "last Tuesday" are not related just because they share a weekday.
10. **The sketch pad.** ~~The highlighter at 5% opacity was effectively
    invisible~~ **Fixed (HISTORY.md §46)**: `globalAlpha` was `0.05` — around
    twenty overlapping passes before a stroke showed at all, which is the
    "completely wrong" in the report — now `0.35`, verified live (pixel
    read-back and a screenshot, not just the code). **Checked before
    touching anything, per this file's own rule**: a size control
    (`#sketch-size`) already existed and already reached every tool
    (pen/highlighter/eraser and every shape's stroke width all read
    `sketchPen.size`) — this file's own claim that it was missing was stale.
    ~~A background colour for the canvas~~ **Done (HISTORY.md §46).** A
    colour picker (`#sketch-bg-color-picker`) next to the image-upload
    button, persisted in `localStorage` the same way the whiteboard's own
    board colour is. **The one real trap this hit**: a first pass wired it
    as a CSS `background` on `#sketch-bg-canvas`, which did *nothing* —
    `sketchDrawBackground()` already paints an opaque `fillRect` into the
    canvas's own pixels every time the pad opens or an image loads, and
    those pixels sit in front of (and fully hide) any CSS background on the
    element underneath them. Fixed by making the fill colour itself
    `sketchBgColor` instead of a hardcoded `"#ffffff"` — the actual pixels a
    save composites, verified live by reading the saved-PNG composite's own
    pixel data back, not just the on-screen canvas. ~~Holding Shift while
    drawing a shape constrains it~~ **Fixed for the rect tool** (forces a
    square instead of a rectangle), verified live by reading back the
    drawn pixels' bounding box mid-drag. **Still genuinely open**: a
    selection tool (clicking an existing stroke/shape to move, resize or
    delete it; today's tools only ever draw a new one) — the sketch pad is
    pure-raster (`ImageData` snapshots for undo, no discrete stroke
    objects), so this needs a real architecture change, not a small patch,
    unlike the whiteboard's own discrete-object select (item 11). The
    toolbar redesign comes after it, not before.
11. **The whiteboard, properly.** ~~Images, text boxes, resize (8-handle
    corner+edge), grid (lines/dots/isometric)+snap, per-board background
    image, export (PNG/SVG/PDF), clear-board, a redesigned board picker,
    redo, single-item select, undo/redo, per-tool cursors, an eraser,
    keyboard shortcuts, draggable toolbar panels, highlighter+arrow tools,
    a board-colour reset, touch input (pointer events), sketch move+resize,
    copy/paste, multi-select (shift-click/marquee/bulk move/bulk delete),
    grid-snap on every item kind (not just cards), shift-to-constrain a
    drawn shape, Alt to bypass snap for one drag, two more shape types
    (triangle/diamond), arrowhead styles, precise drop placement, a real
    "glitchy and slow to update" perf bug (a full board re-render on every
    card-drag frame), a properties panel (colour/width/arrowhead/fill/
    border/font-size) for the current single selection, card resize
    (8-handle, same as images/text boxes), object grouping (Ctrl+G/
    Ctrl+Shift+G, a persisted `group_id`, click-one-selects-the-whole-group),
    undo/redo extended to cover move *and* resize (not just create/delete),
    arrow-key nudge (grid-step when snap is on, 1px/10px+Shift otherwise),
    alignment tools (left/h-centre/right/top/v-centre/bottom) and distribute
    (horizontal/vertical) for a multi-selection, and rotation (a drag
    handle above the item, Shift snaps to 15°, for cards and objects — see
    "still open" below for why sketches don't have it yet)~~ **all done,
    verified live — see HISTORY.md §53–§55 for the full list and how each
    was verified.**

    **Still genuinely open, ranked by what's actually left.**
    - ~~**Real anchor/connection points**~~ **Done, verified live (HISTORY.md
      §56).** Eight fixed points (corners + edge midpoints, as `{x,y}`
      0–1 fractions of the shape's own bounding box) plus a floating case
      (no anchor persisted — resolves every render via a rectangle/ray
      intersection toward whatever the other end actually is), matching how
      draw.io itself splits the two. `sourceAnchor`/`targetAnchor` live as
      two more keys in the link sketch's existing `data` blob, exactly as
      scoped — no migration. All three call sites named above
      (`dragStart`/`dragging`/`dragEndNode`, `sketchUpdate.each`,
      `wbUpdateLinkedSketches`) now share `wbLinkEndpoints`/`wbLinkPathD`
      rather than three copies of the same math. A real, previously-unknown
      bug was found and fixed along the way (see the whiteboard-fixes entry
      below) — every resize/rotate handle was `opacity: 0` but not
      `pointer-events: none`, so an invisible handle intercepted drags at
      *every* card/object corner for *any* tool, not just while selected;
      this is very likely why a link-from-corner drag felt unreliable even
      before anchors existed. **Extended (HISTORY.md §61), asked for
      directly** ("their anchor points should display... and I should be
      able to move the points... or even make it a dangling unattached
      point"): hovering a card with a link tool selected now shows its
      anchors without needing to start a drag first; a selected link's two
      endpoints get draggable handles that reattach to a different card
      (snapping to its nearest anchor) or detach to a free board-space
      point (`sourcePoint`/`targetPoint`, the same no-migration pattern as
      `sourceAnchor` before it). Building this found a second real
      architecture bug, the same way the resize-handle one above was
      found: the SVG drawing layer renders *under* the HTML card layer by
      design, so anything meant to be seen or clicked *over* a card was
      both invisible and unclickable — fixed with `#wb-overlay-layer`, a
      second SVG layer above the card layer for exactly this.
    - ~~**A mind-mapping mode**~~ **Done — see item 25's own entry (Tier 3)
      and HISTORY.md §57.**
    - ~~**AI + whiteboard, three pieces**~~ **Done, verified (HISTORY.md
      §57).** `read_whiteboard` (board contents: cards, text boxes, image
      count, links), `search_whiteboard` (keyword scan across every board —
      a real embedding index was scoped short as a bigger lift than this
      pass, see the same section), `add_whiteboard_card`/`add_whiteboard_link`
      (the write side — place a note, connect two cards, reusing the
      existing create endpoints). All four registered in
      `src/memorymap/ai/tools.py`, cued via a `TOOL_GROUPS` entry
      (whiteboard/board/canvas/diagram/mind map/sketch/draw.io/flowchart)
      rather than `TOOLS_GUIDE` prose — the fixed prompt prose had 2
      characters of headroom left under `PROSE_BUDGET_CHARS`
      (`test_prompt_budget.py`), so this was a deliberate scoping choice,
      not a miss. 9 new tests in `tests/test_ai_whiteboard_tools.py`,
      including that `add_whiteboard_card` goes through `_require_note`
      (refuses a private note) and is idempotent on `(note_id, board_id)`.
      **Not verified against a live model** — this sandbox's standing
      caveat about provider behaviour applies here too; the tool logic is
      real-database-tested, not watched being chosen mid-conversation.
    - ~~**Sketch rotation.**~~ **Done, verified live (HISTORY.md §61).**
      `wbTransformPathD` gained a `rotate` parameter: `M`/`L`/`C` rotate
      normally, `h`/`v` (the rect tool's own axis-aligned relative lines)
      become absolute `L` since a rotated line can't stay axis-aligned, and
      `a` (the circle tool's arcs) keeps `rx`/`ry`/large-arc/sweep
      unchanged (correct for a pure rotation) while rotating the endpoint
      delta and adding the same angle to the arc's own x-axis-rotation.
      `rotate=0` confirmed byte-identical to the pre-rotation output. A
      round rotate handle above a selected sketch, absolute angle-from-
      vertical drag, baked into `d` on release. Verified with hand-checked
      arithmetic: a rectangle dragged ~90° produced all four corners
      matching an exact rotation about its own centre to the pixel.
    - **Image cropping.** Asked about directly; not scoped or built —
      needs a decision on the interaction (a crop rectangle over the full
      image vs. a separate "adjust" mode) before building.
    - ~~**Uploaded images showing in the Library, and a way to delete
      one.**~~ **Done (HISTORY.md §61).** New `MediaUpload` table tracks
      every `/media/upload` regardless of destination (note, document, or
      whiteboard); `GET /media`/`DELETE /media/{id}` back the Library's
      Image Gallery, one delete button per tile. Both a note's own inline
      image and a whiteboard image object now show a dismissible "deleted"
      box instead of a broken-image glyph once their file is gone. **Still
      open: orphaned `/media/` garbage collection** — deleting an image
      through the gallery removes its file and row, but a file that
      becomes unreferenced some other way (a note edited to remove the
      markdown line, without ever going through the gallery) is not
      detected or cleaned up automatically; this is still a manual-only
      delete, not a sweep.
    - ~~**Smart alignment guides while dragging, colour-coded, with
      equal-spacing detection**~~ **Done, verified live (HISTORY.md §58).**
      Edge/centre snap plus equal-spacing (nearest neighbour each side,
      O(n) per drag frame), Alt bypasses all of it, three independently
      recoloured guide kinds (edge/centre/spacing) via pickers in the
      shape-menu dropdown, persisted to `localStorage`.
    - ~~**Rectangle select and lasso, export selection**~~ **Done, verified
      live (HISTORY.md §58).** A freeform lasso (ray-cast, centre-point
      test) joins the existing marquee, both grouped into their own toolbar
      dropdown (`#wb-select-picker`, same pattern as the shape dropdown).
      Export gained a "Just the selection" option (PNG/SVG/PDF) that
      filters to the selected item(s) and crops to their bounds, not just
      the whole board. **Bug found and fixed (HISTORY.md §61):** the lasso
      was live-reported as "doesn't work properly" — the card/object/grip
      drag filters excluded every other tool while the lasso was active
      *except* the lasso's own pointerdown guard, so dragging a lasso stroke
      across a card moved the card instead of drawing the lasso. Fixed by
      adding the lasso to the three drag filters.
    - ~~**Renaming a board, and a Library gallery of every board/mind-map
      and every uploaded image.**~~ **Done (HISTORY.md §61).** `PUT
      /whiteboard/boards/{id}` renames a board (rewrites its note's `#
      heading` line). The Library's Whiteboard area is now two sub-tabs —
      "Whiteboards" (a board gallery plus "+ New board", replacing the old
      bare board-switcher dropdown as the way to see what boards exist) and
      "Image Gallery" (sourced from the new `/media` listing, see the
      Tier 3 media item below) — restructured mid-session from an initial
      single combined tab after feedback that the whiteboard canvas itself
      should be reachable from the same page.
    - ~~**A structured, small-model-friendly "generate a diagram from my
      notes" tool.**~~ **Done (HISTORY.md §61).** `generate_diagram` takes
      a flat list of nodes (each a title-or-`note_id`, plus a `parent_ref`)
      and a `layout` (`tree` or `radial`), and does the BFS depth/slot
      placement server-side in one call — reusing the existing
      `wbArrangeMindMap` layout logic rather than making a small model
      invent `x`/`y` coordinates across many chained
      `add_whiteboard_card`/`add_whiteboard_link` calls. Capped at 60
      nodes, refuses ambiguous input (no root, more than one root/a cycle,
      an unresolvable `parent_ref`, a node with both `title` and `note_id`),
      and dedups against existing cards on the target board the same way
      `add_whiteboard_card` does.
    - ~~**A whiteboard backend/perf pass**~~ **Partly done (HISTORY.md
      §57).** Asked for directly ("no heavy algorithms, everything
      efficient"): the backend routes themselves (`get_whiteboard_state`,
      `list_boards`) were audited and are already flat, aggregate-query
      shaped — no N+1 found there. The one real issue found was
      client-side: `allEntries.find(...)` inside each card's per-render
      content callback (and again in the SVG-export loop) was O(cards ×
      notebook size) on every single render; replaced with a `Map` built
      once per call. **Not done**: a real profile against a large,
      many-hundred-item board (nothing this session was measured against
      one) — the fixes above are reasoned from reading the code's own
      complexity, not from a before/after timing.
    - ~~**A full line/arrow end-cap system**~~ **Done (HISTORY.md §61).**
      Independent start/end cap pickers (none/arrow/circle/square/
      multiline) replace the old single shared arrowhead control, for both
      the Line and Arrow tools. Caps are computed from the path's own
      tangent at each end (`wbCapPath`), so they track rotation and
      resizing rather than being drawn at a fixed angle.
12. ~~**Links that are links.**~~ **Already done — corrected, not rebuilt
    (HISTORY.md §47).** Checked before touching anything, per this file's
    own rule: every place a link chip renders (a note card's own links, the
    "Similar" panel, a reminder's attached note) already calls `flashEntry`
    on click, which switches to Notes → Browse, clears any active filter,
    and scrolls the target into view with a highlight — the same function
    search results and wiki-style `[[links]]` already use. This file's own
    claim that they were "decoration" was stale, likely inherited from
    before that wiring existed; nothing here needed building.
13. ~~**"Take me to the thing the agent just changed," the UI half.**~~
    **All four kinds now done (HISTORY.md §47, §51).** The document half
    was done in §47: `agent._change_document_id` has resolved a real
    document id on every write since §21, and `changeRow` — the one place
    both the chat's "what changed" list and the autonomous-pass review
    panel render a change — reads it, reusing `openDocumentFromNote`.
    **Reminders and categories, done this session**: `agent.py` gained
    `_change_reminder_id` (`set_reminder`/`complete_reminder`, an int id —
    the same shape as `_change_note_id`) and `_change_category_name`
    (`create_category`/`rename_category`/`merge_categories`, a *name*, not
    an id — every category tool already works in names, so this names the
    field that carries one rather than inventing an id nothing else uses;
    `delete_category` is destructive like `delete_document` and never
    reaches this code path). `changeRow` grew two more View buttons:
    `flashReminder(id)` switches to the Reminders tab, forces the filter to
    "all" (the change that brought you here — completing a reminder — is
    exactly the case where the default "open" filter would hide it), and
    scroll-flashes the item the same way `flashEntry` does for notes;
    `flashCategory(name)` reuses the sidebar's own category filter
    (`activeCategory`) rather than building a second filtering mechanism.
    Verified live end to end: created a real reminder and a real note in a
    fresh category via the API, called both functions directly, confirmed
    the tab switched, the item was found in the DOM, and (after waiting the
    two animation frames the flash needs) the `.flash` class was actually
    applied.
14. **Timeline line view, and text placement in grid view.** The grid view's
    text-placement half is **done**: `.timeline-dot`'s `line-clamp: 3` was
    unprefixed under a `-webkit-box` display, a combination this Chromium
    doesn't connect — `-webkit-line-clamp` computed to `none`, so nothing
    was actually clamping and a long preview just hard-cropped mid-word
    with no ellipsis. Fixed (the `-webkit-` property, kept alongside the
    standard one), plus the backend's own `preview` field, which was a bare
    `text[:120]` slice with no "…" on truncation even before the CSS ever
    saw it. **Re-reported after that fix, still cut off** — four full lines
    with no ellipsis this time, not reproduced in this sandbox's Chromium
    (a live check found nothing overflowing at all: `scrollHeight ===
    clientHeight`). A defensive `max-height` independent of
    `-webkit-line-clamp` support was added as a safety net (HISTORY.md
    §49-adjacent, same session as §48's Arc investigation) but this is
    hardening, not a diagnosis — if it's still cut off after this, the next
    session needs the actual browser/OS this is happening in, since two
    separate attempts from this sandbox's Chromium haven't reproduced it.
    ~~**Also reported: the line-view's own note popup shows no markdown
    rendering and no sketch/image attachment preview.**~~ **Fixed and
    verified live (HISTORY.md §51).** `openTimelinePopup` set the content
    with `.textContent`, showing literal `**`/`#` characters, and never
    touched `#timeline-popup-media` at all — the div existed in the HTML
    (reusing the graph popup's own CSS class) but nothing ever populated
    it, a "feature that never ran once". Rewired to reuse `renderMarkdown`
    (the note card's own renderer) and a `renderTimelinePopupMedia`
    mirroring `renderGraphPopupMedia` almost exactly — same
    `attachmentObjectUrl`/`openLightbox` calls, so a click still opens the
    full-size lightbox. The popup's position, computed once from its
    un-loaded size, is now recomputed after an image's thumbnail finishes
    loading too (`placeTimelinePopup`, the same fix the graph popup already
    had for the same reason). Verified live end to end against a real
    server: a note with `# Heading` and `**bold**` rendered as real
    `<h3>`/`<strong>` elements, no literal asterisks; an uploaded PNG
    attachment showed as an `<img>` with a real `blob:` src, not just
    reasoned from the code. **Still open:** the line view itself —
    reported as needing a real visual pass ("very professional and ready
    for public use"), and grid view could still take general UX polish
    beyond the text-cropping fix (not scoped further — say what
    specifically, next time it's reported).
15. ~~**Arc view: labels clashing with the connection arcs**~~ **Fixed and
    verified live with a screenshot (HISTORY.md §52).** The earlier
    "labels behind nodes" framing was investigated live (§48) and never
    reproduced — DOM order already put labels on top, z-order was never
    the problem. Re-reported with an actual screenshot, and the real bug
    was *position*, not z-order: the label's tilt (`rotate(-40, ...)`)
    pointed labels *up*, into exactly the strip above the baseline
    `arcPath`'s connection arcs curve through, so text and arcs fought for
    the same space. Measured live before fixing: 9 of 10 labels' bounding
    boxes overlapped a `.graph-edge`. Flipped the tilt to `rotate(40,
    ...)` — down instead of up — moving every label into the arcs' empty
    side while keeping the same anti-collision shape (still angled,
    reading outward). Confirmed two ways: a fitted screenshot showing
    labels clearly below the row with the arcs undisturbed above it, and a
    geometry check (`labelMostlyBelowNode`) true for every label, false
    before the fix. The refinement pass's other piece — the trace overlay
    drawing a straight chord through the row instead of its own taller
    arc — was already **done** in an earlier session.

    **Re-reported once more, with a screenshot, after the fix above**:
    labels still read as attached to the wrong node — not z-order or
    tilt-direction this time, but density. At the old spacing (`ARC_STEP`
    46px, up to 20-character labels, `rotate(40, ...)`), a 20-char label's
    horizontal reach was `20 × ~6.5px × cos(40°) ≈ 100px` — two-plus
    node-steps — so a label's own tail routinely landed under a *later*
    node, exactly the "category name is on the note, the note's text
    starts on the category node" symptom described. Fixed by widening
    `ARC_STEP` to 58px, shortening `ARC_LABEL_LIMIT` to 12 characters, and
    steepening the tilt to `rotate(58, ...)` (more vertical, less
    horizontal reach per character) — **not re-verified with a fresh
    screenshot this session (token budget)**, so treat this as reasoned
    from the same geometry that diagnosed it, not re-measured live; worth a
    screenshot check first thing next session. **Also asked for directly**:
    category labels only differed by weight/size before, not colour —
    `.graph-label-group` now also gets `fill: var(--accent)` in both light
    and dark mode, so a category reads as a different *kind* of label, not
    just a bigger note preview.
16. **Documents in the graph.** They are notes' equal everywhere else.
16a. ~~**The document editor's sidebar, reported directly with
    screenshots.**~~ **Checked and fixed (HISTORY.md §51).** The
    sticky/floating half was already done — `#doc-sidebar` already has
    `position: sticky` — stale by the time it was reported, corrected
    rather than rebuilt. The Outline-collapses bug was real and reproduced
    live before touching anything: 10 headings' outline went from 258px
    tall to exactly **0px** the instant the storage disclosure opened.
    Cause: `.doc-sidebar > details` was `flex: 0 0 auto` — flex-shrink
    *zero*, meaning it was **exempt** from shrinking — while the outline
    sitting above it had no minimum height at all, so the entire squeeze
    landed on the one sibling that could give and had nothing to give.
    That's backwards from what the block's own comment already said the
    intent was ("the help disclosure gives up its space first"). Fixed by
    giving the outline a real floor (`min-height: 4rem` — enough for a few
    entries even under pressure) and actually making the disclosure
    shrinkable with its own internal scroll, so it's now the one that
    yields. Re-measured live after the fix: outline settles at ~100px
    (visible and scrollable) instead of 0, disclosure scrolls its own
    overflow instead of forcing the outline out.
16b. ~~**The document editor's bold/italic don't toggle off.**~~ **Fixed
    and verified live (HISTORY.md §51).** `wrapDocSelection` (`app.js`,
    shared by the toolbar buttons and Ctrl+B/Ctrl+I) only ever wrapped —
    applying Bold to an already-bold selection stacked a second `**` pair
    instead of removing the first. Now checks both shapes a selection can
    be in before wrapping: markers just outside it (`**|bold|**`) or
    markers included inside it (`|**bold**|`) — either way, a second press
    strips them instead of stacking. Verified live through the real
    `#doc-content` textarea and `wrapDocSelection` itself, not a unit test
    (this file has no JS test runner): `hello world` → Bold → `**hello**
    world` → Bold again → back to `hello world`, byte for byte; the
    whole-span-selected and italic cases both round-tripped the same way.
    **Still open**: "a bunch of missing features... could be improved a lot
    more" was named but not itemised — needs a concrete list from the user
    before a session can act on more than the toggle bug.
16c. ~~**Images and files still can't be copied, pasted, or dragged into
    notes.**~~ **Two of three already worked — checked live before
    building anything (HISTORY.md §51).** A global `document`-level
    `paste`/`dragover`/`drop` handler (`app.js`, matches *any* `<textarea>`
    generically, not a note-specific one) already uploads to
    `/media/upload` and inserts markdown — and `#entry-content` (Capture)
    is a `<textarea>`, so it was already covered without anyone having
    wired it specifically. Verified live, not assumed: dispatched a real
    `paste` and a real `drop` event carrying a PNG file at `#entry-content`
    on a running server, both produced `![name](/media/…)` in the
    textarea. **The third path — a file-picker button — was genuinely
    missing and is now built**: `📎 Attach` next to Capture's other
    buttons, wired to the same `handleFileUpload` the paste/drop paths
    already use, so all three insert identically. Verified live with a
    real file chooser (Playwright's `filechooser` event, a real PNG on
    disk, not a synthetic DataTransfer): picking it produced the same
    `![name](/media/…)` markdown. One trap this hit and is worth recording:
    Capture lives in the Notes tab's `capture` sub-section — `switchTab
    ("notes")` alone leaves it `display: none` and the button unclickable;
    needs `showNotesSection("capture")` too, the same trap CLAUDE.md's own
    traps list already names for a different Notes-tab element.
16d. ~~**An optional title field in Capture, and everywhere a note can be
    created.**~~ **Decided and built (HISTORY.md §52).** Confirmed
    directly: write the leading `# {title}` heading line into `content` on
    save — the exact shape `manager.extract_title` already reads — rather
    than a second stored field. `#entry-title` in Capture and
    `#graph-new-note-title` in the graph's own "+ New note" popup (the
    two dedicated note-creation forms; voice dictation, templates, and
    quick actions all funnel into Capture's own textarea already) share
    one `withTitle(content, title)` helper, so a title typed in the box
    and one typed as the note's own first line produce byte-identical
    content. Also confirmed working, unprompted: a note started with a
    single `#` (not just `##`–`######`) was already read as a title by
    `extract_title` before this change — nothing needed building there.
    Verified live end to end: a title typed in Capture round-tripped to
    `# My Explicit Title\n\n...` in the saved note and the field cleared
    after save; a bare `#` line typed directly into the body was read back
    with the same computed title; the graph popup's own field produced
    identical behaviour.
16e. **Decision made, not yet built**: both a native-OS picker and a
    built-in in-app palette, same pattern as 16f — a toggle in Settings →
    Appearance picks which one opens. Not scoped further (which inputs get
    the trigger control, where the built-in palette's emoji set/data comes
    from) — do that scoping next to whatever picks up 16f, since both share
    the same Appearance-tab toggle mechanism and are cheaper built together.
16f. **Decision made, not yet built**: an SVG icon set *and* monochrome
    emoji, both available, with a toggle in Settings → Appearance to switch
    between them (not a single fixed replacement). Needs: (1) the actual
    count/categorisation pass (decorative vs. load-bearing) this item
    already called for, (2) an icon set picked and the SVGs wired in
    alongside the existing emoji rather than replacing them outright, (3)
    the CSS monochrome-filter path for the emoji option, (4) the Appearance
    toggle and the app-wide switch it drives. Sizeable — a full session's
    worth, not a quick pass.
    Original ask, kept for context: **a full sweep of emoji usage across
    the app**:
    *"I feel the application is very heavy with emojis, it feels too much
    like AI slop... make sure they are only used professionally and with
    intention, otherwise professional icons are the better way to go."*
    Also considering colourless/monochrome emoji as a middle ground, but
    undecided. This is a design decision affecting most of `index.html` and
    a large fraction of `app.js` (tab icons, button labels, toast prefixes,
    status chips) — not a quick pass. Needs, in order: (1) an actual count
    and categorisation (decorative vs. load-bearing — some emoji are the
    only differentiator between otherwise-identical icons, e.g. the
    notification kind icons), (2) a decision on the replacement (SVG icon
    set vs. monochrome emoji vs. selective removal), (3) then a build pass.
    Doing the build pass before the decision risks redoing the same ground
    twice, which this project's own history (HISTORY.md's repeated "checked
    before building" theme) is precisely the failure mode it keeps warning
    about.
17. ~~**Battery-saver: an indicator and an honest description.**~~ **Done —
    both halves, one already there.** Checked before writing this — the
    indicator already exists (`#power-saver-indicator`, a
    status-bar chip shown/hidden from `battery_efficient_mode`) and is wired
    on both load and toggle, so that half was already done and this file
    hadn't been told. The "honest" half had a real bug, now **fixed**: the
    autonomous loop only re-read `battery_efficient_mode` (and the on/off
    toggle, and the interval) once per scheduled tick, sleeping up to the
    full interval — six hours by default — between reads. Turning battery
    mode off, or the scheduler back on, did nothing until that sleep ran
    out, which is what "background tasks skip things thinking battery mode
    is on" and "finishing a task disables automatic tasks" actually were.
    `autonomous.wake()` now interrupts the sleep; `PUT /preferences` calls
    it whenever a preference the loop reads changes.
18. ~~**The full-screen graph's suggested-links list ran off the bottom
    without scrolling.**~~ **Fixed and verified live (HISTORY.md §51).**
    `#graph-card`'s own `overflow: hidden` (added in an earlier session for
    a different bug — see its own comment) still applied in full screen,
    since an ID beats a class on specificity regardless of source order —
    a plain `.graph-fullscreen { overflow-y: auto }` would have lost that
    fight silently. Measured live before fixing: toolbar + open Options +
    15 suggestions was 1061px of content in a 498px fullscreen window, and
    `overflow: hidden` meant the last several suggestions weren't merely
    unscrolled — they were unreachable, full stop. Fixed with
    `#graph-card.graph-fullscreen { overflow-y: auto }` (an id *and* a
    class, which wins outright), and confirmed live that the last
    suggestion goes from off-screen-and-permanent to reachable by scrolling
    the fullscreen view. **"The sketch/image toggles" part of this item
    couldn't be matched to anything in the current Options panel** (it has
    Similarity/Hide-unlinked/Labels, no sketch or image controls) — likely
    a stale or mis-transcribed note from whatever session first triaged
    this; left unaddressed rather than guessed at, and worth asking
    directly what it referred to if it's still wanted.
19. **First-run onboarding, the rest.** Reachability diagnostics are built;
    still open: offering to pull a model, a data-dir writability check,
    seeded example notes so the graph, timeline and dashboard have something
    to show before the first note exists — named by the project's own outside
    review as the highest-leverage version of onboarding. Also asked for
    directly: **a guided application tour** — a click-through walkthrough of
    the tabs and their core actions, distinct from the reachability/seeded-
    notes work above (that's about the notebook having something to show;
    this is about someone new knowing where to look). `#onboarding-overlay`
    already exists as a surface (see CLAUDE.md's login recipe); worth
    checking what it currently does before scoping a tour on top of it.
19a. ~~**The graph toolbar's controls read as one undifferentiated strip.**~~
    **Done (HISTORY.md §44).** Reported directly: `.graph-time-label` ("All
    time") is a plain read-out of the Time Filter slider, styled identically
    to the *interactive* toggle labels (Similarity/Hide unlinked/Labels)
    sitting right after it with the same flex gap, so nothing marked where
    one group ended and the next began. The three toggles are now grouped
    under one `.graph-toggle-group` span with a divider drawn before each
    group (`.graph-physics`/`.graph-temporal`/`.graph-toggle-group`), the
    same `+`-selector convention `.chat-tool-group` already used, so the row
    reads as Physics | Time | Toggles rather than one strip. **Not verified
    live** — CSS-only, reasoned from the DOM/selectors and the existing
    `.chat-tool-group` precedent, not screenshotted in this session.
19b. **A mute-notifications option, asked for directly**, alongside making
    the toast/notification split clearer: "there can be an option to mute
    notifications except for reminders." Built as
    `notifications_muted_except_reminders` (Settings → Preferences →
    Notifications): `toast()` takes an `exempt` flag (set on the three
    reminder-alert call sites) and returns early for everything else when
    muted; `recordNotification` does the same for the persistent panel,
    keyed off `kind !== "reminder"`. Errors are never muted — silencing a
    real failure would hide the thing muting is least meant to hide. **Not
    built**: mirroring ordinary toasts into the notifications panel (the
    other half of the same message) — every `toast()` call site would need
    a `kind` to avoid flooding the panel with routine "Saved."/"Linked."
    noise, which needs a first pass at which toasts actually belong there
    before it's buildable.

    **Extended (HISTORY.md §49), asked for directly**: a mute toggle inside
    the notifications panel itself (`#notif-mute-toggle`, reads "🔕 Mute" /
    "🔔 Unmute" and `aria-pressed`), not only three screens away in Settings
    — and the bell icon (`#notif-btn`) itself now shows 🔕 instead of 🔔
    whenever muted, so the state is visible without opening anything. Built
    and verified live end to end, which is what caught item 4a's real bug —
    the toggle correctly PUT the preference and correctly re-rendered from
    the response, and *still* showed unmuted, because `GET /preferences`
    (which the PUT response is built from) never echoed the new key back.
    Fixed there, not patched around here.

### Open questions raised this session, not built

- **Should Capture have its own title field**, separate from the leading-
  heading convention §43 already shipped (`manager.extract_title` reads a
  `#`–`######` first line, computed on read rather than stored)? Asked
  directly, including "if the user begins a note with `#` maybe it moves to
  the optional title input" — genuinely a design question in the same shape
  §43 was worked through as, not a bug: a second, separate title field would
  either duplicate the heading-line mechanism (keeping both in sync) or
  replace it (undoing the "read off the note, not enforced" decision §43's
  writeup already recorded). Needs a decision before either is built, not a
  guess.
- **"The dashboard isn't detecting my name."** Traced end to end
  (`renderNameNudge`/`withDisplayName` read `prefsCache.display_name`, and
  `savePrefs` updates both the cache and re-renders the greeting on save) and
  the code reads correct — the nudge is *designed* to show exactly when
  `display_name` is empty, so a fresh profile with no name saved yet showing
  "👋 Add your name" is very likely the feature working as built, not a bug.
  Could not reproduce a case where a name was actually saved and still not
  shown; if it recurs, check `GET /preferences` directly for whether
  `display_name` actually persisted, rather than assuming the render path.
- **The Timeline grid's "text cut off with no ellipsis" report** (§38a item
  2 was believed fixed) was re-investigated live: seeded notes up to 122
  characters at the grid's actual 13rem column width and read
  `getComputedStyle` on every `.timeline-dot`. Two things came out of it,
  neither a confirmed fix: `-webkit-box`'s **computed** `display` resolves to
  `flow-root` in this sandbox's Chromium, not `-webkit-box` — the property
  the existing code comment says is "what this display mode actually reads"
  isn't actually the mechanism in effect here, though clamping still worked
  correctly in every case tested (`scrollHeight === clientHeight`, nothing
  overflowing). Could not reproduce actual clipped, non-ellipsised text with
  any input tried. Worth re-checking with the user's exact note content and
  browser before guessing at a CSS change — this project's own standing rule
  is to reproduce before theorising, and this one didn't reproduce.

### Tier 3 — new capability

Worth doing, and worth doing after the above.

20. **Files and images on notes, and standalone in the Library.** The plumbing
    exists (`/media`, attachments); an images-only Library gallery now exists
    (20a, HISTORY.md §61). **Still not built:** a gallery over *note
    attachments* specifically (files attached to a note but not images —
    asked for directly this session as "separate from the whiteboard gallery
    I just built"), and drag-to-attach.
20a. ~~**A Library "Media/Images" gallery tab**~~, **and garbage-collecting
    orphaned `/media/` files** (still open). The decision this item asked
    for is made and built (HISTORY.md §61): every `/media/upload` now gets
    a `MediaUpload` row (filename, original name, timestamp), which is
    what the new Library "Image Gallery" sub-tab lists, and what
    `DELETE /media/{id}` uses to remove a file plus its row. A note's own
    inline images now also fail visibly and manageably instead of silently
    — a broken `<img>` (from a note, or from a whiteboard image object)
    renders a closable "deleted" placeholder in its place, and the file
    action menu's Download/Delete on a gallery item both work (Download
    was pointed at the wrong URL before this session; Delete didn't
    exist). **Still open:** nothing yet reconciles `/media/` files on disk
    against live note content, so an image referenced only inline in a
    note's markdown (not tracked via the note's own attachment list) that
    gets pasted over or the note deleted still leaks a file with a
    `MediaUpload` row nobody will ever call delete on. That reconciliation
    pass — not the tracking/gallery/delete plumbing — is what remains of
    this item.
20b. ~~**An "Agent Activity" background-task popup cleanup pass.**~~ **Done
    (HISTORY.md §61).** The concrete overlap this item asked for a list of
    turned out to be one bug: `.agent-monitor` was pinned to `right: 20px`,
    the same corner several whiteboard floating panels anchor to, so the
    monitor toast sat on top of them at some viewport sizes. Moved to
    `left: 20px`; the dead compensating CSS rule for the old position
    (`body.has-agent-monitor .whiteboard-floating-panel.bottom-right`) was
    removed with it.
21. **A persona on the welcome messages.** Small, and it makes the app feel
    like one thing rather than a chat bolted to a notebook.
22. **Meeting recordings as first-class objects**: pause/resume, replay, save
    as a voice note, transcribe in the background. Blocked on Tier 1 item 1.
23. **Notification expansion**: reminders, and opt-in AI nudges from the
    utility model. Blocked on Tier 1 item 5 — decide what they *are* first.
24. **Graph layouts beyond Arc** — mind map, treemap/sunburst, adjacency
    matrix. Each is a materially different rendering approach, not a fourth
    case the existing `layoutHierarchy` machinery covers free. The decorative
    half (skins, minimap, PNG export) is the smaller contained piece if a
    session wants a quicker win. Asked for by name as "an Obsidian-style
    knowledge graph": Obsidian's is a force layout, which this app already
    has — the gap reported is closer to *interaction* (smooth pan/zoom feel,
    node-drag responsiveness, a cleaner minimal aesthetic at rest) than a
    new layout algorithm. Worth reproducing what specifically feels
    different — screenshot the two side by side — before assuming it's this
    item rather than a tuning pass on the existing force simulation.
25. ~~**Mind-mapping — decided: a whiteboard mode, not a third tab.**~~
    **Done, verified live (HISTORY.md §57).** Both additions built exactly as
    scoped: "Arrange as mind map" (Tree or Radial, in the properties panel
    for a linked card) reuses the Graph tab's own `d3.hierarchy`/`d3.tree`
    approach against the whiteboard's node/link data via a BFS spanning
    tree, not a second layout engine; Tab (linked child, next open radial
    slot) and Enter (sibling) both create a real note+card+link. Verified
    live: a 4-card hub-and-spoke arranged radially put every child at
    exactly the configured ring distance from the root; Tab/Enter both
    produced real, correctly-parented cards.
26. **Widgets: a picker**, and more of them. Customisable sidebars, and note
    view options in the Notes tab. Asked for directly as "a widget management
    hub popup on the dashboard, like a widget marketplace" — the foundation
    is already substantial and worth knowing about before rebuilding it:
    `DASH_WIDGETS` in app.js already registers 17 widgets, `dashboard_layout`
    (order/hidden/wide) is a real preference, and Edit layout mode already
    supports add/remove/reorder/wide-toggle inline on the dashboard. What's
    actually missing is a *dedicated surface* — a button opening a proper
    modal/picker rather than an inline edit mode — and more widgets to fill
    it. A UI-surface change on an existing data model, not new plumbing.
27. **llama.cpp, actually wired in.** A new `ai/provider.py` entry alongside
    Ollama/OpenAI-compatible, a GGUF file picker (files on disk, not a
    registry to pull from), and `core/extras.py`'s `unavailable` string
    removed once it is real. Asked about directly and deferred, not forgotten.
28. **§20's async-httpx refactor.** Deferred so there was always a known-good
    streaming path to bisect against; that reason has expired, and the cost
    grows as more providers touch the sync path.
29. **Better-looking theme previews** in Appearance.
30. **Standing backlog, the rest** — [roadmap/BACKLOG.md](roadmap/BACKLOG.md)
    (note-list keyboard nav, a per-chat token meter, an eval harness,
    multi-category notes, desktop packaging, MCP support). None is blocked on
    anything above.
31. **Expand the autonomous background agent's capabilities.** Asked for
    directly, without a specific gap named — today it does three things
    (`_enabled_tasks` in `ai/autonomous.py`): tag untagged notes, link
    conceptually related ones, flag duplicates. Candidates worth scoping
    before picking one: acting on stale/orphaned notes (nothing currently
    reviews a note nobody has touched in months), running the digest or
    on-this-day surfacing proactively rather than only on request, or
    letting a saved skill run on the same schedule instead of only the three
    fixed tasks. Needs a real "which of these, and why" before building —
    "expand the capabilities" alone isn't a spec.
32. ~~**Keyword search has no IDF weighting and can't use an index.**~~
    **Done.** An external-content FTS5 table (`entries_fts`, kept in sync by
    triggers, `core/database.py`) replaced the leading-wildcard `ILIKE`
    scan; ranked by `bm25()` with tags weighted above body text, an exact
    contiguous phrase still breaking ties in front of everything else
    (checked against the small already-narrowed candidate set, not a
    second index). Full suite green.
33. ~~**`graph_expansion` is hard-capped at one hop, on purpose.**~~ **Done
    — automatic, not a "search deeper" action.** That was the one open
    decision; made it automatic because it needs no new UI and the roadmap
    text's own "shown as a visibly weaker tier" already implied no control
    was required to see it. `GRAPH_EXPANSION_HOP2_LIMIT = 2` (smaller than
    the first hop's 3), walked from the first hop's own neighbours, tagged
    `connected_2hop` in `match_info` rather than merged into `connected` —
    its own badge text and ~0.65 opacity vs ~0.85 for a direct connection.
34. ~~**No entity/concept layer above notes — only note-to-note links.**~~
    **Done, at the scoped-down size this item asked for.** `Entity` +
    `EntityMention` (membership only, no entity-to-entity graph), extracted
    by `ai/entities.py`'s `suggest_entities` — one `suggest_tags`-shaped
    completion per note, run a few at a time by the autonomous pass behind
    its own `auto_entities_enabled` toggle (default off), skipping notes
    under 20 chars and never re-scanning one already marked
    (`Entry.entities_extracted_at`). Same-name mentions merge within a pass
    via a case-folded lookup — two real different "Sarah"s colliding into
    one entity is an accepted gap, not an oversight (the item's own scope
    cut). `GET /graph?include_entities=true` (off by default; every
    existing consumer of that endpoint assumes a numeric Entry id, so an
    entity node's id is prefixed `entity:N`) adds entity nodes and
    membership edges; the graph's own "Entities" checkbox asks for them,
    and a matched node renders with a dashed ring rather than a second SVG
    shape. Seven tests (`tests/test_entities.py`) cover extraction,
    merging, the skip-short/skip-already-scanned paths, and the endpoint
    shape — all against a faked model, this suite runs with no LLM. The
    graph rendering was checked live (seeded an entity by hand, confirmed
    the dashed node paints) after catching a real trap the hard way: the
    dev server had been running since the start of the session and was
    serving stale Python for every backend change up to that point,
    including this one — restarted, then re-verified. Nothing else in this
    session's backend work was re-checked live after that restart; the
    pytest suite (unaffected by server staleness, since it imports fresh)
    is what stands behind items 32/33 and the earlier bug fixes instead.
35. **No vision-capable image understanding.** Confirmed by grep, not
    assumed: `ollama_client.py` already reads a model's `vision` capability
    alongside `tools`/`thinking` from the same `/api/show` call §6 built, but
    nothing consumes it — no code path sends an attached image to a vision
    model. Asked for directly, including how it should be configured:
    auto-detected the same way `tools`/`thinking` already are, with a manual
    override in Settings → Models for OpenAI-compatible backends that don't
    self-report capabilities. Wire into the existing image path (paste/drop/
    attach → `/media/upload`), and run it *alongside*, not instead of, the
    OCR idea already scoped in BACKLOG.md §4 item 1 — the two answer
    different questions and are both cheap once the pipeline exists: local
    OCR (`pytesseract`, no torch, always available) extracts literal text for
    the existing keyword index ("what did that whiteboard photo say"), a
    vision model's description (only when one is configured) covers content
    OCR can't read at all ("what's in that photo"). Needs a decision on
    where the description is stored (a note field vs. a side table) and
    whether the agent narrates "generated from an image" the way whiteboard
    AI actions already disclose their own source.
36. ~~**Q&A answers cite which notes matched, not which claim inside the
    answer's prose came from which note.**~~ **Done, backend and frontend.**
    `ai/grounding.py`'s `ground_answer_sentences` splits the answer into
    sentences and scores each against every retrieved note by shared
    meaningful words (the same signal `search_manager`'s own keyword
    ranking uses) — deliberately not a second LLM call, so the
    already-answered turn isn't made slower to explain itself. Attaches a
    note only above `MIN_OVERLAP_RATIO`; omits the sentence rather than
    guessing when nothing clears it (a wrong claim-ledger entry is worse
    than a missing one). `POST /chat` carries it as `sentence_grounding`;
    the Ask box's actual live path, `/chat/stream`, carries it as its own
    `grounding` NDJSON event, sent once after the answer finishes
    streaming (needs the whole answer, not per-delta). The badge itself
    (`renderAnswerGrounding`, a new `#ai-answer-grounding` strip below the
    answer, one small chip per *source note* — several grounded sentences
    sharing a note collapse into one chip rather than repeating it, the
    sentence(s) it backs in the hover title) opens that note on click,
    same as a search-result row already does. Seven backend tests
    (`test_grounding.py`) plus a live Playwright smoke check (no console
    errors driving the real Ask box; the actual "a chip renders and says
    the right thing" path needs a running Ollama to reach, which this
    sandbox doesn't have — say so rather than claim it was watched).

    Original scope, for the next session: `match_info` (search results'
    per-row "why this matched" badge) already covers "which notes were
    retrieved"; `unsupported_claims` (Tier 1 item 7) already covers the
    agent's own narrated actions; link `reason`/`reason_confidence` (Tier 2
    item 9) already covers grounding a connection between two notes. None of
    the three covers a sentence inside a direct Q&A answer. Narrower than a
    full claim-ledger (ANALYSIS.md §59) precisely because those three already
    exist, surfaced the same understated way `match_info` already is — a
    badge, not an interruption — and scoped to the direct Q&A path only, not
    the full agentic chat, where
    `unsupported_claims` already does the related job.
37. **`preferences.json` isn't crash-safe** (ANALYSIS.md §60). Found by the
    second odysseus read: `ConfigManager.set_preference` persists it with a
    plain `write_text()` — no tmp file, no fsync, no atomic rename — so a
    crash mid-write can truncate or corrupt the one file holding
    `llm_api_key` and every saved setting, contradicting its own docstring's
    promise that "a crash never loses a settings change." §59 already looked
    at this class of fix once (claude-obsidian's transaction layer) and
    correctly ruled it unnecessary because SQLite's own transactions cover
    concurrent note writes — but `preferences.json` sits outside the
    database, so that dismissal doesn't reach this file. Fix is odysseus's
    own `atomic_write_json`/`atomic_write_text` shape (write-to-tmp + fsync +
    `os.replace`), ~15 lines, applied at the one call site in `core/config.py`.
38. **MCP support, now with a concrete shape to build from** (ANALYSIS.md
    §60, narrowing BACKLOG §29). Expose first: a stdio MCP server over the
    existing tool registry (search/create/tag a note) needs no new trust
    model — it's the same local-process boundary the app already has, reachable
    from Claude Desktop or any other MCP client on the machine. Consuming
    external MCP servers is a separate, harder feature that needs the trust
    model BACKLOG §29 already flagged as missing; it should wait until that
    exists rather than ship alongside the expose direction.
39. **Passive capture: a fifth autonomous-tasks job that mines chat for
    un-filed facts** (ANALYSIS.md §60). Today a note is only filed on an
    explicit instruction or an explicit tool call — something mentioned in
    passing during an ordinary Q&A turn is never captured. An
    `auto_capture_enabled` job alongside the existing `auto_tag`/`auto_link`/
    `auto_dedupe` three, default off for the same reason those are ("it runs
    the agent against the whole notebook with nobody watching"). Needs
    measuring before it ships, the same discipline already applied to §33's
    semantic-tool-retrieval item — a background job that mis-files something
    nobody asked to capture is a worse failure than one that misses something.

### Tier 4 — deferred, with the reason

Not a dump: each says why it is not Tier 3.

- **`app.js` module split** (29.1k lines now, up from the 20.7k this entry
  was last written against — §60's session). Still worth doing
  *deliberately*, and now with an actual first candidate instead of "pick
  something": the whiteboard is a single unbroken, clearly-marked 5,300-line
  block (`// === WHITEBOARD LOGIC ===` at line 23292 through the next marked
  section at 28586) — the largest coherent subsystem in the file by a wide
  margin, and one a session could plausibly extract to `whiteboard.js` in
  one sitting with the `tests-e2e/` Playwright smoke suite as the safety
  net. Not attempted this session — the risk isn't the extraction itself,
  it's doing it *in the same sitting* as live edits to that exact code (this
  session's whiteboard bug fixes), where a half-done split and a bug fix
  landing in the same diff is much harder to review or revert than either
  alone. Do the split on a quiet day, not appended to a bug-fix session.
  Same for `style.css`, unscoped.
- **A second React frontend.** A second implementation of every screen, kept
  in step by hand, for an app whose brief is "no build step". The cost is not
  the first version — it is every change afterwards having two homes. If the
  motive is component structure rather than React, the split above is cheaper.
- **"Make everything faster."** Not actionable as written, and the measured
  slow paths are fixed: PageRank and the similarity sweep are cached per
  notebook version, three N+1s and two O(n²) traps are gone. The next real
  work needs a profile against a large notebook, not a sweep.
- **Spacing and clashing controls across the app.** Real, and too broad as one
  item. The design tokens and the lints make each instance a small fix; raise
  them as they are noticed rather than as a project.
- **A pass over "the Gemini/antigravity improvements".** Done — see
  HISTORY.md's §40. 46 tests and 4 lints so the next such audit is cheaper.
- **The "full UI audit" umbrella.** Break into dated sub-items as capacity
  allows. The concrete pieces left: a colour-scale pass to match the existing
  spacing/type work, and a widget-density sweep.
- **"Clean up, consolidate and refactor the test files."** Asked again
  (§60's session), so this time checked with the actual method the entry
  above calls for, not re-deferred on the same reasoning twice: grepped
  every `@pytest.fixture` across all 107 files for a name reused in more
  than one — none found. The two closest near-misses (`ollama()` in both
  `test_presets.py` and `test_model_specs.py`) build genuinely different
  mocks, not a copy-paste duplicate. **The finding is that there is no
  finding** — no reinvented fixture, no `test_x`/`test_x_more` pair sharing
  setup, nothing a mechanical merge would safely collapse. The four largest
  files (`test_skills.py` 881 lines, `test_wavef_api.py` 764,
  `test_searxng_install.py` 755, `test_antigravity_regressions.py` 733) are
  each single-topic and coherent, not grab-bags — a size-triggered split
  would separate a fixture from the twenty tests that share it for no
  reason but the line count. Still nothing to do here until a real
  duplication turns up.

### The rule this section exists to enforce

Anything reported goes in here with a tier, **immediately**, even if nobody is
working on it. This project's failure mode is not forgetting to write things
down — it is writing them somewhere a later session does not read, and then
rebuilding or re-deriving them. One ordered list, in the file every session is
told to open first.

## How to work on this repo

- `pytest tests/` — ~1,600+ tests, fully offline, no Ollama needed
  (`pytest.ini` sets `pythonpath = src`).
- `ruff check .` — matches CI.
- `node --check frontend/app.js` — one large plain-JS file; run after every edit.
- **Install non-ML deps by hand** (see root `CLAUDE.md`) — do not install
  `torch` or `sentence-transformers`; both have failed to install cleanly in
  past sessions and the suite passes without them (semantic search falls
  back to keywords; tests that care use a fake embedding backend).
- **Drive the app in a browser before claiming a UI change works.** Chromium
  + Playwright are in the sandbox. Launch with `service_workers="block"` or
  `sw.js` serves a cached `app.js` and you'll be testing yesterday's code.
  Assert on measured geometry (`scrollWidth - clientWidth`), not screenshots.
- **Collect the console while driving.** The app sends a strict CSP; a
  refused style/script/fetch shows up *only* in the console — no failed
  request, no thrown error, the thing just silently doesn't happen.

### Traps that have each cost real time

1. **Don't guess element ids** — check `index.html` or query generically.
2. **`git checkout <file>` discards uncommitted work in that file.** Commit
   before experimenting.
3. **A POST response can lie about stored state** — SQLAlchemy returns the
   in-memory object; assert on the next GET, not the create response.
4. **`utcnow() + offset` is a lie with a timezone attached** — it tags UTC on
   a value that actually holds local wall-clock. Build the user's clock as
   `utcnow().astimezone(timezone(offset))`.
5. **The Notes tab is sub-tabbed.** Anything that scrolls to a note must call
   `showNotesSection("browse")` first, or it targets an element inside
   `display: none`.
6. **The app sends a strict CSP; a violation is reported only in the console.**
   No failed request, no thrown error. An injected `<style>` tag won't apply
   (use `adoptedStyleSheets`), `style=""` in `index.html` won't apply (use
   `style.css`), and a script from off-origin is refused outright.
7. **CSS automatic minimum sizing is the usual cause of a wide page.** A
   `1fr` grid track or a flex item with default `min-width: auto` refuses to
   shrink below its content; `overflow-x: auto` on the child does nothing
   until every ancestor has an explicit floor.
8. **A POSIX idiom can mean something else on Windows, silently** —
   `os.kill(pid, 0)` terminates on Windows rather than probing; the sandbox
   is Linux, so this class of bug never reproduces here.
9. **A control that "does nothing" is usually working** — check the
   *computed* result. Most reported cases wrote correctly and were then
   overridden by CSS source order, a status poll repainting, or living in a
   hidden section.
10. **This suite cannot see any of the above.** Every UI bug this project has
    found passed a fully green test run first.

Full historical detail for every trap above — the original report, the
diagnosis, the fix, and what verification could and couldn't cover — is in
[roadmap/HISTORY.md](roadmap/HISTORY.md).
