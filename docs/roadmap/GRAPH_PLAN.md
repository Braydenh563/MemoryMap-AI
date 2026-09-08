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

---

## Built, Phase 3 (colour rules and groups), 2026-09-09

Measured with `scratchpad/ui-sweeps/graph3.js` on a six-note fixture
(canvas renderer; the SVG renderer behind its flag stays category-only).

- **Colour by is a rule.** The two radios became a select: Category,
  Cluster, Kind, Age, Space, First tag, Has a file. Every note on `/graph`
  now carries `kind`, `tags`, `space_id` and `has_file` (one query for the
  file rule, never a join per node), and the age buckets read `created_at`
  on the client. The legend follows the rule and every entry toggles the
  notes it names: hiding the tag "uni" took the map from 6 notes to 4,
  with the entry marked off.
- **Groups.** A saved search painted one colour, added in the display
  options panel, resolved on every render through `GET /graph/match?q=`
  (the keyword engine, ids only; `/entries?q=` filters only in semantic
  mode), listed first in the legend with its count, and hidden or shown
  from there. A group paints over the rule for the notes it matches. Up
  to eight groups, one colour each.
- **Saved views** store the rule, the hidden legend keys and the groups,
  and restore all three.

Not verified: the rule scales in dark theme (the palettes are fixed hex
by design, chosen to read on both grounds; `contrast.js` does not sample
canvas pixels); the SVG renderer with a non-category rule (it falls back
to category, by design, until it is retired).

## Built — Phase 1 (the canvas renderer and physical drag)

### What landed

- **`frontend/graph-worker.js`** — d3-force in a dedicated Worker. It takes
  nodes, edges and the two slider values, ticks on a self-scheduled timeout
  (a dedicated worker has no `requestAnimationFrame`), and posts a
  **transferred `Float32Array`** of interleaved x,y per frame; the main
  thread hands each buffer back so a 2,000-node map does not allocate 16 KB
  sixty times a second. Drag start raises `alphaTarget(0.3)` and pins, drag
  end sets `alphaTarget(0)` so the release decays. `forceCollide` from the
  drawn radius, `velocityDecay 0.4`, a weak `forceX`/`forceY` centre
  (0.015/0.02) rather than the SVG path's strong one. Gravity maps onto
  charge and spread onto link distance, both 1x at 50.
- **`frontend/graph-canvas.js`** — the Canvas 2D renderer, behind the same
  `renderGraph()` entry, on the same data, with the same ids and the same
  dock controls. Nodes are circles sized `4 + 2*sqrt(degree)` clamped to
  [4, 18] with degree counted client-side; edges are lines in the existing
  kind colours, batched into one `Path2D` per recipe; labels appear above
  zoom 1.4 or on hover, selection and search hits; hover dims every
  non-neighbour to 20%; `d3.quadtree` hit-testing rebuilt only when the
  positions moved; `d3.zoom` on the canvas with a filter that leaves a
  gesture starting on a node to `d3.drag`; DPR-aware sizing and a
  `ResizeObserver` on the card.
- **`scratchpad/graph-fixture.js`** (2,000 notes, ~4,000 links, ten
  categories, batched through the app's own `api()`) and
  **`scratchpad/ui-sweeps/graph.js`** (the gate).
- The fullscreen graph card is inset one spacing step and given
  `--radius-lg` instead of being a square-cornered 100vw x 100vh overlay —
  reported directly.

### Decisions made while building

- **`graphSvg` and `graphZoom` point at the canvas.** `d3.zoom` does not care
  what element it is attached to, so the zoom strip, the keyboard shortcuts,
  the minimap, saved views and `fitGraphToView` all keep working with no
  change at all. This is the single decision that kept the carry-over list
  short.
- **Tree, radial and arc keep their computed positions and their curves.**
  `hierarchyPath`/`arcPath` already return SVG path data and `Path2D` reads
  it, so the curve maths is shared with the layout code rather than
  rewritten. The worker is not started for those layouts.
- **The map is framed twice**: immediately on the first tick, and again when
  the layout settles unless the viewer has zoomed in the meantime. Framing
  once at alpha < 0.08 (what the SVG renderer did) is about 110 ticks, which
  on this fixture was nine seconds of looking at a graph mostly outside the
  frame.
- **A drag freezes everything except the dragged note's own neighbourhood.**
  Freezing the whole map came from a real report (aiming at a moving target
  is not a gesture, and drag-to-link depends on aiming); freezing nothing is
  what §3 asks for (the neighbours follow). Freezing all but the neighbours
  is both.
- **The worker yields about as long as its tick took** (twice as long during
  a drag). See the numbers below: this was the difference between a map that
  could be dragged and one that could not.
- **`window.__graphDebug`** is a read-only getter returning a frozen
  snapshot: renderer, node and edge counts, layout, colour mode, transform,
  hovered id, hidden categories, time cutoff, trace ids, first/last frame
  ms, worker alpha, tick count and mean tick cost, and the first 40 radii,
  colours and positions. It exists so the gate can assert that a control
  changed *what is drawn* rather than only that the control moved. Nothing
  outside `graph-canvas.js` can write to it.
- **The SVG renderer is still here**, behind
  `localStorage["graph-renderer"] = "svg"`, because the gate below is not
  fully met on this machine. It is one commit to delete
  (`renderGraphSvg` and its helpers in `graph.js`, `#graph-svg` in
  `index.html`, `graphRenderer()`), and that commit should be the one that
  can also show the fps number met.

### The numbers (2,000 notes, ~4,000 links, one Chromium, same box)

Measured with `scratchpad/ui-sweeps/graph.js` against the fixture. **The box
was running at load average 6-10 on four cores throughout** (other work on
the same sandbox), which §7 anticipated: these are relative before/after
numbers, not promises.

| | SVG (before) | Canvas (after) |
| --- | --- | --- |
| First frame after `/graph` resolves | 2008.3 ms | **126.1 / 141.8 ms** |
| Frames per second during a 2 s drag | 3.0 | **6.2** |
| Worst frame gap during that drag | 1849.9 ms | **700.0 ms** |
| Renderer's own cost per frame | not separable | **8.6-12.4 ms** at 2,000 notes, **0.6-0.8 ms** at 200 |
| Frame rate, settled map, nothing being driven | never settles | **58.4-59.2 fps** |
| Export PNG | SVG clone + inlined styles + rasterise | `canvas.toBlob`, 1.16 MB |

Every control was driven and the drawing compared (canvas pixel hash plus
the debug state): the four layouts, colour by category and by cluster,
search highlight and clearing it, hide unlinked, labels on and off, the time
slider both ways, legend filtering, zoom in/out/fit, similarity edges, focus
mode and exiting it, trace and clearing it, the minimap (700 dots max,
coloured, with a live viewport rectangle), saved views, and PNG export. All
redrew.

### What the gate does not meet, and why

**"≥ 55 fps during a 2 s drag" and "no frame > 16 ms on a 200-note board"
are not met on this sandbox, and the measurement says the renderer is not
the reason.** The gate now measures the attribution directly (step 2b):

- with the layout hot: **7.9 fps**, p50 frame gap 117 ms, **draw 8.6 ms**,
  worker tick 65 ms;
- with the worker stopped and *nothing else changed*: **59.2 fps**, p50 gap
  17 ms, draw 12.4 ms;
- restarted: back to 2.9 fps.

So the main thread is roughly 10% busy in both cases and the page still
cannot get frames while the simulation runs. On a 200-note board the numbers
are starker: the renderer draws in **0.6-0.8 ms** (worst 1.9-4.9 ms, inside
the 16 ms budget by an order of magnitude) and a tick costs 1-12 ms, and the
page still only reaches 6-9 fps *during* a drag while reaching 58.4 fps
settled. The limit is the machine's ability to run any sustained background
work alongside a 60 Hz frame loop, not the graph.

Three things were changed because of these measurements, and all three are
real improvements regardless of the box: the worker's duty cycle (it used to
hold its thread flat out and took an *idle* map to 2.5 fps),
`forceManyBody.distanceMax(900)` and `theta(1.1)`, and the minimap sampling
at most 700 dots instead of rebuilding 2,000 SVG circles per repaint.

### Not carried over from the SVG renderer

Listed rather than silently dropped:

1. **Radial and arc labels are not rotated onto the spoke** — they are drawn
   centred under the node. Tree labels do sit beside the node.
2. **The halo is a flat translucent disc, not a blurred one.** `ctx.filter =
   blur()` per node is not affordable; the disc reads the same at the sizes
   involved.
3. **The "orb shine" radial-gradient highlight on each node is gone.**
4. **The semantic-zoom cluster blobs** (the category super-nodes the SVG path
   faded in below zoom 0.45) are gone. Colour by cluster still works; this
   was a second, unrelated overlay.
5. **The "Favourite" text badge above a pinned node** is now the warn-coloured
   ring alone.
6. **An edge's `<title>` tooltip** (its reason on hover) is gone; clicking a
   link edge still opens the management panel that shows and edits it. Node
   tooltips are kept, on the canvas element itself.
7. **`frameTree` cannot measure a bounding box** on a canvas, so a tree is
   framed from node extents rather than from the drawn labels. Long labels
   can sit slightly outside the first frame.
8. `#graph-svg`'s own click and dblclick handlers in `app.js` are inert while
   the canvas is showing; the canvas carries equivalents.

### What was not verified

- **No claim here rests on looking at a screenshot.** Every visual statement
  above is either a pixel hash, a `getComputedStyle`, or a number off
  `__graphDebug`. Nothing in this phase was checked by eye, so *how it looks*
  — whether the dimming reads well, whether the labels are legible at 1.4x,
  whether the halo without its blur looks flat — is unverified.
- The dark theme was not measured (`contrast.js` was not run on the canvas).
- Touch and pinch were not exercised; `touch-action: none` and d3's pointer
  handling are inherited from the SVG surface's own rules, not tested.
- Entity, document and mind-map nodes were not on the fixture, so their
  dashed and dotted rings are drawn from the transcribed recipes and were
  never seen.
- No second browser: Chromium only.
- Two gate steps flaked once each under load (similarity edges, clearing a
  trace between two notes that turned out not to be connected); both were
  given longer settles and better reporting rather than being chased.

### Phase 2, measured before starting it

Three of the four things Phase 2 lists are already true and were confirmed
rather than assumed: the page does not scroll on Graph (`scrollHeight` equals
the viewport on all axes), the card already fills the tab (767 px of an
807 px tab), and the minimap and zoom strip are already absolutely
positioned over the canvas. What is left is the dock, the stats line and the
legend row, which are still in flow above the map: **the map gets 530 px of
the card's 767 px, so 31% of the tab is chrome.** That, and the stats line
becoming a chip in the dock, is the real content of Phase 2.

---

## Built, Phase 2 (the space)

The phase is complete. The space landed first (below); the gear button
(INBOX 21), the options panel (INBOX 41), the spread, full screen (INBOX 29)
and the label collision pass with its probe (INBOX 27) landed in the session
after it, and the hover-during-a-pan bug (INBOX 28) was fixed on the branch
and confirmed here rather than assumed. What is left of the graph is Phases 3
to 5 and the list in `docs/roadmap/agent-remaining/graph.md`.

### What landed

- **One floating column, `.graph-overlay`** (index.html, and the section at
  the end of `frontend/css/02-chat-graph.css`), holding the dock, the help
  panel, the options panel, the trace strip and the link suggestions over the
  map on the app's popover shell: `--modal-bg-opaque` ground, `--radius-lg`,
  `--glass-shadow`, the recipe `.doc-dock-menu-list` already uses. The column
  is `pointer-events: none` and its children are not, so the gaps between the
  panels are still map and a drag that starts in one pans the graph.
- **The legend floats bottom left** on the same shell, clear of the zoom
  strip, and is gone (not an empty box) when collapsed or when the notebook
  has no categories.
- **The stats line is a chip in the dock's identity zone.** `.dock-chip` is
  general, not a graph class: a count or a readout beside a dock's title,
  never a control, truncating rather than wrapping the row, hidden below
  600px with the sibling link beside it.
- **The card pads nothing and the map has no border of its own.** One
  hairline on the outermost pane, which is what DESIGN.md asks for.
- **Full screen fills the screen again**, and keeps the card's own corner.

### Decisions made while building

- **The whole card, not a reserved strip.** The dock floats over the map
  rather than the map being inset below it: an inset gives the same pixels
  back to chrome under a different name, and a map application (every one of
  them) floats its controls.
- **Opaque, not glass, for the floating panels.** The panels sit over a
  canvas that repaints every frame; `--modal-bg`'s 4% see-through leaves the
  nodes under a panel legible as ghosts through the words, and three stacked
  blurred layers over a live canvas is paint nobody sees.
- **The minimap keeps its four corners and its top-left default**, with the
  two top corners pushed down past the floating dock by
  `--graph-chrome-top`. Bottom left is now the legend's, which is a collision
  the corner setting exists to let someone step out of.

### The numbers (1440x900, a 35-note fixture, `scratchpad/ui-sweeps/graph2.js`)

| | before | after |
| --- | --- | --- |
| Map, share of the card's height | 588 of 767 px, 76.7% | **765 of 767 px, 99.7%** |
| Map, share of the card's area | 74.0% | **99.6%** |
| Page scroll on Graph | 900 = 900, none | **900 = 900, none** |
| Full screen: the card | 1424x371 at y=264 | **1424x884 at y=8** |
| Full screen: the map | 192 px, 51.8% of the card | **882 px, 99.8%** |
| The card's corner, tab vs full screen | 14px vs 11.2px | **14px vs 14px** |

The plan's own "measured before starting it" number (530 px of 767) was taken
with the options panel open; 588 px is the same card with it closed.

**Why full screen was not full screen**, since it is a trap worth writing
down: `.card` resolves `align-self: center`, and for an absolutely positioned
box the self-alignment properties apply *inside the inset-modified containing
block*. With `height: auto` that means shrink-to-content and centre, not
stretch. `inset: var(--space-3)` computed top and bottom of 8px and the box
still came out 371px tall at y=264, which is content height, centred.
`align-self: stretch` is the fix.

### What was not verified

- **Light theme only, and one width.** `contrast.js` was not run on the new
  floating panels, and 1440x900 is the only viewport measured. The phone
  rules (the column's smaller inset, the hidden stats chip) are reasoned, not
  measured.
- Nothing here was looked at. Every number above is a `getBoundingClientRect`
  or a `getComputedStyle`; how the floating panels *read* over a moving map,
  whether the legend fights the minimap at bottom left, and whether the dock
  covers nodes people want at the top of the map are all unseen.
- `errors.js` and `docks.js` were not run after the change.

### What landed after it, the rest of the phase

- **The display options are one click from the dock** (INBOX 21). A gear in
  the utilities run, after refresh and help and before the kebab, opening the
  panel as a popover anchored under it on the dock-menu shell. The View menu
  keeps layout, colour, legend and Trace, which was the decision already made.
  `tests/test_dock_grammar.py` stays green by its own rules: a utility is
  recognised by id (`*-refresh`, `*-help-toggle`) or the `dock-more` class, so
  the gear is outside the order it enforces, and `icon-only` keeps it out of
  the one-filled-button count. The panel closes the three ways every popover
  in this app closes, and its Escape is spent on the panel rather than also
  leaving full screen, which the full-screen handler's own comment had claimed
  since it was written.
- **The panel itself is a list, not a strip** (INBOX 41). Five named sections
  on `.dock-menu-section` (Physics, Show, Time, Minimap, Links), one row per
  setting, the words left and the control right, one control height and one
  label size down the panel. Three strip-era rules went with the old shape
  rather than being overridden (the physics group's inline row and its 0.8rem
  labels, the time group's width cap and flex sizing). Every id is unchanged.
- **The spread is scaled by the note count** (`densityScale` and
  `centreScale` in `graph-worker.js`, and `gcWorldFor`'s room per note from
  1.6 to 1.25). A fixed charge and link length gave a span that grew like
  sqrt(count), so the fit zoom fell the same way and any notebook opened as a
  field of dots.
- **Full screen hides the app chrome** (INBOX 29). The top bar, the tab bar
  and the status bar were still laid out behind a card that already covered
  the screen, and showing through its inset. Leaving the tab now leaves full
  screen too, so nobody lands on another tab with no tab bar.
- **Labels do not stack, and the probe says so** (INBOX 27). The draw pass
  landed a session earlier without its probe; the boxes it places are now on
  `__graphDebug` and `graph2.js` does the overlap test. It found that a search
  matching most of the notebook rebuilt the pile through the search box: past
  twelve hits the labels are queued first and tested like everything else.

### The numbers after it (1440x900, light, settled, default sliders)

| | 35 notes before | 35 after | 300 before | 300 after |
| --- | --- | --- | --- | --- |
| World bounding box | 721 x 760 | **565 x 604** | 2162 x 1828 | **1269 x 1003** |
| Fit zoom | 0.80 | **0.90** | 0.30 | **0.60** |
| Notes inside the box at zoom 1 | 35/35 | 35/35 | 162/300 | **271/300** |
| Median nearest-neighbour gap | 84 px | 64 px | 53 px | 30 px |
| Gap over span (the "not one blob" guard) | 0.117 | 0.113 | 0.0245 | 0.0236 |
| Labels drawn of labels wanted | n/a | 17 of 21 | n/a | **45 of 264** |
| Overlapping label pairs | n/a | **0** | n/a | **0** |

Full screen, measured: `#top-bar`, `#tab-bar` and `#status-bar` at 0px and
not visible; the canvas 1422x882 against a viewport of 1440x900 less its 8px
gutters; the card's corner 14px in both states; out by the button, by Escape
and by leaving the tab all restore the card (1408x767), the canvas (1406x765)
and the chrome.

The options panel: 352x490 at (1063, 140), right edge on the dock's, five
sections, twelve rows at one height (30px) and one label size, no control past
its right edge, clear of the zoom strip and the minimap, 629px of list
scrolling inside a 488px box with the cut row in sight.

### What was not verified, after it

- **Light theme, 1440x900, Chromium.** `contrast.js` was run on the new panel
  in both themes and `errors.js` and `docks.js` after the change; no other
  width and no other browser.
- Nothing was looked at. Every number above is a rect, a computed style or a
  `__graphDebug` read.
- The 300-note fixture is the largest measured here. The world constant's
  change bites above about a thousand notes, where it is reasoned only.
- `#graph-physics` is read as a checkbox by the saved-views code
  (`graph.js` `physics: ...?.checked ?? true`), which is a span and now a
  section: saved views have always stored `physics: true` and restoring one
  has always been a no-op. Found here, not fixed; it is in
  `agent-remaining/graph.md`.
