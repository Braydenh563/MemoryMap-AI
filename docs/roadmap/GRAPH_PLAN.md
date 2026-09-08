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

### Phase 4 — utility (1 session)
Lasso select (Shift+drag) → a selection dock (tag, link, move to space,
make a mind map of these, open all); right-click menu on a node (open,
open beside, pin/unpin, hide, focus); a **local graph pane** that can sit
beside an open note or document (the same renderer at `size: "pane"`);
the time slider gains Play; export PNG at 2× of exactly the visible
frame, with the legend.

### Phase 5 — backend (½ session)
`/graph` returns `degree`, `cluster`, `age_days`, `space_id`, `map_ids`
per node; positions on `/graph/views`; `/graph/structure` cached per
notebook version; a `?since=` cursor; `tests/test_graph_api.py` covers
each field and the payload size for a 5k-note fixture (< 600 KB gzipped).

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
