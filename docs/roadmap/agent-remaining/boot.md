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

- A2, whole row. Measured on a 13-note notebook with one board and one `[[`
  link (`scratchpad/seed.sh` in the session scratch made it), before and after,
  same server: **boot fetches 34 to 29**, and the 29 includes `/insights/stats`,
  which the 34 never asked for because `fetchDashStats` called itself. Per
  document: `/preferences` 4 to 1, `/graph` 3 to 1, dashboard `/reminders` 3 to
  1, `/whiteboard/boards` 2 to 1, `/entries` 2 to 1. `errors.js` clean at four
  widths, 0 page errors.

## Next

- Nothing on A1 or A2. Found and not fixed, both the same shape as the fixed
  ones but across the app.js/dashboard.js boundary rather than inside one file,
  so each wants a shared reader in app.js rather than a dashboard-local one:
  `/chat/recent` twice at boot (`loadRecentQuestions`, app.js boot step, and
  `renderQuestionsWidget`) and `/entries/most-accessed` twice
  (`loadMostUsed`, app.js boot step, and `renderMostUsedWidget`).
