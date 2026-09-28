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

## Done, round 8 (Atlas, the owner's batch of 2026-09-27)

- `4384b50` the drawing: the feminine look's skirt of ribbons (no legs, no
  leg layers), the faded chest constellation on both looks, the arms from
  inside the chest with mitten hands and easier rest angles, one nebula
  ribbon behind the figure in a haze, drifting on its own layer.
  Walking and idle: 0 layouts and 0 paints a second, both looks, before
  and after; errors.js at 1440 and 390 clean.
- `1e16321` the lab's rays knob retired; `atlasr6.js` and `atlaszoom.js`.
  Sheets in `scratchpad/shots/atlas-r6/`.

## Done, round 9 (the companion and Atlas, INBOX 430)

Shots in `scratchpad/shots/atlas-r7/`; walking and idle 0 layouts and 0
paints a second (atlaswalk.js), companionperf.js PASS, after every step.

- `5d50ca4` show or hide it: Ctrl+Shift+Y, the palette, Find anything.
- `d6a055a` it fades out from under a popup (companiondodge.js).
- `65f02e3` it keeps out of the tour's ring (tourspill.js, PUT=1).
- `377a571` rings tilted to -11 degrees; the planets orbit on the
  compositor (atlasorbit.js); the nebula rises from above the crown.
- `d897ae4` one figure, not parts: masculine legs, feet, arms and hands
  redrawn, one shade for body and limbs, no hem line over the legs.
- `b2042cc` generated faces: each character wears a mood its own way
  (facelean.js: 3 to 4 faces over 8 characters per mood).
- `249e2e3` panels first on every tab, riding their scroll
  (companiontabs.js: 7 of 8 tabs, the graph keeps the bar).
- (this step) a crouch before a move, a squash and rebound on landing,
  limbs easing between poses, calmer idle loops (companionmotion.js).

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
5. Atlas: the feminine right arm (held out, sowing seeds) sits behind the
   hair's locks at the full size, as it did before; bringing it in front
   of the hair is a drawing-order change in the body layer.
6. Atlas: judged against the owner's references 60 to 83 only by their
   written descriptions; the images themselves are not in this sandbox.
7. INBOX 430, "changing animations": a change of mood or act still swaps
   one loop for another at once (CSS animations do not blend); poses and
   moves now ease. A blend would need each loop's phase carried over.
8. The graph tab keeps the companion on the bottom bar: its canvas has no
   panel edge free of controls at 1440 by 900.
9. Guide batch (INBOX 430) done: help expansion and toggle (445f7c8),
   prompt fencing (see CHANGELOG, Security), atlasRepaint (this step).
   Open: mood and act changes still swap loops rather than cross-fade
   (a CSS animation cannot be blended; needs each loop's phase carried
   into a WAAPI hand-over). Help text and prompts not tested on a real
   model.
