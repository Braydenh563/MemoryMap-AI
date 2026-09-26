# Agent: the Library and the Timeline, round 6

Worktree `.claude/worktrees/agent-a42ac8319ec33be28`, merged with
`origin/fix/gemini-fixes-5`. Port 8807, data dir `/tmp/mm-libtl`, seeded
with 1,000 notes by `scratchpad/ui-sweeps/seed-timeline-bulk.py`. Shots and
numbers in `scratchpad/shots/libtl-0926/`.

## Done

- `2d42cd5` read-along fires for every way a note opens (`flashEntry`).
- Long lists, measured with `scratchpad/ui-sweeps/libtlscroll.js` (120 wheel
  steps; worst frame and frames over 32ms, before then after): Library
  100 to 33ms, 7 to 5; Timeline feed 100 to 33ms, 12 to 2; table 83 to
  50ms, 10 to 4. Library cards are built by time, a card no longer restyles
  the grid (a `:has()` became `.is-choosing`), the Timeline appends by time
  and counts once a chunk, and its scroll work runs once a frame.

## Remaining

1. Filter and sort ergonomics (Library, Timeline).
2. Empty states.
3. Keyboard navigation.
4. Card consistency with DESIGN.md.
5. The Timeline feed still lays out about 35 times a second while
   scrolling: `drawTimelineWindow`'s `elementFromPoint` probes force it,
   once a frame now. A row index by offset would remove it.
