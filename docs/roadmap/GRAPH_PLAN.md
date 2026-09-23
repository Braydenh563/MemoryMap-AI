# The graph — a full redesign, front and back

**Status: written by direct instruction; executed in ROADMAP.md order after
the plans already listed (row 13).** The instruction, verbatim:

> the actual graph itself visually, what it looks like, how it acts and how
> it is rendered needs a full upgrade and redesign in the front and backend,
> the features dont feel like they fit the application, they are glitchy to
> drag around and the ui ux could be improved as well as the utility. the way
> the graph is shown on the main view is awkward and all the examples of 2nd
> brain maps, obsidian graphs, and knowledge graphs completely blow my mind,
> then I look at what is in this application and I am dissapointed.

## 1. What exists (checked in the code, not assumed)

`frontend/graph.js` (3,800 lines) draws an **SVG** d3 force graph: one
`<g>` per node with a circle, a label and a halo; edges as `<line>`s;
`forceManyBody(-340)`, `forceLink`, `alphaDecay(0.05)`; four layouts
(force, tree, radial, arc); colour by category or by cluster; a legend row;
a minimap; search highlight; a trace (path between two notes); focus mode
(`/graph/local/{id}` at depth 2); saved views; entity, document and map
nodes as opt-ins; physics sliders (gravity, spread); a time slider; drag
that pins a node. `routes_graph.py` (850 lines) serves `/graph`,
`/graph/local`, `/graph/structure` (clusters, hubs, orphans — a real
community pass) and `/graph/path`. The dock is on the Phase 8 grammar.

## 2. Why it disappoints — measured and read

1. **SVG per node does not scale, and it is why dragging is glitchy.** Every
   tick rewrites `transform` on N groups and `x1..y2` on E lines through
   d3's selection API; at a few hundred notes each tick is thousands of DOM
   attribute writes, so the simulation and the pointer fight for the main
   thread and a drag stutters. Obsidian renders its graph to a **canvas**
   (PixiJS/WebGL) precisely because of this.
2. **The physics is tuned for a demo, not a notebook.** A fixed charge, no
   collision force, `alphaDecay 0.05` (the graph settles in ~90 ticks and
   then freezes: a dragged node's neighbours barely follow), no
   `velocityDecay` tuning, and gravity that pulls everything into one
   clump. Obsidian's feel comes from a *live* simulation with `alphaTarget`
   raised on drag and decayed on release, collision radius from node size,
   and a centre force weak enough that clusters keep their shape.
3. **Nodes are all the same size and every label is always on.** A second
   brain graph reads because size encodes degree (or recency), labels
   appear by zoom level and on hover, and the hovered node's
   neighbourhood lights up while everything else dims to 20%. Here every
   node is one radius, every label is drawn, and hover changes one halo.
4. **Colour has no semantics a reader can learn.** Category colours are
   the graph's own palette; clusters use the same. There is no colour by
   tag, by age, by folder/space, and no way to *save* a colour rule — the
   thing Obsidian's "groups" do and the thing that makes a graph a lens.
5. **The view is awkward.** The graph sits in a card under a dock with a
   stats line and a legend row, in a page that scrolls; the canvas is a
   fixed height; fullscreen is a mode. A graph is a *space*: it should fill
   the tab, the chrome should float over it (the dock, a legend, a minimap,
   the zoom strip), and the page must not scroll.
6. **Utility stops at looking.** No lasso select → act (tag, link,
   move to a space, make a map); no "open in split" of a hovered note; no
   timeline scrub with a *play*; no local-graph pane beside an open note;
   no export of the picture that matches the screen.

## 3. The target, in one paragraph

A full-tab canvas graph that renders 5,000 nodes at 60 fps, where notes
are circles sized by degree, coloured by a *rule* you can choose and save
(category, tag, space, age, cluster, "has a map"), labels appear as you
zoom in and on hover, the hovered neighbourhood lights up, dragging feels
physical (the neighbours follow and the rest settles), the dock, legend,
minimap and zoom float over the space, and a lasso turns a region into an
action. The local graph of any note is one click away and can sit beside
the note. The same renderer draws the Dashboard widget's small graph and
the map's node graph, so the three cannot disagree.

## 4. Decisions to make first

- **Renderer: Canvas 2D first, WebGL later if measured.** Canvas 2D with
  d3-force in a Web Worker handles 5k nodes / 10k edges at 60 fps on a
  laptop; it needs no new dependency (d3 is vendored) and keeps the
  export path (`canvas.toBlob`) trivial. WebGL (PixiJS, MIT, vendorable)
  is the step if a measured notebook is bigger than that. Hit-testing via
  a quadtree (`d3.quadtree`), not per-node DOM events.
- **Simulation off the main thread.** `d3-force` runs in a Worker; the
  main thread receives positions per frame (a `Float32Array` transferred,
  not copied) and paints. Drag sends the pinned position back. This is
  what makes drag smooth regardless of N.
- **Layout persistence.** Positions are saved per view (the saved-views
  feature already stores layout/colour) so a notebook opens where it was
  left rather than re-exploding — `/graph/views` gets `positions` (a
  compact `{id: [x, y]}`), written on settle and on drag end.
- **Backend computes what the client should not.** Degree, cluster id,
  and age bucket come from `/graph` per node (cheap, one pass); community
  detection stays in `/graph/structure` and is cached per notebook
  version; a `?since=` cursor makes the payload incremental for big
  notebooks.

## 5. Phases

### Phase 1 — the canvas renderer and physical drag (1–2 sessions)
Canvas 2D renderer behind the same `renderGraph()` entry; d3-force in a
Worker; quadtree hit-testing; drag with `alphaTarget(0.3)` on start and
decay on end, `forceCollide` from radius, `velocityDecay 0.4`, a weak
centre force; node radius by degree (`4 + 2·√degree`, clamped); labels by
zoom (`k > 1.4`) and on hover/selection; hover dims non-neighbours to
20%; the existing search highlight, trace, focus mode, colour modes, time
slider and saved views keep working through the new renderer.
**Gate:** a 2,000-note fixture built by a script (`scratchpad/graph-
fixture.js`) paints its first frame < 300 ms and holds ≥ 55 fps during a
2 s drag (Playwright `requestAnimationFrame` counter); no frame > 16 ms
on a 200-note board; `errors.js` 0.

### Phase 2 — the space (½ session)
The graph fills the tab; the dock, legend, minimap and zoom strip float
over it on the popover shell; the page does not scroll on Graph; the
stats line becomes a chip in the dock's identity zone; fullscreen is
just "hide the app chrome". Dark theme measured with `contrast.js`.

### Phase 3 — colour rules and groups (½ session)
"Colour by" becomes a rule picker (category, tag, space, age, cluster,
has a map, has a file) plus **groups**: a saved search → a colour, listed
in the legend, stored with the view. Legend entries toggle visibility.

### Phase 6 — the node panel (½ session, INBOX 59)
The popup that opens on a node is a form with nine equal buttons under it.
Target: a header (title, category chip, the confidence as a small mark
beside it, not a chip), one muted meta line (date, links, views), the
attachment as a compact row, the content editor sized to its text (four
lines minimum, grows), tags, and a single primary Save that appears only
when something changed. Actions become one toolbar row of icon buttons
with tooltips in three groups: read (Open, Similar, Trace), shape (Grow,
Focus, Link, Remind), keep (Favourite; Bin last, separated, ghost). Open
is the one filled button. Width and the dock grammar per DESIGN.md; the
panel scrolls inside, never the page; measured at 1440 and 1024 and on
390 as a sheet. Gate: `scratchpad/ui-sweeps/graph4b.js` plus a node-panel
probe that counts buttons per row and the panel's own scrollHeight.

### Phase 5 — backend (built; one row deliberately deferred, see below)
Built 2026-09-09 (HISTORY.md, "Built, Phase 5 (backend)"): the per-node
fields, `/graph/structure` cached per notebook version, and the payload
gate. Two more rows of the original phase were re-read against the code on
2026-09-20 rather than started:

- **Positions on `/graph/views`.** Views are localStorage on purpose
  (`graph.js`, "saved views": per-device workspace state of the same kind
  as `graph-layout`, not notebook content that belongs in a backup), and
  the positions that *are* notebook content, the pins, are already on the
  Entry as `graph_pin_x`/`graph_pin_y` and already restored by both
  renderers. The reason recorded for leaving this was "the local pane and
  multi-device views are the reason to move them, and neither exists yet";
  the local pane exists now and does not read saved views, and there is no
  second device to sync to in a local-first notebook. Nothing to build
  here as written.
- **What was genuinely missing** (a saved view did not restore where the
  unpinned notes sat) is built. Moved to HISTORY.md ("Built, Phase 5
  continued (positions on a saved view), 2026-09-21", GRAPH_PLAN.md); the
  decision it turned on ("Decision made, 2026-09-21: a restored view holds,
  it does not re-settle", below) stays here.
- **A `?since=` cursor.** Still nothing polls `/graph`: every call is
  `renderGraph()` behind a control, a tab activation or a save. A query
  parameter with no caller is the "feature that never ran once" shape
  CLAUDE.md section 6 puts second on its list. Left until something polls.

## 6. Consistency rules (learnability)

The graph uses the app's tokens for every colour; the dock is the Phase 8
dock; the legend is `.library-chip`s; the right-click menu is
`.action-menu`; the zoom strip is the whiteboard's `.graph-zoom` recipe
(they are the same control and must look it); keyboard: `+`/`-` zoom,
`0` fit, `F` focus selection, `Esc` clears — the same keys the whiteboard
uses.

## 7. Not verified until built

Frame rates are only meaningful on the sandbox's CPU; record them as
relative before/after numbers, not promises. WebGL is measured, not
assumed, before it is adopted.

---

## Built, Phase 6 (the node panel), 2026-09-09

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", GRAPH_PLAN.md) on 2026-09-09: a plan holds open work only.

## Built, Phase 5 (backend), 2026-09-09

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", GRAPH_PLAN.md) on 2026-09-09: a plan holds open work only.

## Built, Phase 4 (utility), part one, 2026-09-09

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", GRAPH_PLAN.md) on 2026-09-09: a plan holds open work only.

## Built, Phase 4 (utility), part two: the local map, 2026-09-13

Moved to HISTORY.md ("Moved from the plans, 2026-09-13", GRAPH_PLAN.md) on 2026-09-13: a plan holds open work only. Phase 4 is complete.

## Built, Phase 3 (colour rules and groups), 2026-09-09

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", GRAPH_PLAN.md) on 2026-09-09: a plan holds open work only.

## Built — Phase 1 (the canvas renderer and physical drag)

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", GRAPH_PLAN.md) on 2026-09-09: a plan holds open work only.

## Built, Phase 2 (the space)

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", GRAPH_PLAN.md) on 2026-09-09: a plan holds open work only.

## Placed from INBOX, 2026-09-09

The owner's reports this plan owns, moved whole from INBOX.md with their numbers (never reused). Each becomes a phase row when its phase is written; until then this list is the phase.

41. **(the panel: fixed, 5724587 and dbff8f0; the clean-up is Phase 4)**
    **Graph display options belong on the dock, and the options panel
    needs a redesign**; the graph needs a utility, UI and interaction
    clean-up. Owner: GRAPH Phase 2 remainder (gear button, INBOX 21) and
    Phase 4; the panel on the popover shell with the dock-menu sections.
78. **Graph minimap UX and utility**: Phase 6b, **built 2026-09-13**. The
    draggable viewport rectangle, click-to-jump, wheel zoom about the pointer
    and cluster-coloured dots landed earlier; this pass added the last two,
    the size toggle and the fade when the whole graph already fits. Size is a
    Small/Large select beside Position in the dock's Minimap section (the map
    itself is `aria-hidden` decoration that happens to be draggable, so a
    focusable control inside it would be one no screen reader could reach),
    and Large is the same picture at 1.5x, scaled on the element so the
    projection and the drag keep working off the rendered width they already
    measure. The fade is on the viewport rectangle's own area against the box,
    not on the zoom scale: "everything fits" is a fact about this graph's
    extent at this window size. Measured
    (`scratchpad/ui-sweeps/minimap6b.js`, 1440x950, 297 notes): fit-to-screen
    at k 0.56 gives a 168x112 rectangle, redundant true, opacity 0.12; at k
    1.6 the rectangle is 78.5x45.3, redundant false, opacity 0.45; Large
    renders 252x168 with the projection intact.
59. **Graph node popup panel redesign** (screenshot, 00:50; the owner:
    "include redesigning the graph node popup panels in the graph redesign
    plan"): title, five meta chips at one weight, a file card, a tall
    content editor, tags, Save, then a 3x3 grid of nine equal action
    buttons (Favourite, Grow, Focus, Similar, Link, Trace, Remind, Open,
    Bin). Placed as GRAPH_PLAN Phase 6. Owner: Opus, now.

## Placed from INBOX, 2026-09-09 (the owner's evening batch)

Built. Moved to HISTORY.md ("Moved from the plans, 2026-09-20", GRAPH_PLAN.md)
on 2026-09-20, with the measurement of each: a plan holds open work only.

## Decision made, 2026-09-20: three of the six options sections are folds

The recommendation on record (archive/agent-remaining/graph.md, "Open, found
and not fixed") was that Groups and Minimap become one collapsed `details`
each. Taken, and measured: it is no longer enough. The panel had grown from
the 587px that recommendation was written against to 655px of list in a 488px
box at 1440x900, because the Show section went from six switches to nine
(143px to 211px). Groups and Minimap folded give 517 in 488, still scrolling.

Decided, since which section gives way next is a design call and rule 3 says
to record one: **Physics folds too.** The rule the three share is that they
are set once and then left, while Show and Time are used with the map in
front of you. Physics is the clearest of the three on that test: its two
sliders are already disabled outright under the tree layouts, which is the
app saying they do not always apply. Its "Unpin all" rides the fold's own
`<summary>`, where it already rode the section head, and the button calls
`preventDefault` so releasing the pins does not also open or close the fold.

Each fold remembers whether it is open, for the reason the panel itself does.
Closed is the default. `details.settings-fold` is the app's existing
disclosure and is now a row in DESIGN.md's recipe index, with
`tests/test_ui_recipes.py` holding the four rules that dress it to one set of
families and the count of disclosures that name no family at all.

Measured after, `scratchpad/ui-sweeps/graphoptfold.js`: 451px of list in a
451px box at 1440x900 and again at 1024, nothing scrolling, 37px clear of the
cap; opening all three gives 669 in 488, which scrolls inside the panel as it
should. At 390 the panel still scrolls (795 in 286, against 1071 with the
three open), which is the phone's own cap rather than this panel's size.

## Decision made, 2026-09-13: a Show switch that is off means absent

INBOX 185 forced a decision the three switches in the Show section had never
actually been given: what "off" means. Entities and Documents add nodes that
exist nowhere else, so off has always meant absent for them. A board is an
`Entry`, so it was on the map either way and the switch only changed whether
the node said so. Two readings of one control drawn three times.

Decided: **off means the thing is not on the map.** `include_maps=false` drops
every board from `/graph` at the source, so there is no board node, no map
edge, and no board in the centrality pass or the path index. The switch is
labelled Boards rather than Mind maps, because a whiteboard is a board too and
a switch that hides one and not the other is the same confusion one step over.

Still open, and deliberately: `/graph/local` has no such switch, so focus mode
and the local pane still walk boards as notes. They are a neighbourhood of one
note rather than a picture of the notebook, and nothing has been asked about
them.

## Decision changed, 2026-09-09: a drag places, Shift pins

The plan and the code both carried "a drag is an intentional placement and
it stays placed", added after the report that arranging the map was
impossible because a released note was handed back to the simulation and
pulled wherever the forces wanted.

The owner has now asked for the other end of it (INBOX 96): "my original
annoyance was that I'd try to drag a node or cluster around and it would
just snap back ... but I move a node a little and then I have to unpin it
and there's got to be a better way."

Both complaints are satisfied by one rule, and the reason they are not in
conflict is that releasing is not the same as snapping back. At the end of a
drag the simulation's alpha is already decaying (`alphaTarget(0)`, which the
worker has always done), so a released node settles *from where it was
dropped*, with its neighbours, rather than being yanked to a fresh solution.
Placement without permanence is what the view wanted; a pin, for the notes
that must not move at all, is Shift and drag, or the node menu.

So, on both renderers: a plain drag places and releases, Shift and drag
pins, a node already pinned stays pinned at its new place, a zero-distance
drag is still a click, and only a real pin is written to
`graph_pin_x`/`graph_pin_y`. The dashed held ring follows `fx`, so it now
appears only on real pins, which is the last line of the owner's own
description of what they wanted.

The group drag this entry left open is built: moved to HISTORY.md ("Moved
from the plans, 2026-09-23", GRAPH_PLAN.md).

## Placed from INBOX, 2026-09-13

- **Hovering a node grows it into its own halo** (INBOX 149, the owner: "can
  you make graph nodes temporarily expand to fill their glow bubble when I
  hover over them or smth?? I feel like the graph nodes could look slightly
  nicer, cooler, more professional and more modern. visually"). Built, both
  renderers. Detail in HISTORY.md.

## Placed from INBOX, 2026-09-21

Item 275 (the graph's full screen spending one Escape on two things) is
fixed. Moved to HISTORY.md ("INBOX resolved, 2026-09-21").

## Decision made, 2026-09-21: a restored view holds, it does not re-settle

The open question Phase 5's "positions on a saved view" row left ("whether a
restored arrangement then holds or settles") is decided: **it holds.** A
person saved a picture of the map; reopening it must give them that picture,
not a fresh relaxation of the same forces that happens to start from it. So
`graphApplyView` seeds each saved node's x/y and the simulation starts at
alpha 0, not alpha 1: no reheat, nothing moves.

The one case that must still reheat is a note added *since* the view was
saved, which has no saved position at all: that note alone needs the
simulation to place it. When one exists, every saved note is held in place
(`fx`/`fy`, the same "freeze" a drag already uses to hold the rest of the map
still while one node moves) for exactly the length of that settle, and
released the moment it ends. A real pin (`graph_pin_x`/`graph_pin_y`,
notebook content) is a different, permanent hold and is never touched by
this: it is set and released by the code that already owns it.

Read this where the code carries it out: `graphCaptureView`/`graphApplyView`
(`frontend/graph.js`) and `renderGraphCanvas`/`gcStartWorker`
(`frontend/graph-canvas.js`, the default renderer).

