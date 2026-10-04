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
