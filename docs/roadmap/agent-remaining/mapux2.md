# The map's tools, its two connections and its pan (MINDMAP_PLAN section 13): what is left

> Companions: [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) **section 13** (the read,
> the decisions, the phases) · [maprender.md](maprender.md) (13a, the drag
> pick-up) · [HISTORY.md](../HISTORY.md) "Moved from the plans, 2026-09-21"
>
> One agent, one worktree (`worktree-agent-mapux2`), port 8794, data dir
> `/tmp/mm-mapux2`. Every figure below was taken in a real Chromium against
> the running app at 1440x900 in light unless another width is named.

## 2026-09-23: canvas conventions and the map UX remainder (agent M)

Port 8795, data dir `/tmp/mm-agentM`. Sweep:
`scratchpad/ui-sweeps/canvasconventions.js` (board and map, every check a
number). Baseline on the branch head: 20/47; now 48/48.

Left, in order (struck when built):

- ~~Double-click a rotate handle resets to 0 (card, text box, shape).~~ Built.
- ~~Shift-resize keeps the aspect ratio (was: squares the box).~~ Built.
- ~~Escape cancels a move, resize, rotate, link draw in flight.~~ Built.
- ~~Shift-drag keeps to one axis; Alt-drag leaves a copy behind.~~ Built.
- ~~Arrow nudges: one undo step per burst (and the race that dropped presses).~~ Built.
- ~~Ctrl+D and copy/paste of several items, paste at the pointer.~~ Built.
- ~~Board canvas: right-click menu, double-click adds a text box.~~ Built.
- ~~Keyboard zoom: Ctrl+0, Shift+1, Ctrl+= and Ctrl+-.~~ Built.
- ~~Map: double-click a branch line asks for its label (it made a topic).~~ Built.
- Found on the way and fixed: a click on a shape's grip deselected it;
  Ctrl+Shift+G ungrouped and also switched to Chat (agent mode).
- ~~Job B: the View menu.~~ Built: 453px on this head (the columns had
  already taken it down from 714) to 357px on a map at 1440; no printed
  headings, hairlines between groups, no second copy of the zoom bar's
  buttons, no empty Map group on a board. `mapviewmenu.js` 4/4, 1/4 before.
- ~~Job B: the hint strip.~~ Built: never on a map (the ring caption and
  the rail's ? teach the same keys when they apply), on a board only while
  one note card is selected and never over it. `mapviewmenu.js` 8/8.
- ~~Job B: the 44px ticks.~~ Built: 22px drawn box in a 44px target on a
  coarse pointer, Library cards and reminders; `touchticks.js` 7/7.
- Job B: the discoverability pass.

## Done

- **13b, the topic strip is sized like a topic.** 959.4 x 38 to 314 x 38 at
  1440, 1024 and 820 (0.67, 0.94 and unread, to 0.22, 0.31 and 0.38 of the
  window); 348.4 x 150 to 314 x 54 at 390. Fourteen unlabelled icons in one
  run to five controls, three of which are named doors. `mapstrip.js` 39/39.

- **13c, one vocabulary for two connections.** Both kinds on one ring, which
  names the kind; no board context bar for a cross-link on a map; the rail
  says cross-link on a map; a cross-link draws in the map's ink, dashed, and
  is marked as one before its first paint rather than at the next reload.
  `maptwokinds.js` 10 checks to 16, 16/16, six failing on base.

- **The map's canvas answers a right-click and a double-click** (§13, in
  place of the withdrawn 13f). `mapdoors.js`, new, 7/7 and 3/7 on base, in
  `scripts/gate.sh`'s sweep list.

- **13e's first half, the two missing layouts.** Tree-left and both sides,
  in the picker, the API and the tidy; the split is greedy by subtree weight
  (5/6 at 12 topics, 93/106 at 200); the branch bar moves to the edge the
  parent is on. `maplayouts.js`, new, 19/19 and 5 failing on base, in the
  gate's sweep list.

## Left to do

- ~~**13e's other half: a map-level default for new topics.**~~ **Built
  2026-09-21** by the next agent; the remaining list is
  [maptheme.md](maptheme.md) and the record is in HISTORY.md ("Moved from the
  plans, 2026-09-21", "From MINDMAP_PLAN.md section 13e: the map's own look").

- The rest of section 13's phases, in the plan's own order. Picked up in
  [maptheme.md](maptheme.md).

## Found, not fixed

- **The Insert and Arrange menus are still in a map's top bar markup**, 18
  controls, hidden with their wraps by `wbSyncMapChrome`. Not drawn, not
  exposed, dead on a map. A tidy-up, not a bug.

- **A right-click on a selected cross-link's bend grip does nothing.** The
  grip takes the press (measured: `circle.wb-link-bend-handle` under the
  pointer at the line's mid-point), so the ring never opens there.
  `maptwokinds.js` works around it by pressing at 35% of the line's length.
  The fix is a `contextmenu` on the grip that opens the same ring.
- **Nothing says which kind a connect drag is about to make while it is in
  flight.** Both kinds say what they made once it lands. A live cue on the
  drag preview is the remaining half of §13.2's "one gesture produces either,
  decided by something invisible".

- **`scratchpad/ui-sweeps/mapstyle.js` fails its "radial slot" check on the
  base branch too** (`claude/open-sections-a-b`, measured by stashing this
  worktree's changes and re-running it): the slot it measures reads `w: 0`.
  Not this work's, not investigated.

## Not verified

- Dark is unmeasured on the new strip; every figure is light.
