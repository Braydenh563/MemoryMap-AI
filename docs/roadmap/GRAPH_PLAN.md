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

`frontend/js/graph.js` (3,800 lines) draws an **SVG** d3 force graph: one
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
(`frontend/js/graph.js`) and `renderGraphCanvas`/`gcStartWorker`
(`frontend/js/graph-canvas.js`, the default renderer).


## Decision made, 2026-09-24: similarity is each note's two closest matches

INBOX 412 (the owner: "when I tick similarity on the graph, this happens, is
there a way to make it more visually understandable or parsable??"). What was
read first: Gephi and InfraNodus thin a weighted network by weight and map the
weight onto the stroke; Kumu scales a connection's width by its strength and
focuses a selection's neighbourhood; Obsidian and Logseq fade what a hovered
note is not joined to; Heptabase draws no inferred relations and lists them
beside the card. Decided, and measured on 42 notes over six topics with
vectors shaped like bge-small's (`scratchpad/ui-sweeps/graphsim.js`):

- **k = 2.** Each note keeps its two strongest similarity lines above the
  cutoff; a line survives if it is in either end's two. 200 lines became 58
  and 1,701 crossings 39; k = 3 gave 80 lines and 84 crossings with the same
  six clusters, so the fewer lines win. Pruned before the layout, so the
  springs stop pulling the topics into one ball.
- **Three strengths, relative to the range drawn**, in opacity and width, one
  dash, the strongest still under a link's opacity, stroked beneath the links.
- **Scores on demand**: the note in focus writes a percentage on each of its
  lines where there is room and lists all of them in its tooltip; a pill with
  no room is left out, never stacked.
- **One cutoff control**, Strength (55 to 95), in the Show grid's free cell,
  shown only while Similarity is on, so the panel stays 451px in its 451px box.
- **Reset to defaults** covers the layout, the colour rule, the physics, every
  Show switch, the cutoff, the time filter, the minimap and the legend's
  hidden kinds; it keeps groups and saved views (things somebody made and
  named) and which folds are open. It shares the panel's last row with
  Suggest links, and its toast carries the Undo.

## Decision made, 2026-09-26: the hubs are named, over a dot if they must be

The label pass (`gcDraw`, `gcPlaceLabels`) placed a name under its dot or
not at all, and never over another dot. On the 417-note, 1,105-link fixture
that named none of the ten best-connected notes in view, at the fit (where
the zoom gate drew no label at all above 400 notes) or at 2x (30 labels, all
on the thin edge of the map, because in the dense middle "under" is always
another dot). Decided, and measured with `scratchpad/ui-sweeps/graphlabels.js`:

- **Four places, in order**: under, above, right, left. The first free of
  every placed label and every other dot wins. At 2x: 31 labels to 80.
- **Landmarks at the overview**: below the zoom gate on a map past
  `GC_LABEL_ALL_MAX`, the twelve best-connected notes in view with two or
  more links are still queued for a name. At the fit: 0 labels to 10.
- **The ten best-connected in view may sit on a dot**, and only they: they
  live where every place is on some other dot, and a map is read by them.
  Two names still never overlap (0 overlapping pairs at the fit and at 2x),
  every other label keeps the dot rule (0 on a dot), and a covered dot still
  takes the pointer, because a canvas label is paint and hit testing is on
  the notes. Hubs named: 0 to 10 of 10 at the fit, 0 to 9 of 10 at 2x.

## Decision made, 2026-10-03: the shape follows the links, and the unlinked sit on a ring

INBOX 443 (1) (the owner: "the graph shape could look nicer"), measured with
`scratchpad/ui-sweeps/graphlook.js` on 60 notes in 5 categories, 10 unlinked,
1440x900, and on a 300-note fixture whose links ignore categories:

- **The category gather scales with how category-shaped the links are**
  (`groupCohesion`, graph-worker.js): the share of non-similarity links joining
  two notes of one category. At 0.6 or more the pull is 0.05 and the ring 28
  per root of the count (the nearest-four colour purity rose 0.56 to 0.84); at
  0.2 or less it is the old 0.025 and 22. A flat 0.05 doubled the 300-note
  fixture's crossings, so it is not flat.
- **Unlinked notes have seats** on a ring that follows the cluster's outline
  (36 angle bins, smoothed by the widest neighbour), each category's on the arc
  facing its own place, evenly spaced, a second ring when an arc is full. Gap to
  the nearest linked note, in the cluster's own median spacings: 3.0 to 1.8.
- **Links wear a category.** Same colour at both ends takes that colour;
  a bridge stays neutral; a reasoned link is 1.9px at 0.62; curved by default
  (a note that never touched the switch is on). Tapered strokes were not built:
  a taper is one polygon per link, and the batched stroke per colour is what
  keeps a 2,000-link map inside a frame.
- **One size scale, 5 to 15**, and a glow at roughly two thirds of its old
  strength.
- **Not changed, on purpose:** the fit (`fitGraphToView` pads each dot by its
  radius plus 34 for its label, a decision from the "gap at the bottom" report);
  the server's 40-character preview, so the whole name on hover is as long as
  the server sends.

## Decision made, 2026-10-04: names on plates, clear of lines, and a calmer palette

INBOX 493 (the owner: "is there a way to make my graphed notes look
nicer??", a screenshot with labels in white over the lines). Measured with
`scratchpad/ui-sweeps/graphlook.js` (60 notes, 1440x900) and
`graphlabels.js` (417 notes):

- **A name stands on a plate**: its box in the card's colour at 0.88, 4px
  corners, in place of the 3px card stroke around each glyph, which left a
  line under a name showing between its letters.
- **Placement knows the lines**: eight places (under, above, beside, the four
  corners); the first free of labels, dots and lines wins, else the one
  crossing the fewest. Label-line crossings 43 to 28, names on a line 14 of
  15 to 12 of 19. Not while the layout moves (the grid would rebuild every
  frame); the names cross-fade to their places when it settles. Cost on the
  417-note map, settled: a frame 3.3 to 4.1ms at the fit, 2.6 to 4.9ms at 2x.
- **The automatic palette at 78% saturation**, same hue and lightness, so
  contrast is unchanged; a chosen colour is drawn as chosen.
- **Not changed:** the reasoned link's accent stroke (1.9px at 0.62, the
  decision above), the loudest thing left on the map.

## Decision made, 2026-10-04: a Display fold

The owner asked for Label backgrounds as a switch, and 514 adds Arrows and two
display sliders; the Show grid could not take them (the panel already scrolled
closed, 632px in 492 at 1440x900). Decided: **how the map is drawn is a fourth
fold, Display**, on the 2026-09-20 rule (set once, then left): Labels, Label
backgrounds, Curved links, Cluster glow, then 514's Arrows, Text fade and Link
thickness; Length by similarity and Group by category move to Physics (they are
forces) beside Link force, so Show stays four rows. Off, Label backgrounds draws each name
on the old 3px card-coloured outline; the placement keeps it clear of lines
either way (`scratchpad/ui-sweeps/graphplates.js`: 19 plates on, 19 outlines
off, off kept after a reload).

## Placed from INBOX, 2026-10-04: parity with Obsidian's graph

514 (parity with Obsidian's graph) and 518 (wiki link origin, the payload cache,
the fingerprint, similarity per note) are built: moved to HISTORY.md ("INBOX
resolved, 2026-10-04"). Arrows default off.

## The knowledge graph, 2026-10-04 (INBOX 528)

528. **The owner, 2026-10-04, verbatim.** "what I want to take from obsidian
     is how ideas, context, relationships, and similarities are stored,
     recognised, sorted, visualised etc. My graph and the backend knowledge
     graph needs to be waaayy better more versatile and have more features
     than both obsidian and notion". Placed here: the phases below (KG1 to
     KG9) are the brief; KG1 and KG2 are built first.

### (a) What exists (read in the code, 2026-10-04)

| Layer | Where | What it is | Gap |
| --- | --- | --- | --- |
| Links | `core/database.py` `EntryLink` | source, target, `reason` (free text), `reason_confidence` (deduced only), `link_type` (closed set of six, `LINK_TYPES`), `origin` ("wiki" or null); `link_strength` weights paths | no properties on a link; no inverse names; a type is undirected in the UI |
| Wiki links | `entry/manager.py` `sync_wiki_links`, `find_by_wiki_name`, `resolve_links_to`, `rewrite_wiki_name` | `[[name]]` resolves by vault stem then opening line; stale wiki links removed; rename rewrites holders | no aliases; ghosts only on the graph (`routes_graph._add_unresolved_nodes`) |
| Backlinks | `routes_entries._reference_rows_batch`, `/entries/{id}/connections`, `/references` | incoming notes, "links to it" vs "mentions it" | **no context sentence, no one-click link** for a note (documents have both: `routes_documents._backlinks`, `documents.js` `docLinkMention`) |
| Threads | `Entry.parent_id` | reply chains, a graph edge kind | fine |
| Entities | `ai/entities.py` `extract_entities_pass`, `Entity`, `EntityMention`, `routes_graph._add_entity_nodes` | free-text names from the utility model, membership only | no kind, no aliases, no merge, no entity page, no co-mention edge |
| Dates | `EntryDate` | resolved relative phrases | not a node or a relation |
| Facts | `DerivedFact` (claim, question) | spans with provenance and lifecycle | not linked to relations |
| Documents, maps, tags, attachments | `routes_graph._add_document_nodes`, `_add_map_edges`, `_add_tag_nodes`, `_add_attachment_nodes` | opt-in node kinds | fine |
| Categories, spaces | `Category`, `Space` | one category per note; spaces scope | no per-type fields |
| Similarity | `routes_graph._similarity_edges` (k=2 per note), `search_engine.cached_similar_pairs` | cosine over stored vectors, cached per matrix version | one signal, one reason string |
| Suggestions | `routes_entries.link_suggestions` (12 pairs, similarity only), `/tensions` (contradiction via local model), `learning` `dismiss_link` | accept or dismiss | **one signal**, and none at all with embeddings off; no co-mention, co-citation or time; no accept learning |
| Structure | `paths.clusters` (connected components, a decision), `hubs`, `orphans`, `pagerank`, `/graph/structure` cached | exact islands | no topics inside an island, no names, no summaries |
| Paths | `/graph/path`, `paths.find_many` | weighted Dijkstra with a per-hop phrase | the phrase is the link reason only |
| Properties | `core/docmeta.py` (documents' frontmatter, read-only) | none for notes | no fields, no types, no queries |
| Saved searches | `routes_settings` `saved_searches`, graph groups | text queries, colour groups | no property or relation operators |

### (b) Research (what each does that matters here)

- **Obsidian**: a backlinks pane with linked and unlinked mentions, each
  with its sentence, and a one-click Link
  ([Backlinks](https://help.obsidian.md/plugins/backlinks)); properties as
  typed YAML frontmatter ([Properties](https://help.obsidian.md/properties));
  Bases, table, cards and list views over properties with filters and
  formulas ([Bases syntax](https://help.obsidian.md/bases/syntax)); Dataview
  (community); Canvas; graph groups by query
  ([Graph view](https://help.obsidian.md/plugins/graph)). Edges are untyped;
  nothing is inferred.
- **Notion**: relation properties between database rows, two-way with a
  named inverse; rollups compute over related rows
  ([Relations and rollups](https://www.notion.com/help/relations-and-rollups)).
  No graph, no inference, no unlinked mentions.
- **Logseq**: block references and embeds, linked and unlinked references
  per page, queries over properties and tags ([docs](https://docs.logseq.com/)).
- **Tana**: supertags make a node a typed object with fields; search nodes
  are live queries over tags and field values
  ([Supertags](https://tana.inc/docs/supertags), [Fields](https://www.tana.inc/docs/fields),
  [Search nodes](https://tana.inc/search-nodes)).
- **Heptabase, Capacities**: object types (Person, Book, Meeting) with their
  own properties and pages; Heptabase draws only explicit relations and
  lists inferred ones beside the card.
- **Knowledge-graph tooling (GraphRAG)**: model-extracted entities and typed
  relations with descriptions, Leiden communities, a precomputed summary per
  community ([overview](https://www.mintlify.com/microsoft/graphrag/concepts/overview)).
  On a small local model the extraction is the expensive, unreliable half
  and the community pass the cheap, reliable one, which sets the order here.

### (c) Gap table

| Capability | Obsidian | Notion | Here before | Target |
| --- | --- | --- | --- | --- |
| Backlinks with the sentence | yes | no | documents only | notes too (KG1) |
| Unlinked mentions, one-click link | yes | no | documents only | notes too (KG1) |
| Inferred relations with reasons | no | no | similarity only | five signals, each with reason and confidence (KG2) |
| Typed directional relations | no | two-way relations | six types, no inverse, no properties | custom types, inverse names, properties (KG3) |
| Note types with fields | properties | databases | none | types with field templates over frontmatter (KG4) |
| Entities | no | no | names only | kinds, aliases, merge, entity page, co-mention (KG5) |
| Communities and summaries | no | no | components only | named topics inside islands, model summary (KG6) |
| Live queries | Dataview, Bases | filters, rollups | text saved searches | property and relation queries, as list, table and graph (KG7) |
| Graph by relation type, hulls, path why | partial | no | partial | all three (KG8) |
| A suggestions inbox that learns | no | no | dismiss only | one inbox; accept and reject reweight signals (KG9) |

### (d) Target design (storage, recognition and cost, API, UI recipe, done-when)

**KG1. Backlinks with context; unlinked mentions to one-click links.**
Storage: none (read from text). Recognition: the documents scanner moves to
`entry/mentions.py` (`sentence_around`, `backlink_spans`) and is searched for
the note's name (opening line, heading marker off); one LIKE narrows, the
regex decides. Cost: one LIKE over notes and documents, 400 sources at most.
API: `GET /entries/{id}/backlinks` (`links`, `mentions`, each with `context`,
`hit_start`, `hit_end`, `start`, `end`); `POST /entries/{id}/mentions/link`
(`kind`, `id`, `start`, `end`) re-checks the span on the server, rewrites it
to `[[name]]` and saves through the manager (revision, wiki sync, event). UI:
two connection groups in the Notes rail, rows on the `.doc-backlink` recipe
with a `smallButton` Link. Done when: one click turns a mention into a
stored wiki link and it leaves the mentions list; a moved span answers 409
and writes nothing.

**KG2. Relationship recognition with explanations.** Storage: none new;
reads `EntryLink`, `EntityMention`, tags, `created_at`, vectors. Signals,
each a reason sentence and a 0..1 confidence: similarity (the cached pairs);
co-mention (shared entities, IDF weighted); co-citation (shared link
neighbours, Adamic-Adar); shared rare tags (IDF weighted, hub tags out);
written close in time (support only, never alone). Combined as a noisy-or,
ranked, one note anchoring two at most. Cost: linear in links and mentions,
except co-citation, the sum of degree squared. API: `/entries/link-suggestions`
rows gain `signals: [{signal, reason, confidence}]` and `confidence`, and the
list is no longer empty with embeddings off. UI: the suggestions panel lists
the reasons. Done when: a pair joined by two shared entities and a shared
neighbour is suggested, with both reasons, with the embedding backend off;
2k notes well under a second, measured.

**KG3. Typed directional relations with properties.** Storage:
`relation_types` (name, inverse, directed, colour, built_in); `EntryLink`
gains `props` (JSON text, ADD COLUMN). The six built-ins stay; a person adds
"part of / has part", "cites / cited by". Recognition: on accept, the
utility model may propose a type (one call, optional). API:
`/relation-types` CRUD; link create and patch take `link_type` and `props`.
UI: the link menu's type picker (`kebabMenu`), the inverse name on the
incoming row. Done when a custom type survives a backup round trip and shows
its inverse name.

**KG4. Note types with fields.** Storage: the note's text is the source of
truth (a `---` frontmatter block, Obsidian-compatible, so an imported vault
keeps its properties); `entry_properties` (entry_id, key, value, number,
date) is an index rebuilt on save; `note_types` (name, icon, colour, fields
JSON: text, number, date, note, list, checkbox); a `type:` property assigns
one. Cost: a parse per save. API: `/note-types` CRUD,
`/entries/{id}/properties`. UI: a property table under the note title
(`.settings-row`), relation fields as note pickers. Done when a vault's
frontmatter imports as properties and a type adds its fields to a new note.

**KG5. Entity layer.** Storage: `Entity` gains `kind` (person, place,
project, organisation, thing), `aliases` (JSON), `merged_into`.
Recognition: the extraction prompt asks for `name|kind`; exact and alias
matches merge on their own, near matches (token-sort ratio 0.9 or more) go
to KG9 as merge suggestions. An entity page: mentions with context (KG1's
scanner), co-mentioned entities, its dates. Done when "Sam" and "Sam Lee"
merge and every mention follows.

**KG6. Topics and summaries.** Cached per fingerprint like
`/graph/structure`. Label propagation inside each component (seeded, in id
order), named by the top IDF tags, entities and title words; a local-model
summary per topic on demand, cached by its members. Components stay the
clusters (the 2026-09 decision stands); topics are a labelled second layer.
Cost: O(edges x iterations). API: `/graph/structure?topics=1`. UI: hulls on
the canvas, legend chips. Done when a two-topic fixture splits into two
named topics.

**KG7. Saved live queries.** A grammar in the search box: `type:meeting`,
`prop:status=open`, `links:[[X]]`, `rel:contradicts`, `entity:"Sam"`,
`tag:x`, `-` negates. Stored with saved searches; results as a list, a table
(properties as columns) and a graph filter. Done when one query gives the
list, the table and the graph the same ids.

**KG8. Graph filters and path explanations.** Filter chips by relation type
and property; topic hulls; every `/graph/path` hop says each KG2 signal that
joins the pair, not only the link reason.

**KG9. A suggestions inbox that learns.** One sheet: link suggestions,
tensions, entity merges, type suggestions. Accept writes the link with
`reason` and `reason_confidence` from the signals and records `accept_link`;
reject records `dismiss_link`; each signal's weight moves with its
acceptance rate (Laplace smoothed, bounded 0.5x to 1.5x).

### (e) Phases, build order

1. KG1, backlinks with context and one-click mentions: built 2026-10-04,
   moved to HISTORY.md ("Moved from the plans, 2026-10-04 (the knowledge
   graph, INBOX 528)").
2. KG2, multi-signal recognition with explanations: built 2026-10-04, moved
   to HISTORY.md (the same section as KG1).
3. KG9, the inbox and accept learning: built 2026-10-04, both parts moved
   to HISTORY.md (the same section as KG1).
4. KG5, entity kinds, aliases, merge, entity page: built 2026-10-04, moved
   to HISTORY.md (the same section as KG1).
5. KG6, topics, names, hulls, summaries: built 2026-10-04, both parts
   moved to HISTORY.md (the same section as KG1).
6. KG3, relation types with inverses and properties: built 2026-10-04,
   moved to HISTORY.md (the same section as KG1).
7. KG4, properties and note types: built 2026-10-04, moved to HISTORY.md
   (the same section as KG1).
8. KG7, live queries: built 2026-10-04, moved to HISTORY.md (the same
   section as KG1).
9. KG8, graph filters and path explanations. Path explanations built
   2026-10-04 (HISTORY.md, same section as KG1); open: filter chips by
   relation type and property (after KG3 and KG4).

One Opus session each, tests first, measured on a 2k fixture.

**Decisions made (recommendations taken):** a suggestion never links by
itself; every inferred relation carries a reason and a confidence, and the
reasons are the signals, not a model's prose; properties live in the note's
text and the table is an index; components stay the clusters, topics are a
labelled second layer; the structural signals work with embeddings off; one
mention scanner for notes and documents; a moved span is refused, never
guessed.

**Not to build:** a block model (notes are short and `[[Note#Heading]]`
exists); a second canvas (the whiteboard is one); model-extracted
entity-to-entity triples at notebook scale (slow and unreliable on a small
local model; typing happens on accept, one pair at a time); Leiden as a
dependency (label propagation in Python suffices at 10k); formulas and
rollups beyond count, sum, min, max, earliest and latest.
