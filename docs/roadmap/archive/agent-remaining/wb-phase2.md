# Whiteboard draw.io phase 2: what is left

The 2026-10-05 brief's six steps, cut from `claude/notes-flow-rebuild` at
`d75a406`. What landed is in HISTORY.md ("Moved from the plans, 2026-10-05
(wb-phase2: draw.io phase 2)"); the decisions are WHITEBOARD_PLAN 30 to 36.
Sweeps added (each takes `W`, `H`, `THEME`; `wbmatrix.sh` runs any of them at
1440 and 390, light and dark): `wbwaypoints.js`, `wbmermaidframes.js`,
`wbhistory.js` (ages the log in its own data dir, `DATA=`), `wbguides.js`,
`wbports.js`, `mapsuggest.js`.

## Still open, in the order to take them

1. **FEAT-13, the rest.** Ghosts drawn on the canvas (decision 36 chose the
   picker dialog because the boot CSS cap is full: 183,284 of 183,300
   bytes after this branch; ghosts want a lazy whiteboard stylesheet or
   dead rules found and cut first), "Expand from my notes" and "Summarise
   this branch" (MINDMAP_PLAN §12.3 item 2).
2. **Phase G's other two**: the affinity sort (select stickies, Group by
   theme, the local model proposes named frames, each sticky shows the notes
   behind its place, accept per frame, one Undo) and the claim check. Both
   want faked-transport tests and `agent.PROSE_BUDGET_CHARS`.
3. **The time machine's "what changed"** (the audit's idea): a plain-words
   summary between two moments by the local model, off the same log.
4. **Line jumps** are recomputed on a render, not on every drag frame: a
   line being dragged, and the lines it crosses, show their hops again when
   it lands. A curved line takes none (draw.io's rule), but is hopped over.
5. **Waypoints carried** only by a pointer drag that moved both ends; the
   arrow-key nudge, align and distribute leave a connector's bends where
   they were.
6. **Ports with Select** are mouse and pen only (touch has no hover); a
   phone draws connectors with the link tools as before.

## Not verified

- A real model: every suggestion test is a fake transport, and the sweep's
  server runs none, so only the notebook fallback was driven in a browser.
- The time machine on a mind map in a browser (the server half is tested:
  a remade topic keeps its parent); on a board whose history crosses a
  compaction (tested with a hand-compacted log, never a real 90-day one).
- Touch and pen on ports, bends and the history slider; the desktop webview.

## Found, not fixed

- **SQLite reuses a deleted row's id** (no AUTOINCREMENT on the board item
  tables), so one id's event log can hold two items, on two boards. The
  board history places each event by the board it names and starts a fresh
  state on each `created`; any other reader of an item's log
  (`events.replay` for a board item) would merge them.
- **`gate.sh --staged` does not run `tests/test_help_controls.py`**: step 1's
  help edit put the whiteboard keys entry over the Guide's length (1,926
  against 1,920) and passed the gate; caught and fixed two commits later.
- Library placements made before this branch, a duplicated board's copies
  and a generated or imported map's topics have no `created` event, so the
  history reads them as there from the start.
- `wblinklabel.js`'s right-click at 0.3 along a selected connector landed on
  the selection bar on the base too: the bar sits over the line's first third
  at 1440 (the sweep now aims at an uncovered point).
