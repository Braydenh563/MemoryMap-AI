# Audit 2026-10-05: architecture, backend and local AI

Area `arch`. Head `64ddf14`. Server on :8831, data `/tmp/mm-audit-arch`.
Every number was measured in this session unless the line says "read".
The sandbox ran at load 10 to 19 on 4 cores (other audit agents), so
absolute milliseconds are inflated, perhaps 2x to 4x; ratios, statement
counts, plans and failures are not.

**The 5,000-note notebook.** 779 notes through `POST /entries` (4 clients,
real filing, real bge-small vectors), grown to 5,000 in-process through
`manager.create_entry` + `sync_wiki_links` with vectors reused from the real
ones plus noise (re-embedding was a 30-minute job). Text is synthetic: 20 to
420 words from a 77-word vocabulary, 2 tags each, 40% with `[[links]]`, 57 MB
file. Two endpoints (`/entries/link-suggestions`, `/duplicates`) react badly
to that small vocabulary; their lines say so. Scripts, all outside the repo:
`/tmp/mm-audit-arch/work/` (`seed5k.js`, `grow.py`, `harness.py`, `bench.py`,
`locktest.py`, `spacetest.py`, `explain*.py`, `bootnet.js`, `cycles.py`,
`deadcode.py`, `routes.py`; py-spy profiles `prof_*.txt`).

## 1. Summary: the five worst things

1. **A night pass holds SQLite's write lock across every model call: every
   save during it fails with a 500 after 5.1 s** (measured, ARCH-01).
2. **Saving a note is O(notebook)**: 1.7 s p50 for a 400-word note and 0.93 s
   for a one-line note at 5,000 notes; edits 0.74 s (ARCH-02).
3. **`GET /search` ignores the active space**: a "work" note comes back to a
   "personal" request (measured, ARCH-03). The finder and palette call it.
4. **Every unlock downloads the whole notebook**: 26 sequential
   `/entries?limit=200` pages, 2.3 MB, 4.4 s of request time at 5,000 notes,
   each page a full sort because "All spaces" cannot use the list indexes
   (ARCH-04, ARCH-05).
5. **Switching the chat backend silently turns semantic search off** until
   the next save, which then takes 5.1 s (measured, ARCH-06).

## 2. The system in one page

```
Browser: frontend/js, 68 files, 164k lines, one global scope.
  Boot: unlock, then pages ALL notes into memory (allEntries), 55 API calls.
   | fetch, NDJSON (/chat/stream), SSE (/jobs/stream, /logs/stream)
FastAPI (api/app.py create_app): 7 middlewares (gzip, CSP, origin, host,
  vault scope, space guard, request pulse), 403 routes in 45 files,
  401 sync handlers on the anyio threadpool (40 threads), 2 async (SSE).
  api/ is 32.7k lines and holds much of the domain logic itself.
   |                       |                          |
entry/ (5k lines)       ai/ (29k + tools 6.5k)      search/ (7.7k)
 manager.py: writes,     janitor: filing             index.py: FTS5 search_index,
 links, revisions;       librarian/agent: chat         fed by an ORM after_flush hook
 core/events.py writes   facts: night pass           engine.py: FTS candidates,
 one audit_log row       embeddings: bge-small via     cosine re-rank, graph hops
 per public write        sentence-transformers,      search_manager.py: older path
                         in process                    (/entries?q=, chat retrieval)
                         provider -> ollama_client |
                         openai_client (requests, 600 s)
   |                       |                          |
core/database.py: one engine, QueuePool 5+10, WAL, synchronous=NORMAL,
  busy_timeout 5000. At every start: create_all, _add_missing_columns,
  _INDEXES, entries_fts triggers, Alembic stamp/upgrade (14 revisions).
  Spaces: a do_orm_execute hook adds workspace_id to ORM statements only.
core/jobs.py: pool with lanes cpu (n) and model (1); durable rows (jobstore).
ai/autonomous.py: one scheduler (night pass, entities, link audit, agent).
Disk: memorymap.db + uploads/ (attachments) + media/ + backups/ (db only).
```

The two paths that matter:

- **Save** (`POST /entries`, no defer): `janitor.categorise` embeds, averages
  every category's vectors, kNN, lexical vote, a model call only if the cheap
  path is unsure; `manager.create_entry` (commit 1, event row, FTS triggers,
  search_index hook); tag suggestions from up to 4,000 notes (commit 2);
  note and paragraph vectors (commit 3); wiki links (commit 4); a semantic
  search for a duplicate warning. `defer_filing` (composer, quick note) moves
  filing, embedding and the duplicate check to a `file-entry` job on the
  one-wide `model` lane.
- **Ask** (`POST /chat/stream`): `_prepare` retrieves through search_manager,
  budgets the window at 4 chars per token, streams from the provider; with
  tools `agent.run_agent` loops rounds. 194 ms to the first `meta` line at
  5,000 notes with no model.

## 3. Findings, by severity

### Critical

**ARCH-01. The night pass blocks every write for its whole run (NEW)** FIXED 5a25517
- Evidence: `ai/facts.py:373-375` adds and flushes the `NightRun` row (an
  INSERT, so the connection holds SQLite's write lock), then per note calls
  `_narrow(provider, ...)` (a model call, `:404`) and later `_pair_passes`
  (more model calls); the caller commits once at the end
  (`routes_night.py:67-72`, `autonomous.py:405-416`).
- Measured (`locktest.py`, fake OpenAI server, 2.5 s per round): during
  `POST /night/run` three `POST /entries` each returned
  `500 {"code":"internal"}` after **5.1 s** (the busy_timeout); reads stayed
  200 in 30 ms; the pass took 23.4 s and derived 16 facts.
- Same shape, read: `ai/entities.py:225-246` (`extract_entities_pass`, one
  commit after up to `limit` model calls; `get_or_create` autoflushes in the
  loop). Durable-job bookkeeping (`jobstore.record/lease/finish`) also needs
  the lock, so queued filings stall too, and log only at DEBUG.
- Impact: with a real 4B model each call is seconds to tens of seconds. "Run
  now" in Settings, or a scheduled pass (budget 20,000 tokens), makes every
  save, edit, pin and filing fail for minutes with "Something went wrong".
- Fix (M): commit the `NightRun` row first; per note, read, call the model
  with no open write, then a short write transaction for that note's rows.
  Same in `extract_entities_pass`. Map `database is locked` to 503 "The
  notebook is busy for a moment, try again" instead of 500.

### High

**ARCH-02. Every save does work proportional to the notebook (NEW)** FIXED f7aa175 (4,300 to 390-615 ms at 5,000 notes under load 10-13; PUT still embeds on the request)
- Measured at 5,000 notes, in-process (section 6): `POST /entries` 400 words
  **1,706 / 2,092 ms** (p50/p95), one line **930 / 1,474 ms**, `defer_filing`
  87 ms, `PUT /entries/{id}` **744 / 1,117 ms**. Seeding with 4 clients fell
  from 11 notes/s at 40 notes to 2.2/s at 600 and **1.0/s at 750**.
- Where (cProfile of `create_entry` at 610 notes, 1,415 ms):
  `_keep_suggestions` -> `lexical_filing.suggest_tags` **490 ms**: reads up
  to `MAX_EXAMPLES = 4000` notes' full text and rebuilds TF-IDF from scratch
  (`lexical_filing.py:176-196`); `janitor._best_centroid_match` **539 ms**:
  loads every stored vector of every note and re-averages every category
  (`janitor.py:278-318`), ignoring the engine's cached matrix; two uncached
  bge encodes of the same note (4 `embed_text` calls, 2 misses, 850 ms).
  `update_entry` embeds on the request too (`routes_entries.py:2214`).
- Impact: the core action gets linearly slower with use; deferring only moves
  the cost onto the single `model` lane (ARCH-09).
- Fix (M): incremental tag-term counts kept on write, or tag votes from the
  engine's cached vector neighbours; centroids cached per matrix version (the
  `cached_similar_pairs` pattern); embed once per save and pass the vector.
  Gate: create p50 at 5,000 within 20% of create p50 at 500.

**ARCH-03. `GET /search` returns notes from other spaces (NEW)** FIXED f7aa175
- Evidence: `routes_search.py:52-57` sets `space` only from the query string;
  `engine.search` filters its raw-SQL FTS candidates by `space` only when
  given (`engine.py:1044`, `:710`); the ORM space hook never sees raw SQL.
- Measured (`spacetest.py`): note created with `X-Workspace-ID: work`;
  `/search?q=zebracorn` with `X-Workspace-ID: personal` returned it, while
  `/entries/query`, `/graph`, `/timeline` and chat retrieval returned nothing.
  Callers without `space`: `spaces-find.js:1030` (finder, palette),
  `notes-list.js:2423`.
- Impact: titles and snippets cross spaces, including spaces marked
  `hidden_from_all`.
- Fix (S): default `space` from `session.info["workspace_id"]`; for "all",
  exclude `hidden_workspaces`; a two-space test.

**ARCH-04. Every unlock downloads the whole notebook (KNOWN H7 / F12, the
number is NEW)** PARTLY FIXED 73fcd97 (server cursor; client switch is FE-05)
- Measured (`bootnet.js`, Chromium, 5,000 notes): 55 API calls after unlock;
  **26 sequential `/entries?limit=200&offset=...` pages, 2,307 KB, 4,449 ms of
  request time**; `/entries/reference-counts` 1,060 ms; total 11.3 s of
  request time, 2.5 MB. `notes-list.js:3497-3530` loops until `X-Total-Count`
  into `allEntries`, by design ("it still ends up exactly as complete as it
  always was"). H7 says "The three request pages of /entries at boot are the
  paging contract": that was 500 notes.
- Impact: unlock cost and browser memory grow with the notebook for ever;
  offset paging over a list that changes during the load can skip or repeat a
  note.
- Fix (L): the list renders a window and asks the server (search, filters and
  counts are server-side already); keyset cursor (`created_at,id`) instead of
  offset.

**ARCH-05. "All spaces", the default, cannot use the list indexes (NEW)** FIXED 173ff35
- Evidence: `activeSpaceId()` defaults to `"all"` (`spaces-find.js:298`);
  with "all" the hook adds no `workspace_id = ?`, and every composite index in
  `database._INDEXES` leads with `workspace_id`. EXPLAIN on the real
  statements (`explain2.py`, `explain3.py`):
  - `/entries?limit=50`, "all": `SCAN entries USING INDEX
    ix_entries_live_nodraft` + **`USE TEMP B-TREE FOR ORDER BY`**; one space:
    `SEARCH entries USING INDEX ix_entries_live` (no sort).
  - `/documents`, `/reminders`, `/conversations`, `/media`, "all": `SCAN` +
    `TEMP B-TREE`; one space: index search.
  - Also full scans in any mode: `/library` `_activity` (`SCAN audit_log` +
    sort, loads the whole-note `payload` of 200 rows to print a verb),
    `learning.corrections` (`SCAN audit_log WHERE action = ?`, run by filing
    prompts, `/suggestions`, link suggestions), `count(*)` with
    `is_board = 0` (`SCAN entries`), `/tags` (`SCAN entries`, JSON parse per
    row).
- Impact: 31 ms per page at 5,000 notes, but the sort carries every column
  including `content`, 26 times per unlock (ARCH-04), and `audit_log` grows
  by a whole note per edit (9.7 MB of payload for 7.9 MB of notes after one
  create each).
- Fix (S): add the same indexes without the `workspace_id` prefix (or make
  "all" filter `workspace_id IN (visible)`), `ix_audit_log_action` and
  `ix_audit_log_created`, and select only needed columns in `_activity`.
  The perf pass of 2026-10-03 measured with a space selected, which is why it
  missed this.

**ARCH-06. Switching the chat backend turns semantic search off (NEW)** FIXED f83ec98
- Evidence: `deps.reload_llm_client` (`deps.py:260-273`), called by
  `POST /models/provider`, builds a new `EmbeddingService` with no warm-up,
  although the built-in sentence-transformers model never uses the chat
  client. Measured: after switching to an OpenAI-compatible server and back,
  `/models/status` said `embedding_ready: false` and `/search/stats`
  `vectors: 0, vectors_warm: false` **15 minutes later**; the next save took
  **5.1 s** (the cold load) and then `vectors: 5000`.
- Impact: search, chat retrieval, link suggestions and graph similarity drop
  to keyword-only with no notice, and the next save stalls.
- Fix (S): rebuild the embedding service only when the embedding backend is
  the chat backend (Ollama embeddings); otherwise keep it, or re-warm it.

**ARCH-07. The unified search only re-ranks keyword hits (NEW detail of
KNOWN `search-one-surface`)** FIXED 535ae2e
- Evidence: `engine.py:1058-1066`: candidates come only from the FTS pass;
  `if not rows: return []`. Measured: `/search?q=horticulture` 0 hits,
  `vegetable patch` 0, `gardn` 0. The vocabulary typo fix lives only in the
  older `search_manager` path.
- Impact: the finder and palette, which B3 was meant to unify, are
  keyword-only; "three signals" overstates recall.
- Fix (M): union FTS candidates with the matrix's top-k for the query vector
  when embeddings are ready; port the vocab correction into `_keyword_pass`.

**ARCH-08. I7's filing consumer is claimed built and not wired (WRONGLY
CLOSED)** FIXED f7aa175
- Evidence: `learning.centroid_excluded` (`learning.py:361`) and
  `learning.filing_evidence` (`:392`, 50 lines) have no caller in `src/`;
  `janitor.py` never imports `learning`. Only the model prompt gets corrections
  (`librarian.corrections_note`). WORLD_CLASS_PLAN I7 state line: "the loop is
  built (... the centroid exclusion ...)".
- Impact: with no model running (centroid and kNN file everything), re-filing
  by hand teaches nothing; the spec test passes because it calls the function
  directly.
- Fix (S): apply `centroid_excluded` in `_best_centroid_match` and
  `_knn_match`; a route-level test (two refiles away from X, then a save with
  no model is not filed to X).

**ARCH-09. Model calls have no shared gate; filing waits behind captions
(NEW)** FIXED 535ae2e
- Evidence: `core/jobs.py` lane `model` is width 1 and carries `caption`,
  `vision`, `vision-pdf` and `file-entry`; 20 other call sites call the
  provider directly (chat, `/chat/followups`, greeting, category and title
  naming, graph labels, reminder parser, night and agent passes).
- Impact: a local runner serves one request at a time, so a chat turn queues
  behind a vision page or a night-pass call with no feedback; a deferred
  filing (embedding and lexical work when no model runs) waits behind every
  queued caption: an import of 200 pictures leaves new notes "pending".
- Fix (M): one process-wide model gate with interactive priority (background
  yields between calls); `file-entry` on its own lane.

**ARCH-10. Import cycles are hidden from the lint, not removed (NEW)** PARTLY FIXED 535ae2e (ratchet lint at 15 and 3; cycles not cut)
- Evidence: 46 `importlib.import_module("memorymap...")` calls, commented as
  the way around the lint: "`importlib`, not an `import` statement: naming it
  here closes `core.database -> search.index -> core.database`"
  (`database.py:1941-1953`; also `embeddings.py:200`, `engine.py:1299`,
  `manager.py:1706`). `tests/test_no_import_cycles.py` counts statements and
  reports 0. With `import_module` edges (`cycles.py`): 3 cycle groups, the
  largest **15 modules** (`core.deps`, `core.events`, `core.extras`,
  `core.ocr`, `entry.manager`, `search.engine`, `search.search_manager`,
  `search.chunks`, `ai.embeddings`, `ai.provider`, `ai.ollama_client`,
  `ai.openai_client`, `ai.model_manager`, `ai.facts`, `ai.learning`); plus
  306 function-level imports.
- Impact: no real layering; load order and test doubles break at runtime.
- Fix (M): count `import_module("memorymap.` edges in the lint, ratchet the
  largest group down, invert edges with registries (as
  `jobstore.set_forget` does).

### Medium

**ARCH-11. Whole-notebook loads on routine endpoints (NEW)** PARTLY FIXED 38debe1 (`/suggestions`; pairs capped per note in 535ae2e)
- 5,000 notes, p50/p95: `/suggestions` **1,234 / 2,377 ms** returning an
  empty list: `routes_inbox._visible` loads every note as a full ORM object to
  test membership (py-spy: 27% in that comprehension). `/library` 703 / 1,112
  ms. `/timeline` 528 / 974 ms, 336 KB. `/insights/stats` 313 ms in 3
  statements. `/entries/{id}/backlinks` 271 ms (LIKE scan of every note).
  `/entries/reference-counts` (60 ids) 645 ms in-process, 1,060 ms at boot.
- `/entries/link-suggestions` with embeddings ready did not finish in several
  minutes in-process (stuck in `relations.recognise`): `cached_similar_pairs`
  has no cap, and on this synthetic text 90% of pairs pass the 0.55 threshold
  (median bge cosine 0.885). A real notebook is more varied; nothing bounds
  the output. `/duplicates` took **86.7 s and returned 8.2 MB** (one call, live server;
  PPJoin's prefix filter degenerates on a small vocabulary, and the response
  is uncapped). Both with that caveat.
- Fix (S each): ids-only `_visible`; top-k per note in `similar_pairs`.

**ARCH-12. 422 has its own error shape and echoes input (NEW)** FIXED 73fcd97
- No `RequestValidationError` handler. Measured: `POST /entries
  {"tags":"x"}` gives `{"detail":[{type, loc, msg, input}]}`, no `code`;
  `POST /auth/unlock {"password":["hunter2-secret"]}` echoes the password.
  `test_core_message_wording.py` and `test_server_detail_wording.py` read
  `HTTPException` literals only, so they cannot see it.
- Fix (S): one handler returning `{"detail", "code": "invalid", "fields"}`,
  never `input`.

**ARCH-13. The API contract is mostly untyped (KNOWN B7, larger than
stated)**
- 403 routes: 259 return a bare `dict`, 33 have no annotation or model.
  Creates disagree: `POST /entries` 201; `/entries/{id}/links`, `/spaces`,
  `/whiteboard/nodes`, `/whiteboard/sketches` 200. DELETE: 30 answer 200 with
  a body, 2 answer 204. Paging params: `limit` 36, `offset` 18, `page` 6,
  `cursor` 1 (`/timeline` has an unused `_encode_cursor`,
  `routes_timeline.py:79`). `test_list_endpoints_page.py` keys on the name
  `list_*`, so it misses `/graph` (2.4 MB), `/suggestions`,
  `/entries/link-suggestions`, `/documents/outline`, `/entries/query`.
- Fix (M): response models for the 20 busiest routes; one paging helper; the
  lint keyed on "returns a list, or a dict holding one".

**ARCH-14. `/graph` is 1.4 s and 2.4 MB at 5,000 notes (KNOWN H7, worse)** PARTLY FIXED 73fcd97, d5754d4 (encoded off the loop; warm 3.3-4.1 s to 0.7-1.0 s in process; the payload cache left, GRAPH_PLAN "Still open")
- p50 1,444 ms, p95 3,508 ms in-process; 667 ms and 234 KB gzipped in the
  browser. The plan recorded 600 ms. FastAPI serialises a sync route's dict on
  the event loop thread (py-spy: `serialize_response` under gzip), so a big
  payload stalls every other request while it encodes.
- Fix: the fingerprint-keyed payload cache the plan names; build the JSON
  bytes in the worker thread.

**ARCH-15. Token budgeting assumes 4 characters per token (NEW, read)** FIXED 535ae2e
- `ai/context.py:40` `CHARS_PER_TOKEN = 4` sets every share, and `num_ctx`
  comes from the same window. CJK text is about 1 char per token, code about
  3. A CJK notebook overfills the window up to 4x; Ollama then truncates from
  the front, dropping the system prompt and grounding rule first.
- Fix (S): per-script estimate (CJK code points count 1); shrink the next
  turn when the backend's `prompt_eval_count` exceeds the plan.

**ARCH-16. A second model call after every answer, always on (NEW)** PARTLY FIXED 535ae2e (skipped while a turn streams; no preference)
- `capture-ask.js:2220`, `chat-attach.js:2744` call `/chat/followups` after
  each answer; no preference gates it. With one slot, the next question waits.
- Fix (S): off by default on CPU-only machines (the hardware probe exists), or
  emit follow-ups from the answer stream.

**ARCH-17. Connect timeout is 600 s, no connection reuse (NEW, read)** FIXED 535ae2e
- `ollama_client.py:153`, `openai_client.py:117`: one float, which `requests`
  applies to connect too; each call opens a new connection.
- Impact: a LAN model host that is off and drops packets hangs a chat turn,
  a filing job or a night-pass step for ten minutes each.
- Fix (S): `timeout=(5, 600)` and one `requests.Session` per client.

**ARCH-18. `/export/backup` is not a backup (NEW)** FIXED 73fcd97
- `routes_settings.py:1993-2021` zips the live WAL-mode file with
  `zf.write` (no WAL, no backup API) and `media/` but not `uploads/`.
  Measured: 3 notes saved, zip taken: **5,000 entries in the zip, 5,003
  live, 0 of 3 probes**; `integrity_check` ok, so silent. Nothing in the UI
  calls it (only a test), which is why this is Medium. The daily backups
  (`core/backup.py`) are database-only: attachments, media and preferences are
  in no automatic backup (read).
- Fix (S): build the zip from `backup.backup_now`, add `uploads/`, or delete
  the route.

**ARCH-19. Startup does maintenance before the port opens (NEW)** FIXED 73fcd97
- `create_app` runs the bin purge, event-log compaction and the daily backup
  synchronously (`app.py:791-821`), after `create_all`, column and index
  checks, the FTS check and Alembic (`database.py:1920-1934`). Measured: 4.45 s
  from launch to first byte at 5,000 notes; `create_app` 1.4 to 5.5 s
  in-process. The day's first launch copies the whole database before
  serving.
- Fix (S): enqueue purge, compaction and backup after startup.

**ARCH-20. Lexical filing reads private notes' ciphertext (NEW)** FIXED f7aa175
- `lexical_filing.suggest_tags` and `_tally` have no `is_private` filter
  (`lexical_filing.py:186`); `janitor._knn_match` has one (`janitor.py:347`).
  Ciphertext tokens enter every save's TF-IDF, and private notes' tags vote.
- Fix (S): add the filter.

### Low

**ARCH-21. Test scaffolding ships in production modules (NEW)**
- `core/events.py:858-1004` (`_drive_*`, `exercise_for_test`, 150 lines),
  `skill_runner.run_for_test` (99), `librarian.filing_prompt_for_test`. 17
  functions (306 lines) are referenced only from `tests/`; 2 are dead
  (`routes_timeline._encode_cursor`, `engine.similar_to_vector`).

**ARCH-22. Oversized functions after the A5 split (KNOWN section 16,
regressed)**
- `agent._dispatch_call` 448 lines, `run_agent` 439,
  `skill_runner._run_one_step` 425, `create_app` 336,
  `routes_chat._stream_lines` 334; 24 functions over 150 lines.

**ARCH-23. Offline-queue idempotency is a racy in-memory dict (KNOWN INBOX
434 for restarts; the race is NEW)** FIXED 73fcd97
- `routes_entries.py:560-579`: check, create, remember; two concurrent resends
  with one `client_key` both create. A unique `client_key` column fixes both.

**ARCH-24. Library activity ignores the query and the space (NEW)** FIXED 73fcd97
- `/library?q=zebracorn` in "personal" returned 200 activity rows from every
  space (`_activity` takes no `q`; `audit_log` has no space).

**ARCH-25. Small costs worth one line each (NEW)** PARTLY FIXED 73fcd97 (/changelog off the loop; pool and restore not done)
- `/changelog` 132 ms p50 per call (parsed per request).
- `QueuePool` 5 + 10 with a 30 s timeout; a chat stream holds its session's
  connection for the whole stream (read).
- `restore_backup` deletes `-wal`/`-shm` after `engine.dispose()`, which does
  not close connections checked out by other threads (read, not reproduced).

## 4. Claimed built but not

| Claim | Where | What is true |
| --- | --- | --- |
| "the loop is built (... the centroid exclusion ...)" | WORLD_CLASS_PLAN I7 | `centroid_excluded`, `filing_evidence` have no caller (ARCH-08). |
| "One error shape (exists)" | WORLD_CLASS_PLAN B7 | 422 has another shape, no `code` (ARCH-12). |
| "one index, three signals" | B3, HISTORY | cosine only re-ranks keyword hits; `/search` has no typo fix (ARCH-07). |
| six composite indexes, "measured" | `database._INDEXES`, H7 pass | they serve one selected space; the default "All spaces" sorts (ARCH-05). |
| "The three request pages of /entries at boot are the paging contract" | H7 | 26 pages, the whole notebook, at 5,000 notes (ARCH-04). |
| no import cycles (`test_no_import_cycles.py`) | CLAUDE.md, comments | a 15-module cycle through `import_module` (ARCH-10). |
| "every list takes a `limit`" | F2 state | only functions named `list_*` (ARCH-13). |
| "the split is done (audit A5)" | section 16 | `_dispatch_call` is 448 lines (ARCH-22). |
| "Both [Ollama and embedding] already run off the request thread" | ARCHITECTURE.md, "One process" | a non-deferred save and every edit embed on the request (ARCH-02). |

## 5. Verified working

- **Stream cancel**: a client dropping `/chat/stream` after 3 s stopped the
  agent after the round in flight (fake server: 1 request; a connected client
  ran 4 rounds, 5 requests).
- **Concurrent saves**: 779 creates from 4 clients, 0 errors.
- **Durable jobs**: resume skips live leases and gives up after
  `MAX_ATTEMPTS` (read).
- **Tool-call parsing**: `normalise_tool_calls` takes string or object
  arguments, lenient JSON, and reports invalid arguments to the loop (read).
- **A selected space**: list queries are index searches (ARCH-05's other half).

## 6. Measurements (5,000 notes, in-process `TestClient`, 7 to 9 runs, load 10 to 19)

| Endpoint | p50 ms | p95 ms | statements | KB |
| --- | --- | --- | --- | --- |
| `GET /entries?limit=50` | 92 | 477 | 9 | 113 |
| `GET /entries?limit=50&offset=2500` | 72 | 165 | 9 | 130 |
| `GET /entries/count` | 14 | 182 | 1 | 0 |
| `GET /categories` | 38 | 65 | 2 | 0.5 |
| `GET /tags` | 20 | 32 | 2 | 0.9 |
| `GET /search?q=garden` | 112 | 236 | 3 | 7.7 |
| `GET /search?q=garden budget travel` | 108 | 312 | 3 | 7.8 |
| `GET /search?q=what did I plan for the garden budget` | 55 | 256 | 3 | 7.9 |
| `GET /search?q=gardn` (0 hits) | 20 | 106 | 5 | 0.1 |
| `GET /graph` | 1,444 | 3,508 | 11 | 2,437 |
| `GET /graph/structure` | 59 | 628 | 4 | 50 |
| `GET /graph/local/{id}` | 150 | 962 | 10 | 1.0 |
| `GET /library` | 703 | 1,112 | 16 | 184 |
| `GET /timeline` | 528 | 974 | 12 | 336 |
| `GET /insights/stats` | 313 | 519 | 3 | 0.4 |
| `GET /insights/heatmap` | 206 | 1,680 | 1 | 0.8 |
| `GET /insights/tag-cloud` | 121 | 272 | 2 | 1.7 |
| `GET /suggestions` | 1,234 | 2,377 | 14 | 0.0 |
| `GET /resurface` | 49 | 82 | 7 | 1.2 |
| `GET /whiteboard/boards` | 49 | 415 | 23 | 1.0 |
| `GET /entries/{id}` | 22 | 35 | 14 | 1.8 |
| `GET /entries/{id}/connections` | 67 | 101 | 11 | 0.3 |
| `GET /entries/{id}/backlinks` | 271 | 315 | 8 | 0.2 |
| `GET /entries/reference-counts` (60 ids) | 645 | 772 | 5 | 1.4 |
| `POST /chat/stream`, no model, to `meta` | 194 | 291 | n/a | |
| `POST /entries`, 400 words | 1,706 | 2,092 | 40 | |
| `POST /entries`, one line | 930 | 1,474 | 39 | |
| `POST /entries`, `defer_filing` | 87 | 96 | 25 | |
| `PUT /entries/{id}` | 744 | 1,117 | 49 | |
| `/entries/link-suggestions` (embeddings ready) | did not finish in minutes | | | |
| `/entries/link-suggestions` (embeddings not ready, live) | 828 (one call) | | | 2.6 |
| `/duplicates` (live, one call) | 86,654 | | | 8,166 |

Fast and fine (p50 under 25 ms): `/entries/most-accessed`, `/entries/daily`,
`/questions/summary`, `/night/latest`, `/reminders`, `/documents`, `/media`,
`/conversations`, `/entities`, `/events`, `/tasks`, `/jobs`, `/models/status`,
`/entries/{id}/history`, `/audit`. Browser boot (Chromium, 5,000 notes): 55
calls after unlock, 11.3 s summed, 2.5 MB; Graph tab `/graph` 667 ms; Timeline
220 ms; Library 404 ms. Startup to first byte 4.45 s. Statement counts include
the embedding back-fill thread where it was running.

## 7. Top 5 execution briefs

### Brief A: no model call inside a write transaction (ARCH-01)
- Goal: a save during a night pass, an entity pass or any background model
  work returns 201 in under a second.
- Files: `src/memorymap/ai/facts.py` (`run`, `_pair_passes`, `_narrow`,
  `_judge`), `src/memorymap/ai/entities.py` (`extract_entities_pass`),
  `src/memorymap/api/routes_night.py`, `src/memorymap/ai/autonomous.py:405`,
  `src/memorymap/api/app.py` (error handler).
- Steps: 1) test first: `tests/test_write_lock_during_passes.py` starts a
  fake provider whose `chat` sleeps 2 s and runs `facts.run` on a thread, then
  `POST /entries` must be 201 within 1 s (the `locktest.py` shape; use the
  in-process fake, not a socket). 2) commit the `NightRun` row before the
  loop; collect each note's candidates, call the model with no pending writes
  (`session.commit()` or a read-only session), then add rows and commit per
  note. 3) the same for `_pair_passes` and `extract_entities_pass`. 4) a
  handler: `OperationalError` "database is locked" -> 503, code `busy`, a
  plain sentence. 5) a static ratchet: no provider `.chat(` call between a
  `session.add/flush` and the next `commit` in `ai/` (AST walk; allowlist
  with reasons).
- Acceptance: the new test; `tests/test_learned_spec.py`,
  `tests/test_night_runs.py`, `tests/test_night_pairs.py`,
  `tests/test_entities.py` green.
- Risks: a run killed mid-way now leaves part of its facts (fine: facts are
  keyed by fingerprint and the next run skips them); `NightRun.finished_at`
  must be set in a `finally`.

### Brief B: the save path is O(1) in the notebook (ARCH-02, ARCH-08, ARCH-20)
- Goal: `POST /entries` p50 at 5,000 notes within 20% of p50 at 500; I7's
  centroid exclusion actually applied.
- Files: `src/memorymap/ai/lexical_filing.py` (`suggest_tags`, `_tally`),
  `src/memorymap/ai/janitor.py` (`_best_centroid_match`, `_knn_match`,
  `categorise`), `src/memorymap/ai/embeddings.py` (`embed_text`,
  `store_for_entry`), `src/memorymap/api/routes_entries.py` (`create_entry`,
  `update_entry`, `_keep_suggestions`), `src/memorymap/search/engine.py`
  (matrix cache).
- Steps: 1) a timing test at 200 and 2,000 notes (direct inserts, fake
  embedder) asserting the ratio, plus a statement-count cap. 2) centroids from
  the engine's matrix, cached per matrix version, minus
  `learning.centroid_excluded` categories. 3) tag suggestions from the top-k
  vector neighbours' tags (already ranked), falling back to an incremental
  term->tag table only with no embedder; filter `is_private`. 4) embed once
  per save: `categorise` returns the vector, `store_for_entry` accepts it.
  5) `PUT` embeds through the deferred job unless the text is unchanged.
- Acceptance: the timing test; `tests/test_janitor_knn.py`,
  `tests/test_learned_spec.py`, `tests/test_lexical_filing.py`; a route test that
  two refiles away from X keep a no-model save out of X.
- Risks: tag suggestion quality changes; keep the old function for the
  no-embedder path and compare on the fixture.

### Brief C: spaces are honoured by search and served by indexes (ARCH-03, ARCH-05, ARCH-24)
- Goal: no endpoint returns another space's rows; "All spaces" lists are index
  scans.
- Files: `src/memorymap/api/routes_search.py`, `src/memorymap/search/engine.py`
  (`search`, `_candidates`, `_keyword_pass`), `src/memorymap/core/deps.py`
  (`get_session`), `src/memorymap/core/database.py` (`_INDEXES`),
  `src/memorymap/api/routes_library.py` (`_activity`).
- Steps: 1) test: two spaces, one note each, every GET route that returns
  notes called with each header; nothing crosses (start with `/search`,
  `/library`, `/graph`, `/timeline`, `/entries/query`). 2) `/search` defaults
  `space` from the session, "all" excludes `hidden_workspaces`. 3) indexes
  without the `workspace_id` prefix for the live, bin, archive, documents,
  reminders, conversations and media lists, plus `audit_log (action)` and
  `audit_log (created_at DESC, id DESC)`; an EXPLAIN test per list under
  both headers asserting no `TEMP B-TREE FOR ORDER BY`. 4) `_activity` selects
  four columns and honours `q`.
- Acceptance: the two new tests; `tests/test_spaces.py`,
  `tests/test_search_engine_spec.py`.
- Risks: write cost of 8 more indexes (measure a 1,000-note import before and
  after).

### Brief D: unlock does not download the notebook (ARCH-04, ARCH-13's paging)
- Goal: unlock to settled under 1.5 s at 5,000 notes, at most 3 `/entries`
  calls; memory flat in notebook size.
- Files: `frontend/js/notes-list.js` (`loadEntries` loop at 3497, `allEntries`
  readers), `src/memorymap/api/routes_entries.py` (`list_entries` paging),
  `src/memorymap/entry/manager.py` (`list_entries`), every `allEntries`
  consumer (`grep -n allEntries frontend/js/*.js`).
- Steps: 1) inventory `allEntries` readers (sidebar counts, tag suggestions,
  keyboard nav, search) and give each a server answer (counts exist:
  `/entries/count`, `/categories`, `/tags`). 2) keyset cursor
  `?after=<created_at,id>` with `next_cursor`. 3) the list virtualises and
  fetches pages on scroll. 4) `scratchpad/ui-sweeps/boottime.js` before and
  after on a 5,000-note dir.
- Acceptance: boot sweep numbers in CHANGELOG; `tests/test_list_limits.py`,
  `tests/test_list_paging_f2.py`; a new test that the boot path makes at most
  3 `/entries` calls (sweep).
- Risks: many features assume the whole notebook client-side; do it reader by
  reader, one commit each (Opus, design judgement).

### Brief E: one model gate, priorities, sane timeouts, no silent embedder loss (ARCH-06, ARCH-09, ARCH-16, ARCH-17)
- Goal: an interactive model call never waits behind background work for more
  than the call in flight; switching chat backend keeps semantic search.
- Files: `src/memorymap/ai/provider.py`, `ollama_client.py`,
  `openai_client.py`, `src/memorymap/core/jobs.py` (`KIND_LANES`),
  `src/memorymap/core/deps.py` (`reload_llm_client`), `frontend/js/capture-ask.js`
  and `chat-attach.js` (follow-ups).
- Steps: 1) test: `reload_llm_client` with the built-in embedder keeps
  `is_ready()` true. 2) a `ModelGate` (a condition with two queues) wrapped
  around `chat`, `chat_stream`, `chat_tools_stream` by priority from a context
  variable (`interactive` set in the chat routes; background by default).
  3) `file-entry` to its own lane. 4) `timeout=(5, read)` and a
  `requests.Session` per client. 5) follow-ups behind a preference, off when
  the hardware probe says CPU-only.
- Acceptance: a gate test with two fake slow calls; `tests/test_providers.py`,
  `tests/test_jobs_pool.py`, `tests/test_jobstore.py`.
- Risks: a gate that deadlocks a tool call which itself calls the model
  (agent inside a skill): make it re-entrant per thread.

## 8. What I could not verify

- Real inference: every model number used the fake OpenAI server. ARCH-15's
  overflow and ARCH-09's queueing on a real Ollama were reasoned, not seen.
- `restore_backup` with background sessions open (ARCH-25): read only.
- Absolute latencies: load 10 to 19 on 4 cores throughout.
- Link suggestions and duplicates on 5,000 natural notes: the synthetic
  vocabulary exaggerates both.
- What the composer does with a 5 s 500 on save (ARCH-01): for the UX audit.
- The plan's 2026-10-03 numbers (`reference-counts` 388 ms at 5,000) could
  not be compared like for like; mine are 645 ms in-process and 1,060 ms at
  boot under load.
