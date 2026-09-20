// MemoryMap AI: the graph, drawn to a Canvas 2D surface.
//
// GRAPH_PLAN.md §4 ("Renderer: Canvas 2D first") and §5 Phase 1. This is the
// other half of `graph-worker.js`: the worker decides where the notes are,
// this paints them, and neither one touches the DOM per node.
//
// **Why this exists at all** (§2.1, measured before it was written): the SVG
// renderer builds one `<g>` per node with a circle, a halo, a shine and a
// label, plus two `<line>`s per edge, and rewrites every one of their
// attributes through d3's selection API on every tick. At a few hundred notes
// that is thousands of DOM attribute writes per frame on the same thread the
// pointer is being handled on, which is why dragging stuttered. Here a frame
// is a few hundred canvas path operations regardless of how many notes there
// are, and the simulation is not even on this thread.
//
// It is loaded as a classic script *after* graph.js and before app.js, so
// `renderGraph()` in graph.js can dispatch to `renderGraphCanvas()` by name at
// call time. Nothing in app.js's own top-level wiring names anything in here.
//
// What is deliberately shared with graph.js rather than re-implemented: the
// note popup, the new-note form, the link panel, trace, the minimap, saved
// views, keyboard driving, `fitGraphToView` and the tree/radial/arc layout
// maths. Those are all renderer-agnostic, they work on `graphNodesRef` and on
// `graphSvg`/`graphZoom`, and this file points those at the canvas.

// --- the drawing surface ------------------------------------------------------

//: **One surface, not a pile of module globals** (GRAPH_PLAN Phase 4, the
//: local pane). Everything the renderer needs to draw one graph into one
//: canvas lives on an object made here, and every function below is handed
//: the one it is working on. It used to be forty-odd module-level `let`s,
//: which is fine while there is exactly one canvas and impossible the moment
//: there are two: the pane beside a note and the tab would have written each
//: other's node array, transform, worker and hover state. `s = gcTab` as the
//: last parameter everywhere means the tab's own calls, and the sweeps',
//: read exactly as they did.
//:
//: `size` says which of the two this is. "full" is the tab: it owns the
//: chrome (the legend, the minimap, the stats line, the time slider, trace,
//: the keyboard) and writes the renderer-agnostic globals in graph.js that
//: the chrome reads. "pane" is the small one beside a note: same draw, same
//: worker, no chrome, and it touches none of those globals.
function gcSurface(options = {}) {
  return {
    size: options.size || "full",
    boxId: options.boxId || "graph-box",
    canvasId: options.canvasId || "graph-canvas",
    //: What a click on a node does on this surface. Null means the Graph
    //: tab's own behaviour (trace, link, the node popup).
    onNodeClick: options.onNodeClick || null,

    canvas: null, // the <canvas> element
    ctx: null,
    dpr: 1,
    dims: { w: 0, h: 0 },
    observer: null,
    drawQueued: false,
    minimapQueued: false,
    //: The pan/zoom behaviour and the d3 selection it is attached to. The tab
    //: also publishes these as `graphSvg`/`graphZoom`, which is what every
    //: camera helper in graph.js drives; a pane keeps them to itself.
    svg: null,
    zoom: null,
    //: The live pan/zoom matrix. Kept here as well as on the element (d3
    //: stores it there) because every draw needs it and `d3.zoomTransform` is
    //: a property lookup plus a null check on a hot path.
    transform: null,

    worker: null,
    //: **Which simulation a message from the worker belongs to.** Bumped every
    //: time the node array is replaced, sent with each `init`, and echoed on
    //: every tick. A `{type:"stop"}` cannot unsend a tick already posted (both
    //: directions of `postMessage` are asynchronous), and the tick handler
    //: writes positions *by index*, so a tick from the previous run landing
    //: after a relayout overwrites the new positions with the old ones.
    //: Measured: the tree switched to 500 ms into a warm force simulation came
    //: back with its depth-1 nodes spread over 351 px and its depth-2 nodes
    //: over 778 px, where a tree has every node of one depth at one x. That is
    //: the scatter reported as "the tree view on the graph is still broken",
    //: and it also explains why it was intermittent: at six other moments in
    //: the same cooling curve the same switch was clean. A computed layout
    //: never sends an `init` at all, so its epoch can match nothing and every
    //: tick arriving under it is dropped.
    epoch: 0,
    //: A slow payload that has been overtaken by a newer render must not paint
    //: over it. A canvas has nothing to clear, so this is the guard.
    renderSeq: 0,

    //: The drawing's own copy of the graph. On the tab `nodes` is the same
    //: array `graphNodesRef` points at, so everything in graph.js that walks
    //: the nodes (the keyboard, the minimap, `fitGraphToView`, drag-to-link)
    //: sees exactly what is on screen. Edges have their `source`/`target`
    //: resolved to node objects once per render rather than per frame.
    nodes: [],
    edges: [],
    adj: new Map(),
    byId: new Map(),
    quadtree: null,
    quadtreeDirty: true,
    layoutKind: "force",
    tree: null, // the laid-out hierarchy for tree/radial/arc, else null
    timeCutoff: null,
    colourOf: () => "#888",

    //: Set while a pan/zoom gesture is in flight, so a node sliding under a
    //: stationary cursor does not register as a hover. Same reasoning the SVG
    //: renderer's `graphIsPanning` carries; here it is cheaper, because there
    //: is no CSS `:hover` to fight as well.
    panning: false,
    wired: false,
    dropTarget: null,
    dragNode: null,
    //: The node the pointer is over. The tab mirrors it into
    //: `graphHoveredId`, which the SVG renderer and the node popup read.
    hoveredId: null,
    hoverTo: null, // the node id growing
    hoverFrom: null, // the node id shrinking back
    hoverStart: 0,
    hoverEase: 1, // 0 to 1 across the two above

    //: GRAPH_PLAN Phase 4. A lasso (Shift and drag on empty map) selects
    //: notes; the selection dock acts on them. `lasso` holds world points
    //: while a lasso is being drawn, `selected` the ids it caught (or
    //: Shift-clicks added). `hiddenIds` is the right-click "Hide" for this
    //: visit only: it is not a saved preference, and the legend says how many
    //: are hidden. All three are the Graph tab's; a pane wires none of them.
    selected: new Set(),
    lasso: null,
    hiddenIds: new Set(),

    //: "the camera has framed this graph once already". The tab keeps the same
    //: fact in `graphAutoFitDone`, which switchTab clears on a fresh visit; a
    //: pane has no tab visit to hang it on and keeps its own. `fittedOnce` and
    //: `userZoomed` are why there are two fits and why the second one is
    //: conditional: see the tick handler.
    autoFitDone: false,
    fittedOnce: false,
    userZoomed: false,

    //: Timing for the gate (§5 Phase 1) and for `window.__graphDebug`.
    //: `firstFrame` is measured from the moment the payload has arrived to the
    //: end of the first paint, which is what the plan's "< 300 ms after data
    //: arrives" means.
    timing: { dataAt: 0, firstFrame: 0, lastFrame: 0, frames: 0 },
    //: The last thing the worker said about itself: how hot the layout still
    //: is, and how many steps it has taken. Reported on the debug surface
    //: because a slow-looking map is two separable questions, is the
    //: simulation crawling or is the paint dropping frames, and guessing which
    //: cost a round of theorising before this was here.
    alpha: 0,
    ticks: 0,
    tickMs: 0,
    //: How many labels the last frame wanted, how many it could place without
    //: one landing on another, and how many of those were asked for by name
    //: (the hovered or keyboard-focused note, and the search hits, which are
    //: drawn whether or not they clash). On the debug surface because "the
    //: labels are unreadable" and "the labels are fine" look identical from
    //: outside the canvas. `labelBoxes` is what the last frame actually
    //: placed, in world coordinates, read by `scratchpad/ui-sweeps/graph2.js`.
    labelsWanted: 0,
    labelsDrawn: 0,
    labelsPriority: 0,
    labelBoxes: [],
  };
}

//: The Graph tab's surface: the one every existing caller means.
let gcTab = gcSurface({ size: "full", boxId: "graph-box", canvasId: "graph-canvas" });

//: **Where a surface ends and the tab's globals begin.** Three facts are read
//: outside this file by things that only ever meant the tab: whether the
//: camera has framed the map already (`graphAutoFitDone`, cleared by
//: switchTab on a fresh visit) and which node the pointer is over
//: (`graphHoveredId`, read by the SVG renderer and the node popup). The tab's
//: surface writes through to both; a pane keeps them to itself, so hovering a
//: note in the pane cannot light a node up on the tab behind it.
function gcAutoFitDone(s) {
  return s.size === "full" ? graphAutoFitDone : s.autoFitDone;
}

function gcSetAutoFitDone(s, value) {
  if (s.size === "full") graphAutoFitDone = value;
  else s.autoFitDone = value;
}

//: Which node the keyboard is on. `graphKeyboardId` is driven by the Graph
//: tab's own arrow-key handler, so it means nothing on a pane and must not
//: draw a focus ring there on whichever note happens to share the id.
function gcKeyboardId(s) {
  return s.size === "full" ? graphKeyboardId : null;
}

function gcSetHovered(s, id) {
  s.hoveredId = id;
  if (s.size === "full") graphHoveredId = id;
}

//: **The tab's state under its old names**, for graph.js's renderer-agnostic
//: helpers and for the sweeps in `scratchpad/ui-sweeps/`, both of which read
//: `gcNodes`, `gcTransform`, `gcSelected` and friends as bare globals. They
//: were module-level `let`s until the surface object above; these getters keep
//: every one of those readers working, and read-only, against the tab.
for (const [name, prop] of [
  ["gcNodes", "nodes"],
  ["gcEdges", "edges"],
  ["gcAdj", "adj"],
  ["gcById", "byId"],
  ["gcCanvas", "canvas"],
  ["gcCtx", "ctx"],
  ["gcDims", "dims"],
  ["gcTransform", "transform"],
  ["gcSelected", "selected"],
  ["gcLasso", "lasso"],
  ["gcColourOf", "colourOf"],
  ["gcTimeCutoff", "timeCutoff"],
  ["gcLayoutKind", "layoutKind"],
  ["graphHiddenIds", "hiddenIds"],
]) {
  Object.defineProperty(window, name, { configurable: false, get: () => gcTab[prop] });
}


//: The app's colour tokens, read once per render. One document, one theme,
//: so every surface reads the same ones.
let gcTokens = {};

//: Node radius, GRAPH_PLAN.md §5 Phase 1: `4 + 2*sqrt(degree)`, clamped to
//: [4, 18]. Degree is counted client-side from the edges until Phase 5 sends
//: it on the payload. The SVG renderer sized by PageRank centrality instead,
//: which is a number the reader cannot verify by looking, degree is "how many
//: lines come out of this dot", which is the one thing a graph makes visible.
const GC_MIN_RADIUS = 4;
const GC_MAX_RADIUS = 18;
function gcRadius(node, degree) {
  if (node.isGroup) return node.id === "root" ? 14 : 11;
  const d = degree || 0;
  return Math.max(GC_MIN_RADIUS, Math.min(GC_MAX_RADIUS, 4 + 2 * Math.sqrt(d)));
}

//: Zoom at which labels come on by themselves (§5 Phase 1). Below it a label
//: is unreadable anyway and 2,000 of them are a grey wash; above it there is
//: room for them. A hovered or spotlit node always shows its own.
const GC_LABEL_ZOOM = 1.4;
const GC_LABEL_ALL_MAX = 400;
//: How many search hits are still few enough to be answers rather than a
//: filter, and so are drawn even where they overlap something already there.
//: See the label pass in `gcDraw` for what happens past it.
const GC_LABEL_FORCE_MAX = 12;
//: How far a non-neighbour dims while something is hovered (§5 Phase 1).
const GC_DIM_ALPHA = 0.2;

//: Every colour comes from the app's tokens (§6). Read off the canvas element
//: rather than `:root` so whatever cascade actually applies, theme, a user
//: theme, the dark-mode block, is the one that answers.
function gcReadTokens(s = gcTab) {
  const style = getComputedStyle(s.canvas || document.documentElement);
  const get = (name, fallback) => (style.getPropertyValue(name) || "").trim() || fallback;
  gcTokens = {
    muted: get("--muted", "#8b93a7"),
    accent: get("--accent", "#4f7cff"),
    error: get("--error", "#d2453c"),
    ok: get("--ok", "#2f9e6b"),
    warn: get("--warn", "#c98a17"),
    ink: get("--ink", "#1b1f2a"),
    card: get("--card", "#ffffff"),
    font: get("--font-sans", "system-ui, sans-serif"),
  };
}

//: The edge recipes, transcribed from `.graph-edge*` in
//: css/02-chat-graph.css and `.graph-edge-filing` in
//: css/06-timeline-dialogs.css. Transcribed rather than read back out of the
//: cascade because a canvas has no elements to ask: there is no
//: `.graph-edge-similar` in the DOM to run `getComputedStyle` against. The
//: colours still come from tokens (above), so a theme change moves both.
const GC_EDGE_STYLES = {
  link: { width: 1.4, alpha: 0.42, dash: null, colour: "muted" },
  thread: { width: 1.4, alpha: 0.55, dash: [7, 4], colour: "muted" },
  similar: { width: 1.2, alpha: 0.55, dash: [2, 5], colour: "accent" },
  map: { width: 1.3, alpha: 0.7, dash: [1, 4], colour: "accent" },
  filing: { width: 1.6, alpha: 0.25, dash: [3, 3], colour: "muted" },
  entity: { width: 1.6, alpha: 0.55, dash: null, colour: "muted" },
  document: { width: 1.6, alpha: 0.55, dash: null, colour: "muted" },
};
const GC_EDGE_REASONED = { width: 1.5, alpha: 0.5, dash: null, colour: "accent" };
const GC_EDGE_CONTRADICTS = { width: 2.2, alpha: 0.85, dash: [6, 4], colour: "error" };

function gcEdgeStyle(edge) {
  if (edge.link_type === "contradicts") return GC_EDGE_CONTRADICTS;
  if (edge.kind === "link" && edge.reason) return GC_EDGE_REASONED;
  return GC_EDGE_STYLES[edge.kind] || GC_EDGE_STYLES.link;
}

// --- the surface, sized for the device ----------------------------------------

//: DPR-aware sizing. A canvas has two sizes, the CSS box and the pixel
//: buffer: and getting that wrong is the single most common way a canvas
//: renderer ships blurry. The buffer is the box times the device pixel ratio,
//: and every draw starts by scaling the context by the same number so the
//: drawing code can go on thinking in CSS pixels.
function gcResize(s = gcTab) {
  if (!s.canvas) return false;
  const box = document.getElementById(s.boxId);
  const width = (box && box.clientWidth) || 800;
  const height = (box && box.clientHeight) || 540;
  const dpr = window.devicePixelRatio || 1;
  if (width === s.dims.w && height === s.dims.h && dpr === s.dpr) return false;
  s.dims = { w: width, h: height };
  s.dpr = dpr;
  s.canvas.width = Math.max(1, Math.round(width * dpr));
  s.canvas.height = Math.max(1, Math.round(height * dpr));
  s.canvas.style.width = `${width}px`;
  s.canvas.style.height = `${height}px`;
  //: graph.js's camera helpers (`fitGraphToView`, the zoom strip, the minimap)
  //: read the tab's size from `graphDims`. A pane must not move it under them.
  if (s.size === "full") graphDims = { w: width, h: height };
  return true;
}

function gcEnsureCanvas(s = gcTab) {
  if (s.canvas) return s.canvas;
  s.canvas = document.getElementById(s.canvasId);
  if (!s.canvas) return null;
  s.ctx = s.canvas.getContext("2d");
  s.transform = d3.zoomIdentity;
  gcResize(s);
  // The card resizes for reasons no `resize` event fires for: the sidebar
  // opening, the legend collapsing, fullscreen. A ResizeObserver is the only
  // thing that sees all of them (§5 Phase 1 asks for one by name).
  if (!s.observer && typeof ResizeObserver !== "undefined") {
    s.observer = new ResizeObserver(() => {
      if (gcResize(s)) gcRequestDraw(s);
    });
    const box = document.getElementById(s.boxId);
    if (box) s.observer.observe(box);
  }
  gcWireInteraction(s);
  return s.canvas;
}

// --- hovering a node -----------------------------------------------------------
//: Asked for: "can you make graph nodes temporarily expand to fill their glow
//: bubble when I hover over them or smth?? I feel like the graph nodes could
//: look slightly nicer, cooler, more professional and more modern. visually".
//:
//: Every node is already drawn with a halo 6px outside its core, and until now
//: the only thing hovering one changed was a ring around it. The dot now grows
//: out to that halo and the halo steps a little further out and brightens, so
//: the glow stays a glow around the node rather than something the node has
//: swallowed.
//:
//: **Animated here rather than in CSS.** The SVG renderer could do this with a
//: `:hover` rule; this one paints to a canvas, which has no elements to hover
//: and no transitions. So the eased value is held as one number and the draw
//: loop is asked for frames only while it is moving: `gcHoverFrom`/`gcHoverTo`
//: name the node it is leaving and the node it is entering, and both are
//: eased, so moving the pointer straight from one node to the next shrinks the
//: first while the second grows instead of snapping.
//:
//: The cost is bounded by construction: at most two nodes are ever mid-ease,
//: the animation is 140ms, and when nothing is easing `gcHoverEase` is exactly
//: 1 and no frames are requested at all.
//: **Toned down after the first version was shown.** The owner: "the halo
//: growth on the nodes is a bit visually jarring tbh". It was the full 6, so
//: the smallest nodes jumped 67% wider in 140ms while their halo pushed out
//: another 3 and brightened by half again: three things moving at once, and
//: the smaller the node the louder it read. Half the distance, half the light
//: and a little longer to travel it keeps the gesture (the node comes forward
//: under the pointer) without the pop.
//: **A node is a sprite, not three arcs.** The owner on the flat discs with
//: a halo ring: "the visual part of the main graph design needs a better
//: look", and on a first attempt with a highlight dot: "makes it look like a
//: bowling ball". So: one soft radial fill per node (a little lighter at the
//: centre, the category colour at the edge, no dot), a one-pixel rim a shade
//: darker than the fill so the disc has an edge against any background, and
//: a glow outside it that is wide and faint for a hub and narrow for a leaf.
//: Drawn once per colour and size into an offscreen canvas at the current
//: zoom and pixel ratio, then `drawImage`d, which is what keeps a
//: two-thousand-node map inside the frame budget: a radial gradient per node
//: per frame would not be.
const gcSpriteCache = new Map();

function gcHexToRgb(colour) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(colour || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function gcNodeSprite(colour, radiusPx, hub) {
  const r = Math.max(2, Math.round(radiusPx));
  const key = `${colour}|${r}|${hub ? 1 : 0}|${gcTokens.card}`;
  let sprite = gcSpriteCache.get(key);
  if (sprite) return sprite;
  if (gcSpriteCache.size > 600) gcSpriteCache.clear();
  //: Flat, like every other mark in the app (DESIGN.md: one fill, one edge,
  //: no rendered light): the category colour as a disc, a ring in the
  //: card's own colour so a node reads clear of the links it sits on, and
  //: for a hub only, a soft bloom of its colour behind it. A gradient body
  //: was tried and read as "fake or too realistic"; a highlight dot as "a
  //: bowling ball". Neither belongs in an interface of flat glass.
  //: Every node glows a little (the owner: "I didnt mind the soft glow");
  //: a hub's glow is wider and a shade stronger, which is how a hub is told.
  const glow = hub ? Math.round(r * 1.2) + 4 : Math.round(r * 0.7) + 2;
  const ring = Math.max(1, Math.round(r * 0.18));
  const half = r + ring + glow + 1;
  const size = half * 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext("2d");
  if (gcHexToRgb(colour)) {
    const bloom = c.createRadialGradient(half, half, r * 0.9, half, half, half);
    const rgb = gcHexToRgb(colour).join(", ");
    bloom.addColorStop(0, `rgba(${rgb}, ${hub ? 0.24 : 0.16})`);
    bloom.addColorStop(1, `rgba(${rgb}, 0)`);
    c.fillStyle = bloom;
    c.beginPath();
    c.arc(half, half, half, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = gcTokens.card || "#ffffff";
  c.beginPath();
  c.arc(half, half, r + ring, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = colour;
  c.beginPath();
  c.arc(half, half, r, 0, Math.PI * 2);
  c.fill();
  sprite = { canvas, half };
  gcSpriteCache.set(key, sprite);
  return sprite;
}

//: **A nebula behind each cluster.** The one thing a map of a notebook can
//: show that a list cannot is where the mass is, and seven clusters of
//: same-coloured dots say it only once the eye has done the grouping. A wide,
//: very faint radial wash of the cluster's colour behind each group does the
//: grouping for the eye, in the same language as the app's background art
//: (a soft field, not a drawn shape). Seven gradients a frame; a hull would
//: be a shape, and shapes lie about where a cluster ends.
function gcDrawNebulae(ctx, s, inView) {
  const nebulaBox = s.size === "full" ? gcEl("graph-nebula") : null;
  if (nebulaBox ? !nebulaBox.checked : localStorage.getItem("graph-nebula") === "0") return;
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  const groups = new Map();
  for (const node of s.nodes) {
    if (!Number.isFinite(node.x) || !gcVisibleAtTime(node, s)) continue;
    const g = groups.get(node.colour) || { colour: node.colour, xs: [], ys: [] };
    g.xs.push(node.x);
    g.ys.push(node.y);
    groups.set(node.colour, g);
  }
  //: Additive in dark mode, so two washes that overlap brighten where the
  //: clusters meet instead of muddying to brown; on a light ground the plain
  //: blend is the one that stays faint.
  const previous = ctx.globalCompositeOperation;
  if (dark) ctx.globalCompositeOperation = "lighter";
  for (const g of groups.values()) {
    if (g.xs.length < 3) continue;
    const rgb = gcHexToRgb(g.colour);
    if (!rgb) continue;
    const cx = g.xs.reduce((a, b) => a + b, 0) / g.xs.length;
    const cy = g.ys.reduce((a, b) => a + b, 0) / g.ys.length;
    let spread = 0;
    for (let i = 0; i < g.xs.length; i++) spread += (g.xs[i] - cx) ** 2 + (g.ys[i] - cy) ** 2;
    const radius = Math.sqrt(spread / g.xs.length) * 1.6 + 40;
    if (!inView({ x: cx, y: cy, r: radius })) continue;
    const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    wash.addColorStop(0, `rgba(${rgb.join(", ")}, ${dark ? 0.09 : 0.06})`);
    wash.addColorStop(1, `rgba(${rgb.join(", ")}, 0)`);
    ctx.fillStyle = wash;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = previous;
}

const GC_HOVER_GROW = 3;         // half the gap from a core to its own halo
const GC_HOVER_HALO_GROW = 1.5;  // and the halo keeps clear by the same half
const GC_HOVER_MS = 190;

//: `1 - (1 - t)^3`: fast away from the start, settling at the end. The same
//: shape as the `cubic-bezier(0.2, 0.8, 0.3, 1)` the stylesheet uses for the
//: SVG renderer's version of this, so the two renderers feel the same.
function gcEaseOut(t) {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) * (1 - c) * (1 - c);
}

//: Called when the hovered node changes. Whatever was growing starts
//: shrinking from wherever it had got to, so a fast sweep across a cluster
//: does not leave a node stuck large.
function gcHoverChanged(nextId, s = gcTab) {
  s.hoverFrom = s.hoverEase < 1 && s.hoverTo != null ? s.hoverTo : s.hoverFrom;
  if (s.hoverEase >= 1) s.hoverFrom = s.hoverTo;
  s.hoverTo = nextId;
  s.hoverStart = performance.now();
  s.hoverEase = 0;
}

//: How much bigger this node is drawing right now, in world units. Zero for
//: every node that is neither entering nor leaving the hover, which is all but
//: two of them.
function gcHoverGrow(node, base, s = gcTab) {
  if (node.id === s.hoverTo) return base * s.hoverEase;
  if (node.id === s.hoverFrom) return base * (1 - s.hoverEase);
  return 0;
}

//: Advances the ease and says whether another frame is owed. Called once per
//: draw, before anything is measured, so every radius in that frame agrees.
function gcHoverStep(s = gcTab) {
  if (s.hoverEase >= 1) return false;
  //: A reader who has asked for less motion gets the size change without the
  //: travel: the node is simply already large. Removing the growth as well
  //: would leave them with no hover feedback on this renderer at all, since
  //: there is no CSS here to give them a colour change instead.
  const still = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  s.hoverEase = still ? 1 : gcEaseOut((performance.now() - s.hoverStart) / GC_HOVER_MS);
  if (s.hoverEase >= 1) {
    s.hoverEase = 1;
    s.hoverFrom = null;
    return false;
  }
  return true;
}

// --- the draw ------------------------------------------------------------------

function gcRequestDraw(s = gcTab) {
  if (s.drawQueued || !s.ctx) return;
  s.drawQueued = true;
  requestAnimationFrame(() => {
    s.drawQueued = false;
    gcDraw(s);
    if (s.minimapQueued) {
      s.minimapQueued = false;
      graphMinimapFrame();
    }
  });
}

//: **The minimap rides the draw's frame.** A pan used to repaint it
//: synchronously on every pointer event: measured over a forty-move pan,
//: forty full repaints, each one four passes over every node and three
//: document lookups, plus up to 700 fresh `<circle>` elements. Only the last
//: of those can be seen, exactly as with the canvas itself, so it belongs in
//: the frame with the draw rather than in the event. What does happen in the
//: event is the thing that has to: `gcTransform` is the new matrix before the
//: handler returns, so anything reading the camera reads the current one.
function gcRequestMinimapFrame(s = gcTab) {
  //: There is one minimap and it belongs to the tab. A pane panning its own
  //: camera must not move the picture of a map it is not drawing.
  if (s.size !== "full") {
    gcRequestDraw(s);
    return;
  }
  s.minimapQueued = true;
  gcRequestDraw(s);
}

//: **Two controls that were read out of the document on every frame.** The
//: search box and the labels switch are static elements, and `gcDraw` walked
//: the document for both of them on every frame of every pan, drag and hover:
//: 41 lookups each over a forty-move pan. Cached by id, re-found if the node
//: is ever replaced, which is the same shape the whiteboard's selection-bar
//: lookup needed for the same reason.
const gcElCache = new Map();
function gcEl(id) {
  const hit = gcElCache.get(id);
  if (hit && hit.isConnected) return hit;
  const found = document.getElementById(id);
  if (found) gcElCache.set(id, found);
  else gcElCache.delete(id);
  return found;
}

//: What is dimmed and what is lit, in one pass, for the same reason the SVG
//: renderer's `applyGraphHighlight` does it in one pass: search, the "similar
//: notes" spotlight, a traced path and the hover neighbourhood are four
//: sources of the same signal, and two of them computed separately contradict
//: each other on screen.
function gcHighlight(s = gcTab) {
  //: Search, the spotlight and a traced path are the Graph tab's own
  //: controls. A pane beside a note has none of them, and inheriting them
  //: would dim a five-node local map to 20% because somebody left a search in
  //: the box on another tab.
  const chrome = s.size === "full";
  const search = chrome ? gcEl("graph-search") : null;
  const query = (search ? search.value : "").trim().toLowerCase();
  const onPath = chrome && graphTrace ? new Set(graphTrace.ids) : null;
  const ids = chrome ? graphHighlightIds : null;
  const searchOk = (n) =>
    onPath ? onPath.has(n.id) : ids ? ids.has(n.id) : !query || n.preview.toLowerCase().includes(query);
  const neighbours =
    s.hoveredId != null && s.adj ? s.adj.get(s.hoveredId) : null;
  const hoverOk = (id) => neighbours == null || id === s.hoveredId || neighbours.has(id);
  return {
    active: Boolean(query || ids || onPath),
    onPath,
    hovering: neighbours != null,
    searchOk,
    hoverOk,
  };
}

function gcVisibleAtTime(node, s = gcTab) {
  if (s.timeCutoff == null) return true;
  if (node.isGroup) return true;
  const at = new Date(node.created_at || Date.now()).getTime();
  return at <= s.timeCutoff;
}

// --- Phase 4: export at 2x with the legend ------------------------------------------
//: Re-renders the map into an offscreen canvas at `scale` times the screen's
//: pixel density by swapping the draw target for one frame (gcDraw reads
//: gcCtx and gcDpr; gcDims, the CSS size, stays the same, so the transform
//: is identical and nothing moves), then paints the legend and a caption
//: over it. Upscaling the live bitmap would only blur it.
function gcExportPng(scale = 2, s = gcTab) {
  if (!s.ctx || !s.canvas || !s.dims.w) return null;
  const out = document.createElement("canvas");
  out.width = Math.round(s.dims.w * s.dpr * scale);
  out.height = Math.round(s.dims.h * s.dpr * scale);
  const ctx = out.getContext("2d");
  const liveCtx = s.ctx;
  const liveDpr = s.dpr;
  ctx.fillStyle = gcTokens.page || (document.documentElement.dataset.mode === "dark" ? "#12141c" : "#eef1f5");
  ctx.fillRect(0, 0, out.width, out.height);
  try {
    s.ctx = ctx;
    s.dpr = liveDpr * scale;
    gcDraw(s);
  } finally {
    s.ctx = liveCtx;
    s.dpr = liveDpr;
  }
  ctx.setTransform(s.dpr * scale, 0, 0, s.dpr * scale, 0, 0);
  const rows = [...document.querySelectorAll("#graph-legend .legend-toggle:not(.legend-off)")]
    .map((item) => ({ text: item.textContent.trim(), colour: item.querySelector(".legend-dot")?.style.background || gcTokens.muted }))
    .filter((row) => row.text)
    .slice(0, 14);
  const noteCount = s.nodes.filter((n) => !n.isGroup).length;
  const caption = `${noteCount} note${noteCount === 1 ? "" : "s"} · ${new Date().toLocaleDateString()}`;
  ctx.font = "12px system-ui, sans-serif";
  const lineH = 18;
  const pad = 10;
  const width = Math.max(ctx.measureText(caption).width, ...rows.map((r) => ctx.measureText(r.text).width + 18)) + pad * 2;
  const height = (rows.length + 1) * lineH + pad * 2;
  const x = 12;
  const y = s.dims.h - height - 12;
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = gcTokens.card || "#ffffff";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = gcTokens.ink || "#111";
  ctx.textBaseline = "middle";
  ctx.fillText(caption, x + pad, y + pad + lineH / 2);
  rows.forEach((row, i) => {
    const cy = y + pad + lineH * (i + 1) + lineH / 2;
    ctx.fillStyle = row.colour;
    ctx.beginPath();
    ctx.arc(x + pad + 5, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = gcTokens.ink || "#111";
    ctx.fillText(row.text, x + pad + 18, cy);
  });
  return out;
}

function gcDraw(s = gcTab) {
  if (!s.ctx || !s.canvas) return;
  const started = performance.now();
  //: Advanced once, before anything is measured, so every radius in this frame
  //: agrees, and another frame is asked for only while it is still moving.
  const easing = gcHoverStep(s);
  const ctx = s.ctx;
  const t = s.transform || d3.zoomIdentity;
  const k = t.k;
  ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
  ctx.clearRect(0, 0, s.dims.w, s.dims.h);
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.scale(k, k);

  // Cull to the visible world rectangle. On a 2,000-note map zoomed in, this
  // is the difference between drawing 2,000 nodes and drawing forty.
  const margin = 80 / k;
  const view = {
    left: -t.x / k - margin,
    top: -t.y / k - margin,
    right: (s.dims.w - t.x) / k + margin,
    bottom: (s.dims.h - t.y) / k + margin,
  };
  const inView = (n) =>
    n.x >= view.left && n.x <= view.right && n.y >= view.top && n.y <= view.bottom;

  const hl = gcHighlight(s);
  const labelsOn = (() => {
    //: The labels switch is the Graph tab's. A pane is small enough that its
    //: handful of labels are the point of it, so they are always on there.
    if (s.size !== "full") return true;
    const box = gcEl("graph-labels");
    return box ? box.checked : true;
  })();

  gcDrawNebulae(ctx, s, inView);
  //: Read from the switch itself, like the labels above, so what the menu
  //: shows and what is drawn cannot disagree (the owner: "it is showing
  //: curved links even when it is visibly off??"); the stored value only
  //: stands in for a pane, which has no switch.
  const curvedBox = s.size === "full" ? gcEl("graph-curved") : null;
  const curvedLinks = curvedBox ? curvedBox.checked : localStorage.getItem("graph-curved") === "1";

  // --- edges -------------------------------------------------------------
  // Bucketed by recipe and by whether they are dimmed, so the context's
  // stroke state is set once per bucket rather than once per edge. A dashed
  // stroke is the expensive one, and there are only ever a handful of dashes.
  const buckets = new Map();
  for (const edge of s.edges) {
    const a = edge.source;
    const b = edge.target;
    if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(b.x)) continue;
    if (!gcVisibleAtTime(a, s) || !gcVisibleAtTime(b, s)) continue;
    // Both ends off-screen on the same side: nothing of the line can be in
    // frame. A cheap, conservative test, an edge crossing the viewport with
    // both ends outside still gets drawn.
    if (
      (a.x < view.left && b.x < view.left) ||
      (a.x > view.right && b.x > view.right) ||
      (a.y < view.top && b.y < view.top) ||
      (a.y > view.bottom && b.y > view.bottom)
    ) {
      continue;
    }
    const bySearch = !hl.active || (hl.searchOk(a) && hl.searchOk(b));
    const byHover =
      !hl.hovering || a.id === s.hoveredId || b.id === s.hoveredId;
    const dim = !(bySearch && byHover);
    const style = gcEdgeStyle(edge);
    const key = `${edge.kind}|${style.colour}|${style.width}|${style.dash}|${dim}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { style, dim, path: new Path2D() };
      buckets.set(key, bucket);
    }
    if (s.tree) {
      // A tree's edges are curves between fixed points. `hierarchyPath` and
      // `arcPath` already return SVG path data, and Path2D speaks it, so the
      // curve maths is shared with the SVG renderer rather than rewritten.
      if (!edge._path2d) {
        edge._path2d = new Path2D(s.tree.arc ? arcPath(edge) : hierarchyPath(edge, s.tree.radial));
      }
      bucket.path.addPath(edge._path2d);
    } else if (curvedLinks) {
      //: A quadratic curve bowed to one side by an eighth of its length, the
      //: side chosen by the endpoints' ids so the same link bows the same way
      //: whichever end the simulation lists first, and a link that is drawn
      //: twice (both directions) lands on itself.
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const side = String(a.id) < String(b.id) ? 1 : -1;
      const bow = Math.min(len * 0.14, 48) * side;
      const cx = (a.x + b.x) / 2 - (dy / len) * bow;
      const cy = (a.y + b.y) / 2 + (dx / len) * bow;
      bucket.path.moveTo(a.x, a.y);
      bucket.path.quadraticCurveTo(cx, cy, b.x, b.y);
    } else {
      bucket.path.moveTo(a.x, a.y);
      bucket.path.lineTo(b.x, b.y);
    }
  }
  for (const bucket of buckets.values()) {
    const style = bucket.style;
    ctx.strokeStyle = gcTokens[style.colour] || gcTokens.muted;
    // `.graph-edge.graph-dim` is opacity 0.06 in the stylesheet; kept, because
    // a dimmed edge that is still readable defeats the spotlight.
    ctx.globalAlpha = bucket.dim ? 0.06 : style.alpha;
    ctx.lineWidth = style.width / k;
    ctx.setLineDash(style.dash ? style.dash.map((v) => v / k) : []);
    ctx.stroke(bucket.path);
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // --- the traced path ----------------------------------------------------
  gcDrawTrace(ctx, k, s);

  // --- nodes --------------------------------------------------------------
  // Two batched fills per colour (halo, then core) and one batched stroke for
  // the ordinary ring. Only the handful of nodes that are hovered, matched,
  // pinned, held, hub or on a path get their own stroke.
  const haloByColour = new Map();
  const ringed = [];
  const hubs = { path: new Path2D(), any: false };
  const labelled = [];
  const drawn = [];
  const hotHalos = [];
  for (const node of s.nodes) {
    if (!Number.isFinite(node.x)) continue;
    if (!gcVisibleAtTime(node, s)) continue;
    if (!inView(node)) continue;
    const dim = !(hl.searchOk(node) && hl.hoverOk(node.id));
    const key = `${node.colour}|${dim}`;
    let halo = haloByColour.get(key);
    if (!halo) {
      //: Four batched fills per colour, not two: a soft glow outside the halo
      //: and a shine inside the core (the SVG renderer has both; the canvas
      //: renderer had flat discs, and the owner asked for nodes that look
      //: "more visually pleasing while keeping it professional"). Batched
      //: per colour like the halo, so the cost is two fills per colour per
      //: frame rather than two per node.
      halo = { colour: node.colour, dim, nodes: [] };
      haloByColour.set(key, halo);
    }
    //: The hover growth, applied once and remembered on the node, so the core,
    //: the halo, the plain ring, the hub ring and the special ring below all
    //: draw against the same radius this frame. Reading it four times would
    //: let the ring and the dot it rings disagree by a fraction of a pixel
    //: mid-ease, which reads as a shimmer on the outline.
    node._grow = gcHoverGrow(node, GC_HOVER_GROW, s);
    //: The at most two nodes mid-ease, kept aside so their halo can be lit
    //: without breaking the colour batching every other node relies on.
    const heat = gcHoverGrow(node, 1, s);
    if (heat > 0) hotHalos.push({ node, heat });
    const r = node.r + node._grow;
    const haloR = node.r + 6 + gcHoverGrow(node, GC_HOVER_HALO_GROW, s);
    void haloR;
    halo.nodes.push(node);
    drawn.push(node);
    node._dim = dim;
    const focused = node.id === s.hoveredId || node.id === gcKeyboardId(s);
    const matched = hl.active && hl.searchOk(node);
    const onPath = hl.onPath ? hl.onPath.has(node.id) : false;
    const special =
      focused ||
      matched ||
      onPath ||
      node.pinned ||
      node.fx != null ||
      node.type === "entity" ||
      node.type === "document" ||
      node === s.dropTarget;
    if (special) {
      ringed.push({ node, focused, matched, onPath, dim });
    } else if (!dim && (s.adj.get(node.id) || { size: 0 }).size >= 3) {
      // **A hub's ring is batched, not drawn per node.** Average degree in a
      // real notebook is about four, so "degree >= 3" is most of the map: one
      // `beginPath`/`stroke` each was 2,000 stroke calls a frame at the fitted
      // zoom and on its own blew the 16 ms budget. Every hub ring is the same
      // colour and the same width, so it is one path and one stroke.
      hubs.path.moveTo(node.x + node.r + node._grow, node.y);
      hubs.path.arc(node.x, node.y, node.r + node._grow, 0, Math.PI * 2);
      hubs.any = true;
    }
    // Labels come on by zoom, and a hovered or spotlit note always shows its
    // own: including with the Labels tickbox off, which is what
    // `.graph-labels-hidden g.graph-focus .graph-label { opacity: 1 }` does on
    // the SVG renderer. "Labels off" means "not all of them", not "never".
    // "Labels on" means on. Reported with a screenshot: the tickbox was on
    // and one hovered label showed, because every other label waited for a
    // zoom past GC_LABEL_ZOOM that a fitted 35-note map never reaches. Below
    // GC_LABEL_ALL_MAX nodes the tickbox shows them all at any zoom; above
    // it the zoom gate stays, since 2,000 labels at the fitted zoom are
    // paint the eye cannot read and the frame budget cannot afford.
    const labelsForAll = labelsOn && s.nodes.length <= GC_LABEL_ALL_MAX;
    if (!dim && ((labelsOn && (labelsForAll || k > GC_LABEL_ZOOM || matched)) || focused)) {
      labelled.push(node);
    }
  }
  //: Sprites at the zoom's own pixel size, so a node stays crisp at any
  //: scale; the sizes are rounded to whole pixels, which keeps the cache to
  //: a few dozen entries per colour.
  const pixelScale = k * (s.dpr || 1);
  for (const halo of haloByColour.values()) {
    ctx.globalAlpha = halo.dim ? GC_DIM_ALPHA : 1;
    for (const node of halo.nodes) {
      const rWorld = node.r + node._grow;
      const hub = (s.adj.get(node.id) || { size: 0 }).size >= 3;
      const sprite = gcNodeSprite(halo.colour, rWorld * pixelScale, hub);
      const halfWorld = sprite.half / pixelScale;
      ctx.drawImage(sprite.canvas, node.x - halfWorld, node.y - halfWorld, halfWorld * 2, halfWorld * 2);
    }
  }
  //: The hovered node's halo, lit. A second fill over the one the batch
  //: already laid down, because pulling this node out of its colour batch to
  //: give it a different alpha would cost a fill per colour rather than a fill
  //: per hovered node, and there are at most two of those.
  //:
  //: 0.16 over the batch's 0.18 composites to 0.31: `1 - (1 - 0.18)(1 - 0.16)`.
  //: Multiplying by `heat` is what makes it ease in and out with the size,
  //: including on the node being left, whose `heat` is counting down.
  for (const hot of hotHalos) {
    if (hot.node._dim) continue;
    ctx.globalAlpha = 0.16 * hot.heat;
    ctx.fillStyle = hot.node.colour;
    ctx.beginPath();
    ctx.arc(
      hot.node.x,
      hot.node.y,
      hot.node.r + 6 + gcHoverGrow(hot.node, GC_HOVER_HALO_GROW, s),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // The ordinary ring (`.graph-core { stroke: var(--card) }`) in one pass.
  ctx.globalAlpha = 1;
  //: No card-coloured ring and no accent ring on hubs any more: the sprite
  //: carries its own rim, and a hub is told by its size and its wider glow
  //: rather than by a painted outline (`hubs` is still gathered so the
  //: keyboard and hover paths that read it keep working).
  void hubs;

  gcDrawSelection(ctx, k, s);
  for (const item of ringed) {
    const node = item.node;
    ctx.globalAlpha = item.dim ? GC_DIM_ALPHA : 1;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r + (node._grow || 0), 0, Math.PI * 2);
    if (node === s.dropTarget) {
      ctx.strokeStyle = gcTokens.ok;
      ctx.lineWidth = 4 / k;
    } else if (item.onPath) {
      ctx.strokeStyle = gcTokens.accent;
      ctx.lineWidth = 3.5 / k;
    } else if (item.focused) {
      ctx.strokeStyle = gcTokens.accent;
      ctx.lineWidth = 3.5 / k;
    } else if (item.matched) {
      ctx.strokeStyle = gcTokens.accent;
      ctx.lineWidth = 3 / k;
    } else if (node.fx != null && s.layoutKind === "force") {
      // Held in place by a drag or a double-click: the same dashed ink ring
      // `.graph-held` draws, so a held note looks held on both renderers.
      //
      //: Force layout only. Tree, radial and arc hold every node by setting
      //: `fx`/`fy` from the computed hierarchy, so this test was true for all
      //: of them at once and the whole board wore the ring that means "you
      //: pinned this". Reported on 2026-09-09: "on the other graph view
      //: types, they all have the dotted border as they are static but that
      //: shouldnt be the case".
      ctx.strokeStyle = gcTokens.ink;
      ctx.lineWidth = 2 / k;
      ctx.setLineDash([3 / k, 2 / k]);
    } else if (node.pinned) {
      ctx.strokeStyle = gcTokens.warn;
      ctx.lineWidth = 2 / k;
    } else if (node.type === "entity" || node.type === "document") {
      ctx.strokeStyle = gcTokens.ink;
      ctx.lineWidth = 2 / k;
      ctx.setLineDash(node.type === "entity" ? [3 / k, 2 / k] : [1 / k, 3 / k]);
    } else {
      // Unreachable while `ringed` only takes the nodes the branches above
      // name; kept so a future ring condition added to that test cannot draw
      // with whatever stroke the previous node happened to leave set.
      ctx.strokeStyle = gcTokens.accent;
      ctx.lineWidth = 2.5 / k;
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;

  // --- labels -------------------------------------------------------------
  s.labelsWanted = 0;
  s.labelsDrawn = 0;
  s.labelsPriority = 0;
  // Cleared per frame, not only written per frame: a map whose labels have
  // just been switched off would otherwise report the boxes of the last frame
  // that had any.
  s.labelBoxes = [];
  if (labelled.length) {
    const size = 12 / k;
    // Divided by the zoom so a label is a constant size on screen: the whole
    // context is scaled by k, and a fixed font size would make labels grow
    // with the map until three of them filled the card.
    ctx.font = `500 ${size}px ${gcTokens.font}`;
    // A tree's rows are 34px apart, so a label under the node lands on the
    // next row's; beside it is the only place it fits. The web spreads in two
    // dimensions and reads better with the label under the dot. (Radial and
    // arc labels are centred under the node here rather than rotated onto the
    // spoke, which is the one place this renderer is visibly plainer than the
    // SVG one: recorded in GRAPH_PLAN.md's "Built" section.)
    const beside = Boolean(s.tree) && !s.tree.radial && !s.tree.arc;
    ctx.textAlign = beside ? "left" : "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3 / k;
    ctx.strokeStyle = gcTokens.card;
    ctx.fillStyle = gcTokens.ink;
    // **Labels do not stack.** Reported with a screenshot: with the Labels
    // tickbox on, a fitted map drew all of them (every board under
    // `GC_LABEL_ALL_MAX`), and in the dense middle of a force layout that is
    // a pile of overlapping words that says less than no label at all.
    //
    // So a label is drawn only if its own text box is still free. The order
    // decides which one wins the space, and it is not the order the nodes
    // happen to be in: whatever the pointer or the keyboard is on first (it
    // was asked for by name), then the search hits (the reason someone
    // typed), then the best-connected notes, which are the ones a map is
    // read by. Those two priority classes are drawn even when they clash,
    // because a label you asked for and cannot see is a bug, not tidiness.
    // The rest come back on hover or above `GC_LABEL_ZOOM`, which is the
    // gesture the map already teaches.
    //
    // The overlap test is a linear scan of what has been placed: the placed
    // set is bounded by the frame's area over a label's, a few dozen, so
    // this is thousands of number comparisons and no allocation, not the
    // quadtree it looks like it wants.
    const labelRank = (node) =>
      node.id === s.hoveredId || node.id === gcKeyboardId(s)
        ? 0
        : hl.active && hl.searchOk(node)
          ? 1
          : 2;
    // **A search that matches half the notebook is not a request for half the
    // notebook's labels.** Found by the probe on the 300-note fixture:
    // searching a word every note contains made all 264 hits rank 1, and rank
    // 1 was drawn through any clash, so the pile the collision pass exists to
    // prevent came straight back through the search box. A handful of hits is
    // a question about those notes and each one keeps its label whatever it
    // lands on; past that it is a filter, and a filter's job is done by the
    // dimming, with the labels queued ahead of everything else and still
    // subject to the same test as everything else. The hovered or
    // keyboard-focused note is never in this trade: there is exactly one of
    // it, and it was pointed at.
    const hits = labelled.reduce((n, node) => n + (labelRank(node) === 1 ? 1 : 0), 0);
    const forceHits = hits <= GC_LABEL_FORCE_MAX;
    labelled.sort((a, b) => {
      const rank = labelRank(a) - labelRank(b);
      if (rank) return rank;
      const degreeA = (s.adj.get(a.id) || { size: 0 }).size;
      const degreeB = (s.adj.get(b.id) || { size: 0 }).size;
      return degreeB - degreeA;
    });
    const placed = [];
    s.labelsWanted = labelled.length;
    s.labelsPriority = 0;
    const padX = 4 / k;
    const padY = 2 / k;
    // `paint-order: stroke` on `.graph-label`, the halo goes down first so a
    // label stays legible over an edge or another node.
    for (const node of labelled) {
      const text = gcLabelText(node, s);
      // `measureText` is cheap but not free at a few hundred labels a frame,
      // and the answer only changes when the text or the zoom does.
      if (node._labelText !== text || node._labelSize !== size) {
        node._labelText = text;
        node._labelSize = size;
        node._labelWidth = ctx.measureText(text).width;
      }
      const width = node._labelWidth;
      const x = beside ? node.x + node.r + 7 : node.x;
      const y = beside ? node.y : node.y + node.r + 13;
      const left = (beside ? x : x - width / 2) - padX;
      const rank = labelRank(node);
      if (rank < 2) s.labelsPriority += 1;
      // The id and the rank ride along with the geometry because the only
      // way to ask "do the labels on screen overlap" from outside a canvas is
      // to be handed the boxes: a screenshot of a pile of words and a
      // screenshot of a clean map are the same bytes to a sweep.
      const box = {
        id: node.id,
        rank,
        left,
        right: left + width + padX * 2,
        top: y - size / 2 - padY,
        bottom: y + size / 2 + padY,
      };
      let clashes = false;
      for (const other of placed) {
        if (
          box.left < other.right &&
          box.right > other.left &&
          box.top < other.bottom &&
          box.bottom > other.top
        ) {
          clashes = true;
          break;
        }
      }
      if (clashes && !(rank === 0 || (rank === 1 && forceHits))) continue;
      placed.push(box);
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
    s.labelBoxes = placed;
    s.labelsDrawn = placed.length;
  }

  ctx.restore();
  s.timing.lastFrame = performance.now() - started;
  s.timing.frames += 1;
  // **Only a frame with something in it stops the clock.** A frame drawn
  // before the first positions exist is a blank canvas, and calling that "the
  // first frame" would be measuring nothing and reporting a good number for
  // it: the exact shape of self-deception the gate exists to prevent.
  if (!s.timing.firstFrame && s.timing.dataAt && drawn.length) {
    s.timing.firstFrame = performance.now() - s.timing.dataAt;
  }
  //: One more frame while the hover is still growing or shrinking. Nothing
  //: is scheduled once `gcHoverStep` reports it has arrived, so an idle graph
  //: costs no frames at all.
  if (easing) gcRequestDraw(s);
}

function gcLabelText(node, s = gcTab) {
  const limit = s.tree ? (s.tree.arc ? 12 : s.tree.radial ? 16 : 30) : 22;
  const text = node.preview || "";
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

//: The trace overlay. Drawn from the same `graphTrace`/`graphTraceRoutes`
//: state the SVG renderer's `drawTrace` fills in, so trace mode, the route
//: chips and the readout are untouched by the change of renderer.
function gcDrawTrace(ctx, k, s = gcTab) {
  if (s.size !== "full") return;
  const routes = graphTraceRoutes.length
    ? graphTraceRoutes
    : graphTrace
      ? [{ steps: graphTrace.steps }]
      : [];
  if (!routes.length || !s.byId) return;
  const colours = [gcTokens.accent, gcTokens.ok, gcTokens.warn];
  const isArc = s.tree && s.tree.arc;
  const drawRoute = (route, index, selected) => {
    ctx.strokeStyle = colours[index % 3];
    ctx.globalAlpha = selected ? 0.85 : 0.42;
    ctx.lineWidth = (selected ? 4 : 2) / k;
    ctx.setLineDash(selected ? [] : [6 / k, 5 / k]);
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const step of route.steps || []) {
      const from = s.byId.get(step.source);
      const to = s.byId.get(step.target);
      if (!from || !to || !Number.isFinite(from.x) || !Number.isFinite(to.x)) continue;
      if (isArc) {
        ctx.stroke(new Path2D(tracePath(from, to)));
      } else {
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
      }
    }
    if (!isArc) ctx.stroke();
  };
  routes.forEach((route, index) => {
    if (index === graphTraceIndex) return; // drawn last so it wins the overlap
    drawRoute(route, index, false);
  });
  if (routes[graphTraceIndex]) drawRoute(routes[graphTraceIndex], graphTraceIndex, true);
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
}

// --- hit-testing ----------------------------------------------------------------

//: A `d3.quadtree` over the node positions (§4: "Hit-testing via a quadtree,
//: not per-node DOM events"). Rebuilt lazily: marked dirty by every draw, and
//: actually rebuilt only when something asks what is under the pointer, which
//: is at most once a frame and only while the pointer is over the map.
function gcTreeIndex(s = gcTab) {
  if (s.quadtree && !s.quadtreeDirty) return s.quadtree;
  s.quadtree = d3
    .quadtree()
    .x((n) => n.x)
    .y((n) => n.y)
    .addAll(s.nodes.filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y)));
  s.quadtreeDirty = false;
  return s.quadtree;
}

//: The node under a point given in world coordinates, or null. The search
//: radius is generous by exactly the slop a pointer needs at the current zoom:
//: a 4px dot at k=0.3 is a one-pixel target otherwise.
function gcNodeAtWorld(x, y, s = gcTab) {
  if (!s.nodes.length) return null;
  const slop = 6 / ((s.transform && s.transform.k) || 1);
  const found = gcTreeIndex(s).find(x, y, GC_MAX_RADIUS + slop + 8);
  if (!found) return null;
  if (!gcVisibleAtTime(found, s)) return null;
  const distance = Math.hypot(found.x - x, found.y - y);
  return distance <= found.r + slop ? found : null;
}

function gcWorldPoint(event, s = gcTab) {
  const point = d3.pointer(event, s.canvas);
  const t = s.transform || d3.zoomIdentity;
  return t.invert(point);
}

//: The edge under a point, for the link-management panel a click on a link
//: opens. Linear over the edges rather than indexed: it runs once per click,
//: never per frame, and an index that has to be kept in step with a moving
//: layout would cost more than it saves.
function gcEdgeAtWorld(x, y, s = gcTab) {
  const tolerance = 8 / ((s.transform && s.transform.k) || 1);
  let best = null;
  let bestDistance = tolerance;
  for (const edge of s.edges) {
    if (edge.kind !== "link") continue;
    const a = edge.source;
    const b = edge.target;
    if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(b.x)) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy || 1;
    let t = ((x - a.x) * dx + (y - a.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    const distance = Math.hypot(a.x + t * dx - x, a.y + t * dy - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = edge;
    }
  }
  return best;
}

// --- pointer, zoom and drag -----------------------------------------------------


function gcWireInteraction(s = gcTab) {
  if (s.wired || !s.canvas) return;
  s.wired = true;
  const selection = d3.select(s.canvas);

  const zoom = d3
    .zoom()
    .scaleExtent([0.05, 5])
    // A drag that starts on a node moves the node; anywhere else pans. Without
    // this filter d3-zoom claims the gesture first and a node can never be
    // picked up.
    .filter((event) => {
      if (event.type === "wheel") return true;
      if (event.button) return false;
      // Shift and drag on empty map is the lasso, not a pan.
      if (event.shiftKey) return false;
      const [x, y] = gcWorldPoint(event, s);
      return !gcNodeAtWorld(x, y, s);
    })
    .on("start", () => {
      s.panning = true;
      gcSetHovered(s, null);
      gcRequestDraw(s);
    })
    .on("zoom", (event) => {
      // `sourceEvent` is set for a real gesture and null for a programmatic
      // transform, which is how "the user went to look at something" is told
      // apart from "the renderer framed the map".
      if (event.sourceEvent) s.userZoomed = true;
      s.transform = event.transform;
      gcRequestDraw(s);
      gcRequestMinimapFrame(s);
    })
    .on("end", () => {
      s.panning = false;
      gcRequestDraw(s);
    });
  selection.call(zoom).on("dblclick.zoom", null);

  // The rest of the app drives zoom through `graphSvg`/`graphZoom`, the
  // +/-/fit buttons, the keyboard, the minimap, saved views, `fitGraphToView`.
  // Pointing those two at the canvas is what makes every one of them keep
  // working without a line of change: `d3.zoom` does not care what element it
  // is attached to, and `d3.zoomTransform` reads the transform off the node.
  //: Only the tab publishes them. A pane keeps its camera on its own surface,
  //: so the zoom strip and the minimap go on driving the tab while a pane is
  //: open beside a note.
  s.svg = selection;
  s.zoom = zoom;
  if (s.size === "full") {
    graphSvg = selection;
    graphZoom = zoom;
    graphCanvas = null; // there is no <g> to transform any more
  }

  selection.call(
    d3
      .drag()
      // **The canvas, not its parent.** d3-drag's default container is
      // `this.parentNode`, so without this the pointer would be measured
      // against `#graph-box` while the subject's coordinates are measured
      // against the canvas: an offset that is zero today and stops being zero
      // the moment anything is laid out above the canvas inside the box.
      .container(() => s.canvas)
      .subject((event) => {
        //: **Nothing is dragged in a computed layout.** A tree, a ring or an
        //: arc *is* its shape, and a node pulled out of it makes the picture
        //: a lie; the position also comes back on the next relayout, so the
        //: gesture would not even hold. A null subject means d3-drag declines
        //: the gesture and the zoom behaviour keeps the pointer, so panning
        //: still works where a drag used to start.
        if (s.layoutKind !== "force") return null;
        const [x, y] = gcWorldPoint(event, s);
        const node = gcNodeAtWorld(x, y, s);
        if (!node) return null;
        const [sx, sy] = (s.transform || d3.zoomIdentity).apply([node.x, node.y]);
        return { node, x: sx, y: sy };
      })
      .on("start", (event) => {
        const node = event.subject.node;
        s.dragNode = node;
        node._dragStartX = node.x;
        node._dragStartY = node.y;
        node._wasPinned = node.fx != null;
        //: **Shift is what pins.** INBOX 96, the owner: "my original annoyance
        //: was that I'd try to drag a node or cluster around and it would just
        //: snap back ... but I move a node a little and then I have to unpin
        //: it and there's got to be a better way." Both halves of that are one
        //: rule: a plain drag places a node and lets the map settle around it,
        //: an explicit pin holds it against the simulation for good. Read at
        //: `start` rather than at `end` because the modifier is part of the
        //: gesture the reader began, and a Shift pressed or released mid-drag
        //: would otherwise change what the gesture meant halfway through.
        node._dragShift = Boolean(event.sourceEvent && event.sourceEvent.shiftKey);
        const [wx, wy] = (s.transform || d3.zoomIdentity).invert([event.x, event.y]);
        node.fx = wx;
        node.fy = wy;
        gcPost({ type: "drag", phase: "start", id: node.id, x: wx, y: wy }, s);
        // **Everything holds still except this note's own neighbours.**
        //
        // Two rules were in conflict here and both are real. The SVG renderer
        // froze the entire map for the length of a drag, because drag-to-link
        // asks you to aim at a note and aiming at a moving target is not a
        // gesture: that was a direct report. But GRAPH_PLAN.md §3 asks for
        // the opposite thing, and it is the whole point of this phase:
        // "dragging feels physical (the neighbours follow and the rest
        // settles)". Freezing everything makes a drag a pointer-follow with a
        // simulation running behind it that cannot move anything.
        //
        // Freezing everything *except the direct neighbourhood* satisfies both:
        // the notes attached to the one in your hand come along, which is the
        // physicality, and every other note on the map holds the position you
        // are aiming at, which is the gesture.
        const following = s.adj.get(node.id) || new Set();
        gcPost({
          type: "freeze",
          ids: s.nodes
            .filter((n) => n !== node && n.fx == null && !following.has(n.id))
            .map((n) => n.id),
        }, s);
      })
      .on("drag", (event) => {
        const node = event.subject.node;
        const [wx, wy] = (s.transform || d3.zoomIdentity).invert([event.x, event.y]);
        node.fx = wx;
        node.fy = wy;
        node.x = wx;
        node.y = wy;
        s.quadtreeDirty = true;
        gcPost({ type: "drag", phase: "move", id: node.id, x: wx, y: wy }, s);
        //: `graphNodeUnder` aims at `graphNodesRef`, which is the tab's map.
        //: Drag-to-link is a Graph-tab gesture; a pane drags to place only.
        s.dropTarget = s.size === "full" ? graphNodeUnder(node, { x: wx, y: wy }) : null;
        gcRequestDraw(s);
      })
      .on("end", (event) => {
        const node = event.subject.node;
        s.dragNode = null;
        const over = s.dropTarget;
        s.dropTarget = null;
        const movedFar =
          Math.abs(node.x - node._dragStartX) > 2 || Math.abs(node.y - node._dragStartY) > 2;
        //: A plain drag places the node and releases it: the worker's own
        //: `keep: false` path clears `fx`/`fy` and lets `alphaTarget(0)`
        //: decay, so the node settles from where it was dropped with its
        //: neighbours rather than snapping back to where it came from. That
        //: decay is the "better way" the report asks for, and it was already
        //: written; what was wrong is that a moved node never reached it,
        //: because any drag over 2px counted as a pin.
        //:
        //: A zero-distance drag is still a click and pins nothing, and a node
        //: that was already pinned stays pinned at its new place: dragging a
        //: pinned node is a reposition, not a request to release it.
        const keep = node._dragShift || node._wasPinned;
        gcPost({ type: "drag", phase: "end", id: node.id, keep }, s);
        gcPost({ type: "thaw" }, s);
        if (!keep) {
          node.fx = null;
          node.fy = null;
        }
        if (over && movedFar) {
          linkByDrop(node, over);
        } else if (!movedFar) {
          gcClickNode(event.sourceEvent, node, s);
        } else if (!node.isGroup && keep) {
          //: Only a real pin is written down. A placement that the simulation
          //: is free to relax has no position worth surviving a reload, and
          //: saving one was what made every small nudge into a pin the reader
          //: then had to find and undo.
          node.graph_pin_x = node.fx;
          node.graph_pin_y = node.fy;
          apiJson(`/graph/pin/${node.id}`, {
            method: "PUT",
            body: JSON.stringify({ x: node.graph_pin_x, y: node.graph_pin_y }),
          }).catch(() => {
            // Best-effort, exactly as on the SVG path: the placement has
            // already taken effect in memory, so a failed save costs the
            // reload and nothing else.
          });
        }
        gcRequestDraw(s);
      })
  );

  s.canvas.addEventListener("pointermove", (event) => {
    if (s.panning || s.dragNode) return;
    const [x, y] = gcWorldPoint(event, s);
    const node = gcNodeAtWorld(x, y, s);
    const id = node ? node.id : null;
    if (id !== s.hoveredId) {
      gcSetHovered(s, id);
      gcHoverChanged(id, s);
      // The native tooltip the SVG renderer got from a `<title>` child. A
      // canvas has no children, so the canvas itself carries whichever one
      // applies.
      s.canvas.title = node ? gcTooltip(node, s) : "";
      gcRequestDraw(s);
    }
  });
  s.canvas.addEventListener("pointerleave", () => {
    if (s.hoveredId == null) return;
    gcSetHovered(s, null);
    gcHoverChanged(null, s);
    s.canvas.title = "";
    gcRequestDraw(s);
  });

  s.canvas.addEventListener("click", (event) => {
    const [x, y] = gcWorldPoint(event, s);
    const hit = gcNodeAtWorld(x, y, s);
    if (hit) {
      //: **A node is clicked here in every layout but force.** Reported:
      //: "the note node popups dont show on any of the graph views when I
      //: click on a node except for the force view." In a force layout a
      //: click on a node is a zero-distance drag, and d3-drag's `end`
      //: turns it into one (`gcClickNode`), which is why this used to
      //: return. But a computed layout has no drag at all: `subject()`
      //: deliberately returns null for tree, radial and arc so a node
      //: cannot be pulled out of a shape that *is* the meaning, and with
      //: no drag there is no `end` and nothing ever opened the popup.
      //: The click event is the only thing those three layouts get, so it
      //: is where their click lives.
      if (s.layoutKind === "force") return;
      gcClickNode(event, hit, s);
      return;
    }
    //: The link panel, the node popup and the new-note form are the Graph
    //: tab's, and all three are placed against `#graph-box`. A pane that
    //: opened one would put it over a map on another tab.
    if (s.size !== "full") return;
    const edge = gcEdgeAtWorld(x, y, s);
    if (edge) {
      openGraphLinkPanel(edge, s.nodes);
      return;
    }
    closeGraphPopup();
    closeGraphNewNote();
  });

  s.canvas.addEventListener("dblclick", (event) => {
    const [x, y] = gcWorldPoint(event, s);
    const node = gcNodeAtWorld(x, y, s);
    if (!node) {
      // Grow the map: double-click empty space to add a note right there.
      //: The tab only, same reason as the click above: the form is placed
      //: against the tab's own box.
      if (s.size === "full") openGraphNewNote(event);
      return;
    }
    //: A double click in a computed layout used to clear that one node's
    //: `fx`/`fy` and hand it to the force simulation, which then re-solved
    //: from there and pulled the rest of the tree apart with it: reported as
    //: "I test double clicked on a node and it broke them all out of
    //: position". There is no pin to toggle where every position is computed.
    if (s.layoutKind !== "force") return;
    gcTogglePin(node, s);
  });
  //: The lasso, the right-click menu and the selection dock all read elements
  //: that exist once, on the Graph tab. A pane wires none of them.
  if (s.size === "full") {
    gcWireLasso(s);
    gcWireNodeMenu(s);
    gcWireSelectionDock(s);
  }
}

function gcTogglePin(node, s = gcTab) {
  const wasPinned = node.fx != null;
  if (wasPinned) {
    node.fx = null;
    node.fy = null;
    gcPost({ type: "unpin", id: node.id }, s);
  } else {
    node.fx = node.x;
    node.fy = node.y;
    gcPost({ type: "pin", id: node.id, x: node.x, y: node.y }, s);
  }
  gcRequestDraw(s);
  if (node.isGroup) return;
  node.graph_pin_x = wasPinned ? null : node.fx;
  node.graph_pin_y = wasPinned ? null : node.fy;
  apiJson(`/graph/pin/${node.id}`, {
    method: "PUT",
    body: JSON.stringify({ x: node.graph_pin_x, y: node.graph_pin_y }),
  }).catch(() => {
  });
}

// --- Phase 4: the lasso ----------------------------------------------------------
function gcPointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function gcWireLasso(s = gcTab) {
  s.canvas.addEventListener("pointerdown", (event) => {
    if (!event.shiftKey || event.button) return;
    const [x, y] = gcWorldPoint(event, s);
    if (gcNodeAtWorld(x, y, s)) return;
    s.lasso = { points: [[x, y]] };
    s.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  s.canvas.addEventListener("pointermove", (event) => {
    if (!s.lasso) return;
    s.lasso.points.push(gcWorldPoint(event, s));
    gcRequestDraw(s);
  });
  const finish = (event) => {
    if (!s.lasso) return;
    const points = s.lasso.points;
    s.lasso = null;
    try {
      s.canvas.releasePointerCapture(event.pointerId);
    } catch {
    }
    if (points.length > 2) {
      const caught = s.nodes.filter((n) => !n.isGroup && gcPointInPolygon(n.x, n.y, points)).map((n) => n.id);
      // A second Shift-lasso adds to the first, so two sweeps build one selection.
      for (const id of caught) s.selected.add(id);
    }
    gcSelectionChanged(s);
    gcRequestDraw(s);
  };
  s.canvas.addEventListener("pointerup", finish);
  s.canvas.addEventListener("pointercancel", finish);
}

function gcDrawSelection(ctx, k, s = gcTab) {
  if (s.selected.size) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = gcTokens.accent;
    ctx.lineWidth = 3 / k;
    ctx.setLineDash([4 / k, 3 / k]);
    for (const node of s.nodes) {
      if (!s.selected.has(node.id)) continue;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r + 5 / k, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (s.lasso && s.lasso.points.length > 1) {
    ctx.save();
    ctx.beginPath();
    s.lasso.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = gcTokens.accent;
    ctx.globalAlpha = 0.08;
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = gcTokens.accent;
    ctx.lineWidth = 1.5 / k;
    ctx.setLineDash([6 / k, 4 / k]);
    ctx.stroke();
    ctx.restore();
  }
}

// --- Phase 4: the selection dock ---------------------------------------------------
function gcSelectionChanged(s = gcTab) {
  const dock = document.getElementById("graph-selection-dock");
  const count = document.getElementById("graph-selection-count");
  if (!dock || !count) return;
  const live = [...s.selected].filter((id) => s.byId.has(id));
  s.selected = new Set(live);
  dock.classList.toggle("hidden", !live.length);
  count.textContent = `${live.length} selected`;
}

function gcSelectedNodes(s = gcTab) {
  return [...s.selected].map((id) => s.byId.get(id)).filter(Boolean);
}

function gcWireSelectionDock(s = gcTab) {
  const on = (id, fn) => document.getElementById(id)?.addEventListener("click", fn);
  on("graph-selection-clear", () => {
    s.selected.clear();
    gcSelectionChanged(s);
    gcRequestDraw(s);
  });
  on("graph-selection-tag", async () => {
    const nodes = gcSelectedNodes(s);
    if (!nodes.length) return;
    const tag = (await promptDialog("Tag these notes", "", { confirmLabel: "Add tag" })).trim().replace(/^#/, "");
    if (!tag) return;
    let done = 0;
    for (const node of nodes) {
      const tags = Array.from(new Set([...(node.tags || []), tag]));
      // PUT: the entries route has no PATCH, and EntryUpdate leaves every
      // field it is not given alone.
      const ok = await apiJson(`/entries/${node.id}`, { method: "PUT", body: JSON.stringify({ tags }) }).catch(() => null);
      if (ok) {
        node.tags = tags;
        done += 1;
      }
    }
    toast(`Tagged ${done} note${done === 1 ? "" : "s"} #${tag}.`);
    renderGraph();
  });
  on("graph-selection-link", async () => {
    const nodes = gcSelectedNodes(s);
    if (nodes.length < 2) {
      toast("Select at least two notes to link them.");
      return;
    }
    // Pairwise up to six notes (fifteen links); past that a hub, every note
    // linked to the first, which keeps the map readable.
    const pairs = [];
    if (nodes.length <= 6) {
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) pairs.push([nodes[i], nodes[j]]);
    } else {
      for (let i = 1; i < nodes.length; i++) pairs.push([nodes[0], nodes[i]]);
    }
    let made = 0;
    for (const [a, b] of pairs) {
      if (s.adj.get(a.id)?.has(b.id)) continue;
      const ok = await apiJson(`/entries/${a.id}/links`, { method: "POST", body: JSON.stringify({ target_id: b.id }) }).catch(() => null);
      if (ok) made += 1;
    }
    toast(made ? `Linked ${made} pair${made === 1 ? "" : "s"}.` : "Those notes were already linked.");
    renderGraph();
  });
  on("graph-selection-map", async () => {
    const nodes = gcSelectedNodes(s);
    if (!nodes.length) return;
    const name = (await promptDialog("Name the mind map", "", { confirmLabel: "Create map" })).trim();
    if (!name) return;
    // "map" is the board type a mind map carries (BOARD_TYPES in
    // routes_whiteboard.py); "tree-right" is the layout a fresh map gets.
    const board = await apiJson("/whiteboard/boards", {
      method: "POST",
      body: JSON.stringify({ name, type: "map", layout: "tree-right" }),
    }).catch(() => null);
    if (!board?.id) {
      toast("Could not create the map.");
      return;
    }
    const root = await apiJson(`/whiteboard/boards/${board.id}/nodes`, { method: "POST", body: JSON.stringify({ kind: "topic", text: name }) }).catch(() => null);
    for (const node of nodes) {
      await apiJson(`/whiteboard/boards/${board.id}/nodes`, {
        method: "POST",
        body: JSON.stringify({ kind: "note", ref_id: node.id, parent_id: root?.id ?? null, text: node.preview || "" }),
      }).catch(() => null);
    }
    toast(`Mind map “${name}” made from ${nodes.length} note${nodes.length === 1 ? "" : "s"}. It is in Library, Boards.`);
  });
}

// --- Phase 4: the right-click menu ---------------------------------------------------
let gcNodeMenuEl = null;
function gcCloseNodeMenu() {
  if (gcNodeMenuEl) gcNodeMenuEl.remove();
  gcNodeMenuEl = null;
}

function gcWireNodeMenu(s = gcTab) {
  s.canvas.addEventListener("contextmenu", (event) => {
    const [x, y] = gcWorldPoint(event, s);
    const node = gcNodeAtWorld(x, y, s);
    if (!node || node.isGroup) return;
    event.preventDefault();
    gcShowNodeMenu(node, event.clientX, event.clientY, s);
  });
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (gcNodeMenuEl && !gcNodeMenuEl.contains(event.target)) gcCloseNodeMenu();
    },
    true
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && gcNodeMenuEl) gcCloseNodeMenu();
  });
  window.addEventListener("wheel", gcCloseNodeMenu, { passive: true });
}

function gcShowNodeMenu(node, clientX, clientY, s = gcTab) {
  gcCloseNodeMenu();
  const menu = document.createElement("div");
  menu.className = "action-menu action-menu-escaped graph-node-menu";
  menu.setAttribute("role", "menu");
  const item = (icon, text, onPick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "menu-item doc-dock-menu-item";
    button.setAttribute("role", "menuitem");
    setLabel(button, `${icon} ${text}`);
    button.addEventListener("click", () => {
      gcCloseNodeMenu();
      onPick();
    });
    menu.appendChild(button);
  };
  const isNote = node.type !== "entity" && node.type !== "document";
  if (isNote) item("ph:arrow-square-out", "Open", () => flashEntry(node.id));
  item(node.fx != null ? "ph:push-pin-slash" : "ph:push-pin", node.fx != null ? "Unpin" : "Pin in place", () => gcTogglePin(node, s));
  if (isNote) {
    item("ph:crosshair", "Focus on this note", () => {
      graphFocusModeId = node.id;
      renderGraph();
    });
  }
  const selected = s.selected.has(node.id);
  item(selected ? "ph:selection-slash" : "ph:selection-plus", selected ? "Remove from selection" : "Add to selection", () => {
    if (s.selected.has(node.id)) s.selected.delete(node.id);
    else s.selected.add(node.id);
    gcSelectionChanged(s);
    gcRequestDraw(s);
  });
  item("ph:eye-slash", "Hide on this map", () => {
    s.hiddenIds.add(node.id);
    s.selected.delete(node.id);
    gcSelectionChanged(s);
    renderGraph();
  });
  document.body.appendChild(menu);
  gcNodeMenuEl = menu;
  const rect = menu.getBoundingClientRect();
  const left = Math.min(clientX, window.innerWidth - rect.width - 8);
  const top = Math.min(clientY, window.innerHeight - rect.height - 8);
  menu.style.position = "fixed";
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;
  menu.querySelector("button")?.focus();
}

//: The word "entity" explains nothing on its own, and it is the label on a
//: switch, a legend entry and a node. INBOX 183, the owner: "idk what entities
//: are". One sentence, written once here, given in all three places.
const GC_ENTITY_CATEGORY = "Entity";
const GC_ENTITY_HELP =
  "An entity is a person, place or thing Atlas found named across your notes, " +
  "joined to every note that mentions it";

function gcTooltip(node, s = gcTab) {
  const links = (s.adj && s.adj.get(node.id) ? s.adj.get(node.id).size : 0) || 0;
  //: A node that is not a note says what it is, because none of the three
  //: kinds can be opened and a tooltip is the only thing they answer to. An
  //: entity gets the sentence; a document and a board get their own word,
  //: which is at least one somebody has met before.
  if (node.type === "entity") return `${node.preview}\n${GC_ENTITY_HELP}`;
  if (node.type === "document") return `${node.preview}\nA document your notes are attached to`;
  if (node.type === "map") return `${node.preview}\nA mind map, joined to the notes on it`;
  if (node.type === "board" || node.type === "whiteboard") {
    return `${node.preview}\nA whiteboard, joined to the notes on it`;
  }
  return (
    `${node.preview}\n[${node.category}] · ${links} connection${links === 1 ? "" : "s"}` +
    `${node.access_count ? ` · used ${node.access_count}×` : ""}`
  );
}

//: A click on a node, with the same three modes the SVG renderer had: trace
//: mode picks an end, an in-flight "Link" picks the other note, otherwise the
//: note opens in the popup.
function gcClickNode(event, node, s = gcTab) {
  //: A surface can say what a click means on it. The pane opens the note in
  //: the tab it is sitting beside rather than in the Graph tab's popup, which
  //: is anchored to a canvas the reader is not looking at.
  if (s.onNodeClick) {
    s.onNodeClick(node, event);
    return;
  }
  if (event && event.shiftKey && !node.isGroup) {
    if (s.selected.has(node.id)) s.selected.delete(node.id);
    else s.selected.add(node.id);
    gcSelectionChanged(s);
    gcRequestDraw(s);
    return;
  }
  if (node.isGroup || node.type === "entity" || node.type === "document") return;
  if (traceModeActive) {
    pickTraceEnd(node);
    return;
  }
  if (typeof linkSource !== "undefined" && linkSource !== null) {
    beginOrCompleteLink(node);
    return;
  }
  openGraphPopup(event || { clientX: 0, clientY: 0, stopPropagation() {} }, node);
}

// --- the worker ------------------------------------------------------------------

function gcPost(message, s = gcTab) {
  if (s.worker) s.worker.postMessage(message);
}

function gcStop(s = gcTab) {
  gcPost({ type: "stop" }, s);
}

function gcStartWorker(nodes, edges, world, s = gcTab) {
  if (!s.worker) {
    // Version-stamped for the same reason index.html's script tags are
    // (tests/test_asset_cache_busting.py): a desktop wrapper with its own
    // cache can otherwise go on running yesterday's worker forever, and a
    // stale worker is invisible, nothing logs, the map just behaves like the
    // build before last. The stamp is lifted off this file's own <script>
    // tag rather than kept in a second place that can drift from it.
    const own = document.querySelector('script[src*="graph-canvas.js"]');
    const stamp = ((own && own.getAttribute("src")) || "").split("?v=")[1] || "0";
    s.worker = new Worker(`/graph-worker.js?v=${stamp}`);
    s.worker.onmessage = (event) => {
      const message = event.data || {};
      //: A message from a simulation that no longer matches what is on screen
      //: is dropped whole, buffer included: handing a stale buffer back would
      //: decrement an `inFlight` count that the newer `init` has already
      //: reset, and the worker allocates a replacement for nothing worse than
      //: one skipped frame's worth of pool.
      if (message.epoch !== s.epoch) return;
      if (message.type === "tick") {
        s.alpha = message.alpha;
        s.ticks = message.ticks || 0;
        s.tickMs = message.tickMs || 0;
        const positions = message.positions;
        const count = Math.min(s.nodes.length, positions.length / 2);
        for (let i = 0; i < count; i++) {
          const node = s.nodes[i];
          // A node being dragged is authoritative on this side: its position
          // came from the pointer this frame and the worker's copy is one
          // message behind.
          if (node === s.dragNode) continue;
          node.x = positions[i * 2];
          node.y = positions[i * 2 + 1];
        }
        // The positions moved, so the hit-test index is stale. Marked here
        // rather than at the end of every draw: a settled map redraws on
        // hover without anything having moved, and rebuilding a 2,000-point
        // quadtree per pointermove for nothing is a millisecond a frame.
        s.quadtreeDirty = true;
        gcRequestDraw(s);
        // **Framed twice: once straight away, once when it settles.**
        //
        // The SVG renderer framed the map exactly once, when the simulation
        // cooled below alpha 0.08, about 110 ticks. Measured on the 2,000-note
        // fixture in this sandbox, a tick costs ~80 ms, so that is nine seconds
        // of watching a graph whose notes are mostly outside the frame at
        // zoom 1, with no way to know that is what you are looking at. The
        // first tick is framed immediately instead, so the map is *visible*
        // from the first moment, and the settle re-frames it once the layout
        // has actually decided its shape.
        //
        // The second fit is skipped if the user has zoomed or panned in the
        // meantime: recentring the camera out from under someone who has
        // deliberately gone to look at something is the reported bug
        // `graphAutoFitDone` exists for, and an early fit must not reintroduce
        // it by making the late fit unconditional.
        if (!gcAutoFitDone(s) && s.nodes.length) {
          if (!s.fittedOnce) {
            s.fittedOnce = true;
            fitGraphToView(s.svg, null, s.zoom, s.nodes, s.dims.w, s.dims.h);
          } else if (message.alpha < 0.08) {
            gcSetAutoFitDone(s, true);
            if (!s.userZoomed) {
              fitGraphToView(s.svg, null, s.zoom, s.nodes, s.dims.w, s.dims.h);
            }
          }
        }
        // Hand the buffer back so the worker can reuse it (see its `pool`).
        s.worker.postMessage({ type: "recycle", buffer: positions.buffer }, [positions.buffer]);
        if (s.size === "full") {
          graphMinimapTick += 1;
          if (graphMinimapTick % 8 === 0) graphMinimapPaint();
        }
      } else if (message.type === "end") {
        if (s.size === "full") graphMinimapPaint();
        if (!gcAutoFitDone(s) && s.nodes.length) {
          gcSetAutoFitDone(s, true);
          fitGraphToView(s.svg, null, s.zoom, s.nodes, s.dims.w, s.dims.h);
        }
      }
    };
    s.worker.onerror = () => {
      // A worker that will not start must not take the map with it: the nodes
      // already have positions (inherited, pinned or spiral), so the canvas
      // still draws a static graph.
      gcRequestDraw(s);
    };
  }
  s.fittedOnce = false;
  gcPost({
    type: "init",
    epoch: s.epoch,
    // Performance mode (settings.js): the physics yields twice as long
    // between ticks, half the CPU for a layout that converges a little later.
    perf: document.documentElement.dataset.perf === "on",
    nodes: nodes.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      fx: n.fx == null ? null : n.fx,
      fy: n.fy == null ? null : n.fy,
      r: n.r,
    })),
    edges: edges.map((e) => ({
      source: e.source.id != null ? e.source.id : e.source,
      target: e.target.id != null ? e.target.id : e.target,
      kind: e.kind,
    })),
    params: {
      gravity: Number(localStorage.getItem("graph-gravity") || 50),
      spread: Number(localStorage.getItem("graph-spread") || 50),
    },
    world,
    alpha: 1,
  }, s);
}

//: The world the simulation solves in, a square whose side grows with
//: sqrt(count). Carried over from the SVG renderer along with the reason it is
//: square and count-based rather than a multiple of the frame: a graph box is
//: wide and short, so multiplying the frame gave a few hundred pixels of
//: vertical room and the layout settled against the walls into a lattice,
//: reported as "the graph nodes are like locked into a box".
function gcWorldFor(count, width, height) {
  const perNode = 2 * (GC_MAX_RADIUS + 28);
  // 1.25, not 1.6. The world is the wall a reheated layout cannot push past,
  // and it was sized for a simulation whose span grew like sqrt(count) with
  // nothing holding it in; the worker now scales its repulsion and its centre
  // force by the note count (`densityScale`/`centreScale` in graph-worker.js),
  // so the natural spread is a good deal smaller than the room this used to
  // reserve and the gap between the two was somewhere a node could wander to
  // and be lost.
  //: **Where it bites, measured rather than asserted**
  //: (`scratchpad/ui-sweeps/graphtouch.js`, which reads this function at three
  //: counts and two widths). This line used to say "measured at 35 and 300
  //: notes this changes nothing at all: both are under the viewport floor
  //: below", and the floor is not one number: it is 2531 on a 1440 desktop map
  //: and 1168 on a 390 phone. At 35 notes the floor decides at both widths
  //: (680 here against 2531 and 1168), so the change really is neutral there.
  //: At 300 it decides only on the desktop: the count term is 1992, under the
  //: desktop floor and over the phone's, so on a phone this constant shrank
  //: the world from 2550 to 1992, by 22%, which is the direction it was
  //: changed for and a smaller screen is where a lost node is hardest to find.
  //: Above about five hundred notes it decides at every width.
  const roomy = Math.sqrt(Math.max(count, 1)) * perNode * 1.25;
  const side = Math.max(roomy, width * 1.8, height * 1.8);
  return {
    left: (width - side) / 2,
    top: (height - side) / 2,
    right: (width - side) / 2 + side,
    bottom: (height - side) / 2 + side,
  };
}

// --- the render ------------------------------------------------------------------

//: The Canvas 2D renderer, behind the same `renderGraph()` entry, on the same
//: data, with the same ids and the same dock controls. Everything from the
//: fetch down to the stats line is the SVG renderer's own sequence: what
//: changes is that the drawing is a canvas and the simulation is a worker.
async function renderGraphCanvas(s = gcTab) {
  if (!gcEnsureCanvas(s)) return;
  const sequence = ++s.renderSeq;
  const wantSimilarity = document.getElementById("graph-similarity").checked;
  const wantEntities = document.getElementById("graph-entities")
    ? document.getElementById("graph-entities").checked
    : false;
  const wantDocuments = document.getElementById("graph-documents")
    ? document.getElementById("graph-documents").checked
    : false;
  const wantMaps = document.getElementById("graph-maps")
    ? document.getElementById("graph-maps").checked
    : false;
  const endpoint = graphFocusModeId
    ? `/graph/local/${graphFocusModeId}?depth=2&similarity=${wantSimilarity}`
    : `/graph?${wantSimilarity ? "similarity=true&" : ""}${wantEntities ? "include_entities=true&" : ""}${
        wantDocuments ? "include_documents=true&" : ""
      }${wantMaps ? "include_maps=true" : ""}`;
  const data = await apiJson(endpoint).catch(() => null);
  if (!data) return;
  // A slow answer that has been overtaken by a newer render must not paint
  // over it. The SVG path had the same race and answered it by clearing the
  // SVG; a canvas has nothing to clear, so the sequence number is the guard.
  if (sequence !== s.renderSeq) return;
  s.timing = { dataAt: performance.now(), firstFrame: 0, lastFrame: 0, frames: 0 };
  // A fresh visit to the tab (`graphAutoFitDone` cleared by switchTab) is also
  // a fresh camera: forget that the last visit's viewer had zoomed somewhere.
  if (!gcAutoFitDone(s)) s.userZoomed = false;

  gcReadTokens(s);
  const empty = document.getElementById("graph-empty");
  empty.style.display = data.nodes.length > 0 ? "none" : "grid";
  empty.classList.toggle("hidden", data.nodes.length > 0);
  //: The minimap goes with the map, here as in `renderGraphSvg`: an overview
  //: of nothing is a grey rectangle in a corner. Reported against this
  //: renderer, which is the default, so the SVG one's copy of this line alone
  //: changed nothing on screen (measured).
  graphMinimapShown(data.nodes.length > 0);

  const colour = d3.scaleOrdinal(data.categories, d3.schemeTableau10.concat(d3.schemeSet3));
  const clusterColour = d3.scaleOrdinal(d3.schemeTableau10.concat(d3.schemeSet3));
  const colourMode = graphColourMode();
  graphStructure =
    colourMode === "cluster" ? await apiJson("/graph/structure").catch(() => null) : null;
  if (sequence !== s.renderSeq) return;
  // GRAPH_PLAN Phase 3: the colour follows a rule, and a group (a saved
  // search) paints over the rule for the notes it matches.
  const groups = await graphResolveGroups();
  if (sequence !== s.renderSeq) return;
  const ruleColour = gcRuleScale(colourMode, data);
  s.colourOf = (node) => {
    const groupIndex = graphGroupOf.get(node.id);
    if (groupIndex !== undefined && !node.isGroup) return graphGroupColour(groupIndex);
    if (node.isGroup) return colour(node.category);
    if (colourMode === "category") return colour(node.category);
    if (colourMode === "cluster") {
      if (!graphStructure) return colour(node.category);
      const cluster = graphStructure.cluster_of[String(node.id)];
      return cluster === undefined ? gcTokens.muted : clusterColour(String(cluster));
    }
    return ruleColour(gcRuleKey(colourMode, node));
  };
  graphRenderLegend(data, colourMode, colour, clusterColour, ruleColour, groups, s);
  gcSelectionChanged(s);

  const ruleHides = colourMode !== "category" && colourMode !== "cluster";
  let visibleNodes = data.nodes.filter(
    (n) =>
      !graphHiddenCategories.has(n.category) &&
      !s.hiddenIds.has(n.id) &&
      !(ruleHides && graphHiddenKeys.has(`${colourMode}:${gcRuleKey(colourMode, n)}`)) &&
      !(graphGroupOf.has(n.id) && groups[graphGroupOf.get(n.id)]?.hiddenOnMap)
  );
  const kept = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = data.edges.filter((e) => kept.has(e.source) && kept.has(e.target));
  const hideOrphans = document.getElementById("graph-hide-orphans");
  if (hideOrphans && hideOrphans.checked) {
    const connected = new Set();
    for (const edge of visibleEdges) {
      connected.add(edge.source);
      connected.add(edge.target);
    }
    visibleNodes = visibleNodes.filter((n) => connected.has(n.id));
  }
  if (!visibleNodes.length) {
    empty.style.display = "grid";
    empty.classList.remove("hidden");
    s.nodes = [];
    s.edges = [];
    s.adj = new Map();
    s.byId = new Map();
    graphNodesRef = s.nodes;
    gcStop(s);
    gcRequestDraw(s);
    return;
  }

  gcResize(s);
  const width = s.dims.w;
  const height = s.dims.h;
  s.layoutKind = graphLayout();
  s.tree =
    s.layoutKind === "force"
      ? null
      : layoutHierarchy(visibleNodes.map((n) => ({ ...n })), s.layoutKind, width, height);

  // A note already on screen keeps the spot it had settled into, so a legend
  // toggle or a slider change does not replay the whole "explode outward"
  // animation. Same inheritance the SVG renderer does, and for the same
  // reported reason.
  const prior = new Map((graphNodesRef || []).map((n) => [n.id, { x: n.x, y: n.y }]));
  const nodes = s.tree
    ? s.tree.nodes
    : visibleNodes.map((n) => {
        const was = prior.get(n.id);
        const built = was && Number.isFinite(was.x) ? { ...n, ...was } : { ...n };
        if (built.graph_pin_x != null && built.graph_pin_y != null) {
          built.fx = built.graph_pin_x;
          built.fy = built.graph_pin_y;
        }
        return built;
      });
  const edges = s.tree ? s.tree.links : visibleEdges.map((e) => ({ ...e }));

  s.byId = new Map(nodes.map((n) => [n.id, n]));
  s.adj = new Map(nodes.map((n) => [n.id, new Set()]));
  for (const edge of edges) {
    const from = edge.source && edge.source.id != null ? edge.source.id : edge.source;
    const to = edge.target && edge.target.id != null ? edge.target.id : edge.target;
    if (s.adj.has(from)) s.adj.get(from).add(to);
    if (s.adj.has(to)) s.adj.get(to).add(from);
    // Resolve to the node objects once, here, rather than on every frame.
    edge.source = s.byId.get(from) || edge.source;
    edge.target = s.byId.get(to) || edge.target;
    edge._path2d = null;
  }
  for (const node of nodes) {
    node.r = gcRadius(node, (s.adj.get(node.id) || { size: 0 }).size);
    node.colour = s.colourOf(node);
  }
  //: **A note with no position yet is placed here, not in the worker.**
  //: d3-force assigns its phyllotaxis spiral inside `forceSimulation`, which
  //: means the main thread has no positions at all until the first tick comes
  //: back: so the frame drawn the instant the payload arrives would be an
  //: empty canvas, and the gate's "first frame after data" would be timing a
  //: blank. The same spiral is laid down here (identical constants, so the
  //: worker keeps these rather than re-placing anything) and the first frame
  //: is a real picture of the notebook that then relaxes into its layout.
  if (!s.tree) {
    const centreX = width / 2;
    const centreY = height / 2;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    nodes.forEach((node, index) => {
      if (Number.isFinite(node.x) && Number.isFinite(node.y)) return;
      const radius = 10 * Math.sqrt(0.5 + index);
      const angle = index * goldenAngle;
      node.x = centreX + radius * Math.cos(angle);
      node.y = centreY + radius * Math.sin(angle);
    });
  }
  // Everything the worker could still be about is now gone: whatever it says
  // next is about the previous node array and is dropped on arrival.
  s.epoch += 1;
  s.nodes = nodes;
  s.edges = edges;
  graphNodesRef = nodes;
  graphAdjacency = s.adj;
  s.quadtreeDirty = true;

  initGraphMinimap();
  initGraphViews();

  if (s.tree) {
    gcStop(s);
    if (!gcAutoFitDone(s)) {
      gcSetAutoFitDone(s, true);
      frameTree(s.svg, s.zoom, null, nodes, width, height, s.tree.radial);
    }
  } else {
    gcStartWorker(nodes, edges, gcWorldFor(nodes.length, width, height), s);
  }

  graphRenderStats(data, nodes, edges, colourMode, s.layoutKind);
  graphSyncTimeSlider(data, (cutoff) => {
    s.timeCutoff = cutoff;
    gcRequestDraw(s);
  });
  fillTracePickers(nodes);
  drawTrace();
  applyGraphHighlight();
  initGraphKeyboard();
  //: A full paint, because this is exactly the moment the dots are wrong: a
  //: different set of notes, at different places. A pan only ever moves the
  //: rectangle (`graphMinimapFrame`), so nothing else on that path repaints
  //: them, and the force layout's own repaint rides the worker's ticks, which
  //: a computed layout does not have at all.
  graphMinimapPaint();
  gcRequestDraw(s);
}

// --- the chrome around the drawing ------------------------------------------------
//
// The legend, the stats line and the time slider are the same controls on
// either renderer: they describe the data, not the drawing. They live here
// rather than in graph.js because this is the file that survives Phase 1: the
// SVG renderer keeps its own inline copies until it is deleted, and then there
// is one of each.

//: One entry per category (click to filter) or per cluster (click to
//: spotlight). A legend whose dots do not match the colours on screen is worse
//: than no legend, so which of the two it shows follows the colour mode.
//: The key a rule reads off a node, and the order its legend lists them in.
const GC_AGE_BUCKETS = ["Today", "This week", "This month", "This quarter", "Older"];
function gcRuleKey(rule, node) {
  if (rule === "kind") return node.kind || "note";
  if (rule === "space") return node.space_id || "default";
  if (rule === "tag") return (node.tags && node.tags[0]) || "No tag";
  if (rule === "file") return node.has_file ? "Has a file" : "No file";
  if (rule === "age") {
    const days = node.created_at ? (Date.now() - Date.parse(node.created_at)) / 86400000 : Infinity;
    if (days <= 1) return GC_AGE_BUCKETS[0];
    if (days <= 7) return GC_AGE_BUCKETS[1];
    if (days <= 30) return GC_AGE_BUCKETS[2];
    if (days <= 90) return GC_AGE_BUCKETS[3];
    return GC_AGE_BUCKETS[4];
  }
  return node.category;
}
function gcRuleDomain(rule, data) {
  if (rule === "age") return GC_AGE_BUCKETS;
  if (rule === "file") return ["Has a file", "No file"];
  const keys = new Set(data.nodes.filter((n) => !n.isGroup).map((n) => gcRuleKey(rule, n)));
  return [...keys].sort((a, b) => String(a).localeCompare(String(b)));
}
function gcRuleScale(rule, data) {
  if (rule === "age") return d3.scaleOrdinal(GC_AGE_BUCKETS, ["#2f80ed", "#56a3f5", "#8ec2f7", "#c3dcf7", "#9aa1ad"]);
  if (rule === "file") return d3.scaleOrdinal(["Has a file", "No file"], ["#17bebb", "#9aa1ad"]);
  return d3.scaleOrdinal(gcRuleDomain(rule, data), d3.schemeTableau10.concat(d3.schemeSet3));
}

function graphRenderLegend(data, colourMode, colour, clusterColour, ruleColour = null, groups = [], s = gcTab) {
  const legend = document.getElementById("graph-legend");
  if (!legend) return;
  legend.replaceChildren();
  if (s.hiddenIds.size) {
    const hidden = document.createElement("button");
    hidden.className = "legend-item legend-toggle legend-off";
    hidden.title = "Show the notes hidden from this map again";
    hidden.textContent = `${s.hiddenIds.size} hidden on this map. Show`;
    hidden.addEventListener("click", () => {
      s.hiddenIds.clear();
      renderGraph();
    });
    legend.appendChild(hidden);
  }
  // Groups lead the legend whatever the rule: they paint over it.
  groups.forEach((group, index) => {
    const off = Boolean(group.hiddenOnMap);
    const item = document.createElement("button");
    item.className = "legend-item legend-toggle legend-group";
    item.title = off ? `Show the notes matching “${group.query}” again` : `Hide the notes matching “${group.query}”`;
    item.classList.toggle("legend-off", off);
    item.setAttribute("aria-pressed", String(!off));
    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = graphGroupColour(index);
    const count = [...graphGroupOf.values()].filter((i) => i === index).length;
    item.append(dot, document.createTextNode(`${group.query} (${count})`));
    item.addEventListener("click", () => {
      const next = graphGroups();
      if (next[index]) next[index].hiddenOnMap = !next[index].hiddenOnMap;
      graphSetGroups(next);
    });
    legend.appendChild(item);
  });
  if (ruleColour && colourMode !== "category" && colourMode !== "cluster") {
    for (const key of gcRuleDomain(colourMode, data)) {
      const token = `${colourMode}:${key}`;
      const off = graphHiddenKeys.has(token);
      const item = document.createElement("button");
      item.className = "legend-item legend-toggle";
      item.title = off ? `Show ${key} again` : `Hide ${key} from the map`;
      item.classList.toggle("legend-off", off);
      item.setAttribute("aria-pressed", String(!off));
      const dot = document.createElement("span");
      dot.className = "legend-dot";
      dot.style.background = ruleColour(key);
      item.append(dot, document.createTextNode(String(key)));
      item.addEventListener("click", () => {
        if (graphHiddenKeys.has(token)) graphHiddenKeys.delete(token);
        else graphHiddenKeys.add(token);
        renderGraph();
      });
      legend.appendChild(item);
    }
    return;
  }
  const entry = (title, dotColour, text, onClick, off) => {
    const item = document.createElement("button");
    item.className = "legend-item legend-toggle";
    item.title = title;
    if (off !== undefined) {
      item.classList.toggle("legend-off", off);
      item.setAttribute("aria-pressed", String(!off));
    }
    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = dotColour;
    item.append(dot, document.createTextNode(text));
    item.addEventListener("click", onClick);
    legend.appendChild(item);
    return item;
  };
  if (colourMode === "cluster" && graphStructure) {
    graphStructure.clusters.forEach((cluster, position) => {
      entry(
        `${cluster.size} notes, around "${cluster.core.preview}"` +
          (cluster.categories.length ? ` · ${cluster.categories.join(", ")}` : ""),
        clusterColour(String(position)),
        `${cluster.core.preview} (${cluster.size})`,
        () => {
          graphHighlightIds = new Set(cluster.ids);
          applyGraphHighlight();
        }
      );
    });
    if (graphStructure.orphan_count) {
      entry(
        "Notes with no link, no reply and no shared tag",
        gcTokens.muted,
        `unconnected (${graphStructure.orphan_count})`,
        () => {
          graphHighlightIds = new Set(graphStructure.orphans.map((n) => n.id));
          applyGraphHighlight();
        }
      );
    }
    if (graphHiddenCategories.size) {
      // The category filters still apply in this mode, they just have no
      // controls. Saying so beats a map quietly missing notes.
      const note = document.createElement("span");
      note.className = "legend-item";
      note.textContent = `${graphHiddenCategories.size} category filter${
        graphHiddenCategories.size === 1 ? "" : "s"
      } still on: switch to “By category” to change them`;
      legend.appendChild(note);
    }
    return;
  }
  for (const category of data.categories) {
    const off = graphHiddenCategories.has(category);
    entry(
      off ? `Show ${category} again` : `Hide ${category} from the map`,
      colour(category),
      category,
      () => {
        if (graphHiddenCategories.has(category)) graphHiddenCategories.delete(category);
        else graphHiddenCategories.add(category);
        renderGraph();
      },
      off
    );
  }
  //: **The one kind of node the legend never named.** INBOX 183, the owner:
  //: "idk what entities are". `data.categories` is built from the notes before
  //: the entity nodes are appended (`routes_graph.py`), so an entity has
  //: always been drawn in a colour with nothing in the legend to explain it:
  //: an extra dot in an extra colour, on a map of notes, with no word attached
  //: to it anywhere on the screen. This is the same sentence the Show
  //: section's '?' gives and the same one a hovered entity node gives, so the
  //: three cannot drift, and the entry filters like any other because an
  //: entity node carries "Entity" as its category.
  if (!data.categories.includes(GC_ENTITY_CATEGORY) && data.nodes.some((n) => n.type === "entity")) {
    const off = graphHiddenCategories.has(GC_ENTITY_CATEGORY);
    entry(
      GC_ENTITY_HELP,
      colour(GC_ENTITY_CATEGORY),
      `${GC_ENTITY_CATEGORY} (${data.nodes.filter((n) => n.type === "entity").length})`,
      () => {
        if (off) graphHiddenCategories.delete(GC_ENTITY_CATEGORY);
        else graphHiddenCategories.add(GC_ENTITY_CATEGORY);
        renderGraph();
      },
      off
    );
  }
}

//: A plain-language readout of what is on screen. The counts are facts about
//: this notebook and stay on the line; the sentence explaining how a layout
//: works is the same every time you read it, so it is the line's tooltip.
function graphRenderStats(data, nodes, edges, colourMode, layoutKind) {
  const line = document.getElementById("graph-stats");
  if (!line) return;
  const counts = { link: 0, thread: 0, similar: 0, filing: 0, map: 0 };
  for (const edge of edges) counts[edge.kind] = (counts[edge.kind] || 0) + 1;
  const noteCount = nodes.filter((n) => !n.isGroup).length;
  const parts = [`${noteCount} note${noteCount === 1 ? "" : "s"}`];
  if (counts.link) parts.push(`${counts.link} link${counts.link === 1 ? "" : "s"}`);
  if (counts.thread) parts.push(`${counts.thread} thread${counts.thread === 1 ? "" : "s"}`);
  if (counts.similar)
    parts.push(`${counts.similar} similarity line${counts.similar === 1 ? "" : "s"}`);
  if (counts.filing) parts.push(`${counts.filing} filed under a category`);
  if (counts.map) parts.push(`${counts.map} on a mind map`);
  const shape =
    colourMode === "cluster" && graphStructure
      ? `${graphStructure.clusters.length} cluster${
          graphStructure.clusters.length === 1 ? "" : "s"
        }` +
        (graphStructure.small_clusters
          ? ` + ${graphStructure.small_clusters} pair${
              graphStructure.small_clusters === 1 ? "" : "s"
            }`
          : "") +
        `, ${graphStructure.orphan_count} connected to nothing.`
      : layoutKind === "tree"
        ? "filed left to right; replies branch off the note they answer."
        : layoutKind === "radial"
          ? "categories around the centre; replies branch off the note they answer."
          : layoutKind === "arc"
            ? "one line, filed left to right; arcs below show what answers what."
            : "";
  line.textContent = parts.join(" · ");
  line.title = shape;
}

//: The time slider's bounds, recomputed every render. They used to be computed
//: once behind a flag that never reset, so any note created after the first
//: render sat beyond the slider's own "all time" end and stayed permanently
//: hidden once the filter had run. The guard below keeps what the user was
//: actually doing with it: parked at the end, or deliberately looking at an
//: earlier cut-off.
function graphSyncTimeSlider(data, apply) {
  const slider = document.getElementById("graph-time-slider");
  const label = document.getElementById("graph-time-label");
  if (!slider || !data.nodes.length) return;
  const stamps = data.nodes
    .map((n) => new Date(n.created_at || Date.now()).getTime())
    .filter(Number.isFinite);
  const min = stamps.length ? Math.min(...stamps) : Date.now();
  const max = stamps.length ? Math.max(...stamps) : Date.now();
  const previousMax = Number(slider.max);
  const wasAtEnd = !slider.dataset.graphInit || Number(slider.value) >= previousMax;
  slider.min = min;
  slider.max = max;
  slider.step = (max - min) / 100 || 1;
  slider.value = wasAtEnd ? max : Math.min(Number(slider.value), max);
  slider.dataset.graphInit = "1";
  const say = (value) => {
    if (!label) return;
    label.textContent =
      value >= max ? "All time" : `Up to ${new Date(value).toLocaleDateString()}`;
  };
  const set = (value) => {
    say(value);
    // `null` rather than the maximum when the slider is at its end: "no filter"
    // and "a cut-off that happens to be the newest note" are the same picture
    // but not the same state, and the debug surface reports which.
    apply(value >= max ? null : value);
  };
  slider.oninput = (event) => set(Number(event.target.value));
  say(Number(slider.value));
  set(Number(slider.value));
  graphWireTimePlay(slider, set);
}

// --- Phase 4: Play on the time slider --------------------------------------------------
//: Sweeps the cutoff from the first note to the last over about eight
//: seconds, so the notebook grows on screen in the order it was written.
//: A touch on the slider, or a second press, stops it where it is.
let gcTimePlayFrame = null;
function graphWireTimePlay(slider, set) {
  const button = document.getElementById("graph-time-play");
  if (!button || button._wired) return;
  button._wired = true;
  const setPlaying = (on) => {
    button.setAttribute("aria-pressed", String(on));
    button.title = on ? "Pause" : "Play through time";
    setLabel(button, on ? "ph:pause" : "ph:play");
  };
  const stop = () => {
    if (gcTimePlayFrame) cancelAnimationFrame(gcTimePlayFrame);
    gcTimePlayFrame = null;
    setPlaying(false);
  };
  button.addEventListener("click", () => {
    if (gcTimePlayFrame) {
      stop();
      return;
    }
    const min = Number(slider.min);
    const max = Number(slider.max);
    if (!(max > min)) return;
    const duration = 8000;
    const startValue = Number(slider.value) >= max ? min : Number(slider.value);
    const startAt = performance.now() - ((startValue - min) / (max - min)) * duration;
    setPlaying(true);
    const tick = (now) => {
      const value = Math.min(max, min + ((now - startAt) / duration) * (max - min));
      slider.value = value;
      set(value);
      if (value >= max) {
        stop();
        return;
      }
      gcTimePlayFrame = requestAnimationFrame(tick);
    };
    gcTimePlayFrame = requestAnimationFrame(tick);
  });
  slider.addEventListener("pointerdown", stop);
  setPlaying(false);
}

// --- the read-only debug surface -------------------------------------------------
//
//: `window.__graphDebug` exists so the gate script (scratchpad/ui-sweeps/
//: graph.js) can assert that a control changed *what is drawn* rather than
//: only that the control moved. It is deliberately a getter returning a frozen
//: snapshot: nothing outside this file can write to it, so it cannot become a
//: back door into the renderer's state, and reading it can never change what
//: the next frame draws.
Object.defineProperty(window, "__graphDebug", {
  configurable: false,
  get() {
    const t = gcTab.transform || { x: 0, y: 0, k: 1 };
    return Object.freeze({
      renderer: gcTab.canvas && !gcTab.canvas.classList.contains("hidden") ? "canvas" : "svg",
      nodes: gcTab.nodes.length,
      edges: gcTab.edges.length,
      layout: gcTab.layoutKind,
      colourMode: typeof graphColourMode === "function" ? graphColourMode() : "category",
      transform: Object.freeze({ x: t.x, y: t.y, k: t.k }),
      hovered: graphHoveredId,
      focusModeId: graphFocusModeId,
      hiddenCategories: Object.freeze([...graphHiddenCategories]),
      timeCutoff: gcTab.timeCutoff,
      trace: graphTrace ? Object.freeze([...graphTrace.ids]) : null,
      highlight: graphHighlightIds ? graphHighlightIds.size : 0,
      alpha: gcTab.alpha,
      ticks: gcTab.ticks,
      tickMs: gcTab.tickMs,
      labelsWanted: gcTab.labelsWanted,
      labelsDrawn: gcTab.labelsDrawn,
      labelsPriority: gcTab.labelsPriority,
      // Capped: this is a debug read on every frame's worth of geometry, and
      // a 2,000-label frame would put a megabyte through the getter.
      labelBoxes: gcTab.labelBoxes.slice(0, 300).map((b) => Object.freeze({ ...b })),
      firstFrameMs: gcTab.timing.firstFrame,
      lastFrameMs: gcTab.timing.lastFrame,
      frames: gcTab.timing.frames,
      radii: Object.freeze(gcTab.nodes.slice(0, 40).map((n) => n.r)),
      colours: Object.freeze(gcTab.nodes.slice(0, 40).map((n) => n.colour)),
      positions: Object.freeze(
        gcTab.nodes.slice(0, 40).map((n) => Object.freeze([Math.round(n.x), Math.round(n.y)]))
      ),
      // Enough geometry for a sweep to check the *shape* of a computed
      // layout rather than only that one was chosen: which node is where,
      // how deep the hierarchy put it, and where each edge's two ends are.
      // `positions` above cannot answer "does depth increase away from the
      // root" or "do two edges cross", which are the two questions the tree
      // report turns on. Capped like the labels, and for the same reason.
      nodeGeometry: Object.freeze(
        gcTab.nodes.slice(0, 300).map((n) =>
          Object.freeze({
            id: n.id,
            x: Math.round(n.x * 10) / 10,
            y: Math.round(n.y * 10) / 10,
            r: n.r,
            depth: n.depth == null ? null : n.depth,
            group: Boolean(n.isGroup),
          })
        )
      ),
      edgeGeometry: Object.freeze(
        gcTab.edges.slice(0, 300).map((e) =>
          Object.freeze([
            Math.round(e.source.x * 10) / 10,
            Math.round(e.source.y * 10) / 10,
            Math.round(e.target.x * 10) / 10,
            Math.round(e.target.y * 10) / 10,
          ])
        )
      ),
    });
  },
});

// --- GRAPH_PLAN Phase 4: the local map beside an open note or document ------------
//
//: The last open item of Phase 4, and the reason the surface object above
//: exists. The pane is a second `gcSurface` at `size: "pane"`: its own canvas,
//: camera, worker and hover state, so the Graph tab's node array, zoom and
//: minimap are untouched by anything that happens in it. It draws
//: `/graph/local` at depth 1 for whatever is open, wires none of the chrome
//: (no legend, no minimap, no time slider, no lasso, no node menu), and a
//: click on one of its notes opens that note rather than a popup anchored to a
//: canvas the reader is not looking at.

let graphPaneSurface = null;
//: What the pane is drawn for. "Follow what is open" is called from three
//: places and most calls change nothing, so this is what makes the common case
//: a comparison rather than a fetch and a relayout.
let graphPaneShownId = null;

function graphPaneEnsure() {
  if (graphPaneSurface) return graphPaneSurface;
  graphPaneSurface = gcSurface({
    size: "pane",
    boxId: "graph-pane-box",
    canvasId: "graph-pane-canvas",
    //: The pane's notes open where the reader already is. `flashEntry` is the
    //: app's own "go to this note", the same one the graph's node popup, the
    //: search results and a wiki link use.
    onNodeClick: (node) => {
      if (node.isGroup || typeof flashEntry !== "function") return;
      flashEntry(node.id);
    },
  });
  return graphPaneSurface;
}

//: The pane's colours are the tab's colours when the tab has drawn, and its own
//: category scale when it has not. A local map whose "Work" notes are a
//: different colour from the same notes on the Graph tab is worse than no
//: colour at all, and the tab's `colourOf` already carries the rule, the groups
//: and the cluster structure the reader chose.
function graphPaneColour(data) {
  if (gcTab.nodes.length) return gcTab.colourOf;
  const scale = d3.scaleOrdinal(data.categories, d3.schemeTableau10.concat(d3.schemeSet3));
  return (node) => scale(node.category);
}

async function renderGraphPane(entryId) {
  const pane = document.getElementById("graph-pane");
  if (!pane || pane.hidden) return;
  const s = graphPaneEnsure();
  if (!gcEnsureCanvas(s)) return;
  const count = document.getElementById("graph-pane-count");
  const empty = document.getElementById("graph-pane-empty");
  const sequence = ++s.renderSeq;
  if (entryId == null) {
    graphPaneShownId = null;
    s.epoch += 1;
    gcStop(s);
    s.nodes = [];
    s.edges = [];
    s.adj = new Map();
    s.byId = new Map();
    s.quadtreeDirty = true;
    if (count) count.textContent = "No note open";
    if (empty) empty.hidden = false;
    gcRequestDraw(s);
    return;
  }
  const data = await apiJson(`/graph/local/${entryId}?depth=1`).catch(() => null);
  if (!data || sequence !== s.renderSeq) return;
  graphPaneShownId = entryId;
  gcReadTokens(s);

  const nodes = data.nodes.map((n) => ({ ...n }));
  const edges = data.edges.map((e) => ({ ...e }));
  s.byId = new Map(nodes.map((n) => [n.id, n]));
  s.adj = new Map(nodes.map((n) => [n.id, new Set()]));
  for (const edge of edges) {
    const from = edge.source && edge.source.id != null ? edge.source.id : edge.source;
    const to = edge.target && edge.target.id != null ? edge.target.id : edge.target;
    if (s.adj.has(from)) s.adj.get(from).add(to);
    if (s.adj.has(to)) s.adj.get(to).add(from);
    edge.source = s.byId.get(from) || edge.source;
    edge.target = s.byId.get(to) || edge.target;
    edge._path2d = null;
  }
  const colourOf = graphPaneColour(data);
  s.colourOf = colourOf;
  for (const node of nodes) {
    node.r = gcRadius(node, (s.adj.get(node.id) || { size: 0 }).size);
    node.colour = colourOf(node);
  }
  gcResize(s);
  //: The same spiral the tab lays down before the worker has said anything, and
  //: for the same reason: without it the first frame after the payload lands is
  //: a blank canvas.
  const centreX = s.dims.w / 2;
  const centreY = s.dims.h / 2;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  nodes.forEach((node, index) => {
    const radius = 10 * Math.sqrt(0.5 + index);
    node.x = centreX + radius * Math.cos(index * goldenAngle);
    node.y = centreY + radius * Math.sin(index * goldenAngle);
  });
  s.epoch += 1;
  s.nodes = nodes;
  s.edges = edges;
  s.layoutKind = "force";
  s.tree = null;
  s.quadtreeDirty = true;
  //: A pane is opened fresh at every note, so the camera frames the new
  //: neighbourhood every time rather than keeping the last one's.
  s.autoFitDone = false;
  s.fittedOnce = false;
  s.userZoomed = false;
  if (count) {
    count.textContent = `${nodes.length} note${nodes.length === 1 ? "" : "s"}`;
  }
  if (empty) empty.hidden = nodes.length > 1;
  gcStartWorker(nodes, edges, gcWorldFor(nodes.length, s.dims.w, s.dims.h), s);
  gcRequestDraw(s);
}

//: **Where the pane hangs, and what it is about.** Both answers change with the
//: tab, and the app has no event that says so (one `CustomEvent` exists in the
//: whole frontend, for an inline image), so this is called from the three
//: places that already know: `switchTab`, `flashEntry` and `openDocument`, each
//: wrapped once at boot by `graphPaneWire`. A poll would have to run for the
//: life of the page to catch three moments that announce themselves.
function graphPaneFollow() {
  const pane = document.getElementById("graph-pane");
  if (!pane) return;
  const tab = localStorage.getItem("activeTab") || "notes";
  const hostId = tab === "notes" ? "sidebar" : tab === "documents" ? "doc-sidebar" : null;
  if (!hostId) {
    pane.hidden = true;
    //: A hidden pane's worker has nothing to solve for. The nodes keep their
    //: positions, so coming back is a redraw rather than a fresh explosion.
    if (graphPaneSurface) gcStop(graphPaneSurface);
    return;
  }
  const host = document.getElementById(hostId);
  if (!host) return;
  if (pane.parentElement !== host) host.appendChild(pane);
  const wanted =
    tab === "notes"
      ? typeof lastOpenedEntryId === "number"
        ? lastOpenedEntryId
        : null
      : graphPaneDocumentNote();
  //: **The pane arrives with the thing it is about, and leaves with it.** A
  //: panel headed "Local map" reading "No note open" is 263px of chrome with
  //: nothing in it, and the sidebar it hangs in has about 130px of room at
  //: 1440 once the categories and Most used have had theirs: measured with
  //: `errors.js`, an always-present pane put the column at 968 inside 761, so
  //: a reader who had opened nothing paid the whole cost of a map of nothing.
  //: The column scrolls either way (`overflow-y: auto`), so this is about
  //: what is worth scrolling past rather than about a clip.
  pane.hidden = wanted == null;
  if (pane.hidden) {
    if (graphPaneSurface) gcStop(graphPaneSurface);
    graphPaneShownId = null;
    return;
  }
  if (wanted === graphPaneShownId && graphPaneSurface && graphPaneSurface.nodes.length) {
    gcRequestDraw(graphPaneSurface);
    return;
  }
  renderGraphPane(wanted);
}

//: A document is not a node on `/graph/local`, which walks notes. The pane
//: beside one is the local map of the notes that document draws on, which is
//: the same relationship the Documents sidebar already lists; the first of them
//: is the one it centres on.
function graphPaneDocumentNote() {
  if (typeof currentDoc !== "object" || !currentDoc) return null;
  const notes = currentDoc.notes || currentDoc.entries || [];
  const first = notes[0];
  if (first == null) return null;
  if (typeof first !== "object") return first;
  return first.id != null ? first.id : first.entry_id != null ? first.entry_id : null;
}

function graphPaneWire() {
  const pane = document.getElementById("graph-pane");
  if (!pane || pane.dataset.wired === "yes") return;
  pane.dataset.wired = "yes";

  const toggle = document.getElementById("graph-pane-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const collapsed = pane.dataset.collapsed === "true";
      pane.dataset.collapsed = collapsed ? "false" : "true";
      toggle.setAttribute("aria-expanded", collapsed ? "true" : "false");
      toggle.title = collapsed ? "Hide the local map" : "Show the local map";
      toggle.setAttribute("aria-label", toggle.title);
      const icon = toggle.querySelector("i");
      if (icon) icon.className = collapsed ? "ph ph-caret-up" : "ph ph-caret-down";
      //: The box had no size while it was collapsed, so the canvas has to be
      //: measured again on the way back or it paints into the dimensions it
      //: last had.
      if (collapsed && graphPaneSurface) {
        gcResize(graphPaneSurface);
        gcRequestDraw(graphPaneSurface);
      }
    });
  }

  const focus = document.getElementById("graph-pane-focus");
  if (focus) {
    focus.addEventListener("click", () => {
      if (graphPaneShownId == null) return;
      graphFocusModeId = graphPaneShownId;
      switchTab("graph");
      renderGraph();
    });
  }

  //: Wrapped rather than called from inside each: `app.js` and `documents.js`
  //: are not the graph's files, and three edits across two of them to announce
  //: something the graph is the only consumer of is a worse trade than one
  //: wrapper each here, next to the thing that needs them.
  for (const name of ["switchTab", "flashEntry", "openDocument"]) {
    const original = window[name];
    if (typeof original !== "function" || original.__graphPaneWrapped) continue;
    const wrapped = function (...args) {
      const result = original.apply(this, args);
      if (result && typeof result.then === "function") {
        return result.then((value) => {
          graphPaneFollow();
          return value;
        });
      }
      graphPaneFollow();
      return result;
    };
    wrapped.__graphPaneWrapped = true;
    window[name] = wrapped;
  }
  graphPaneFollow();
}

onDomReady(graphPaneWire);
