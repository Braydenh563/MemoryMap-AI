# The map's tools, its two connections and its pan (MINDMAP_PLAN section 13): what is left

> Companions: [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) **section 13** (the read,
> the decisions, the phases) · [maprender.md](maprender.md) (13a, the drag
> pick-up) · [HISTORY.md](../HISTORY.md) "Moved from the plans, 2026-09-21"
>
> One agent, one worktree (`worktree-agent-mapux2`), port 8794, data dir
> `/tmp/mm-mapux2`. Every figure below was taken in a real Chromium against
> the running app at 1440x900 in light unless another width is named.

## 2026-09-23: canvas conventions and the map UX remainder (agent M)

Port 8795, data dir `/tmp/mm-agentM`. Sweeps, every check a number:
`canvasconventions.js` (board and map), `mapviewmenu.js`, `touchticks.js`,
all three in `scripts/gate.sh`'s sweep list.

### The checklist (WHITEBOARD_PLAN, Placed from INBOX 2026-09-23)

What a Figma, Miro, tldraw or Excalidraw user expects, measured on the
branch head first (`canvasconventions.js` 20/47 there), then built.

| Convention | Before | Now |
| --- | --- | --- |
| Double-click the rotate grip: upright again | nothing (card, text box, shape) | built; a shape keeps its running `turned` angle |
| Double-click a resize handle: fit the text | existed | kept; the second press no longer saves or pushes undo |
| Shift while rotating: 15 degree steps | existed | kept |
| Shift on a corner: keep proportions | squared the box (2:1 went 1:1) | built (a square stays square) |
| Shift while dragging: one axis | free | built, card, object, shape |
| Alt-drag: leave a copy | moved only | built (one undo step) |
| Arrows nudge 1px, Shift 10px | existed, one undo per press, presses lost to a save race (5 moved 3) | one undo per burst, one save |
| Ctrl+D | one item only | several, selected after, one undo |
| Ctrl+A in scope | existed | kept |
| Escape cancels a drag, resize, turn, link draw, group resize | nothing | built, restores and records nothing |
| Delete, Backspace | existed | kept |
| Ctrl+G, Ctrl+Shift+G | Ctrl+Shift+G also switched on agent mode and left for Chat | the board owns the chord (`wbOwnsChord`) |
| Double-click bare board canvas | nothing | a text box, typing |
| Right-click bare board canvas | the browser's page menu | the board's own menu (paste here, text, sticky, select all, 100%, fit) |
| Space-drag pans, Ctrl+wheel zooms at the pointer | existed | kept (measured) |
| Ctrl+0, Shift+1, Ctrl+=, Ctrl+- | none bound (Ctrl+0 zoomed the page) | built |
| Copy and paste keep relative places, paste at the pointer | one item, at a fixed offset | built |
| A drag of a group undoes whole | only the grabbed item came back | built |
| A group's resize or turn undoes | no undo entry at all | one step |
| Map: Tab, Enter, arrows walk the tree | existed | kept (measured) |
| Map: double-click a line to label it | made a new trunk on top of the line | asks for the label |
| Map: double-click the bend grip to straighten | existed | kept (measured) |
| Map: Escape during a topic drag | nothing | the branch goes back |

### Conventions broken on purpose (each reason is also in the code)

- **Double-click a board link adds a bend**, not a label: the owner asked
  for exactly that ("double click on lines, add points for curving"), and a
  board link has no label to edit. A map line, which has one, is labelled.
- **A group's corner is proportional by default and Shift frees it**, the
  inverse of a single item: the owner's own report ("the items all go out of
  proportion") decided it.
- **Alt-drag does not copy a note card or a map topic**: one card per note
  per board, and a copied topic row would have no place in the tree.
- **Plain arrows walk a map's tree; Ctrl or Shift arrows nudge the topic.**
  The brief's "Ctrl+arrow moves between topics" is the plain arrows here
  (Obsidian's set, MINDMAP_PLAN section 5 item 5); not rebound.
- **Alt held mid-drag still releases the grid**, as before; Alt held at the
  press copies.

### Job B

- ~~The View menu.~~ 453px on this head (the columns had already taken it
  from 714) to 357px on a map at 1440; hairlines, not headings; no second
  copy of the zoom bar's buttons; no empty Map group on a board.
  `mapviewmenu.js` 1/4 before.
- ~~The hint strip.~~ Never on a map (it counted note cards, which a map has
  none of, so it stood over every new map); on a board only while one note
  card is selected, and never over it.
- ~~Discoverability.~~ The board's ? help, the map rail's ?, the grips'
  titles, the canvas menus and the zoom buttons name every new gesture and
  key; `canvasconventions.js` fails if the help drops one.
- ~~The 44px touch ticks.~~ A 22px box inside the 44px target, Library
  cards and reminders; `touchticks.js` 7/7.

### Left

- ~~Escape during a lasso or marquee~~: measured 2026-09-23 (the culling
  agent) clearing the selection as well as the rectangle; it takes back the
  drag only now, `wbmarqueeescape.js` 8/8.
- The graph panel items from the owner (disclosure arrows, Groups search
  height) are the orchestrator's.

### Found, not fixed (measured on the base, `d1f7748`, served from an archive)

- `maptwokinds.js` 16/17 on base and here: "a cross-link is drawn ...
  dashed" expects the dashed look the "drawn like branches" change retired.
  The sweep is stale, not the map.
- ~~`mindmap.js` (H1) "a node's edges still follow a drag on a 200-node
  map"~~: passes after the culling agent's line order fix (a branch's lines
  drawn after every member moves), during 0px and after 0px, `mindmap.js`
  76/76 on a fresh data dir, 2026-09-23.
- `wbgroupguides.js` and `mindmap.js` (B) read the default board, so a data
  dir other sweeps have used fails them (a leftover card under the pointer
  shows its grip on hover). Both pass on a fresh data dir, here and on base.

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
