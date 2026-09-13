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

- (pending)

## Next

- A1 step 2: `ensureModule`, the deferred `<script>` tags, `switchTab` awaits.
