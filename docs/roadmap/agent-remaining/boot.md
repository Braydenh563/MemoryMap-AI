# boot agent: WORLD_CLASS_PLAN "Audit, 2026-09-13 night" rows A1 and A2

Port 8804, data dir `/tmp/mm-boot2`. Probes: `scratchpad/ui-sweeps/boottime.js`
(scripts, KB, fetch count, slowest fetches, repeats, before and after every tab
is visited) and `scratchpad/ui-sweeps/fetchwho.js` (which line made a fetch, by
stack).

## Baseline on this head, measured

`boottime.js` at 1440x900, fresh profile: 13 script files, 1,699 KB JS, 24 boot
fetches, DCL 631 ms, first tab `dashboard`. Repeated at boot: `/preferences`
twice by GET (app.js `startApp` line 728 and `loadTemplates` line 961) plus
twice by PUT, `/entries` twice. `/whiteboard/boards?limit=200` comes from
`loadMapBoardIndex()` inside `loadEntries`.

## Done

- A1, whole row. `ensureModule` plus `LAZY_ENTRY_POINTS` in app.js, the five
  `<script>` tags gone from index.html, `switchTab` and `refreshActiveTab`
  awaiting the bundle. Measured at 1440x900 on a fresh profile: **8 scripts,
  1,072 KB, 24 fetches, DCL 707 ms**, from 13 / 1,699 / 24 / 631. After every
  tab is visited: 13 scripts, 1,702 KB, 41 fetches, 0 page errors. `errors.js`
  clean at 1440, 1024, 820 and 390.
  `tests/test_frontend_load_order.py` grew two lints for the mechanism: every
  lazily-loaded function app.js names in its own top-level code has a stand-in,
  and no stand-in names a function that does not exist. Both proven to fail by
  removing one name and by mistyping another.

## Next

- A2: `/preferences` once at boot, the notes list's first page at 200, boards
  off the boot path.
