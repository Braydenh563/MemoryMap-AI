# World class 1004: what is left

Worked WORLD_CLASS_PLAN section 8's rows 3, 4 and 2 in the brief's order.

- **Row 3, B2 durable jobs: built** for the pool's six kinds
  (`core/jobstore.py`, a `jobs` table, leases with a heartbeat, resume at
  launch, `GET /jobs`, `GET /jobs/stream`, `POST /jobs/{id}/cancel`, the
  panel's Quit on a queued reading). Record: HISTORY.md, "Moved from the
  plans, 2026-10-04 (B2 durable jobs)". Gate: `tests/test_jobstore.py`, a
  real SIGKILL of a real process mid-job, resumed by a second.
- **Row 4, D2 connections rail: already built** (2026-09-27); re-measured,
  `notesrail.js` 30/30 light and dark on the showcase notebook. Record moved
  to HISTORY.md, "Moved from the plans, 2026-10-04 (D2 connections rail)".
- **Row 2's IPv6: not started**, sized M rather than S (§12 has the shape).

## Still open, in the order to take them

1. **B2's other kinds onto the table** (re-index, embeddings backfill, skill
   run, import, backup, model download). Each runs in its own thread with
   its own canceller today (`core/bgtasks.py`); each needs a handler that
   resumes from a cursor rather than from the start, and a kind in
   `jobstore.HANDLERS`. Opus, M.
2. **The activity panel on `/jobs/stream`** instead of polling `/tasks`
   (`ai-tools.js`). The stream closes after 60 s by design (an open response
   holds a quit; `EventSource` reopens). Help moves with it (order 13). Opus, S.
3. **Cancel of a running durable job**: cooperative, a `should_stop()` the
   handler checks between pages; today the answer says it will finish. S.
4. **LAN mode over IPv6** (row 2): the dual-stack socket in `__main__.py`,
   `arrived_on_loopback` for v4-mapped loopback, bracketed IPv6 in
   `lan_addresses`, `test_lan_mode.py` over `[::1]` and v4. Opus, M.

## Not verified

- The activity panel showing a resumed job: without Tesseract or a vision
  model in the sandbox each reading finishes in milliseconds.
- Windows: the SIGKILL test is skipped there; the heartbeat and lease are
  plain SQL and threads.

## Session 2 (rows 6, 5, 7, then 2's IPv6)

- **Row 6 (§14.3, I6): built.** Paragraph vectors (`chunk_vectors`,
  `search/chunks.py`) f4c64a1; evidence fields, the peek's bars and the
  evidence view in the next commit. Record: HISTORY.md, "row 6: paragraph
  vectors and evidence cards". Left: "wrong" on a card as a correction (I7).
- Next: row 5, the tension and answered-question passes (`ai/facts.py`).
- **Row 5 (I1 passes 4 and 5): built.** `facts._pair_passes`, `derived_facts.payload`,
  the card's pair rows. Record: HISTORY.md, "row 5: tensions and answered
  questions". Left: pass 2's kinds (dates, duplicates, entities) as facts.
- Next: row 7, the questions view (`GET /questions`, the Ask scope, the answered-by link).
- **Row 7 (I3): built.** `ai/questions.py`, `routes_questions.py`, Notes,
  Questions, the Ask scope, the Dashboard line. Record: HISTORY.md, "row 7:
  open questions" (with the answered-by link's decision).
- Next: row 2's leftover, LAN mode over IPv6 (§12; `__main__.py`, `core/netbind.py`).
- **Row 2's IPv6: built.** `netbind.listening_socket` (one dual-stack
  socket), mapped loopback, IPv6 addresses bracketed. Record: HISTORY.md,
  "row 2: LAN mode over IPv6". The `[::1]` launcher test skips here (the
  sandbox has no IPv6 at all); it runs wherever `has_dualstack_ipv6()`.

## Still open after session 2, in order

1. B2's other kinds onto the jobs table, the panel on `/jobs/stream`, cancel
   of a running durable job (session 1's list above, unchanged).
2. I7 on an evidence card: "wrong" as a correction that changes the next
   answer's ranking (H2's second half; `learning.py`, `capture-ask.js`
   `evidenceBlock`). Opus, M.
3. I1 pass 2's kinds as derived facts: dates (a reminder on accept),
   duplicates (the merge on accept), entities (`ai/facts.py`). Opus, M.

## Not verified (session 2)

- Any real model: paragraph-vector gains measured with a hashed
  bag-of-words embedder (`scratchpad/chunk_retrieval_bench.py`), the night
  pairs' judging and the Ask scope against fakes that answer by rule.
- IPv6 end to end and Windows' dual-stack bind: no IPv6 in this sandbox.

## Found, not fixed

- `tests/test_flaw_class_lints.py::test_no_module_starts_more_threads_than_it_did`
  fails on the branch head: `core/jobstore.py` starts a thread (the B2
  heartbeat) and is not in `THREAD_SITES`. Session 1's code; a reason or a
  move onto the pool, not a widened rule.
- The gzip total (`tests/test_static_compression.py`) has 235 bytes
  left under 794,000 (793,765) after rows 6 and 7; three long history comments in
  `capture-ask.js` were condensed to make room.
