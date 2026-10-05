# Boards and maps, 2026-10-05 (boardmap-1005): what is left

INBOX 596, 607 to 610 and 617. What landed is in HISTORY.md ("Moved from the
plans, 2026-10-05 (boardmap-1005)"); commits `95e8127` (609), `64ab644`
(608), `e1c598d` (607), `4ed1b3c` (610), `98e319e` (617), `b454b7b` (596).
Sweeps in `scratchpad/ui-sweeps/`, each taking `W` and `THEME`:
`bm1005-curve.js`, `bm1005-mapfromgraph.js`, `bm1005-nodetasks.js`,
`bm1005-segstate.js`, `bm1005-mapmulti.js`, `bm1005-sidebar.js` (`DOCK=side`
for the side dock).

## Still open

1. **596, skeleton loaders** ("some skeleton loaders are missing like on the
   dashboard"): not measured against a surface yet; the board's Library and
   Notes tabs draw nothing while they load.
2. **596, the side-docked tool column's own layout**: rows of one to four
   controls, centred; 173px wide on a board, 225px on a map (the layout
   select sets it). The sidebar now stands beside it, so this is looks only.
3. **596 at phone width with the side dock**: the open sidebar sheet covers
   the dock's collapsed picker (7,554px², unchanged from the base).
4. **608, lists**: edge auto-scroll for a drag selection in Notes and the
   Library (boards and maps are built).

## Traps

- Boot CSS is at 183,210 of 183,300 bytes gzipped after this branch and the 6ef2770 merge. Any new
  whiteboard rule needs dead CSS cut first (this branch cut `.reminder-item`,
  `#library-sort-seg`, the side dock's overridden placement values and a
  dead `.select-opener` rule).
- The Guide's longest topics are at 1,916 of the 1,920 characters
  the Guide preset's reply cap allows (`test_help_controls.py`).
