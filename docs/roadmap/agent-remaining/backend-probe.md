# The audit's backend rows, 2026-09-13 night (A3 to A9)

Brief: WORLD_CLASS_PLAN "Audit, 2026-09-13 night", rows A3, A4, A5, A6, A9 in
that order. One commit per row (A5 one per function), `gate.sh --changed` after
each, tests first.

| Row | State | Commit |
| --- | --- | --- |
| A3 bounded job pool | done | `8b9da9e` |
| A4 small-model agent | done | (this commit) |
| A5 five functions split | next: `run_agent` first | |
| A6 nine silent excepts | not started | |
| A9 CI skips | not started | |

# The backend refinement pass, 2026-09-13 evening

The owner's order was "refine the backend", worked as the list in the brief:
the strict-xfail specs first, then WORLD_CLASS_PLAN's flaw classes, the
security review's open rows, D6, and the performance probes.

## Landed

| What | Measured | Commit |
| --- | --- | --- |
| The derived facts pipeline: I9's whole backend and I1's first pass | `tests/test_learned_spec.py` from 9 strict-xfail markers to 0, 14 of 14 green; 11 more in `tests/test_derived_facts.py` | `50398cb`, `7e29d6f` |
| The `facts`/`learning` import cycle the lint caught | `tests/test_no_import_cycles.py` red then green; the export that needs both moved to the route | `7467ff2` |
| F2: four lists that returned the whole notebook | 14 `list_*` routes took no limit, 4 of them notebook-sized; `tests/test_list_limits.py` walks the routes and fails on the fifth | `12e1ea6` |
| S5: one definition of an address this app must not fetch | `core.security.public_addresses`, websearch delegating, and a walk of `src/` that fails on an unreviewed fetcher | `5aab24c` |
| D6's backend | `POST /entries/daily/{date}` creates or returns (the GET reads and 404s); `GET /entries/daily` gives the strip its days and the streak | `766c0ba`, `548ae77` |
| The list-query probe | 13 endpoints driven at a page of 5 and of 100 over 121 notes: **none grow**. Three pinned in `test_scale_query_counts.py` | `9da2cdf` |
| The flaw classes re-run | 147 broad handlers, **52 silent** (`scratchpad/probe_excepts.py`); the grep in the plan could not tell them apart | `7aa54fd` |
| An N+1 in this session's own night pass | 9 statements over 5 notes and 44 over 45 before; flat after | `cd83f11` |

Verified against a running server on 8796 (`/tmp/mm-back`), not only tests:
two POSTs to `/entries/daily/2026-09-13` both return id 1, the window reports
`streak: 1`, the night pass derived 2 facts in 8 tokens with the span
`[34, 55]` pointing at "Should we move to 64?", and PATCH, a forced re-run
(derived 0), reset and export all behaved. **The auth header is
`X-Auth-Token`, not `Authorization`**, which cost ten minutes here and is
written down so it costs nobody else any.

## Running log (append only, newest last)

- done `50398cb`, `7e29d6f`, `7467ff2`: the derived facts pipeline, its docs, and the facts/learning import cycle the lint caught. next: WORLD_CLASS F2, the list limits (`tests/test_list_limits.py` new, four routes paged, uncommitted).
- done: WORLD_CLASS F2, four unbounded lists bounded and the route-walking lint added. next: F4 (102 broad excepts), F7 (17 modules with threads), F10 (the three reading columns).
- done: S5, the private-address guard moved to `core/security.public_addresses` with the outbound-fetch lint. next: item 4, D6 daily notes (`agent-remaining/chat-timeline-skills.md` item 8), then item 5, the perf probes.
- done: D6's backend, `/entries/daily/{date}` create-or-return and `/entries/daily` for the strip and the streak. next: item 5, the perf probe and any N+1 or per-page full count it finds.
- done: the list-query probe (`scratchpad/probe_list_queries.py`), 13 endpoints flat at 121 notes, three pinned in `test_scale_query_counts.py`. next: F4/F7/F10 measured and left to the mechanical agent; the full suite before the final report.
- done: the flaw classes re-run and recorded, `scratchpad/probe_excepts.py` added (147 broad, 52 silent). next: nothing queued; the full suite is running before the final report.
- done: D6's writing half moved from GET to POST; the GET is read-only and 404s, because a GET that makes a row sits outside the method-judging CSRF defence. next: the full suite, then the report.
- verified against a running server on 8796 (`/tmp/mm-back`), not only tests: POST /entries/daily twice returns id 1 both times; the window reports streak 1; the night pass derived 2 facts in 8 tokens; PATCH, force re-run (derived 0), reset and export all behaved. The auth header is `X-Auth-Token`, not `Authorization`.
- done: an N+1 in my own night pass, found by reading the loop after the list endpoints came back clean. 9 statements over 5 notes and 44 over 45 before, flat after (`test_the_night_pass_does_not_cost_a_query_per_note`). next: the full suite, then the report.

## Left for the next session, and what is not verified

**Next, in order.**

1. **The Settings section for I9** (frontend, not this agent's files). The
   backend it sits on is complete and the shapes are in
   `agent-remaining/learning-loop.md`: `GET /learned?kind=&q=&limit=&offset=`
   returns `{items, total}` with `X-Total-Count`, every row carries `span` as
   `[start, end]` into `entries.content`, so "open the note scrolled to the
   sentence" needs no further backend work.
2. **D6's frontend.** `startTodaysNote` in `frontend/app.js` still posts a new
   note to `/entries`; pointing it at `POST /entries/daily/${key}` fixes the
   duplicate it makes today and is the whole of the next step. Then Ctrl+D,
   then the strip, then yesterday/tomorrow.
3. **F2's frontend half**, placed in WORLD_CLASS's "Placed from INBOX,
   2026-09-13": five `apiJson` readers of `/files/gallery` move to
   `apiPagedList`, then `GALLERY_PAGE_SIZE` drops to 200.
4. **F4**, the 52 silent broad handlers, with the mechanical agent whose remit
   ruff is.
5. **F3, F7, F10** are each their own brief in the plan and were not started.

**Not verified.**

- **No real model has run the night pass.** What a small local model keeps
  when asked to narrow a candidate list is untested, which is CLAUDE.md
  section 4's standing caveat. The pass is built so a reply it cannot parse
  keeps the local candidates rather than emptying the table, and that is the
  path the fake transport exercises; the other one has never run.
- **No completed full-suite run exists on this head.** One was run to its
  short summary and reported exactly one failure,
  `test_like_escaping.py::test_every_like_call_site_escapes_or_is_a_literal_pattern`,
  against the journal's `LIKE` pattern; that cause is fixed at `73d14ef` and
  the file passes on its own, but the run was cut off before its count line
  and a second was not affordable. `scripts/gate.sh --changed` is green
  (lints, node-check, ruff, and the three tests that name the changed files),
  and every test file this session added or touched was run: 62 green across
  `test_derived_facts`, `test_learned_spec`, `test_daily_journal`,
  `test_list_limits`, `test_list_paging_f2`, `test_outbound_fetch_guard`,
  `test_scale_query_counts`, `test_every_route_is_locked` and
  `test_no_import_cycles`. **CI on the next push is what closes this.**
- **`gate.sh --staged` does not run `test_like_escaping.py`.** It is not in
  the lint set, which is why eleven green staged gates did not see the one
  thing the suite found. Worth knowing before trusting a staged gate on a
  change that writes SQL.
- Nothing here was measured past 121 notes. The night pass is O(notes) with
  one query for the whole known set, which is the shape that scales; the
  constant was not measured on a real notebook.

## The security review's open rows, checked before building (section 12)

- **S5, the outbound guard: done** (`5aab24c`), above.
- **S2, per-client unlock throttling: checked and deliberately not built.**
  `routes_auth.py` already carries the opposite decision in writing, at the
  top of the throttle: "One global bucket, not per-IP: there is a single user
  to protect, and per-IP buckets are exactly what a botnet has plenty of."
  Standing order 3 says a decision is not remade, and the plan's own fix is
  conditional on a bind that is not loopback, which does not exist yet. This
  belongs to Brief 15 with `tests/test_lan_mode.py`, where it can be asserted
  rather than assumed.
- **S1 (the token in `?token=`) and S3 (`import_directory` reading a path
  from the body): checked, not built, same reason.** S3's fix is "refuse when
  the bind is not loopback"; there is no non-loopback bind to refuse under.
  S1's is a media-scoped token or an HttpOnly cookie, and `mediaSrc` in
  `app.js` is half of it, which is not this agent's file.
- **The route lock walk: re-confirmed.** `tests/test_every_route_is_locked.py`
  passes with the two new routers (`/learned`'s I9 half and `/night`) in it,
  which is the point of walking rather than naming.
- **Input limits on everything added here: driven, not assumed.** The budget
  (1 to 1,000,000), every page (1 to its own maximum), the offset, the
  corrected text (1 to 2,000 characters) and the journal window (1 to 366
  days) are caps declared on the route, and
  `test_every_number_this_pipeline_takes_is_bounded` plus
  `test_the_window_is_bounded` drive each boundary from both sides, because a
  declared cap nobody drives is a cap nobody knows is spelled right.

## The flaw classes, re-run 2026-09-13 evening (WORLD_CLASS section 10)

Every backend row's command run against the tree. The frontend rows (F1, F5,
F8, F11, F12) are not this agent's files and were not touched.

| # | Command's answer today | State |
| --- | --- | --- |
| F2 | 14 `list_*` routes took no limit; 4 of them were notebook-sized | **Fixed.** `tests/test_list_limits.py` walks the routes and fails on the fifth; the other 10 are in an allowlist with the bound named per line. The frontend half (five `apiJson` readers of `/files/gallery`) is placed in WORLD_CLASS's "Placed from INBOX, 2026-09-13" |
| F3 | `semantic_search` still reads and parses every vector row per request | Open, sized in the plan, deliberately its own brief |
| F4 | 147 broad `except` in `src/memorymap`, **52 of which say nothing at all** (`scratchpad/probe_excepts.py`, new: the grep in the plan counts every handler, and the ones that cost something are the silent subset) | Open, and **left to the mechanical agent on purpose**: the plan's fix is ruff `BLE001` plus a `# noqa` per site, which is that agent's remit this session, and 52 sites across 30 files is exactly the sweep two writers must not both make |
| F6 | The timers are done; the `scheduler` it proposes is a refactor | Open, unchanged |
| F7 | 17 modules import `threading.Thread` | Open. The fix is B2's job runtime, not a sweep |
| F9 | The route walk exists and passes, with the two new routers in it | Done, re-confirmed |
| F10 | 175 lines in `routes_files.py` mention `ocr_text`, `caption` or `vision_ocr_text` | Open. The fix is B3's one `readings` table |

Performance, which the list above does not cover:
`scratchpad/probe_list_queries.py` (new) drives thirteen list endpoints at a
page of 5 and a page of 100 over one notebook of 121 notes with 40
attachments and reports whether the statement count moves. **None do.**
`/entries` is 9 statements at either size (15.7 ms at 100),
`/timeline` 13 (17.4 ms), `/files/gallery` 5 (13.9 ms), `/learned` 3,
`/entries/daily` 2 over a 366-day window. The three newest and most joined
are pinned in `tests/test_scale_query_counts.py`.

## The specs, read

`test_events.py`, `test_search_engine_spec.py`, `test_harness_verifier_spec.py`
and `test_resurface_spec.py` have **no markers left**: all four were finished
by Briefs 7, 11, 13 and 23, and their headers still say "strict-xfail until
built" because the sentence was never updated. Only `test_learned_spec.py`
still had any, nine of them, every one naming I9, and they are now gone.

## Decisions filed and taken

- INBOX 194 (resolved in the same pass): the I9 switches default **on**, and
  "off by default" stays where it has always lived, `autonomous_tasks_enabled`.
  Reason in `ai/facts.SWITCHES` and in HISTORY.
## 2026-09-13 evening, hygiene

Mechanical hygiene pass (schemas.py, ruff/CodeQL-shaped read, import
warnings, doc lints). Worktree had fallen behind the branch tip (stale
CLAUDE.md/docs layout, no scripts/gate.sh) — merged
`origin/claude/epic-ramanujan-8xocc0` first (commit `65e31e2`), one
conflict in schemas.py's import line, resolved by keeping both names.

**Fixed:** `SpaceResponse.Config` (class-based) -> `model_config =
ConfigDict(...)`, the only Pydantic V1-style config left (checked all 43
`BaseModel` files). `pytest tests/test_api*.py tests/test_whiteboard.py
tests/test_spaces.py tests/test_space_delete_cascades.py -W
error::pydantic.warnings.PydanticDeprecatedSince20`: clean.

**Checked clean, no fix needed:** `ruff check .` (0); CodeQL-shaped read of
unclosed `open()` (one found, `searxng_process.py:151`, already closed in
a `finally`), lazy `.*?` over paths/argv (none — the six hits are all over
HTML/markdown text, not paths), case-sensitive tag filters (all lowercase
consistently), XML parsers (the two stdlib `ElementTree` uses in
routes_whiteboard.py only serialize/export, never parse; parsing uses
defusedxml already), `shell=True` (none), bare/silent `except: pass`
(none — every `except Exception` carries a `# noqa: BLE001` with a
rationale comment); `python -W error -c "from memorymap.api.app import
create_app; create_app()"` (clean); `test_readme_freshness.py`,
`test_docs_layout.py`, `test_plan_hygiene.py`, `test_no_em_dashes.py`,
`test_css_braces.py`, `test_asset_cache_busting.py` (all pass already).

**Not verified:** wrong-keyword-argument sweep was spot-checked via ruff
(F-codes) and import-time exercise only, not a full call-site audit of
every function signature.

**Next:** nothing left from this brief. `gate.sh --staged` passes.

---

# The backend hole-poking pass, 2026-09-12 evening

What the orchestrator probed while agents worked the surfaces, what it
found, and, just as usefully, what came back clean. Written so the next
session spends its probes somewhere new.

## Found and fixed

| What | Measured | Commit |
| --- | --- | --- |
| `GET /entries` was an N+1 | 32 statements at 25 notes, 107 at 100; one attachments SELECT per note. 67 to 8 on a 60-note page | notes list attachments |
| Five missing indexes | `entry_links` had none on either of its two columns, the link table of a linked-notes app: SCAN from either end on 2,000 notes with 6,000 links. `whiteboard_objects.board_id` SCAN, 34.38 ms for one board of 3,000. `conversations` and `reminders` sorted their whole table per load | index the link table |
| `_related_elsewhere` ran 3 queries per word | 18 round trips for a six-word question, each an unindexable `ILIKE '%word%'` over the two widest text columns. 145.3 to 118.8 ms; 109.8 to 85.3 when nothing matches | three scans not three per word |
| Three unbounded list endpoints | `/documents` 116.7 KB, `/reminders` 52.5 KB, `/media` 117.6 KB at 300 rows | INBOX 117, agent |
| Nine first-page-only readers | `apiPagedList` returns 260 of 260 where a plain read returns 200 | read to the end |
| `_list_reminders` gave the model every reminder | Everything a tool returns is spent from the context window | a page not the table |
| A concurrent capture lost notes | Six writers, twelve notes each: **5 of 72 saves died** on a category race; 0 after | category race |
| `store_for_entry` was a bare insert | Second call for one note raised `UNIQUE constraint failed` | idempotent vector |
| **Three of four parents could not be deleted** | A document with a note attached, a note with a saved link, a bookmark attached to either: FOREIGN KEY constraint failed, 500, the thing still there | three delete commits |
| The guard that should have caught the last one | `test_a_note_with_every_kind_of_attached_row...` builds rows **by hand**; written when 7 tables pointed at an entry, there are 10 | schema-driven check |

## Probed and clean, so do not spend a session here again

- **Auth surface.** With a password set, exactly two routes answer without a
  token: `/changelog` and `/health`. Both are meant to.
- **Error contract.** Every parameterised route driven with a non-existent
  id, a non-numeric id and an empty body: **0 endpoints returned 5xx or
  raised**.
- **Path traversal.** Seven encodings of `../../../../etc/passwd` and its
  Windows twin against `/media`, `/media/meta`, `/media/text` and
  `/media/pdf-info`: nothing escaped, nothing 5xx'd.
- **Private notes.** Twelve read endpoints with the vault locked return no
  plaintext, retrieval does not carry one into the model's context, and the
  text is in none of `entries.content`, `search_index.body` or
  `entries_fts.content`. Now pinned by a test, which carries the trap that
  produced a false alarm: `/search` echoes the query back, so grepping its
  response for the secret word finds it every time.
- **Search cost.** 4 statements at every size; 8.4 ms at 200 notes, 10.5 at
  1,000, 14.2 at 3,000, against the plan's 200 ms target.
- **Capture cost.** 16 statements and 9.0 ms at 1,206 notes, the same as at
  56. The app does not get worse at the one thing it is for.
- **Backup and restore.** Already covered properly: `test_backups_api.py`
  asserts the content actually rolls back and that a pre-restore safety
  snapshot is taken.
- **Restore from the bin.** A note comes back with its document link intact.
- **Rename paths.** The other half of the delete class: renaming a category
  moves its notes and leaves one category behind (`renamed, merged: false,
  moved: 0`, the note reads `Projects`), and renaming a tag rewrites it on
  every note that had it (`changed: 2`, both notes updated, the other tag
  untouched). Nothing stores a category or tag by name where an id was
  meant, so nothing goes stale.
- **Every other short write field.** After capping notes and tags, the rest
  were driven with 100,000 characters: a space's name and icon, a category
  rename, a bookmark's title and url, a reminder's text and a conversation's
  title. All refused (422, or 400 for the two space fields). Capture was the
  only unbounded one.

## Not verified

- Everything here is this sandbox, SQLite, one process, seeded rows. No real
  notebook, no real model (every provider test runs against a fake
  transport, CLAUDE.md section 4), nothing at ten thousand notes.
- The concurrency probe used six threads against one TestClient app. Real
  contention between the desktop window, a browser tab and the night shift
  is the same shape but not the same timing.
- ~~Large-input handling was measured and not acted on~~ **acted on the same
  evening, and the reasoning is worth keeping because it changed.** It was
  first written down as a product decision to leave alone: capping how long
  a note may be is a judgement about someone pasting a long article. On a
  second look that framing was wrong. The question was never "how long may a
  note be": `routes_documents` already answered it with `MAX_CONTENT =
  500_000`, and capture simply never grew the same limit, so the same app
  said yes and no to the same paste depending on which box it went in. Using
  the document's own number is removing an inconsistency, not making a new
  rule. A note is now capped at the same 500,000 characters, a tag is
  clipped to 60 (twice what `librarian.py` allows itself when it suggests
  one) rather than refused, because a save that fails over one long tag
  throws the note away, and a tag list past 200 is a paste rather than a set
  of labels.
