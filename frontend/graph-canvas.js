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

let gcCanvas = null; // the <canvas> element
let gcCtx = null;
let gcWorker = null;
//: The drawing's own copy of the graph. `gcNodes` is the same array
//: `graphNodesRef` points at, so everything in graph.js that walks the nodes
//: (the keyboard, the minimap, `fitGraphToView`, drag-to-link) sees exactly
//: what is on screen. Edges have their `source`/`target` resolved to node
//: objects once per render rather than looked up per frame.
let gcNodes = [];
let gcEdges = [];
let gcAdj = new Map();
let gcById = new Map();
let gcDims = { w: 0, h: 0 };
let gcDpr = 1;
//: The live pan/zoom. Kept here as well as on the element (d3 stores it there)
//: because every draw needs it and `d3.zoomTransform` is a property lookup
//: plus a null check on a hot path.
let gcTransform = null;
let gcObserver = null;
let gcDrawQueued = false;
let gcQuadtree = null;
let gcQuadtreeDirty = true;
//: Set while a pan/zoom gesture is in flight, so a node sliding under a
//: stationary cursor does not register as a hover. Same reasoning the SVG
//: renderer's `graphIsPanning` carries; here it is cheaper, because there is
//: no CSS `:hover` to fight as well.
let gcPanning = false;
let gcLayoutKind = "force";
let gcTree = null; // the laid-out hierarchy for tree/radial/arc, else null
let gcTimeCutoff = null;
let gcColourOf = () => "#888";
let gcTokens = {};
let gcRenderSeq = 0;
//: Timing for the gate (§5 Phase 1) and for `window.__graphDebug`. `firstFrame`
//: is measured from the moment the payload has arrived to the end of the first
//: paint, which is what the plan's "< 300 ms after data arrives" means.
let gcTiming = { dataAt: 0, firstFrame: 0, lastFrame: 0, frames: 0 };
//: The last thing the worker said about itself: how hot the layout still is,
//: and how many steps it has taken. Reported on the debug surface because a
//: slow-looking map is now two separable questions, is the simulation
//: crawling, or is the paint dropping frames, and guessing which cost a round
//: of theorising before this was here.
let gcAlpha = 0;
let gcTicks = 0;
let gcTickMs = 0;
//: Whether this render has been framed once already, and whether the person
//: has since taken the camera somewhere themselves. See the tick handler for
//: why there are two fits and why the second one is conditional.
let gcFittedOnce = false;
let gcUserZoomed = false;

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
//: How far a non-neighbour dims while something is hovered (§5 Phase 1).
const GC_DIM_ALPHA = 0.2;

//: Every colour comes from the app's tokens (§6). Read off the canvas element
//: rather than `:root` so whatever cascade actually applies, theme, a user
//: theme, the dark-mode block, is the one that answers.
function gcReadTokens() {
  const style = getComputedStyle(gcCanvas || document.documentElement);
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
  link: { width: 1.6, alpha: 0.55, dash: null, colour: "muted" },
  thread: { width: 1.4, alpha: 0.55, dash: [7, 4], colour: "muted" },
  similar: { width: 1.2, alpha: 0.55, dash: [2, 5], colour: "accent" },
  map: { width: 1.3, alpha: 0.7, dash: [1, 4], colour: "accent" },
  filing: { width: 1.6, alpha: 0.25, dash: [3, 3], colour: "muted" },
  entity: { width: 1.6, alpha: 0.55, dash: null, colour: "muted" },
  document: { width: 1.6, alpha: 0.55, dash: null, colour: "muted" },
};
const GC_EDGE_REASONED = { width: 2.2, alpha: 0.8, dash: null, colour: "accent" };
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
function gcResize() {
  if (!gcCanvas) return false;
  const box = document.getElementById("graph-box");
  const width = (box && box.clientWidth) || 800;
  const height = (box && box.clientHeight) || 540;
  const dpr = window.devicePixelRatio || 1;
  if (width === gcDims.w && height === gcDims.h && dpr === gcDpr) return false;
  gcDims = { w: width, h: height };
  gcDpr = dpr;
  gcCanvas.width = Math.max(1, Math.round(width * dpr));
  gcCanvas.height = Math.max(1, Math.round(height * dpr));
  gcCanvas.style.width = `${width}px`;
  gcCanvas.style.height = `${height}px`;
  graphDims = { w: width, h: height };
  return true;
}

function gcEnsureCanvas() {
  if (gcCanvas) return gcCanvas;
  gcCanvas = document.getElementById("graph-canvas");
  if (!gcCanvas) return null;
  gcCtx = gcCanvas.getContext("2d");
  gcTransform = d3.zoomIdentity;
  gcResize();
  // The card resizes for reasons no `resize` event fires for: the sidebar
  // opening, the legend collapsing, fullscreen. A ResizeObserver is the only
  // thing that sees all of them (§5 Phase 1 asks for one by name).
  if (!gcObserver && typeof ResizeObserver !== "undefined") {
    gcObserver = new ResizeObserver(() => {
      if (gcResize()) gcRequestDraw();
    });
    const box = document.getElementById("graph-box");
    if (box) gcObserver.observe(box);
  }
  gcWireInteraction();
  return gcCanvas;
}

// --- the draw ------------------------------------------------------------------

function gcRequestDraw() {
  if (gcDrawQueued || !gcCtx) return;
  gcDrawQueued = true;
  requestAnimationFrame(() => {
    gcDrawQueued = false;
    gcDraw();
  });
}

//: What is dimmed and what is lit, in one pass, for the same reason the SVG
//: renderer's `applyGraphHighlight` does it in one pass: search, the "similar
//: notes" spotlight, a traced path and the hover neighbourhood are four
//: sources of the same signal, and two of them computed separately contradict
//: each other on screen.
function gcHighlight() {
  const search = document.getElementById("graph-search");
  const query = (search ? search.value : "").trim().toLowerCase();
  const onPath = graphTrace ? new Set(graphTrace.ids) : null;
  const ids = graphHighlightIds;
  const searchOk = (n) =>
    onPath ? onPath.has(n.id) : ids ? ids.has(n.id) : !query || n.preview.toLowerCase().includes(query);
  const neighbours =
    graphHoveredId != null && gcAdj ? gcAdj.get(graphHoveredId) : null;
  const hoverOk = (id) => neighbours == null || id === graphHoveredId || neighbours.has(id);
  return {
    active: Boolean(query || ids || onPath),
    onPath,
    hovering: neighbours != null,
    searchOk,
    hoverOk,
  };
}

function gcVisibleAtTime(node) {
  if (gcTimeCutoff == null) return true;
  if (node.isGroup) return true;
  const at = new Date(node.created_at || Date.now()).getTime();
  return at <= gcTimeCutoff;
}

function gcDraw() {
  if (!gcCtx || !gcCanvas) return;
  const started = performance.now();
  const ctx = gcCtx;
  const t = gcTransform || d3.zoomIdentity;
  const k = t.k;
  ctx.setTransform(gcDpr, 0, 0, gcDpr, 0, 0);
  ctx.clearRect(0, 0, gcDims.w, gcDims.h);
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.scale(k, k);

  // Cull to the visible world rectangle. On a 2,000-note map zoomed in, this
  // is the difference between drawing 2,000 nodes and drawing forty.
  const margin = 80 / k;
  const view = {
    left: -t.x / k - margin,
    top: -t.y / k - margin,
    right: (gcDims.w - t.x) / k + margin,
    bottom: (gcDims.h - t.y) / k + margin,
  };
  const inView = (n) =>
    n.x >= view.left && n.x <= view.right && n.y >= view.top && n.y <= view.bottom;

  const hl = gcHighlight();
  const labelsOn = (() => {
    const box = document.getElementById("graph-labels");
    return box ? box.checked : true;
  })();

  // --- edges -------------------------------------------------------------
  // Bucketed by recipe and by whether they are dimmed, so the context's
  // stroke state is set once per bucket rather than once per edge. A dashed
  // stroke is the expensive one, and there are only ever a handful of dashes.
  const buckets = new Map();
  for (const edge of gcEdges) {
    const a = edge.source;
    const b = edge.target;
    if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(b.x)) continue;
    if (!gcVisibleAtTime(a) || !gcVisibleAtTime(b)) continue;
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
      !hl.hovering || a.id === graphHoveredId || b.id === graphHoveredId;
    const dim = !(bySearch && byHover);
    const style = gcEdgeStyle(edge);
    const key = `${edge.kind}|${style.colour}|${style.width}|${style.dash}|${dim}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { style, dim, path: new Path2D() };
      buckets.set(key, bucket);
    }
    if (gcTree) {
      // A tree's edges are curves between fixed points. `hierarchyPath` and
      // `arcPath` already return SVG path data, and Path2D speaks it, so the
      // curve maths is shared with the SVG renderer rather than rewritten.
      if (!edge._path2d) {
        edge._path2d = new Path2D(gcTree.arc ? arcPath(edge) : hierarchyPath(edge, gcTree.radial));
      }
      bucket.path.addPath(edge._path2d);
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
  gcDrawTrace(ctx, k);

  // --- nodes --------------------------------------------------------------
  // Two batched fills per colour (halo, then core) and one batched stroke for
  // the ordinary ring. Only the handful of nodes that are hovered, matched,
  // pinned, held, hub or on a path get their own stroke.
  const haloByColour = new Map();
  const coreByColour = new Map();
  const ringed = [];
  const hubs = { path: new Path2D(), any: false };
  const labelled = [];
  const drawn = [];
  for (const node of gcNodes) {
    if (!Number.isFinite(node.x)) continue;
    if (!gcVisibleAtTime(node)) continue;
    if (!inView(node)) continue;
    const dim = !(hl.searchOk(node) && hl.hoverOk(node.id));
    const key = `${node.colour}|${dim}`;
    let halo = haloByColour.get(key);
    if (!halo) {
      halo = { colour: node.colour, dim, path: new Path2D() };
      haloByColour.set(key, halo);
      coreByColour.set(key, { colour: node.colour, dim, path: new Path2D() });
    }
    const r = node.r;
    halo.path.moveTo(node.x + r + 6, node.y);
    halo.path.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
    const core = coreByColour.get(key);
    core.path.moveTo(node.x + r, node.y);
    core.path.arc(node.x, node.y, r, 0, Math.PI * 2);
    drawn.push(node);
    node._dim = dim;
    const focused = node.id === graphHoveredId || node.id === graphKeyboardId;
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
      node === gcDropTarget;
    if (special) {
      ringed.push({ node, focused, matched, onPath, dim });
    } else if (!dim && (gcAdj.get(node.id) || { size: 0 }).size >= 3) {
      // **A hub's ring is batched, not drawn per node.** Average degree in a
      // real notebook is about four, so "degree >= 3" is most of the map: one
      // `beginPath`/`stroke` each was 2,000 stroke calls a frame at the fitted
      // zoom and on its own blew the 16 ms budget. Every hub ring is the same
      // colour and the same width, so it is one path and one stroke.
      hubs.path.moveTo(node.x + node.r, node.y);
      hubs.path.arc(node.x, node.y, node.r, 0, Math.PI * 2);
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
    const labelsForAll = labelsOn && gcNodes.length <= GC_LABEL_ALL_MAX;
    if (!dim && ((labelsOn && (labelsForAll || k > GC_LABEL_ZOOM || matched)) || focused)) {
      labelled.push(node);
    }
  }
  for (const [key, halo] of haloByColour) {
    ctx.globalAlpha = halo.dim ? 0.05 : 0.18;
    ctx.fillStyle = halo.colour;
    ctx.fill(halo.path);
    const core = coreByColour.get(key);
    ctx.globalAlpha = core.dim ? GC_DIM_ALPHA : 1;
    ctx.fillStyle = core.colour;
    ctx.fill(core.path);
  }
  // The ordinary ring (`.graph-core { stroke: var(--card) }`) in one pass.
  ctx.globalAlpha = 1;
  ctx.strokeStyle = gcTokens.card;
  ctx.lineWidth = 2 / k;
  const plain = new Path2D();
  for (const node of drawn) {
    if (node._dim) continue;
    plain.moveTo(node.x + node.r, node.y);
    plain.arc(node.x, node.y, node.r, 0, Math.PI * 2);
  }
  ctx.stroke(plain);
  if (hubs.any) {
    // Well-connected notes get a brighter ring so the structure of the
    // notebook is visible without reading a single label.
    ctx.strokeStyle = gcTokens.accent;
    ctx.lineWidth = 2.5 / k;
    ctx.stroke(hubs.path);
  }

  for (const item of ringed) {
    const node = item.node;
    ctx.globalAlpha = item.dim ? GC_DIM_ALPHA : 1;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    if (node === gcDropTarget) {
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
    } else if (node.fx != null) {
      // Held in place by a drag or a double-click: the same dashed ink ring
      // `.graph-held` draws, so a held note looks held on both renderers.
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
    const beside = Boolean(gcTree) && !gcTree.radial && !gcTree.arc;
    ctx.textAlign = beside ? "left" : "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3 / k;
    ctx.strokeStyle = gcTokens.card;
    ctx.fillStyle = gcTokens.ink;
    // `paint-order: stroke` on `.graph-label`, the halo goes down first so a
    // label stays legible over an edge or another node.
    for (const node of labelled) {
      const text = gcLabelText(node);
      const x = beside ? node.x + node.r + 7 : node.x;
      const y = beside ? node.y : node.y + node.r + 13;
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
  }

  ctx.restore();
  gcTiming.lastFrame = performance.now() - started;
  gcTiming.frames += 1;
  // **Only a frame with something in it stops the clock.** A frame drawn
  // before the first positions exist is a blank canvas, and calling that "the
  // first frame" would be measuring nothing and reporting a good number for
  // it: the exact shape of self-deception the gate exists to prevent.
  if (!gcTiming.firstFrame && gcTiming.dataAt && drawn.length) {
    gcTiming.firstFrame = performance.now() - gcTiming.dataAt;
  }
}

function gcLabelText(node) {
  const limit = gcTree ? (gcTree.arc ? 12 : gcTree.radial ? 16 : 30) : 22;
  const text = node.preview || "";
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

//: The trace overlay. Drawn from the same `graphTrace`/`graphTraceRoutes`
//: state the SVG renderer's `drawTrace` fills in, so trace mode, the route
//: chips and the readout are untouched by the change of renderer.
function gcDrawTrace(ctx, k) {
  const routes = graphTraceRoutes.length
    ? graphTraceRoutes
    : graphTrace
      ? [{ steps: graphTrace.steps }]
      : [];
  if (!routes.length || !gcById) return;
  const colours = [gcTokens.accent, gcTokens.ok, gcTokens.warn];
  const isArc = gcTree && gcTree.arc;
  const drawRoute = (route, index, selected) => {
    ctx.strokeStyle = colours[index % 3];
    ctx.globalAlpha = selected ? 0.85 : 0.42;
    ctx.lineWidth = (selected ? 4 : 2) / k;
    ctx.setLineDash(selected ? [] : [6 / k, 5 / k]);
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const step of route.steps || []) {
      const from = gcById.get(step.source);
      const to = gcById.get(step.target);
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
function gcTreeIndex() {
  if (gcQuadtree && !gcQuadtreeDirty) return gcQuadtree;
  gcQuadtree = d3
    .quadtree()
    .x((n) => n.x)
    .y((n) => n.y)
    .addAll(gcNodes.filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y)));
  gcQuadtreeDirty = false;
  return gcQuadtree;
}

//: The node under a point given in world coordinates, or null. The search
//: radius is generous by exactly the slop a pointer needs at the current zoom:
//: a 4px dot at k=0.3 is a one-pixel target otherwise.
function gcNodeAtWorld(x, y) {
  if (!gcNodes.length) return null;
  const slop = 6 / ((gcTransform && gcTransform.k) || 1);
  const found = gcTreeIndex().find(x, y, GC_MAX_RADIUS + slop + 8);
  if (!found) return null;
  if (!gcVisibleAtTime(found)) return null;
  const distance = Math.hypot(found.x - x, found.y - y);
  return distance <= found.r + slop ? found : null;
}

function gcWorldPoint(event) {
  const point = d3.pointer(event, gcCanvas);
  const t = gcTransform || d3.zoomIdentity;
  return t.invert(point);
}

//: The edge under a point, for the link-management panel a click on a link
//: opens. Linear over the edges rather than indexed: it runs once per click,
//: never per frame, and an index that has to be kept in step with a moving
//: layout would cost more than it saves.
function gcEdgeAtWorld(x, y) {
  const tolerance = 8 / ((gcTransform && gcTransform.k) || 1);
  let best = null;
  let bestDistance = tolerance;
  for (const edge of gcEdges) {
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

let gcDropTarget = null;
let gcDragNode = null;
let gcWired = false;

function gcWireInteraction() {
  if (gcWired || !gcCanvas) return;
  gcWired = true;
  const selection = d3.select(gcCanvas);

  const zoom = d3
    .zoom()
    .scaleExtent([0.05, 5])
    // A drag that starts on a node moves the node; anywhere else pans. Without
    // this filter d3-zoom claims the gesture first and a node can never be
    // picked up.
    .filter((event) => {
      if (event.type === "wheel") return true;
      if (event.button) return false;
      const [x, y] = gcWorldPoint(event);
      return !gcNodeAtWorld(x, y);
    })
    .on("start", () => {
      gcPanning = true;
      graphHoveredId = null;
      gcRequestDraw();
    })
    .on("zoom", (event) => {
      // `sourceEvent` is set for a real gesture and null for a programmatic
      // transform, which is how "the user went to look at something" is told
      // apart from "the renderer framed the map".
      if (event.sourceEvent) gcUserZoomed = true;
      gcTransform = event.transform;
      gcRequestDraw();
      graphMinimapPaint();
    })
    .on("end", () => {
      gcPanning = false;
      gcRequestDraw();
    });
  selection.call(zoom).on("dblclick.zoom", null);

  // The rest of the app drives zoom through `graphSvg`/`graphZoom`, the
  // +/-/fit buttons, the keyboard, the minimap, saved views, `fitGraphToView`.
  // Pointing those two at the canvas is what makes every one of them keep
  // working without a line of change: `d3.zoom` does not care what element it
  // is attached to, and `d3.zoomTransform` reads the transform off the node.
  graphSvg = selection;
  graphZoom = zoom;
  graphCanvas = null; // there is no <g> to transform any more

  selection.call(
    d3
      .drag()
      // **The canvas, not its parent.** d3-drag's default container is
      // `this.parentNode`, so without this the pointer would be measured
      // against `#graph-box` while the subject's coordinates are measured
      // against the canvas: an offset that is zero today and stops being zero
      // the moment anything is laid out above the canvas inside the box.
      .container(() => gcCanvas)
      .subject((event) => {
        const [x, y] = gcWorldPoint(event);
        const node = gcNodeAtWorld(x, y);
        if (!node) return null;
        const [sx, sy] = (gcTransform || d3.zoomIdentity).apply([node.x, node.y]);
        return { node, x: sx, y: sy };
      })
      .on("start", (event) => {
        const node = event.subject.node;
        gcDragNode = node;
        node._dragStartX = node.x;
        node._dragStartY = node.y;
        node._wasPinned = node.fx != null;
        const [wx, wy] = (gcTransform || d3.zoomIdentity).invert([event.x, event.y]);
        node.fx = wx;
        node.fy = wy;
        gcPost({ type: "drag", phase: "start", id: node.id, x: wx, y: wy });
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
        const following = gcAdj.get(node.id) || new Set();
        gcPost({
          type: "freeze",
          ids: gcNodes
            .filter((n) => n !== node && n.fx == null && !following.has(n.id))
            .map((n) => n.id),
        });
      })
      .on("drag", (event) => {
        const node = event.subject.node;
        const [wx, wy] = (gcTransform || d3.zoomIdentity).invert([event.x, event.y]);
        node.fx = wx;
        node.fy = wy;
        node.x = wx;
        node.y = wy;
        gcQuadtreeDirty = true;
        gcPost({ type: "drag", phase: "move", id: node.id, x: wx, y: wy });
        gcDropTarget = graphNodeUnder(node, { x: wx, y: wy });
        gcRequestDraw();
      })
      .on("end", (event) => {
        const node = event.subject.node;
        gcDragNode = null;
        const over = gcDropTarget;
        gcDropTarget = null;
        const movedFar =
          Math.abs(node.x - node._dragStartX) > 2 || Math.abs(node.y - node._dragStartY) > 2;
        // A drag is an intentional placement and it stays placed; a
        // zero-distance drag is a click and must not pin anything. Both rules
        // are carried straight over from the SVG renderer, where each was a
        // reported bug in its own right.
        const keep = movedFar || node._wasPinned;
        gcPost({ type: "drag", phase: "end", id: node.id, keep });
        gcPost({ type: "thaw" });
        if (!keep) {
          node.fx = null;
          node.fy = null;
        }
        if (over && movedFar) {
          linkByDrop(node, over);
        } else if (!movedFar) {
          gcClickNode(event.sourceEvent, node);
        } else if (!node.isGroup) {
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
        gcRequestDraw();
      })
  );

  gcCanvas.addEventListener("pointermove", (event) => {
    if (gcPanning || gcDragNode) return;
    const [x, y] = gcWorldPoint(event);
    const node = gcNodeAtWorld(x, y);
    const id = node ? node.id : null;
    if (id !== graphHoveredId) {
      graphHoveredId = id;
      // The native tooltip the SVG renderer got from a `<title>` child. A
      // canvas has no children, so the canvas itself carries whichever one
      // applies.
      gcCanvas.title = node ? gcTooltip(node) : "";
      gcRequestDraw();
    }
  });
  gcCanvas.addEventListener("pointerleave", () => {
    if (graphHoveredId == null) return;
    graphHoveredId = null;
    gcCanvas.title = "";
    gcRequestDraw();
  });

  gcCanvas.addEventListener("click", (event) => {
    const [x, y] = gcWorldPoint(event);
    if (gcNodeAtWorld(x, y)) return; // handled by the drag's own end
    const edge = gcEdgeAtWorld(x, y);
    if (edge) {
      openGraphLinkPanel(edge, gcNodes);
      return;
    }
    closeGraphPopup();
    closeGraphNewNote();
  });

  gcCanvas.addEventListener("dblclick", (event) => {
    const [x, y] = gcWorldPoint(event);
    const node = gcNodeAtWorld(x, y);
    if (!node) {
      // Grow the map: double-click empty space to add a note right there.
      openGraphNewNote(event);
      return;
    }
    const wasPinned = node.fx != null;
    if (wasPinned) {
      node.fx = null;
      node.fy = null;
      gcPost({ type: "unpin", id: node.id });
    } else {
      node.fx = node.x;
      node.fy = node.y;
      gcPost({ type: "pin", id: node.id, x: node.x, y: node.y });
    }
    gcRequestDraw();
    if (node.isGroup) return;
    node.graph_pin_x = wasPinned ? null : node.fx;
    node.graph_pin_y = wasPinned ? null : node.fy;
    apiJson(`/graph/pin/${node.id}`, {
      method: "PUT",
      body: JSON.stringify({ x: node.graph_pin_x, y: node.graph_pin_y }),
    }).catch(() => {
      // Best-effort; the hold works for this session either way.
    });
  });
}

function gcTooltip(node) {
  const links = (gcAdj && gcAdj.get(node.id) ? gcAdj.get(node.id).size : 0) || 0;
  return (
    `${node.preview}\n[${node.category}] · ${links} connection${links === 1 ? "" : "s"}` +
    `${node.access_count ? ` · used ${node.access_count}×` : ""}`
  );
}

//: A click on a node, with the same three modes the SVG renderer had: trace
//: mode picks an end, an in-flight "Link" picks the other note, otherwise the
//: note opens in the popup.
function gcClickNode(event, node) {
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

function gcPost(message) {
  if (gcWorker) gcWorker.postMessage(message);
}

function gcStop() {
  gcPost({ type: "stop" });
}

function gcStartWorker(nodes, edges, world) {
  if (!gcWorker) {
    // Version-stamped for the same reason index.html's script tags are
    // (tests/test_asset_cache_busting.py): a desktop wrapper with its own
    // cache can otherwise go on running yesterday's worker forever, and a
    // stale worker is invisible, nothing logs, the map just behaves like the
    // build before last. The stamp is lifted off this file's own <script>
    // tag rather than kept in a second place that can drift from it.
    const own = document.querySelector('script[src*="graph-canvas.js"]');
    const stamp = ((own && own.getAttribute("src")) || "").split("?v=")[1] || "0";
    gcWorker = new Worker(`/graph-worker.js?v=${stamp}`);
    gcWorker.onmessage = (event) => {
      const message = event.data || {};
      if (message.type === "tick") {
        gcAlpha = message.alpha;
        gcTicks = message.ticks || 0;
        gcTickMs = message.tickMs || 0;
        const positions = message.positions;
        const count = Math.min(gcNodes.length, positions.length / 2);
        for (let i = 0; i < count; i++) {
          const node = gcNodes[i];
          // A node being dragged is authoritative on this side: its position
          // came from the pointer this frame and the worker's copy is one
          // message behind.
          if (node === gcDragNode) continue;
          node.x = positions[i * 2];
          node.y = positions[i * 2 + 1];
        }
        // The positions moved, so the hit-test index is stale. Marked here
        // rather than at the end of every draw: a settled map redraws on
        // hover without anything having moved, and rebuilding a 2,000-point
        // quadtree per pointermove for nothing is a millisecond a frame.
        gcQuadtreeDirty = true;
        gcRequestDraw();
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
        if (!graphAutoFitDone && gcNodes.length) {
          if (!gcFittedOnce) {
            gcFittedOnce = true;
            fitGraphToView(graphSvg, null, graphZoom, gcNodes, gcDims.w, gcDims.h);
          } else if (message.alpha < 0.08) {
            graphAutoFitDone = true;
            if (!gcUserZoomed) {
              fitGraphToView(graphSvg, null, graphZoom, gcNodes, gcDims.w, gcDims.h);
            }
          }
        }
        // Hand the buffer back so the worker can reuse it (see its `pool`).
        gcWorker.postMessage({ type: "recycle", buffer: positions.buffer }, [positions.buffer]);
        graphMinimapTick += 1;
        if (graphMinimapTick % 8 === 0) graphMinimapPaint();
      } else if (message.type === "end") {
        graphMinimapPaint();
        if (!graphAutoFitDone && gcNodes.length) {
          graphAutoFitDone = true;
          fitGraphToView(graphSvg, null, graphZoom, gcNodes, gcDims.w, gcDims.h);
        }
      }
    };
    gcWorker.onerror = () => {
      // A worker that will not start must not take the map with it: the nodes
      // already have positions (inherited, pinned or spiral), so the canvas
      // still draws a static graph.
      gcRequestDraw();
    };
  }
  gcFittedOnce = false;
  gcPost({
    type: "init",
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
  });
}

//: The world the simulation solves in, a square whose side grows with
//: sqrt(count). Carried over from the SVG renderer along with the reason it is
//: square and count-based rather than a multiple of the frame: a graph box is
//: wide and short, so multiplying the frame gave a few hundred pixels of
//: vertical room and the layout settled against the walls into a lattice,
//: reported as "the graph nodes are like locked into a box".
function gcWorldFor(count, width, height) {
  const perNode = 2 * (GC_MAX_RADIUS + 28);
  const roomy = Math.sqrt(Math.max(count, 1)) * perNode * 1.6;
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
async function renderGraphCanvas() {
  if (!gcEnsureCanvas()) return;
  const sequence = ++gcRenderSeq;
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
  if (sequence !== gcRenderSeq) return;
  gcTiming = { dataAt: performance.now(), firstFrame: 0, lastFrame: 0, frames: 0 };
  // A fresh visit to the tab (`graphAutoFitDone` cleared by switchTab) is also
  // a fresh camera: forget that the last visit's viewer had zoomed somewhere.
  if (!graphAutoFitDone) gcUserZoomed = false;

  gcReadTokens();
  const empty = document.getElementById("graph-empty");
  empty.style.display = data.nodes.length > 0 ? "none" : "grid";
  empty.classList.toggle("hidden", data.nodes.length > 0);

  const colour = d3.scaleOrdinal(data.categories, d3.schemeTableau10.concat(d3.schemeSet3));
  const clusterColour = d3.scaleOrdinal(d3.schemeTableau10.concat(d3.schemeSet3));
  const colourMode = graphColourMode();
  graphStructure =
    colourMode === "cluster" ? await apiJson("/graph/structure").catch(() => null) : null;
  if (sequence !== gcRenderSeq) return;
  gcColourOf = (node) => {
    if (colourMode === "category" || !graphStructure || node.isGroup) return colour(node.category);
    const cluster = graphStructure.cluster_of[String(node.id)];
    return cluster === undefined ? gcTokens.muted : clusterColour(String(cluster));
  };
  graphRenderLegend(data, colourMode, colour, clusterColour);

  let visibleNodes = data.nodes.filter((n) => !graphHiddenCategories.has(n.category));
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
    gcNodes = [];
    gcEdges = [];
    gcAdj = new Map();
    gcById = new Map();
    graphNodesRef = gcNodes;
    gcStop();
    gcRequestDraw();
    return;
  }

  gcResize();
  const width = gcDims.w;
  const height = gcDims.h;
  gcLayoutKind = graphLayout();
  gcTree =
    gcLayoutKind === "force"
      ? null
      : layoutHierarchy(visibleNodes.map((n) => ({ ...n })), gcLayoutKind, width, height);

  // A note already on screen keeps the spot it had settled into, so a legend
  // toggle or a slider change does not replay the whole "explode outward"
  // animation. Same inheritance the SVG renderer does, and for the same
  // reported reason.
  const prior = new Map((graphNodesRef || []).map((n) => [n.id, { x: n.x, y: n.y }]));
  const nodes = gcTree
    ? gcTree.nodes
    : visibleNodes.map((n) => {
        const was = prior.get(n.id);
        const built = was && Number.isFinite(was.x) ? { ...n, ...was } : { ...n };
        if (built.graph_pin_x != null && built.graph_pin_y != null) {
          built.fx = built.graph_pin_x;
          built.fy = built.graph_pin_y;
        }
        return built;
      });
  const edges = gcTree ? gcTree.links : visibleEdges.map((e) => ({ ...e }));

  gcById = new Map(nodes.map((n) => [n.id, n]));
  gcAdj = new Map(nodes.map((n) => [n.id, new Set()]));
  for (const edge of edges) {
    const from = edge.source && edge.source.id != null ? edge.source.id : edge.source;
    const to = edge.target && edge.target.id != null ? edge.target.id : edge.target;
    if (gcAdj.has(from)) gcAdj.get(from).add(to);
    if (gcAdj.has(to)) gcAdj.get(to).add(from);
    // Resolve to the node objects once, here, rather than on every frame.
    edge.source = gcById.get(from) || edge.source;
    edge.target = gcById.get(to) || edge.target;
    edge._path2d = null;
  }
  for (const node of nodes) {
    node.r = gcRadius(node, (gcAdj.get(node.id) || { size: 0 }).size);
    node.colour = gcColourOf(node);
  }
  //: **A note with no position yet is placed here, not in the worker.**
  //: d3-force assigns its phyllotaxis spiral inside `forceSimulation`, which
  //: means the main thread has no positions at all until the first tick comes
  //: back: so the frame drawn the instant the payload arrives would be an
  //: empty canvas, and the gate's "first frame after data" would be timing a
  //: blank. The same spiral is laid down here (identical constants, so the
  //: worker keeps these rather than re-placing anything) and the first frame
  //: is a real picture of the notebook that then relaxes into its layout.
  if (!gcTree) {
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
  gcNodes = nodes;
  gcEdges = edges;
  graphNodesRef = nodes;
  graphAdjacency = gcAdj;
  gcQuadtreeDirty = true;

  initGraphMinimap();
  initGraphViews();

  if (gcTree) {
    gcStop();
    if (!graphAutoFitDone) {
      graphAutoFitDone = true;
      frameTree(graphSvg, graphZoom, null, nodes, width, height, gcTree.radial);
    }
  } else {
    gcStartWorker(nodes, edges, gcWorldFor(nodes.length, width, height));
  }

  graphRenderStats(data, nodes, edges, colourMode, gcLayoutKind);
  graphSyncTimeSlider(data, (cutoff) => {
    gcTimeCutoff = cutoff;
    gcRequestDraw();
  });
  fillTracePickers(nodes);
  drawTrace();
  applyGraphHighlight();
  initGraphKeyboard();
  gcRequestDraw();
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
function graphRenderLegend(data, colourMode, colour, clusterColour) {
  const legend = document.getElementById("graph-legend");
  if (!legend) return;
  legend.replaceChildren();
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
    const t = gcTransform || { x: 0, y: 0, k: 1 };
    return Object.freeze({
      renderer: gcCanvas && !gcCanvas.classList.contains("hidden") ? "canvas" : "svg",
      nodes: gcNodes.length,
      edges: gcEdges.length,
      layout: gcLayoutKind,
      colourMode: typeof graphColourMode === "function" ? graphColourMode() : "category",
      transform: Object.freeze({ x: t.x, y: t.y, k: t.k }),
      hovered: graphHoveredId,
      focusModeId: graphFocusModeId,
      hiddenCategories: Object.freeze([...graphHiddenCategories]),
      timeCutoff: gcTimeCutoff,
      trace: graphTrace ? Object.freeze([...graphTrace.ids]) : null,
      highlight: graphHighlightIds ? graphHighlightIds.size : 0,
      alpha: gcAlpha,
      ticks: gcTicks,
      tickMs: gcTickMs,
      firstFrameMs: gcTiming.firstFrame,
      lastFrameMs: gcTiming.lastFrame,
      frames: gcTiming.frames,
      radii: Object.freeze(gcNodes.slice(0, 40).map((n) => n.r)),
      colours: Object.freeze(gcNodes.slice(0, 40).map((n) => n.colour)),
      positions: Object.freeze(
        gcNodes.slice(0, 40).map((n) => Object.freeze([Math.round(n.x), Math.round(n.y)]))
      ),
    });
  },
});
