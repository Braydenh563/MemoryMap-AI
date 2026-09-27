# Agent: the Library and the Timeline, round 6

Worktree `.claude/worktrees/agent-a42ac8319ec33be28`, merged with
`origin/fix/gemini-fixes-5` (last at `9728157`). Port 8807, data dir
`/tmp/mm-libtl`, seeded with 1,000 notes by
`scratchpad/ui-sweeps/seed-timeline-bulk.py`. Shots and numbers in
`scratchpad/shots/libtl-0926/`.

## Done

- `2d42cd5` read-along fires for every way a note opens (`flashEntry`).
- `8bd591d` long lists, measured with `scratchpad/ui-sweeps/libtlscroll.js`
  (120 wheel steps; worst frame and frames over 32ms, before then after):
  Library 100 to 33ms, 7 to 5; Timeline feed 100 to 33ms, 12 to 2; table
  83 to 50ms, 10 to 4. A card no longer restyles the grid (a `:has()`
  became `.is-choosing`), Library cards are built by time, the Timeline
  appends by time and counts once a chunk, its scroll work runs once a
  frame. `libtlscroll` is in gate.sh's sweeps.
- `e4d15d9` review (b): a tick that yawns still moves the companion's mood.
- `326e2f8` review (a): the walk's 60 style recalcs a second were
  `atlaswalk.js`'s own rAF frame counter; without it a held walk is 2.2
  recalcs and 5ms of main thread a second (1.7 standing still). Frames
  now come from the trace.
- `6d37e4c` keyboard: the Library grid is one Tab stop (15 presses from the
  search to past the grid, was 400+), arrows between cards; the All
  view's sort is remembered. `scratchpad/ui-sweeps/libtlaudit.js` gates it.
- `bd78d56` empty states: every kind chip at zero measured; Archived said
  "No archived yet." beside a Create; fixed. Card heights uniform (138px
  cards, 46px rows over 40 cards).
- `d2bc42a` the Timeline's grouping is remembered across a reload.

## Done, round 7

- `64cdf1a` status bar: fits at 820 (the notebook count gives way to 959)
  and a running job's name no longer widens the page (it was errors.js's
  seven tabs at 1024: a fresh server's job label, 52px at 1024, 172px at
  768). errors.js at 1024 and 820: 0 errors, 0 layout findings.
- `04b16fb` the Timeline strip's window from an IntersectionObserver, not
  `elementFromPoint`: scripting 38 to 20 ms/s (feed), 39 to 15 (table).
- `995cc98` Settings, Tools it can use: the rows fill their grid cell;
  offset 27.58px to 0 at DSF 1, 1.25 and 1.5 (`toolgrid.js`).
- `3d3b50e` the pacer steps effects inside an Atlas layer at 10Hz
  (`atlasmoodfx.js`).

## Remaining

1. The Timeline feed lays out about 39 times a second while scrolling. It
   is not forced (one forced layout in a trace, `markScrollEdge` in
   shell-reminders.js); it is the rows' `content-visibility: auto` bringing
   rows into range, INBOX 400's deliberate trade (about 15ms a second).
2. The Library search keystroke measured 17 to 191ms under load; not
   re-measured on an idle machine.
3. "Mind maps" chip at zero offers "New concept map": a naming decision.
4. The app's poll lands a text change and two paints (about 40ms) in one
   4s window in three or four; not chased.
