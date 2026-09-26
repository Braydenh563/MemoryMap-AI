# Backend agent, 2026-09-26: what is left

Eight steps built this night, each with its tests and its HISTORY.md block
("Moved from the plans, 2026-09-26"). What they leave, in the order to take
it. Frontend items name the route to call; nothing here needs more backend
first unless it says so.

## Frontend halves of what was built (each S)

- **The privacy receipt page** (WORLD_CLASS_PLAN row 35). A Settings page
  over `GET /privacy/receipt`: the verdict as one sentence, "since this
  launch" and "since the ledger began" (`ledger`), the destination table with
  `role` and `feature`, the model server's `note`, the listening address, and
  the switches. `covers` is the honest paragraph under it.
- **LAN mode's switch** (row 2, Brief 15). Settings, Account and security:
  "Allow other devices on this network" over `GET /auth/lan-access` (state,
  `addresses`, `restart_required`) and `POST /auth/lan-access`
  `{enabled, current_password}` (on needs the password; 401 and 429 read
  like an unlock's). Say a restart is needed; list the addresses.
- **The morning card** (row 5, I1). An opt-in Dashboard widget over
  `GET /night/latest` (`{run, counts, samples, previous}`); each count opens
  `GET /night/runs/{id}/facts?kind=&limit=&offset=` in the modal list recipe.
- **Undo the AI** (OPEN.md, events-undo). Settings, What it learned (or the
  activity widget): pick an actor (`system:filing`, `system:librarian`,
  `ai:<tool>`) and a point, show `POST /events/undo` `{actor, since}` (a dry
  run) as a list with each status, then Undo with `dry_run: false`.
- **Add to calendar** (§17 row 7). A reminder's menu item and a Reminders
  dock action over `GET /reminders/{id}/export.ics` and
  `GET /reminders/export.ics`, fetched with the auth header and saved as a
  blob (a plain link cannot send `X-Auth-Token`).

## Backend, open

- **A skill run's Undo** calls `events.undo` with the run's actor and first
  event id (Brief 13). `ai/skill_runner.py` records as `ai:<skill>`; it needs
  to hand the first event id back with the run's result. S.
- **F7's threads onto the pool**: `tests/test_flaw_class_lints.py` holds 13
  modules; move one at a time onto `core/jobs.py`, lowering the ratchet. M.
- **The receipt's ledger is flushed on read and at shutdown only**; a
  process killed between the two loses what it saw since the last read. A
  flush from the autonomous loop's tick would bound that. S.
- **Night passes still open** (row 5): tensions and answered questions as
  `DerivedFact` kinds stamped with `run_id`. M each.
- **LAN mode over IPv6**: `netbind.bind_host` binds `0.0.0.0` only, and
  `lan_addresses` lists IPv4. S.

## Not verified

- The privacy receipt against a real outbound call from the running app
  (only loopback and `sys.audit`-raised events were measured), and against
  sentence-transformers' warmup, which this sandbox does not install.
- LAN mode from a real second device and browser (the end-to-end test uses
  this machine's own network address with `http.client`); the media cookie in
  a real browser over plain http to a LAN address.
- The `.ics` files in a real calendar app.
- Per-session vault grants with a streaming response that decrypts (none
  does today; the context variable would carry through by design).
