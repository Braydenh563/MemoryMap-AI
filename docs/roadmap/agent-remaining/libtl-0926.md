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

## Remaining

1. The Timeline feed still lays out about 35 times a second while
   scrolling: `drawTimelineWindow`'s `elementFromPoint` probes force it,
   once a frame now. A row index by offset would remove it.
2. The Library search keystroke measured 17 to 191ms under load (re-render
   of the grid per keystroke after the 150ms debounce); not re-measured on
   an idle machine.
3. "Mind maps" chip at zero offers "New concept map": two names for one
   thing; which name wins is a naming decision, not taken here.
4. At 820 the status bar's redo button ends 3px past the viewport
   (`span.status-zone`, `#status-redo`), so every tab scrolls sideways by
   3px (errors.js layout findings at 820; 1024's seven were not reproduced
   on the dashboard). Not in this scope (the shell's status bar).
