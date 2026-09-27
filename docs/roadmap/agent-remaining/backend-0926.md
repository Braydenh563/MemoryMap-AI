# Backend agent, 2026-09-26: what is left

Eight steps built this night, each with its tests and its HISTORY.md block
("Moved from the plans, 2026-09-26"). What they leave, in the order to take
it. Frontend items name the route to call; nothing here needs more backend
first unless it says so.

## Frontend halves: built the same night

All five are built (HISTORY.md, "The frontend halves of the night's backend
rows"): Settings, Privacy; the other-devices switch; the "While you were
away" widget; "Add to calendar (.ics)"; and "Undo what Atlas did" under
Recent activity. What they leave:

- **Undo's row stays after an undo**: the button reads the actors in the
  list, not whether their changes are still undoable, so pressing it again
  says "Already undone" in a toast. A dry run per render would hide it. S.
- **The night card's review list scrolls inside the widget's fixed-height
  body**, so an open list can push the summary line out of view. A wide
  default for the widget, or the list in a sheet, would give it room. S.
- **A skill run's own Undo**: see below.

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
- The five UIs in the desktop window (WebView2, WebKitGTK); all were driven
  in headless Chromium only. The receipt page was driven against a seeded
  ledger (`egress-ledger.json` with an update-check row), since nothing in
  the sandbox reaches the internet.
- LAN mode from a real second device and browser (the end-to-end test uses
  this machine's own network address with `http.client`); the media cookie in
  a real browser over plain http to a LAN address.
- The `.ics` files in a real calendar app.
- Per-session vault grants with a streaming response that decrypts (none
  does today; the context variable would carry through by design).
