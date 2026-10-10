# bgprogress-1006: background pass progress and log (Sonnet agent)

Owner: "do the other automated bg tasks work? can there be status updates and not just a working message?"

## Landed
- `core/jobruns.py`: live-run registry. `Run.step(done, total, what)`, `plan(labels)`, `say(line)` (last 50 lines, 300 chars each), `jobruns.live()`, `jobruns.current(kind)` (no-op handle when nothing runs).
- `/tasks` (`api/routes_tasks.py`): every scheduled pass is listed while it runs (kind `job-pass`, merged into the pool's row for a Run now, into the `autonomous` row and the `tidy-link-reasons` row); Stop on housekeeping works for scheduled runs too (`passes.running`).
- Reporting added: night shift (notes read of to read, then claims and questions compared), resurface, embeddings backfill, housekeeping (named steps, also at start), backup (copy, check, remove old; `backup.verify_copy` is new), autonomous (7 stages plus tool lines), tidy link reasons (links looked at of total), caption and page-read (model, started, what it waits on; no fraction exists for one blocking call).
- Tests: `tests/test_job_runs.py` (live registry, merge with pool row, steps, log bound, backup steps, night pass).

## Measured on /tmp/mm-d1 (port 8824, 60 then 860 notes)
- Run now, all six: night-shift 28 ms ok (read 0: the scheduled pass had already read them), backup 43 ms ok, resurface 33 ms ok (60 notes), embeddings-backfill 15 ms ok, maintenance 14 ms ok, autonomous 65 ms ok.
- Row seen while running: autonomous 5 of 7 with 5 stages ticked and 4 log lines; backup 0 of 3 with three named steps; forced night shift on 860 notes (121 s): "Reading notes: 558 of 860" at 0.7 s, then "Comparing claims: 1142 of 1600" at 61 s, "Matching questions to answers: 859 of 860" at 121 s.

## Not verified
- Browser rendering of the new `step.word` text and steps on a pass row (no screenshot taken); real model runs (no model in the sandbox).

## Found, not fixed
- Autonomous with no model running ends "Finished analysing and linking notes." in 65 ms: it should say it had no model. Check `agent.run_agent` for a no-provider error event.
- Night shift pairing phase is slow (120 s for 2400 facts, 4786 pairings) with the local matcher; the bar resets between the reading and comparing phases (the detail names the phase).
