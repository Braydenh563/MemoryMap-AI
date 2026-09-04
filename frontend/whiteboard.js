// MemoryMap AI — Whiteboard subsystem (extracted from app.js).
//
// This is the "Whiteboard" tab: boards, cards, sketches-as-objects, links,
// mind-mapping, export — the OneNote/draw.io-style canvas built across
// HISTORY.md §53-§58/§61 (ROADMAP.md Priority 0 item 2; style.css's half of
// that item was split first, into frontend/css/*.css).
//
// Loaded as a second classic (non-module) <script> tag, after app.js, so it
// shares app.js's global scope: everything here can call `$`, `api`,
// `apiJson`, `toast`, `switchTab`, `confirmDialog`, `openSketch` (the
// separate Quick Sketch modal — see below) and the rest of app.js's helpers
// directly, and app.js's command palette calls `createNewBoard`/
// `wbShowCanvasView` right back. None of that requires a particular load
// order: every cross-file call here happens at runtime, inside a function
// body or an event-listener callback, never at parse time. app.js loads
// first only because this file's own top-level code (the `wbZoom = d3.zoom()`
// assignment) needs `d3` from /vendor/d3.v7.min.js, which the existing
// script order already guarantees — nothing here needs app.js to have run
// first.
//
// NOT included here: the "Quick Sketch" pad (`openSketch`/`closeSketch`/
// `saveSketch`/`sketchPen`/... and the `#sketch-*` DOM ids), which stayed in
// app.js. It looks related by name — the task that produced this split
// flagged it explicitly for a call — but it is a separate, still-live Wave F
// ("Platform") feature: a full-screen freehand pad that saves a PNG as a
// note, reachable from the command palette and the floating action menu,
// unrelated by call graph to the board/card system below except that the
// whiteboard toolbar's "Add sketch" button opens it (`openSketch()`, called
// at runtime from `initWhiteboard`). Moving it here would have been a scope
// mistake, not a cleanup, so it was left where it was.
//
// ALSO NOT included here any more: the Library's Documents/Image-Gallery
// sub-tabs, their own selection state, and the `#library-subtabs` switcher —
// all genuinely Library-owned code (they switch and populate OTHER Library
// sub-tabs, not this one) that had ended up in this file's own
// DOMContentLoaded listener purely because it was written in the same block
// as this tab's own two controls (`wb-boards-new`/`wb-back-to-boards`,
// still below). Moved out to frontend/library.js in the app.js split's
// second file (§88.3); see that file's own header for the full list and the
// reasoning. `renderLibraryBoardsGallery`/`wbShowBoardsLanding`/
// `wbShowCanvasView` stayed — they render and switch between *this* tab's
// own two views (a boards gallery and the canvas), which is whiteboard's own
// concern even though the gallery happens to live inside the Library's
// Whiteboard sub-tab.

// ======================= WHITEBOARD LOGIC =======================
let wbZoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", handleWbZoom);
let wbState = { nodes: [], sketches: [], objects: [] };
let wbHintForcedOpen = false; // the "?" help button's override — see renderWhiteboard
let wbInitialized = false;
// ROADMAP.md Tier 2 §11: Select was folded into Pan, with no visible
// "this is selected" state and no way to delete without switching to the
// Delete tool. `{kind: "sketch"|"node", id}` of whatever's currently
// selected, or null. Rotate isn't part of this — `WhiteboardNode` has no
// angle column at all, so rotation needs a real backend change, not a
// frontend-only pass; left as its own separate item.
let wbSelectedItem = null;
// ROADMAP.md Tier 2 §11 / reported directly: "multi-select, holding down
// shift, area select... missing". A set of `"kind:id"` strings, alongside
// (not replacing) `wbSelectedItem` — a lone selection still goes through
// the single-item path (it's what the sketch resize handles and copy/paste
// are built around, and both only ever make sense for exactly one item);
// this is populated only once a second item joins, via shift-click or a
// marquee drag.
let wbMultiSelection = new Set();
// `deleteSketch`/`deleteNode` are closures defined fresh inside every
// `wbScheduleRender()` call; these hold whichever pair is current, so code
// outside that closure (the Delete-key handler) can still call them.
let wbDeleteSketchRef = null;
let wbDeleteNodeRef = null;
let wbDeleteObjectRef = null;
// `selectWbTool` is a closure defined inside `initWhiteboard` (it needs that
// scope's `container`/`toolGroup`); this holds the current one so code
// outside it — placing a text box switches back to Select once typed —
// can still call it, the same shape the delete-refs above already use.
let wbSelectToolRef = null;
// Same shape, for refreshing the "Line ends" control's displayed value when
// the active tool switches between Line and Arrow (each now has its own
// remembered end-style — see the live-reported bug fix in `initWhiteboard`).
let wbRefreshArrowStyleControlRef = null;
// True only between an eraser mousedown and mouseup — the drawing tools
// leave one mark per click-drag, the eraser is meant to remove everything
// the pointer crosses while held, so it needs a "currently held" flag the
// per-item hover handlers in renderWhiteboard can check.
let wbErasing = false;
// True for the span of an in-progress link drag (dragStart → dragEndNode on
// a card, with a link-type tool selected) — lets the plain hover listener
// in initWhiteboard step aside rather than fight the drag's own per-frame
// anchor-hint redraw with a second, slightly-stale one.
let wbLinkDragActive = false;
// Which attached-note cards are expanded past their clamp — keyed by node id
// (the whiteboard attachment, not the note itself), same "remember per card
// for the session" shape as `expandedNotes` on the Notes list. A plain `let`
// module-level Set, not persisted: reopening the board later re-clamps.
const wbExpandedNodes = new Set();
// {action: "delete"|"create", kind: "sketch"|"node", payload, id}. Bounded
// so an hour of erasing doesn't grow this forever; only the newest matters.
let wbUndoStack = [];
// ROADMAP.md Tier 2 §11: a redo stack, the same shape as the sketch pad's
// own history — cleared whenever a fresh action is pushed onto wbUndoStack,
// since redoing something that predates a new action would resurrect a
// version of the board the newer action never saw.
let wbRedoStack = [];
const WB_UNDO_MAX = 20;
// Ids currently mid-DELETE. The eraser's mouseenter can fire again for the
// same still-on-screen item before its first DELETE round-trip resolves (a
// slow request, or the pointer wobbling back over it) — without this a
// second call pushes a second undo entry and fires a second DELETE for
// something already gone, and the 404 catch then pops the *wrong* undo
// entry off the stack (whatever else was pushed in between).
const wbDeleting = new Set();

function handleWbZoom(e) {
  d3.select("#wb-html-layer").style("transform", `translate(${e.transform.x}px, ${e.transform.y}px) scale(${e.transform.k})`);
  d3.select("#wb-zoom-group").attr("transform", e.transform);
  d3.select("#wb-overlay-zoom-group").attr("transform", e.transform);
  wbSyncGridToTransform(e.transform);
}

//: The grid's spacing in board coordinates. Scaled by the zoom so a square
//: stays a square of the *board*, not of the screen — panning and zooming
//: move the ruling with the content, which is the whole point of a grid you
//: can snap to.
const WB_GRID_SPACING = 24;

//: A card's default size before a resize ever sets `width`/`height`
//: explicitly — the CSS auto-size every card used before resize existed,
//: and the same figure this file's own drop-centring/link-anchor math has
//: assumed all along (see the drop handler and `dragStart`'s own comments).
const WB_CARD_DEFAULT_SIZE = { w: 250, h: 150 };

function wbSyncGridToTransform(transform) {
  const el = document.getElementById("whiteboard-container");
  if (!el) return;
  const t = transform || d3.zoomTransform(el);
  el.style.setProperty("--wb-grid-size", `${WB_GRID_SPACING * t.k}px`);
  el.style.setProperty("--wb-grid-offset-x", `${t.x}px`);
  el.style.setProperty("--wb-grid-offset-y", `${t.y}px`);
}

function wbGridType() {
  return localStorage.getItem("wb-grid") || "none";
}

function wbSnapOn() {
  // Snapping without a visible grid is a mystery, not a feature — the
  // toggle stays honest by only applying while a grid is actually shown.
  return localStorage.getItem("wb-snap") === "on" && wbGridType() !== "none";
}

//: Round a board coordinate to the nearest grid intersection, when snap is
//: on. A no-op otherwise, so every call site can use it unconditionally.
//: `bypass` (asked for directly — Alt held during a drag temporarily
//: releases the grid lock, the same convention Figma/Illustrator use) skips
//: the rounding for just this one call, without needing the snap toggle
//: itself touched.
function wbSnap(value, bypass) {
  return wbSnapOn() && !bypass ? Math.round(value / WB_GRID_SPACING) * WB_GRID_SPACING : value;
}

//: Smart alignment guides while dragging (asked for directly: "the
//: recognisable popup alignment guides... draw.io and Microsoft
//: PowerPoint have... dotted alignment rule guides... subtly snap"). Scoped
//: to cards and objects as both the dragged item and the things it aligns
//: against — sketches are freehand strokes, not the kind of rectangular
//: "object" this pattern is normally drawn against in the apps it's
//: modelled on. Independent per axis: an X-axis snap and a Y-axis snap can
//: both fire on the same frame (a corner aligning with another item's
//: corner), each drawing its own guide line.
const WB_ALIGN_SNAP_PX = 6; // board units — matches WB_GRID_SPACING's own order of magnitude

function wbAlignmentGuides(excludeKind, excludeId, x, y, w, h) {
  const dragged = { left: x, centerX: x + w / 2, right: x + w, top: y, centerY: y + h / 2, bottom: y + h };
  let bestX = null, bestY = null;
  const others = [];
  for (const [kind, listName] of [["node", "nodes"], ["object", "objects"]]) {
    for (const item of wbState[listName] || []) {
      if (kind === excludeKind && item.id === excludeId) continue;
      const box = wbItemBBox(kind, item);
      if (!box) continue;
      others.push(box);
      const other = {
        left: box.minX, centerX: (box.minX + box.maxX) / 2, right: box.maxX,
        top: box.minY, centerY: (box.minY + box.maxY) / 2, bottom: box.maxY,
      };
      for (const edge of ["left", "centerX", "right"]) {
        const delta = other[edge] - dragged[edge];
        if (Math.abs(delta) <= WB_ALIGN_SNAP_PX && (!bestX || Math.abs(delta) < Math.abs(bestX.delta))) {
          bestX = { delta, at: other[edge], y1: Math.min(dragged.top, other.top), y2: Math.max(dragged.bottom, other.bottom), kind: edge === "centerX" ? "center" : "edge" };
        }
      }
      for (const edge of ["top", "centerY", "bottom"]) {
        const delta = other[edge] - dragged[edge];
        if (Math.abs(delta) <= WB_ALIGN_SNAP_PX && (!bestY || Math.abs(delta) < Math.abs(bestY.delta))) {
          bestY = { delta, at: other[edge], x1: Math.min(dragged.left, other.left), x2: Math.max(dragged.right, other.right), kind: edge === "centerY" ? "center" : "edge" };
        }
      }
    }
  }
  const guideLines = [];
  if (bestX) guideLines.push({ x1: bestX.at, y1: bestX.y1 - 20, x2: bestX.at, y2: bestX.y2 + 20, kind: bestX.kind });
  if (bestY) guideLines.push({ x1: bestY.x1 - 20, y1: bestY.at, x2: bestY.x2 + 20, y2: bestY.at, kind: bestY.kind });
  let dx = bestX ? bestX.delta : 0, dy = bestY ? bestY.delta : 0;

  // Equal-spacing guides ("same spacing", asked for directly): only tried on
  // an axis the edge/center snap above didn't already claim, so a card never
  // fights between "line up with this edge" and "match this gap" mid-drag.
  // Scoped to the single nearest neighbour each side, not every possible
  // triple — that is what draw.io and PowerPoint show too, and it keeps this
  // O(n) per drag frame like the alignment pass above it, not O(n^2).
  if (!bestX) {
    const rowMates = others.filter((b) => b.minY < dragged.bottom && b.maxY > dragged.top);
    const left = rowMates.filter((b) => b.maxX <= dragged.left + WB_ALIGN_SNAP_PX).sort((a, b) => b.maxX - a.maxX)[0];
    const right = rowMates.filter((b) => b.minX >= dragged.right - WB_ALIGN_SNAP_PX).sort((a, b) => a.minX - b.minX)[0];
    if (left && right) {
      const gapLeft = dragged.left - left.maxX, gapRight = right.minX - dragged.right;
      if (gapLeft >= 0 && gapRight >= 0 && Math.abs(gapLeft - gapRight) <= WB_ALIGN_SNAP_PX) {
        const avgGap = (gapLeft + gapRight) / 2;
        dx = left.maxX + avgGap - dragged.left;
        const midY = (Math.max(left.minY, dragged.top) + Math.min(left.maxY, dragged.bottom)) / 2;
        guideLines.push({ x1: left.maxX, y1: midY, x2: dragged.left + dx, y2: midY, kind: "spacing" });
        guideLines.push({ x1: dragged.right + dx, y1: midY, x2: right.minX, y2: midY, kind: "spacing" });
      }
    }
  }
  if (!bestY) {
    const colMates = others.filter((b) => b.minX < dragged.right && b.maxX > dragged.left);
    const above = colMates.filter((b) => b.maxY <= dragged.top + WB_ALIGN_SNAP_PX).sort((a, b) => b.maxY - a.maxY)[0];
    const below = colMates.filter((b) => b.minY >= dragged.bottom - WB_ALIGN_SNAP_PX).sort((a, b) => a.minY - b.minY)[0];
    if (above && below) {
      const gapAbove = dragged.top - above.maxY, gapBelow = below.minY - dragged.bottom;
      if (gapAbove >= 0 && gapBelow >= 0 && Math.abs(gapAbove - gapBelow) <= WB_ALIGN_SNAP_PX) {
        const avgGap = (gapAbove + gapBelow) / 2;
        dy = above.maxY + avgGap - dragged.top;
        const midX = (Math.max(above.minX, dragged.left) + Math.min(above.maxX, dragged.right)) / 2;
        guideLines.push({ x1: midX, y1: above.maxY, x2: midX, y2: dragged.top + dy, kind: "spacing" });
        guideLines.push({ x1: midX, y1: dragged.bottom + dy, x2: midX, y2: below.minY, kind: "spacing" });
      }
    }
  }

  return { dx, dy, guideLines };
}

//: Default guide colours, one per `kind` `wbAlignmentGuides` can report —
//: "edge" (an outer border lining up with another), "center" (mid-points
//: lining up, the draw.io/PowerPoint convention of a *different* colour so
//: the two are never confused at a glance), and "spacing" (equal gaps).
//: Overridable per the direct ask ("colours should be alterable"); the
//: picker lives in the whiteboard's own shape-menu dropdown rather than a
//: new top menu bar — see HISTORY.md for why that redesign is deferred.
const WB_ALIGN_GUIDE_COLORS = { edge: "#ff00ff", center: "#00c8ff", spacing: "#3ddc84" };
function wbAlignGuideColor(kind) {
  return localStorage.getItem(`wb-guide-color-${kind}`) || WB_ALIGN_GUIDE_COLORS[kind] || WB_ALIGN_GUIDE_COLORS.edge;
}

//: Draws (or clears) the dashed guide lines `wbAlignmentGuides` found —
//: shared by every drag handler that uses it, same reasoning as
//: `wbShowAnchorHints`'s own shared group.
function wbShowAlignmentGuides(lines) {
  const zoomGroup = document.getElementById("wb-zoom-group");
  if (!zoomGroup) return;
  let group = document.getElementById("wb-align-guides");
  if (!group) {
    group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("id", "wb-align-guides");
    group.setAttribute("pointer-events", "none");
    zoomGroup.appendChild(group);
  }
  group.innerHTML = "";
  for (const line of lines) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
    el.setAttribute("x1", line.x1);
    el.setAttribute("y1", line.y1);
    el.setAttribute("x2", line.x2);
    el.setAttribute("y2", line.y2);
    el.setAttribute("class", `wb-align-guide-line wb-align-guide-${line.kind || "edge"}`);
    el.setAttribute("stroke", wbAlignGuideColor(line.kind || "edge"));
    group.appendChild(el);
  }
}

function wbClearAlignmentGuides() {
  document.getElementById("wb-align-guides")?.remove();
}

function wbApplyGrid() {
  const el = document.getElementById("whiteboard-container");
  if (!el) return;
  el.dataset.wbGrid = wbGridType();
  wbSyncGridToTransform();
}

//: A board's own background image, kept per board in localStorage the same
//: way its background colour already is — it is a property of how you like
//: to look at that board, not notebook data, and storing it server-side
//: would mean a schema column for something the server never reads.
function wbBgImageKey() {
  return `wb-bg-image-${window.currentBoardId ?? "default"}`;
}

function wbApplyBgImage() {
  const el = document.getElementById("whiteboard-container");
  if (!el) return;
  const url = localStorage.getItem(wbBgImageKey());
  // `mediaSrc`, not the bare url — a CSS `background-image: url(...)` is a
  // plain resource load, same as `<img src>`, so it never attaches
  // X-Auth-Token either.
  el.style.setProperty("--wb-bg-image", url ? `url("${mediaSrc(url)}")` : "none");
}

// A tiny inline SVG baked into a `cursor:` value, so the OS/GPU renders and
// positions it — zero JS on the hot path. This replaces an earlier version
// that tracked the pointer with a `mousemove`-positioned `<div>`: reported
// (and reproduced) as "my mouse keeps snapping to an invisible grid" — a
// JS-positioned cursor only moves on however often `mousemove` actually
// fires, which is both slower and less regular than the compositor placing
// a real cursor image, so on a fast swipe the dot visibly lagged and then
// jumped to catch up. A `cursor:` image has no such step: once set, the
// browser draws it exactly like the system arrow.
function wbCursorUrl(inner, { size = 26, hx = 3, hy = size - 3 } = {}) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}">${inner}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hx} ${hy}`;
}

// Asked for directly: the sketch pad is meant to be a lite version of the
// whiteboard, so the whiteboard should have at least everything the sketch
// pad does. It already covered pen ("draw"), line, rect, circle and
// eraser; highlighter and arrow were the two genuinely missing ones (a
// third, text, needs its own SVG element type — a `<path>` can't render
// text — and is scoped separately rather than force-fit into this list).
const WB_BRUSH_TOOLS = new Set(["draw", "line", "rect", "circle", "highlighter", "arrow", "triangle", "diamond"]);
const WB_HIGHLIGHTER_ALPHA = 0.35; // matches the sketch pad's own SKETCH_HIGHLIGHTER_ALPHA

//: The four closed shape tools fill applies to — a pen/highlighter/line/
//: arrow stroke has no enclosed area a fill would read as filling. Module
//: scope (not inside `initWhiteboard`) since both the live-draw handlers
//: and `renderWhiteboard` (a separate top-level function) need it.
const WB_FILLABLE_SHAPES = new Set(["rect", "circle", "triangle", "diamond"]);

//: SVG `stroke-dasharray` for each style, scaled to the actual stroke width
//: so a thick dashed line doesn't look like a row of dots. `null` (solid)
//: means "don't set the attribute at all", not "set it to empty".
function wbDashArray(style, width) {
  if (style === "dashed") return `${width * 3} ${width * 2}`;
  if (style === "dotted") return `${width} ${width * 1.6}`;
  return null;
}

//: Two head-stroke subpaths meeting at `(tipX, tipY)`, angled back from
//: `approachAngle` (the direction the shaft arrives *from*, in radians) —
//: factored out so both ends of an arrow can draw one (`currentArrowEndStyle`,
//: reported directly: "can't change arrow heads").
//: Absolute width/height for a shape drawn from `(0,0)` to `(dx, dy)` —
//: equal (a square/perfect circle) while `shiftHeld`, matching the sketch
//: pad's own rect tool (HISTORY.md) and asked for again directly for the
//: whiteboard's shapes generally. Squares to the *larger* of the two raw
//: dimensions so the shape still reaches all the way to the cursor.
function wbShapeDims(dx, dy, shiftHeld) {
  const w = Math.abs(dx), h = Math.abs(dy);
  if (!shiftHeld) return { w, h };
  const s = Math.max(w, h);
  return { w: s, h: s };
}

function wbArrowHeadPath(tipX, tipY, approachAngle, headLen) {
  const h1x = tipX - headLen * Math.cos(approachAngle - Math.PI / 6);
  const h1y = tipY - headLen * Math.sin(approachAngle - Math.PI / 6);
  const h2x = tipX - headLen * Math.cos(approachAngle + Math.PI / 6);
  const h2y = tipY - headLen * Math.sin(approachAngle + Math.PI / 6);
  return `M ${tipX} ${tipY} L ${h1x} ${h1y} M ${tipX} ${tipY} L ${h2x} ${h2y}`;
}

//: Every cap kind a line/arrow/link end can wear, asked for directly ("a
//: full line/arrow end-cap system... circle/square/multi-line ends,
//: independently per end") — the shared arrowhead control only ever grew
//: from Arrow-only to Line-and-Arrow, still one shape. Each is its own
//: closed subpath appended to the shaft's own `d`, same convention
//: `wbArrowHeadPath` already established (a stroked path, no separate SVG
//: element, so hit-testing/move/resize/export keep treating the whole
//: sketch as the one path they already know how to handle) — "arrow" here
//: is exactly `wbArrowHeadPath`'s own two-line V, kept for a single call
//: site to switch on.
const WB_CAP_KINDS = ["none", "arrow", "circle", "square", "multiline"];

function wbCapPath(kind, tipX, tipY, approachAngle, headLen) {
  if (!kind || kind === "none") return "";
  if (kind === "arrow") return wbArrowHeadPath(tipX, tipY, approachAngle, headLen);
  if (kind === "circle") {
    const r = headLen / 3;
    // Centred a radius back from the tip along the shaft, so the circle
    // sits *at* the end rather than half hanging past it.
    const cx = tipX - r * Math.cos(approachAngle), cy = tipY - r * Math.sin(approachAngle);
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
  }
  if (kind === "square") {
    const s = headLen / 2.6;
    const cx = tipX - s * Math.cos(approachAngle), cy = tipY - s * Math.sin(approachAngle);
    const cos = Math.cos(approachAngle), sin = Math.sin(approachAngle);
    const corner = (dx, dy) => `${cx + dx * cos - dy * sin} ${cy + dx * sin + dy * cos}`;
    return `M ${corner(-s, -s)} L ${corner(s, -s)} L ${corner(s, s)} L ${corner(-s, s)} Z`;
  }
  // "multiline": two short perpendicular ticks near the tip — the
  // ER-diagram "many" mark, and a visually distinct third option from a
  // filled dot or square rather than a second arrow variant.
  const cos = Math.cos(approachAngle), sin = Math.sin(approachAngle);
  const perpX = -sin, perpY = cos;
  const half = headLen * 0.4;
  const tick = (back) => {
    const bx = tipX - cos * back, by = tipY - sin * back;
    return `M ${bx - perpX * half} ${by - perpY * half} L ${bx + perpX * half} ${by + perpY * half}`;
  };
  return `${tick(headLen * 0.35)} ${tick(headLen * 0.75)}`;
}

function wbCursorForTool(tool, strokeColor, strokeWidth) {
  const color = /^#[0-9a-fA-F]{3,8}$/.test(strokeColor || "") ? strokeColor : "#ffffff";
  if (WB_BRUSH_TOOLS.has(tool)) {
    // A crosshair with a dot in the actual stroke colour at its centre — a
    // plain crosshair can't say what colour is about to land. The dot's own
    // radius now tracks the stroke-width slider too (asked for directly:
    // "the size should be represented on the cursor tip") — clamped to what
    // a 32x32 cursor image can actually show and still stay a browser-legal
    // cursor size cross-platform (Safari caps well below Chrome/Firefox).
    const size = 32, c = size / 2;
    const r = Math.max(3, Math.min(13, Math.round((Number(strokeWidth) || 3) / 2) + 2));
    const inner =
      `<line x1="${c}" y1="1" x2="${c}" y2="${c - r - 2}" stroke="#000" stroke-opacity=".55" stroke-width="1.5"/>` +
      `<line x1="${c}" y1="${c + r + 2}" x2="${c}" y2="${size - 1}" stroke="#000" stroke-opacity=".55" stroke-width="1.5"/>` +
      `<line x1="1" y1="${c}" x2="${c - r - 2}" y2="${c}" stroke="#000" stroke-opacity=".55" stroke-width="1.5"/>` +
      `<line x1="${c + r + 2}" y1="${c}" x2="${size - 1}" y2="${c}" stroke="#000" stroke-opacity=".55" stroke-width="1.5"/>` +
      `<circle cx="${c}" cy="${c}" r="${r}" fill="${color}" stroke="#000" stroke-opacity=".45"/>`;
    return `${wbCursorUrl(inner, { size, hx: c, hy: c })}, crosshair`;
  }
  if (tool === "eraser") {
    const inner =
      `<g transform="rotate(-30 13 13)">` +
      `<rect x="4" y="9" width="16" height="10" rx="2" fill="#f4d9d9" stroke="#8a4a4a" stroke-width="1.5"/>` +
      `<rect x="4" y="9" width="7" height="10" rx="2" fill="#e7bcbc"/>` +
      `</g>`;
    return `${wbCursorUrl(inner, { hx: 6, hy: 20 })}, cell`;
  }
  if (tool === "delete") {
    const inner =
      `<path d="M6 7h14M11 7V4h4v3M9 7l1 15h6l1-15" fill="none" stroke="#d9534f" ` +
      `stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `${wbCursorUrl(inner, { hx: 13, hy: 3 })}, not-allowed`;
  }
  if (tool === "link-straight" || tool === "link-curved") return "crosshair";
  if (tool === "lasso") return "crosshair";
  return ""; // pan: the CSS grab/grabbing pair already says it
}

// The visible half of Select — asked for directly ("select... as a real
// tool, not folded into pan"). Re-applied after every `wbScheduleRender()`
// (elements are rebuilt on each render, so a class set on the old DOM node
// would vanish silently) as well as right after a click.
const WB_SELECTOR_BY_KIND = {
  sketch: (id) => `.sketch-group[data-id="${id}"]`,
  node: (id) => `.node-card[data-id="${id}"]`,
  object: (id) => `.wb-object[data-id="${id}"]`,
};

const wbMultiKey = (kind, id) => `${kind}:${id}`;

// Asked for directly, more than once: "changing properties of shapes and
// text boxes... fill, border". Single-selection only — the same reasoning
// Grouping — asked for directly (Ctrl+G / Ctrl+Shift+G). Unlike
// `wbMultiSelection` (in-memory, gone on reload), a group's id is persisted
// on every member's own `group_id` column, so clicking any one member later
// reselects the whole set — the other half of this feature lives in
// `wbHandleItemClick` below.
async function wbGroupSelection() {
  if (wbMultiSelection.size < 2) {
    toast("Select more than one item to group them.");
    return;
  }
  const groupId = crypto.randomUUID ? crypto.randomUUID() : `g${Date.now()}${Math.random().toString(36).slice(2)}`;
  for (const key of wbMultiSelection) {
    const sep = key.indexOf(":");
    const kind = key.slice(0, sep), id = Number(key.slice(sep + 1));
    const item = (wbState[WB_LIST_BY_KIND[kind]] || []).find((i) => i.id === id);
    if (!item) continue;
    item.group_id = groupId;
    if (kind === "sketch") await wbSaveSketchProps(item, {});
    else if (kind === "node") await wbSaveNode(item);
    else await wbSaveObject(item);
  }
  toast("Grouped.");
}

//: Clears `group_id` on every currently-selected member — the current
//: selection is either a multi-selection built by hand, or (per
//: `wbHandleItemClick`'s own group-select branch) already the whole group,
//: since clicking any one grouped member selects all of it.
async function wbUngroupSelection() {
  const keys = wbMultiSelection.size > 0
    ? [...wbMultiSelection]
    : wbSelectedItem ? [wbMultiKey(wbSelectedItem.kind, wbSelectedItem.id)] : [];
  if (keys.length === 0) return;
  let ungrouped = 0;
  for (const key of keys) {
    const sep = key.indexOf(":");
    const kind = key.slice(0, sep), id = Number(key.slice(sep + 1));
    const item = (wbState[WB_LIST_BY_KIND[kind]] || []).find((i) => i.id === id);
    if (!item || !item.group_id) continue;
    item.group_id = null;
    ungrouped++;
    if (kind === "sketch") await wbSaveSketchProps(item, {});
    else if (kind === "node") await wbSaveNode(item);
    else await wbSaveObject(item);
  }
  if (ungrouped) toast("Ungrouped.");
}

//: A kind-agnostic bounding box (board coordinates, top-left/bottom-right)
//: for alignment/distribute/nudge math, which all need to compare items of
//: different kinds against each other. A sketch has no width/height of its
//: own — its path data *is* its shape — so its box comes from
//: `wbPathBBox`, while a card/object's box is just its x/y plus whichever
//: width/height it currently has (falling back to the same defaults their
//: own resize code uses).
function wbItemBBox(kind, item) {
  if (kind === "sketch") {
    const parsed = wbSketchParsedData(item);
    if (!parsed) return null; // a link sketch — no shape of its own to align
    return wbPathBBox(parsed.d);
  }
  let w = item.width, h = item.height;
  // A card with no stored size (never manually resized) grows to fit its own
  // text — reported directly, with a screenshot: link anchor points sat well
  // inside a tall card's real border, because every unresized card was
  // assumed to be exactly WB_CARD_DEFAULT_SIZE.h (150px) regardless of how
  // much taller its actual content rendered it. Measured from the live DOM
  // instead, converted to board space with the same zoom-transform division
  // every drag handler already uses (`transform.k`) — falls back to the
  // fixed default below only when the element genuinely isn't rendered.
  if ((!w || !h) && kind === "node") {
    const el = document.querySelector(`.node-card[data-id="${item.id}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
      w = w || rect.width / transform.k;
      h = h || rect.height / transform.k;
    }
  }
  w = w || (kind === "node" ? WB_CARD_DEFAULT_SIZE.w : WB_OBJECT_MIN_SIZE);
  h = h || (kind === "node" ? WB_CARD_DEFAULT_SIZE.h : WB_OBJECT_MIN_SIZE);
  return { minX: item.x, minY: item.y, maxX: item.x + w, maxY: item.y + h };
}

//: Real anchor/connection points for links (asked for directly, "take
//: inspiration from draw.io", named "worth its own session" three sessions
//: running — HANDOVER.md §53-55). Eight **fixed** points (corners + edge
//: midpoints), as fractions of the shape's own bounding box so a resize
//: carries an anchor with it for free, no migration needed — these two
//: fractions just live as `sourceAnchor`/`targetAnchor` keys in the link
//: sketch's existing `data` JSON blob. Omitting either key is the **free**
//: case: that end "floats", auto-following the rectangle border facing
//: whatever the other end resolves to, every render — draw.io's own
//: behaviour, not a fixed centre-point offset.
const WB_FIXED_ANCHORS = [
  { x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 1, y: 0 },
  { x: 1, y: 0.5 }, { x: 1, y: 1 }, { x: 0.5, y: 1 },
  { x: 0, y: 1 }, { x: 0, y: 0.5 },
];

//: A link only ever connects nodes (cards) today — see `dragEndNode`'s own
//: hit-test — but takes `kind` rather than assuming "node" so a future
//: object-to-object link doesn't need this rewritten.
function wbAnchorPoint(kind, item, anchor) {
  if (!anchor) return null;
  const box = wbItemBBox(kind, item);
  if (!box) return null;
  return { x: box.minX + anchor.x * (box.maxX - box.minX), y: box.minY + anchor.y * (box.maxY - box.minY) };
}

//: The nearest of the 8 fixed points to a board-coordinate click, or `null`
//: if none is within `thresholdPx` — `null` is the caller's cue to persist
//: no anchor at all (the free/floating case) rather than a distant one.
function wbNearestAnchor(kind, item, px, py, thresholdPx = 16) {
  const box = wbItemBBox(kind, item);
  if (!box) return null;
  const w = box.maxX - box.minX, h = box.maxY - box.minY;
  let best = null, bestDist = thresholdPx;
  for (const a of WB_FIXED_ANCHORS) {
    const d = Math.hypot(px - (box.minX + a.x * w), py - (box.minY + a.y * h));
    if (d <= bestDist) { bestDist = d; best = a; }
  }
  return best;
}

//: The standard rectangle/ray intersection: where the line from this box's
//: centre toward `(towardX, towardY)` crosses the box's own border. This is
//: what a "floating" end actually resolves to each render — aimed at the
//: other end's real point, not always the other shape's centre.
function wbBoxRayIntersection(box, towardX, towardY) {
  const cx = (box.minX + box.maxX) / 2, cy = (box.minY + box.maxY) / 2;
  const dx = towardX - cx, dy = towardY - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const halfW = (box.maxX - box.minX) / 2, halfH = (box.maxY - box.minY) / 2;
  const t = Math.min(dx ? halfW / Math.abs(dx) : Infinity, dy ? halfH / Math.abs(dy) : Infinity);
  return { x: cx + dx * t, y: cy + dy * t };
}

//: The two real endpoints of a link, shared by the render path
//: (`sketchUpdate.each`) and the per-drag-frame follow (`wbUpdateLinkedSketches`)
//: so the two can't drift apart — same reasoning as that function's own
//: comment, just extended to real anchors instead of a hardcoded centre.
//: A fixed end resolves to its own point regardless of the other end; a
//: floating end resolves toward whatever the *other* end actually is (its
//: fixed point if it has one, its centre otherwise), not always the centre.
function wbLinkEndpoints(sourceItem, sourceAnchor, targetItem, targetAnchor) {
  const sourceBox = wbItemBBox("node", sourceItem);
  const targetBox = wbItemBBox("node", targetItem);
  const sourceCenter = { x: (sourceBox.minX + sourceBox.maxX) / 2, y: (sourceBox.minY + sourceBox.maxY) / 2 };
  const targetCenter = { x: (targetBox.minX + targetBox.maxX) / 2, y: (targetBox.minY + targetBox.maxY) / 2 };
  const fixedSource = wbAnchorPoint("node", sourceItem, sourceAnchor);
  const fixedTarget = wbAnchorPoint("node", targetItem, targetAnchor);
  return {
    source: fixedSource || wbBoxRayIntersection(sourceBox, (fixedTarget || targetCenter).x, (fixedTarget || targetCenter).y),
    target: fixedTarget || wbBoxRayIntersection(targetBox, (fixedSource || sourceCenter).x, (fixedSource || sourceCenter).y),
  };
}

//: A link end is either attached to a card (`sourceId`/`targetId`, plus an
//: optional fixed `sourceAnchor`/`targetAnchor` fraction — the existing
//: shape) or a free "dangling" point in board space with no card at all
//: (`sourcePoint`/`targetPoint`, `{x, y}` — asked for directly: "even make
//: it a dangling unattached point not attached to an object"). Both ends
//: independently resolved here so any combination — node/node (the
//: original case), node/free, or free/free — renders through one path.
//: Returns `null` for a stale reference (a card end whose id no longer
//: exists), same as the two call sites already treated a missing node.
function wbResolveLinkEndpoints(parsed) {
  const sourceNode = parsed.sourceId != null ? wbState.nodes.find((n) => n.id === parsed.sourceId) : null;
  const targetNode = parsed.targetId != null ? wbState.nodes.find((n) => n.id === parsed.targetId) : null;
  if (parsed.sourceId != null && !sourceNode) return null;
  if (parsed.targetId != null && !targetNode) return null;
  if (!sourceNode && !parsed.sourcePoint) return null;
  if (!targetNode && !parsed.targetPoint) return null;
  if (sourceNode && targetNode) return wbLinkEndpoints(sourceNode, parsed.sourceAnchor, targetNode, parsed.targetAnchor);

  const sourceBox = sourceNode ? wbItemBBox("node", sourceNode) : null;
  const targetBox = targetNode ? wbItemBBox("node", targetNode) : null;
  // A free point is always fixed — there's no card border for it to "aim
  // toward" the way a floating card-end resolves. A card-end with no fixed
  // anchor of its own still floats toward whatever the other end actually
  // is, same as the node/node case.
  const sourceFixed = sourceNode ? wbAnchorPoint("node", sourceNode, parsed.sourceAnchor) : parsed.sourcePoint;
  const targetFixed = targetNode ? wbAnchorPoint("node", targetNode, parsed.targetAnchor) : parsed.targetPoint;
  const targetCenter = targetBox && { x: (targetBox.minX + targetBox.maxX) / 2, y: (targetBox.minY + targetBox.maxY) / 2 };
  const sourceCenter = sourceBox && { x: (sourceBox.minX + sourceBox.maxX) / 2, y: (sourceBox.minY + sourceBox.maxY) / 2 };
  return {
    source: sourceFixed || wbBoxRayIntersection(sourceBox, (targetFixed || targetCenter).x, (targetFixed || targetCenter).y),
    target: targetFixed || wbBoxRayIntersection(targetBox, (sourceFixed || sourceCenter).x, (sourceFixed || sourceCenter).y),
  };
}

//: Reads a link's own start/end cap kinds — the new independent-per-end
//: fields (`startCap`/`endCap`, one of `WB_CAP_KINDS`) if it has them, or
//: translated from the older single `endStyle` (start/end/both/none,
//: always an arrow) for a link saved before the full end-cap system
//: existed. No migration needed: this is the only place either shape gets
//: read, so an old link keeps rendering exactly as it always did until its
//: caps are actually changed.
function wbLinkCaps(parsed) {
  if (parsed.startCap !== undefined || parsed.endCap !== undefined) {
    return { startCap: parsed.startCap || "none", endCap: parsed.endCap || "none" };
  }
  const style = parsed.endStyle;
  return {
    startCap: style === "start" || style === "both" ? "arrow" : "none",
    endCap: style === "end" || style === "both" ? "arrow" : "none",
  };
}

//: Shared by the render path and the live drag preview so a straight vs.
//: curved link can't compute its path two different ways. `caps` (from
//: `wbLinkCaps`) is optional — asked for directly ("customisable links...
//: connection endpoint designs", later extended to "circle/square/multi-
//: line ends, independently per end") — a link had no endpoint marker
//: option at all before the first version of this. The approach angle for
//: a cap is the straight line to the *other* endpoint, which is exact for
//: a straight link and a reasonable approximation for a curved one (the
//: curve's own tangent at the endpoint, not attempted — this app's curves
//: are gentle enough that the difference is small).
function wbLinkPathD(type, sPt, tPt, caps, width) {
  const base = type === "link-straight"
    ? `M ${sPt.x} ${sPt.y} L ${tPt.x} ${tPt.y}`
    : (() => {
        const dx = tPt.x - sPt.x;
        return `M ${sPt.x} ${sPt.y} C ${sPt.x + dx / 2} ${sPt.y}, ${tPt.x - dx / 2} ${tPt.y}, ${tPt.x} ${tPt.y}`;
      })();
  const startCap = caps?.startCap || "none", endCap = caps?.endCap || "none";
  if (startCap === "none" && endCap === "none") return base;
  const headLen = (width || 3) * 4 + 6;
  const angle = Math.atan2(tPt.y - sPt.y, tPt.x - sPt.x);
  let d = base;
  if (endCap !== "none") d += " " + wbCapPath(endCap, tPt.x, tPt.y, angle, headLen);
  if (startCap !== "none") d += " " + wbCapPath(startCap, sPt.x, sPt.y, angle + Math.PI, headLen);
  return d;
}

//: A small SVG dot at each of a shape's 8 fixed anchors, shown while a link
//: drag is in progress so the snap targets are actually discoverable rather
//: than a silent hit-test — draw.io shows the same thing on hover. The
//: nearest one to the live pointer (if within snapping range) renders larger
//: and filled, so "this is where it'll land" is visible before release.
function wbShowAnchorHints(kind, item, nearAnchor) {
  // The overlay layer, not the base SVG's own `#wb-zoom-group` — cards
  // render in an HTML layer *above* that SVG (see `#wb-overlay-layer`'s own
  // comment in index.html), so a hint drawn there for a hovered card would
  // be painted directly underneath it, invisible exactly when it matters.
  const zoomGroup = document.getElementById("wb-overlay-zoom-group");
  if (!zoomGroup) return;
  let hints = document.getElementById("wb-anchor-hints");
  if (!hints) {
    hints = document.createElementNS("http://www.w3.org/2000/svg", "g");
    hints.setAttribute("id", "wb-anchor-hints");
    hints.setAttribute("pointer-events", "none");
    zoomGroup.appendChild(hints);
  }
  hints.innerHTML = "";
  if (!item) return;
  const box = wbItemBBox(kind, item);
  if (!box) return;
  const w = box.maxX - box.minX, h = box.maxY - box.minY;
  for (const a of WB_FIXED_ANCHORS) {
    const near = nearAnchor && nearAnchor.x === a.x && nearAnchor.y === a.y;
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", box.minX + a.x * w);
    dot.setAttribute("cy", box.minY + a.y * h);
    dot.setAttribute("r", near ? 6 : 4);
    dot.setAttribute("fill", near ? "var(--accent)" : "var(--card)");
    dot.setAttribute("stroke", "var(--accent)");
    dot.setAttribute("stroke-width", "1.5");
    hints.appendChild(dot);
  }
}

function wbClearAnchorHints() {
  document.getElementById("wb-anchor-hints")?.remove();
}

//: Resolves `wbMultiSelection` into {kind, id, item, bbox} entries, dropping
//: anything stale (deleted since selected) or box-less (a link sketch).
//: Shared by align/distribute/nudge — every one of them needs exactly this.
function wbSelectionEntries() {
  return [...wbMultiSelection]
    .map((key) => {
      const sep = key.indexOf(":");
      const kind = key.slice(0, sep), id = Number(key.slice(sep + 1));
      const item = (wbState[WB_LIST_BY_KIND[kind]] || []).find((i) => i.id === id);
      return item ? { kind, id, item, bbox: wbItemBBox(kind, item) } : null;
    })
    .filter((e) => e && e.bbox);
}

//: Moves one item by (dx, dy) — a sketch by transforming its path, anything
//: else by its own x/y — saves it, and returns the "move" undo entry for
//: it. Shared by nudge/align/distribute, each of which moves a set of items
//: as one user action and needs one entry per item to bundle into a batch.
async function wbMoveItemBy(kind, id, item, dx, dy) {
  const before = WB_KIND_INFO[kind].payload(item);
  if (kind === "sketch") {
    const parsed = wbSketchParsedData(item);
    const newD = wbTransformPathD(parsed.d, { dx, dy });
    await wbSaveSketchD(item, newD);
  } else {
    item.x = (item.x || 0) + dx;
    item.y = (item.y || 0) + dy;
    if (kind === "node") await wbSaveNode(item);
    else await wbSaveObject(item);
  }
  return { action: "move", kind, id, before };
}

//: Pushes N per-item move entries as the one undo step the user actually
//: took — a single "batch" entry when more than one item moved, or the bare
//: entry itself when only one did, so a plain single-item nudge doesn't pay
//: for the extra indirection.
function wbPushMoveBatch(entries) {
  if (entries.length === 0) return;
  wbPushUndo(entries.length === 1 ? entries[0] : { action: "batch", entries });
  wbScheduleRender();
}

// Alignment tools — asked for directly ("alignment tools... missing"), only
// meaningful for two or more selected items. Aligns to the selection's own
// overall bounding box, the same reference every other drawing app uses.
async function wbAlignSelection(edge) {
  const entries = wbSelectionEntries();
  if (entries.length < 2) {
    toast("Select two or more items to align them.");
    return;
  }
  let target;
  if (edge === "left") target = Math.min(...entries.map((e) => e.bbox.minX));
  else if (edge === "right") target = Math.max(...entries.map((e) => e.bbox.maxX));
  else if (edge === "top") target = Math.min(...entries.map((e) => e.bbox.minY));
  else if (edge === "bottom") target = Math.max(...entries.map((e) => e.bbox.maxY));
  else if (edge === "hcenter") {
    const minX = Math.min(...entries.map((e) => e.bbox.minX));
    const maxX = Math.max(...entries.map((e) => e.bbox.maxX));
    target = (minX + maxX) / 2;
  } else if (edge === "vcenter") {
    const minY = Math.min(...entries.map((e) => e.bbox.minY));
    const maxY = Math.max(...entries.map((e) => e.bbox.maxY));
    target = (minY + maxY) / 2;
  }

  const pushed = [];
  for (const e of entries) {
    let dx = 0, dy = 0;
    if (edge === "left") dx = target - e.bbox.minX;
    else if (edge === "right") dx = target - e.bbox.maxX;
    else if (edge === "hcenter") dx = target - (e.bbox.minX + e.bbox.maxX) / 2;
    else if (edge === "top") dy = target - e.bbox.minY;
    else if (edge === "bottom") dy = target - e.bbox.maxY;
    else if (edge === "vcenter") dy = target - (e.bbox.minY + e.bbox.maxY) / 2;
    if (dx === 0 && dy === 0) continue;
    pushed.push(await wbMoveItemBy(e.kind, e.id, e.item, dx, dy));
  }
  wbPushMoveBatch(pushed);
}

// Distribute — asked for as part of the same "alignment tools" request.
// Needs three or more: the first and last (by centre, along the chosen
// axis) stay put as the two ends, and whatever's between them is spaced
// evenly — the same behaviour as every other drawing app's "distribute".
async function wbDistributeSelection(axis) {
  const entries = wbSelectionEntries();
  if (entries.length < 3) {
    toast("Select three or more items to distribute them.");
    return;
  }
  const centerOf = (e) => axis === "horizontal"
    ? (e.bbox.minX + e.bbox.maxX) / 2
    : (e.bbox.minY + e.bbox.maxY) / 2;
  entries.sort((a, b) => centerOf(a) - centerOf(b));
  const first = centerOf(entries[0]);
  const last = centerOf(entries[entries.length - 1]);
  const step = (last - first) / (entries.length - 1);

  const pushed = [];
  for (let i = 1; i < entries.length - 1; i++) {
    const e = entries[i];
    const delta = first + step * i - centerOf(e);
    const dx = axis === "horizontal" ? delta : 0;
    const dy = axis === "horizontal" ? 0 : delta;
    if (dx === 0 && dy === 0) continue;
    pushed.push(await wbMoveItemBy(e.kind, e.id, e.item, dx, dy));
  }
  wbPushMoveBatch(pushed);
}

// Extract notes (BACKLOG.md §62): the selected note cards' own content IS
// the "notes-in-context" — their combined text is what gets split, and each
// card is also passed as an explicit source so the new note(s) link back to
// where they came from, not just to whatever else in the notebook they
// happen to resemble. Reuses `wbSelectionEntries()`, same as align/
// distribute above, rather than a second way of reading the selection.
function wbExtractNotes() {
  const noteEntries = wbSelectionEntries().filter((e) => e.kind === "node");
  if (noteEntries.length === 0) {
    toast("Select at least one note card to extract from.");
    return;
  }
  const entryIds = [...new Set(noteEntries.map((e) => e.item.entry_id))];
  const byId = new Map(allEntries.map((e) => [e.id, e]));
  // A card whose note isn't in `allEntries` yet (created elsewhere, cache
  // not refreshed) is skipped rather than sent as empty text — it still
  // counts as a source id, just contributes nothing to read from.
  const text = entryIds
    .map((id) => byId.get(id)?.content)
    .filter(Boolean)
    .join("\n\n---\n\n");
  if (!text.trim()) {
    toast("Couldn't read the selected notes' content — try reloading the Notes tab first.");
    return;
  }
  openExtractPreview(text, { sourceEntryIds: entryIds });
}

// Arrow-key nudge — asked for directly ("allow objects to be moved with
// arrow keys"). Moves the whole current selection (single item or multi)
// by one step; the keydown handler in initWhiteboard decides the step size
// (grid spacing when snap is on, else 1px, 10px with Shift).
async function wbNudgeSelection(dx, dy) {
  const entries = wbMultiSelection.size > 0
    ? wbSelectionEntries()
    : wbSelectedItem
      ? (() => {
          const { kind, id } = wbSelectedItem;
          const item = (wbState[WB_LIST_BY_KIND[kind]] || []).find((i) => i.id === id);
          const bbox = item && wbItemBBox(kind, item);
          return item && bbox ? [{ kind, id, item, bbox }] : [];
        })()
      : [];
  if (entries.length === 0) return;
  const pushed = [];
  for (const e of entries) pushed.push(await wbMoveItemBy(e.kind, e.id, e.item, dx, dy));
  wbPushMoveBatch(pushed);
}

// as the resize handles above, there is no one set of properties to show
// for a mixed multi-selection. A node (note card) and an image object have
// nothing here to edit yet (a card's own text is the note; an image has no
// stroke/fill of its own), so the panel just stays hidden for those.
function wbUpdatePropertiesPanel() {
  const panel = document.getElementById("wb-properties-panel");
  if (!panel) return;
  const rows = {
    color: document.getElementById("wb-prop-color-row"),
    width: document.getElementById("wb-prop-width-row"),
    startcap: document.getElementById("wb-prop-startcap-row"),
    endcap: document.getElementById("wb-prop-endcap-row"),
    bg: document.getElementById("wb-prop-bg-row"),
    border: document.getElementById("wb-prop-border-row"),
    fontsize: document.getElementById("wb-prop-fontsize-row"),
    multi: document.getElementById("wb-prop-multi-row"),
    mindmap: document.getElementById("wb-prop-mindmap-row"),
    dash: document.getElementById("wb-prop-dash-row"),
    nostroke: document.getElementById("wb-prop-nostroke-row"),
    shapefill: document.getElementById("wb-prop-shapefill-row"),
    extractNotes: document.getElementById("wb-extract-notes-row"),
  };
  Object.values(rows).forEach((r) => r?.classList.add("hidden"));

  // A multi-selection has no one fill/stroke to edit (mixed kinds), but it
  // does have grouping and alignment, which only make sense here — shown
  // instead of the single-item rows above rather than alongside them.
  if (wbMultiSelection.size > 0) {
    panel.classList.remove("hidden");
    rows.multi.classList.remove("hidden");
    // Extract notes (BACKLOG.md §62) only makes sense once the selection
    // actually includes a note card's content to extract from — a
    // multi-selection of pure shapes/sketches has no "notes-in-context".
    const hasNoteCard = wbSelectionEntries().some((e) => e.kind === "node");
    rows.extractNotes.classList.toggle("hidden", !hasNoteCard);
    return;
  }
  if (!wbSelectedItem) {
    panel.classList.add("hidden");
    return;
  }
  const { kind, id } = wbSelectedItem;
  const item = (wbState[WB_LIST_BY_KIND[kind]] || []).find((i) => i.id === id);
  if (!item) {
    panel.classList.add("hidden");
    return;
  }

  if (kind === "sketch") {
    // A link has no `.d` of its own (`wbSketchParsedData` only recognises
    // real drawn shapes), so it needs its own branch here — asked for
    // directly ("customisable links and lines, colour, connection endpoint
    // designs"), previously not editable at all once created.
    let linkParsed = null;
    try {
      const candidate = JSON.parse(item.data);
      if (candidate && (candidate.type || "").startsWith("link-")) linkParsed = candidate;
    } catch { /* not JSON — not a link either */ }
    if (linkParsed) {
      panel.classList.remove("hidden");
      rows.color.classList.remove("hidden");
      rows.width.classList.remove("hidden");
      rows.startcap.classList.remove("hidden");
      rows.endcap.classList.remove("hidden");
      rows.dash.classList.remove("hidden");
      document.getElementById("wb-prop-color").value = linkParsed.color || "#ffffff";
      document.getElementById("wb-prop-width").value = linkParsed.width || 3;
      const linkCaps = wbLinkCaps(linkParsed);
      document.getElementById("wb-prop-startcap").value = linkCaps.startCap;
      document.getElementById("wb-prop-endcap").value = linkCaps.endCap;
      document.getElementById("wb-prop-dash").value = linkParsed.dash || "solid";
      return;
    }
    const parsed = wbSketchParsedData(item);
    if (!parsed) {
      panel.classList.add("hidden");
      return;
    }
    panel.classList.remove("hidden");
    rows.color.classList.remove("hidden");
    rows.width.classList.remove("hidden");
    document.getElementById("wb-prop-color").value = parsed.color || "#000000";
    document.getElementById("wb-prop-width").value = parsed.width || 3;
    if (wbSketchIsArrow(parsed.d)) {
      rows.startcap.classList.remove("hidden");
      rows.endcap.classList.remove("hidden");
      // The sketch's own actual style, not the active drawing tool's current
      // default — live-reported bug, same root cause as Line always drawing
      // with a head: this used to show `window.currentArrowStyle` instead
      // of what was really on the selected line/arrow.
      const caps = wbSketchCaps(parsed);
      document.getElementById("wb-prop-startcap").value = caps.startCap;
      document.getElementById("wb-prop-endcap").value = caps.endCap;
    }
    // Stroke style/no-stroke apply to any drawn shape/line; fill only to
    // the four closed shapes — asked for directly ("stroke width, style,
    // and colour... fill colour/transparency... no border/stroke").
    rows.dash.classList.remove("hidden");
    rows.nostroke.classList.remove("hidden");
    document.getElementById("wb-prop-dash").value = parsed.dash || "solid";
    document.getElementById("wb-prop-nostroke").checked = Boolean(parsed.noStroke);
    if (WB_FILLABLE_SHAPES.has(parsed.shape)) {
      rows.shapefill.classList.remove("hidden");
      document.getElementById("wb-prop-shapefill").value = parsed.fill || "#3355ff";
      document.getElementById("wb-prop-shapefill-on").checked = Boolean(parsed.fill);
      document.getElementById("wb-prop-shapefill").disabled = !parsed.fill;
    }
  } else if (kind === "object" && item.kind === "text") {
    panel.classList.remove("hidden");
    rows.color.classList.remove("hidden");
    rows.bg.classList.remove("hidden");
    rows.border.classList.remove("hidden");
    rows.fontsize.classList.remove("hidden");
    document.getElementById("wb-prop-color").value = item.data.color || "#1f2430";
    document.getElementById("wb-prop-bg").value = item.data.bg === "transparent" ? "#ffffff" : (item.data.bg || "#ffffff");
    document.getElementById("wb-prop-bg-none").checked = item.data.bg === "transparent";
    document.getElementById("wb-prop-border").value = item.data.border_color === "transparent" ? "#8888aa" : (item.data.border_color || "#8888aa");
    document.getElementById("wb-prop-border-none").checked = item.data.border_color === "transparent";
    document.getElementById("wb-prop-fontsize").value = item.data.font_size || 16;
  } else if (kind === "node") {
    // Mind-mapping (item 25): only worth offering once the card actually
    // has something to arrange — a card with no links is already exactly
    // where a "mind map of one" would put it.
    const hasLink = wbState.sketches.some((s) => {
      try {
        const p = JSON.parse(s.data);
        return p.type && p.type.startsWith("link-") && (p.sourceId === item.id || p.targetId === item.id);
      } catch {
        return false;
      }
    });
    if (hasLink) {
      panel.classList.remove("hidden");
      rows.mindmap.classList.remove("hidden");
    } else {
      panel.classList.add("hidden");
    }
  } else {
    panel.classList.add("hidden");
  }
}

//: Mind-mapping (ROADMAP item 25): "Arrange as mind map" auto-positions
//: everything reachable from a selected card via the whiteboard's own
//: links into a Tree or Radial layout — reusing the Graph tab's own
//: `d3.hierarchy`/`d3.tree` approach (see `layoutHierarchy` above) rather
//: than a second layout engine, just against the whiteboard's plain
//: node/link data instead of the notebook's category/reply structure (no
//: categories here, so none of that grouping machinery is needed). A link
//: graph isn't necessarily a tree — cycles, a card linked to two others
//: that are themselves linked — so a BFS from the root turns whatever is
//: reachable into a real spanning tree (first link found wins the "parent"
//: slot), which is the only sense "arrange everything connected to it" can
//: have for a layout that needs one parent per node.
const WB_MINDMAP_TREE_ROW = 170; // spacing across the fan-out axis
const WB_MINDMAP_TREE_COL = 320; // spacing per depth level, left → right
const WB_MINDMAP_RADIAL_STEP = 260; // ring spacing per depth level

//: The undirected adjacency every mind-map operation starts from — every
//: link sketch touching two *currently real* nodes (a stale link to an
//: already-deleted card is silently excluded, same as the render path
//: already does).
function wbLinkAdjacency() {
  const adjacency = new Map();
  const addEdge = (a, b) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
  };
  const nodeIds = new Set(wbState.nodes.map((n) => n.id));
  for (const sketch of wbState.sketches) {
    let parsed;
    try {
      parsed = JSON.parse(sketch.data);
    } catch {
      continue;
    }
    if (!parsed.type || !parsed.type.startsWith("link-")) continue;
    if (nodeIds.has(parsed.sourceId) && nodeIds.has(parsed.targetId)) addEdge(parsed.sourceId, parsed.targetId);
  }
  return adjacency;
}

//: A BFS spanning tree from `rootId`, in the `{parentOf, childrenOf}` shape
//: both `wbArrangeMindMap` and the Tab/Enter branch-entry commands share.
function wbMindMapSpanningTree(rootId) {
  const adjacency = wbLinkAdjacency();
  const parentOf = new Map([[rootId, null]]);
  const childrenOf = new Map([[rootId, []]]);
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift();
    for (const neighbour of adjacency.get(current) || []) {
      if (parentOf.has(neighbour)) continue;
      parentOf.set(neighbour, current);
      childrenOf.get(current).push(neighbour);
      childrenOf.set(neighbour, []);
      queue.push(neighbour);
    }
  }
  return { parentOf, childrenOf };
}

async function wbArrangeMindMap(rootId, kind) {
  const root = wbState.nodes.find((n) => n.id === rootId);
  if (!root) return;
  const { parentOf, childrenOf } = wbMindMapSpanningTree(rootId);
  if (parentOf.size < 2) {
    toast("Nothing linked to this card to arrange.");
    return;
  }

  // d3.hierarchy wants a tree of plain objects with a `children` accessor —
  // built once, keyed by node id, the same shape `layoutHierarchy` above
  // builds from `children`/`groups`.
  const buildTree = (id) => ({ id, children: (childrenOf.get(id) || []).map(buildTree) });
  const laid = d3.hierarchy(buildTree(rootId));

  const positions = new Map();
  if (kind === "radial") {
    // Same `d3.tree().size([2*Math.PI, 1])` call `layoutHierarchy`'s own
    // radial branch uses; ring spacing is a plain fixed step per depth
    // here rather than that function's label-aware `radialRings` sizing,
    // since a mind map has no per-ring label-width category to budget for.
    d3.tree().size([2 * Math.PI, 1])(laid);
    laid.each((point) => {
      const radius = point.depth * WB_MINDMAP_RADIAL_STEP;
      positions.set(point.data.id, {
        x: radius * Math.cos(point.x - Math.PI / 2),
        y: radius * Math.sin(point.x - Math.PI / 2),
      });
    });
  } else {
    d3.tree().nodeSize([WB_MINDMAP_TREE_ROW, WB_MINDMAP_TREE_COL])(laid);
    laid.each((point) => {
      positions.set(point.data.id, { x: point.depth * WB_MINDMAP_TREE_COL, y: point.x });
    });
  }

  // The layout is computed around (0,0) at the root — shift the whole
  // result so the root card itself doesn't move, only what's connected to
  // it, which is what "arrange everything connected to it" (not "recentre
  // my board") actually asked for.
  const rootPos = positions.get(rootId);
  const dx = root.x - rootPos.x, dy = root.y - rootPos.y;
  for (const [id, pos] of positions) {
    if (id === rootId) continue;
    const node = wbState.nodes.find((n) => n.id === id);
    if (!node) continue;
    node.x = wbSnap(pos.x + dx);
    node.y = wbSnap(pos.y + dy);
    await wbSaveNode(node);
  }

  // Cached for the Tab/Enter branch-entry commands below, so a card added
  // right after an arrange lands in the layout it was just shown, not a
  // freshly re-derived (and possibly different, since BFS parent choice
  // isn't unique when a card has more than one link back toward the root)
  // spanning tree.
  window.wbMindMap = { rootId, parentOf, childrenOf, kind };
  wbScheduleRender();
  toast(`Arranged ${parentOf.size} cards as a ${kind === "radial" ? "radial" : "tree"} mind map.`);
}

//: Tab/Enter branch entry (item 25's second piece) needs to know a card's
//: "parent" in mind-map terms, which a whiteboard link doesn't carry on its
//: own (just two ids, no direction). Reuses the cached map from a prior
//: `wbArrangeMindMap` run when the given card is part of it; otherwise
//: seeds one lazily, rooted at the card itself, from the board's current
//: links — so Tab/Enter still work sensibly on a board nobody has arranged
//: yet, not only right after clicking Tree/Radial.
function wbMindMapEnsureMap(fromId) {
  if (!window.wbMindMap || !window.wbMindMap.parentOf.has(fromId)) {
    const { parentOf, childrenOf } = wbMindMapSpanningTree(fromId);
    window.wbMindMap = { rootId: fromId, parentOf, childrenOf, kind: window.wbMindMap?.kind || "radial" };
  }
  return window.wbMindMap;
}

//: Creates a real note, a whiteboard card for it, and a link from
//: `parentId` — the one operation both Tab and Enter reduce to, differing
//: only in which card counts as the parent.
async function wbMindMapAddCard(parentId, x, y) {
  const entry = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "New branch" }) });
  const nodeRes = await apiJson("/whiteboard/nodes", {
    method: "POST",
    body: JSON.stringify({ entry_id: entry.id, board_id: window.currentBoardId ?? null, x: wbSnap(x), y: wbSnap(y), z: 1 }),
  });
  wbState.nodes.push(nodeRes);
  const sketchRes = await apiJson("/whiteboard/sketches", {
    method: "POST",
    body: JSON.stringify({
      data: JSON.stringify({
        type: "link-curved",
        sourceId: parentId,
        targetId: nodeRes.id,
        color: window.currentStrokeColor || "#ffffff",
      }),
      x: 0, y: 0, z: 1, board_id: window.currentBoardId ?? null,
    }),
  });
  wbState.sketches.push(sketchRes);

  // The card about to render reads its text out of `allEntries`, which was
  // fetched before this note existed. Without this the new branch renders
  // as a placeholder and never resolves — see the `!entry` branch in the
  // card renderer.
  await loadEntries();

  const map = wbMindMapEnsureMap(parentId);
  map.parentOf.set(nodeRes.id, parentId);
  if (!map.childrenOf.has(parentId)) map.childrenOf.set(parentId, []);
  map.childrenOf.get(parentId).push(nodeRes.id);
  map.childrenOf.set(nodeRes.id, []);

  selectWbItem("node", nodeRes.id);
  wbScheduleRender();
  // **A new branch is an empty thought, so it opens ready to be typed.**
  // Before this it was a card reading "New branch" and nothing else: the
  // gesture created a node and then left you to find the way to name it,
  // which is the difference between a mind-mapping tool and a diagram
  // editor. `wbScheduleRender` is async, so this waits for the card to
  // exist rather than assuming it does.
  requestAnimationFrame(() => wbEditNodeText(nodeRes.id));
  return nodeRes;
}

/** Put a card into edit mode with its text selected.
 *
 *  A concept map is written by typing, so the node a branch gesture just
 *  created has to be typeable *now* — not after finding a menu. Selecting
 *  the placeholder means the first keystroke replaces it, which is what
 *  makes `Tab, type, Tab, type` a fluent way to work rather than a sequence
 *  of edits.
 */
function wbEditNodeText(nodeId) {
  const node = wbState.nodes.find((n) => n.id === nodeId);
  if (!node) return;
  const card = document.querySelector(`.node-card[data-id="${nodeId}"]`);
  const content = card?.querySelector(".wb-card-content");
  if (!content) return;
  const entry = allEntries.find((e) => e.id === node.entry_id);
  const original = entry?.content || "";

  const box = document.createElement("textarea");
  box.className = "wb-card-editor";
  box.value = original;
  content.replaceChildren(box);
  box.focus();
  box.select();

  let settled = false;
  const finish = async (save) => {
    if (settled) return;
    settled = true;
    const text = box.value.trim();
    const keep = save && text ? text : original;
    if (save && text && text !== original) {
      try {
        await apiJson(`/entries/${node.entry_id}`, {
          method: "PUT",
          body: JSON.stringify({ content: text }),
        });
        // The card reads its text out of `allEntries`; without this the next
        // render would use the old content and the edit would look discarded.
        await loadEntries();
      } catch (err) {
        toast(err.message || "Couldn't save that.", true);
      }
    }
    // **Put the text back by hand, not by re-rendering.** Found live: after
    // saving, the textarea was still on the card. `wbScheduleRender` runs a
    // d3 data join, and card *content* is only built in the `enter`
    // selection — an existing card keeps whatever DOM it already has, which
    // here was the editor. So the edit saved correctly to the server and
    // looked like it had done nothing, which is the worst of both.
    content.replaceChildren();
    renderMarkdown(content, keep);
    wbScheduleRender();
  };

  // Enter commits, Shift+Enter is a real newline — the convention for a
  // single-idea field. Escape abandons. Blur commits, because clicking away
  // to the next card is the most common way to finish one.
  box.addEventListener("keydown", (event) => {
    event.stopPropagation(); // Tab/Enter here are text, not branch gestures
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });
  box.addEventListener("blur", () => finish(true));
}

//: Tab — a new child of the selected card, at "the next open radial slot":
//: evenly spaced by angle among the parent's existing children (plus the
//: one about to be added, so a lone first child doesn't land straight on
//: top of the parent), one ring further out.
async function wbMindMapAddChild(parentId) {
  const parent = wbState.nodes.find((n) => n.id === parentId);
  if (!parent) return;
  const map = wbMindMapEnsureMap(parentId);
  const existing = (map.childrenOf.get(parentId) || []).length;
  const slots = Math.max(existing + 1, 3);
  // **Fan out sideways first, not upwards.** The offset used to be
  // `-Math.PI / 2` — straight up — so the very first branch off a root card
  // landed one full ring *above* it. Driven live: a map created at the
  // canvas centre put its first Tab branch off the top edge, clipped and
  // half unreadable, which is a bad first impression of the one gesture the
  // whole feature turns on. Sideways is also how every mind-mapping tool
  // fans a first child, because a page is wider than it is tall.
  const angle = (existing / slots) * 2 * Math.PI;
  const parentBox = wbItemBBox("node", parent);
  const cx = (parentBox.minX + parentBox.maxX) / 2, cy = (parentBox.minY + parentBox.maxY) / 2;
  const w = parent.width || WB_CARD_DEFAULT_SIZE.w, h = parent.height || WB_CARD_DEFAULT_SIZE.h;
  await wbMindMapAddCard(
    parentId,
    cx + WB_MINDMAP_RADIAL_STEP * Math.cos(angle) - w / 2,
    cy + WB_MINDMAP_RADIAL_STEP * Math.sin(angle) - h / 2
  );
}

//: Enter — a new sibling of the selected card (a child of *its* parent).
//: A card with no known parent (the mind map's own root, or one never
//: linked to anything) has no sibling slot to fill — falls back to adding
//: a child of the card itself, the only branch that makes sense there.
async function wbMindMapAddSibling(cardId) {
  const map = wbMindMapEnsureMap(cardId);
  const parentId = map.parentOf.get(cardId);
  await wbMindMapAddChild(parentId == null ? cardId : parentId);
}

function wbApplySelectionHighlight() {
  document
    .querySelectorAll(".sketch-group.wb-selected, .node-card.wb-selected, .wb-object.wb-selected")
    .forEach((el) => el.classList.remove("wb-selected"));
  // A sketch's resize handles have nowhere else to live between renders
  // (unlike a card/object, which always has 8 handle children of its own) —
  // recomputed here so they track a fresh selection or a just-finished move.
  // Only for the single-item selection — a multi-selection has no one
  // bounding box to hang 8 handles off, and resizing a set isn't built.
  wbRenderSketchHandles();
  wbUpdatePropertiesPanel();
  for (const key of wbMultiSelection) {
    const sep = key.indexOf(":");
    const kind = key.slice(0, sep), id = Number(key.slice(sep + 1));
    document.querySelector(WB_SELECTOR_BY_KIND[kind](id))?.classList.add("wb-selected");
  }
  if (!wbSelectedItem) return;
  const selector = WB_SELECTOR_BY_KIND[wbSelectedItem.kind](wbSelectedItem.id);
  document.querySelector(selector)?.classList.add("wb-selected");
}

function selectWbItem(kind, id) {
  wbSelectedItem = { kind, id };
  wbApplySelectionHighlight();
}

function clearWbSelection() {
  if (!wbSelectedItem && wbMultiSelection.size === 0) return;
  wbSelectedItem = null;
  wbMultiSelection.clear();
  wbApplySelectionHighlight();
}

// Shared by every item's own click handler (sketch/node/object) — a plain
// click replaces whatever was selected, exactly as before; a shift-click
// adds or removes just this one item from the multi-selection, first
// folding any existing lone selection into it so "click one, then
// shift-click another" and "shift-click two in a row" end up in the same
// state.
function wbHandleItemClick(kind, id, event) {
  if (event.shiftKey) {
    if (wbSelectedItem) {
      wbMultiSelection.add(wbMultiKey(wbSelectedItem.kind, wbSelectedItem.id));
      wbSelectedItem = null;
    }
    const key = wbMultiKey(kind, id);
    if (wbMultiSelection.has(key)) wbMultiSelection.delete(key);
    else wbMultiSelection.add(key);
    wbApplySelectionHighlight();
    return;
  }
  wbMultiSelection.clear();
  // A plain click on a *grouped* item selects the whole group, not just the
  // one thing clicked — the other half of Ctrl+G (`wbGroupSelection`).
  const item = (wbState[WB_LIST_BY_KIND[kind]] || []).find((i) => i.id === id);
  if (item && item.group_id) {
    for (const [memberKind, listName] of Object.entries(WB_LIST_BY_KIND)) {
      for (const candidate of wbState[listName] || []) {
        if (candidate.group_id === item.group_id) wbMultiSelection.add(wbMultiKey(memberKind, candidate.id));
      }
    }
    wbSelectedItem = null;
    wbApplySelectionHighlight();
    return;
  }
  selectWbItem(kind, id);
}

//: Which `wbState` list a selection's item lives in, by kind — one place so
//: it can't drift out of step with `WB_KIND_INFO`'s own list names.
const WB_LIST_BY_KIND = { sketch: "sketches", node: "nodes", object: "objects" };

// Delete/Backspace with something selected — the other half of "select as
// a real tool": today, deleting anything meant switching to the Delete
// tool first. Reuses `deleteSketch`/`deleteNode`/`deleteObject`, so a
// selection-delete gets undo/redo for free, the same as every other way of
// deleting one. A non-empty multi-selection takes priority over the
// single-item one — the two are mutually exclusive by construction
// (`wbHandleItemClick`/marquee-select always clear one when populating the
// other), but checking the set first is the honest way to say so.
function deleteWbSelection() {
  if (wbMultiSelection.size > 0) {
    const keys = [...wbMultiSelection];
    wbMultiSelection.clear();
    for (const key of keys) {
      const sep = key.indexOf(":");
      const kind = key.slice(0, sep), id = Number(key.slice(sep + 1));
      const item = (wbState[WB_LIST_BY_KIND[kind]] || []).find((i) => i.id === id);
      if (!item) continue;
      if (kind === "sketch") wbDeleteSketchRef?.(item);
      else if (kind === "node") wbDeleteNodeRef?.(item);
      else wbDeleteObjectRef?.(item);
    }
    wbApplySelectionHighlight();
    return true;
  }
  if (!wbSelectedItem) return false;
  const { kind, id } = wbSelectedItem;
  const item = (wbState[WB_LIST_BY_KIND[kind]] || []).find((i) => i.id === id);
  clearWbSelection();
  if (!item) return false;
  if (kind === "sketch") wbDeleteSketchRef?.(item);
  else if (kind === "node") wbDeleteNodeRef?.(item);
  else wbDeleteObjectRef?.(item);
  return true;
}

// --- Layer order: bring to front / send to back (asked for directly) ------
//
// `z` already exists on every kind's own row and already drives paint order
// (`.style("z-index", d => d.z)`, both nodes' and objects' own render merge
// a few hundred lines down) — nothing here needed a schema change or a new
// render path, only an action that actually changes the number. Nodes and
// objects share one HTML stacking context (`canvas` in renderWhiteboard),
// so they interleave against each other; a sketch renders in the separate
// SVG layer beneath both (wbShowAnchorHints's own comment explains why), so
// it only ever reorders against other sketches — never in front of a card.
// An honest limit of this app's layering, not something faked here.

function wbZOrderPeers(kind) {
  return kind === "sketch"
    ? wbState.sketches || []
    : [...(wbState.nodes || []), ...(wbState.objects || [])];
}

//: Moves one item to the front/back of its own layer and saves it, mirroring
//: `wbMoveItemBy`'s shape (capture `before`, mutate, save, return a "move"
//: undo entry) so it plugs into the same undo/redo stack without a new
//: action type.
async function wbSetZOrder(kind, item, toFront) {
  const zs = wbZOrderPeers(kind).map((p) => p.z || 0);
  const next = toFront ? Math.max(0, ...zs) + 1 : Math.min(0, ...zs) - 1;
  if ((item.z || 0) === next) return null;
  const before = WB_KIND_INFO[kind].payload(item);
  item.z = next;
  try {
    const saved = await apiJson(`${WB_KIND_INFO[kind].base}/${item.id}`, {
      method: "PUT",
      body: JSON.stringify(WB_KIND_INFO[kind].payload(item)),
    });
    Object.assign(item, saved);
  } catch {
    recordBrowserLog("WARN", [`[Whiteboard] ${kind} ${item.id} is stale — reloading the board`]);
    await fetchWhiteboardState();
    wbScheduleRender();
    return null;
  }
  return { action: "move", kind, id: item.id, before };
}

//: The context menu's own entry point — single selection or a whole
//: multi-selection at once, same iteration shape `deleteWbSelection` above
//: already uses.
async function wbSendSelectionZOrder(toFront) {
  const targets = [];
  if (wbMultiSelection.size > 0) {
    for (const key of wbMultiSelection) {
      const sep = key.indexOf(":");
      const kind = key.slice(0, sep), id = Number(key.slice(sep + 1));
      const item = (wbState[WB_LIST_BY_KIND[kind]] || []).find((i) => i.id === id);
      if (item) targets.push({ kind, item });
    }
  } else if (wbSelectedItem) {
    const { kind, id } = wbSelectedItem;
    const item = (wbState[WB_LIST_BY_KIND[kind]] || []).find((i) => i.id === id);
    if (item) targets.push({ kind, item });
  }
  if (!targets.length) return;
  const entries = [];
  for (const { kind, item } of targets) {
    const entry = await wbSetZOrder(kind, item, toFront);
    if (entry) entries.push(entry);
  }
  if (entries.length === 1) wbPushUndo(entries[0]);
  else if (entries.length > 1) wbPushUndo({ action: "batch", entries });
  if (entries.length) wbScheduleRender();
}

// --- Bulk move: dragging one member of a multi-selection moves all of them
// together — the reason to select more than one thing in the first place.
// Three per-kind drag handlers (node/object/sketch) each call these three
// functions at start/drag/end rather than reimplementing the same
// fixed-baseline-per-frame maths three times (see wbSaveSketchD's own
// comment on why re-deriving from a live-mutated value drifts).

function wbDragIsBulkMove(kind, id) {
  return wbMultiSelection.size > 1 && wbMultiSelection.has(wbMultiKey(kind, id));
}

//: Every other multi-selected member's position/shape at the *start* of a
//: bulk drag, so each frame recomputes from one fixed baseline instead of
//: compounding a per-frame delta onto an already-moved value (the exact bug
//: `wbSnap`'s own accumulation fix above exists to avoid, here for a whole
//: set instead of one item).
function wbCaptureBulkMoveOrigin(excludeKey) {
  const origin = new Map();
  for (const key of wbMultiSelection) {
    if (key === excludeKey) continue; // the dragged item's own handler already moves it
    const sep = key.indexOf(":");
    const kind = key.slice(0, sep), id = Number(key.slice(sep + 1));
    const item = (wbState[WB_LIST_BY_KIND[kind]] || []).find((i) => i.id === id);
    if (!item) continue;
    if (kind === "sketch") {
      const parsed = wbSketchParsedData(item);
      if (parsed) origin.set(key, { kind, id, item, d: parsed.d });
    } else {
      origin.set(key, { kind, id, item, x: item.x, y: item.y });
    }
  }
  return origin;
}

function wbApplyBulkMove(origin, dx, dy) {
  for (const entry of origin.values()) {
    if (entry.kind === "sketch") {
      const newD = wbTransformPathD(entry.d, { dx, dy });
      const el = document.querySelector(`.sketch-group[data-id="${entry.id}"]`);
      el?.querySelector(".sketch-path")?.setAttribute("d", newD);
      el?.querySelector(".sketch-hitbox")?.setAttribute("d", newD);
      entry.item._liveD = newD;
    } else {
      entry.item.x = entry.x + dx;
      entry.item.y = entry.y + dy;
      const el = document.querySelector(WB_SELECTOR_BY_KIND[entry.kind](entry.id));
      if (el) el.style.transform = wbItemTransform(entry.item);
    }
  }
}

async function wbSaveBulkMove(origin) {
  for (const entry of origin.values()) {
    if (entry.kind === "sketch") {
      if (entry.item._liveD) {
        const d = entry.item._liveD;
        delete entry.item._liveD;
        await wbSaveSketchD(entry.item, d);
      }
    } else if (entry.kind === "node") {
      await wbSaveNode(entry.item);
    } else {
      await wbSaveObject(entry.item);
    }
  }
}


// Copy/paste — reported directly: "can't copy/paste objects drawn or made
// on whiteboard". One snapshot, not a real OS clipboard: this app has
// nothing to gain from `navigator.clipboard` here (no cross-tab/cross-app
// paste target makes sense for a sketch's own path data), and a plain
// in-memory value is simpler and needs no permission prompt.
let wbClipboard = null; // {kind, payload} — see WB_KIND_INFO's own payload() per kind

//: A card is deliberately excluded. `POST /whiteboard/nodes` is "one card
//: per note per board" by design (routes_whiteboard.py's own comment: two
//: cards for the same note stacked on each other reads as one card that
//: won't drag properly) — POSTing a copy would silently *move* the
//: original card to the paste offset instead of creating a second one,
//: which is worse than not supporting copy/paste for cards at all.
function wbCopySelection() {
  if (!wbSelectedItem) return false;
  if (wbSelectedItem.kind === "node") {
    toast("A note card can't be copied — drag it, or drop the note again from the Library.");
    return false;
  }
  const { kind, id } = wbSelectedItem;
  const item = (wbState[WB_LIST_BY_KIND[kind]] || []).find((i) => i.id === id);
  if (!item) return false;
  if (kind === "sketch" && !wbSketchParsedData(item)) {
    // A link sketch — its `data` has no `d`, only sourceId/targetId, and is
    // recomputed from two cards' positions on every render; nothing here is
    // a standalone shape to copy.
    toast("A link can't be copied — copy the cards it connects instead.");
    return false;
  }
  wbClipboard = { kind, payload: WB_KIND_INFO[kind].payload(item) };
  toast("Copied.");
  return true;
}

//: Applied to both axes on paste, so the copy lands visibly beside the
//: original rather than exactly on top of it — same reasoning as every
//: other drawing app's paste offset.
const WB_PASTE_OFFSET = 24;

async function wbPasteClipboard() {
  if (!wbClipboard) return;
  const { kind, payload } = wbClipboard;
  const { base, list } = WB_KIND_INFO[kind];
  const body = {
    ...payload,
    x: (payload.x || 0) + WB_PASTE_OFFSET,
    y: (payload.y || 0) + WB_PASTE_OFFSET,
    board_id: window.currentBoardId,
  };
  if (kind === "sketch") {
    // A sketch's own x/y isn't what positions it on screen — its path data
    // is (wbTransformPathD's own comment) — so bumping x/y alone would draw
    // the paste directly on top of the original, offset in the database but
    // not on the board.
    const parsed = wbSketchParsedData({ data: body.data });
    if (parsed) {
      parsed.d = wbTransformPathD(parsed.d, { dx: WB_PASTE_OFFSET, dy: WB_PASTE_OFFSET });
      body.data = JSON.stringify(parsed);
    }
  }
  try {
    const created = await apiJson(base, { method: "POST", body: JSON.stringify(body) });
    wbState[list].push(created);
    wbPushUndo({ action: "create", kind, id: created.id });
    wbScheduleRender();
    wbSelectToolRef?.("select");
    selectWbItem(kind, created.id);
  } catch (err) {
    toast(err.message || "Couldn't paste that.", true);
  }
}

// Cut — ROADMAP §89.12, asked as a question alongside the context menu
// below. Same restrictions as copy (a card can't be cut, a link-sketch
// can't be cut) — wbCopySelection already toasts why, so cut just declines
// to delete anything when the copy half refuses.
function wbCutSelection() {
  if (!wbCopySelection()) return false;
  deleteWbSelection();
  return true;
}

// --- Right-click / long-press menu for a selection (ROADMAP §89.12) --------
//
// Asked as a question, alongside cut above: today the only way to act on a
// selection is a keyboard shortcut, and `wbOpenDockedMenu`'s reparent-to-body
// technique (a few hundred lines up) is the only precedent in this file for
// a menu that has to escape a clipped, scrolling ancestor — so this reuses
// that shape rather than inventing a second one, just triggered by a gesture
// on the canvas instead of a toolbar toggle.
let wbCtxMenuEl = null;

//: Rebuilt on every open rather than cached with static buttons: a card
//: can't be copied or cut at all (`wbCopySelection`'s own comment — POSTing
//: a copy would silently move the original instead of duplicating it), and
//: a menu offering two buttons guaranteed to fail is worse than one that
//: only ever offers what this selection can actually do.
function wbBuildContextMenu(kind) {
  if (!wbCtxMenuEl) {
    const menu = document.createElement("div");
    menu.className = "action-menu wb-ctx-menu hidden";
    menu.setAttribute("role", "menu");
    document.body.appendChild(menu);
    wbCtxMenuEl = menu;
  }
  const menu = wbCtxMenuEl;
  menu.replaceChildren();
  const item = (label, title, fn) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "menu-item";
    button.setAttribute("role", "menuitem");
    button.textContent = label;
    if (title) button.title = title;
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      wbCloseContextMenu();
      fn();
    });
    menu.appendChild(button);
  };
  if (kind !== "node") {
    item("Copy", "Ctrl/Cmd+C", () => wbCopySelection());
    item("Cut", "Ctrl/Cmd+X", () => wbCutSelection());
  }
  // Asked for directly. Available for every kind — a sketch reorders
  // against other sketches, a card/object against both (wbZOrderPeers'
  // own comment has the full reasoning for that split).
  item("Bring to Front", "Move above everything else in this layer", () => wbSendSelectionZOrder(true));
  item("Send to Back", "Move below everything else in this layer", () => wbSendSelectionZOrder(false));
  item("Delete", "Delete", () => deleteWbSelection());
  return menu;
}

function wbCloseContextMenu() {
  wbCtxMenuEl?.classList.add("hidden");
}

//: Selects whatever the gesture landed on (unless it's already part of a
//: multi-selection — right-clicking one member of a group opens the menu
//: for the whole group, same rule a plain click already uses) and opens the
//: menu at the pointer, clamped to the viewport the same way the docked
//: toolbar menu already clamps itself.
function wbOpenContextMenuFor(kind, id, clientX, clientY) {
  const key = wbMultiKey(kind, id);
  if (!wbMultiSelection.has(key)) wbHandleItemClick(kind, id, { shiftKey: false });
  // Copy/Cut only ever act on a single-item selection (`wbCopySelection`'s
  // own `wbSelectedItem` check) — a multi-selection gets the same "node"
  // treatment as a card, which is "Delete only", rather than two buttons
  // that would silently do nothing.
  const menu = wbBuildContextMenu(wbMultiSelection.size > 0 ? "node" : kind);
  menu.classList.remove("hidden");
  menu.style.left = `${clientX}px`;
  menu.style.top = `${clientY}px`;
  const margin = 8;
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth - margin) {
    menu.style.left = `${Math.max(margin, window.innerWidth - rect.width - margin)}px`;
  }
  if (rect.bottom > window.innerHeight - margin) {
    menu.style.top = `${Math.max(margin, window.innerHeight - rect.height - margin)}px`;
  }
}

document.addEventListener("click", (e) => {
  if (wbCtxMenuEl && !wbCtxMenuEl.classList.contains("hidden") && !e.target.closest(".wb-ctx-menu")) {
    wbCloseContextMenu();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") wbCloseContextMenu();
});

//: Wires the gesture onto one item type's `enter()` selection — called
//: right after that type's own `.on("click", ...)` is set up, so it only
//: needs binding once per element the same way click already is (d3 keeps
//: the same DOM node across a keyed re-render, so a handler bound on enter
//: persists without needing to be re-applied on every update/merge).
function wbWireContextMenu(selection, kind) {
  let holdTimer = null;
  const cancelHold = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  };
  selection
    .on("contextmenu.wbctx", (event, d) => {
      // A text object's own editable body needs its native context menu
      // (cut/copy/paste, spellcheck) — hijacking it here would make the
      // text box's contenteditable unusable with the mouse.
      if (event.target.closest("[contenteditable]")) return;
      event.preventDefault();
      event.stopPropagation();
      wbOpenContextMenuFor(kind, d.id, event.clientX, event.clientY);
    })
    // Touch has no right-click, so a hold stands in for it — same 500ms
    // threshold and cancel-on-release/move shape as the toolbar toggle's own
    // long-press (wbWireToggleGestures, a few hundred lines up).
    .on("pointerdown.wbctx", (event, d) => {
      if (event.pointerType !== "touch") return;
      if (event.target.closest("[contenteditable]")) return;
      cancelHold();
      holdTimer = setTimeout(() => {
        holdTimer = null;
        wbOpenContextMenuFor(kind, d.id, event.clientX, event.clientY);
      }, 500);
    })
    .on("pointerup.wbctx pointercancel.wbctx pointermove.wbctx", cancelHold);
}

function wbUpdateUndoRedoButtons() {
  const undoBtn = document.getElementById("wb-undo");
  const redoBtn = document.getElementById("wb-redo");
  if (undoBtn) undoBtn.disabled = wbUndoStack.length === 0;
  if (redoBtn) redoBtn.disabled = wbRedoStack.length === 0;
}

function wbPushUndo(entry) {
  wbUndoStack.push(entry);
  if (wbUndoStack.length > WB_UNDO_MAX) wbUndoStack.shift();
  // A fresh action makes whatever redo history existed unreachable — the
  // same rule the sketch pad's own `sketchSaveSnapshot` already follows.
  wbRedoStack = [];
  wbUpdateUndoRedoButtons();
}

// The shared half of undo and redo: pop one entry off `from`, apply its
// inverse, and push what would undo *that* onto `to`. Undo and redo are
// each other's mirror image — pop from one stack, push the reverse onto
// the other — so one function drives both rather than two near-duplicates
// that could drift apart.
//: Per-kind: the collection endpoint, which key in `wbState` holds it, and
//: how to turn a live item back into a POST body. One table rather than a
//: three-way ternary repeated at every call site — adding the "object" kind
//: (images/text boxes) here is the only change `wbApplyHistoryEntry` needed
//: to cover them too.
const WB_KIND_INFO = {
  sketch: {
    base: "/whiteboard/sketches",
    list: "sketches",
    payload: (d) => ({ data: d.data, board_id: d.board_id, x: d.x, y: d.y, z: d.z, group_id: d.group_id ?? null }),
  },
  node: {
    base: "/whiteboard/nodes",
    list: "nodes",
    payload: (d) => ({
      entry_id: d.entry_id, board_id: d.board_id, x: d.x, y: d.y, z: d.z,
      width: d.width ?? null, height: d.height ?? null, rotation: d.rotation ?? null,
      group_id: d.group_id ?? null,
    }),
  },
  object: {
    base: "/whiteboard/objects",
    list: "objects",
    payload: (d) => ({
      kind: d.kind, data: d.data, board_id: d.board_id,
      x: d.x, y: d.y, z: d.z, width: d.width, height: d.height,
      rotation: d.rotation ?? null, group_id: d.group_id ?? null,
    }),
  },
};

//: A card/object's CSS transform — translate always, plus a rotate(deg)
//: about its own centre when it has one. `translate() rotate()` (in that
//: order) is the standard idiom for "move this box, then spin it in
//: place": `transform-origin`'s default (50% 50%) is resolved once in the
//: element's own untransformed box, so the rotation pivots on the box's own
//: centre regardless of where the translate moved it to — the reverse order
//: would instead swing the box around a point offset from its own body.
function wbItemTransform(d) {
  const rot = d.rotation ? ` rotate(${d.rotation}deg)` : "";
  return `translate(${d.x}px, ${d.y}px)${rot}`;
}

//: A screen-space point's angle from a screen-space centre, in degrees,
//: 0-360, with "straight up" (the rotate handle's own resting position) as
//: 0 — so an untouched handle already reads as the item's actual rotation.
//: `shiftSnap` rounds to the nearest 15°, the same modifier convention as
//: shift-to-constrain while drawing a shape.
//: `wbAngleFromCenterDeg`, but for a sketch's rotate handle specifically —
//: the center it's given is in *board* space (the same coordinate space
//: `d` itself uses), while the pointer only ever arrives in *screen*
//: space (`clientX`/`clientY`). The resize-handle drag just above this
//: function divides `event.dx` by the zoom scale by hand for the same
//: reason: an SVG child's d3.drag coordinates are not auto-corrected for
//: an ancestor `<g transform>` in this app's actual DOM, so the two
//: spaces have to be reconciled explicitly rather than assumed to match.
function wbSketchAngleFromCenterDeg(boardCx, boardCy, sourceEvent, shiftSnap) {
  const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
  const rect = document.getElementById("wb-svg-layer").getBoundingClientRect();
  const screenCx = boardCx * transform.k + transform.x + rect.left;
  const screenCy = boardCy * transform.k + transform.y + rect.top;
  return wbAngleFromCenterDeg(screenCx, screenCy, sourceEvent.clientX, sourceEvent.clientY, shiftSnap);
}

function wbAngleFromCenterDeg(cx, cy, px, py, shiftSnap) {
  let deg = Math.atan2(py - cy, px - cx) * (180 / Math.PI) + 90;
  deg = ((deg % 360) + 360) % 360;
  if (shiftSnap) deg = Math.round(deg / 15) * 15 % 360;
  return Math.round(deg);
}

async function wbApplyHistoryEntry(from, to) {
  const entry = from.pop();
  if (!entry) return false;
  if (entry.action === "batch") {
    // A single user gesture that touched several items at once — an
    // arrow-key nudge on a multi-selection, or an alignment/distribute pass
    // — needs to undo/redo as the one action it visibly was, not N separate
    // Undo presses. Bundles N sub-entries and replays each through this same
    // function (recursively — none of the sub-actions are themselves
    // batches), re-bundling whatever came back as the one reverse entry.
    const reverse = [];
    for (const sub of entry.entries) {
      const subTo = [];
      await wbApplyHistoryEntry([sub], subTo);
      if (subTo.length) reverse.push(subTo[0]);
    }
    to.push({ action: "batch", entries: reverse });
    return true;
  }
  const { base, list, payload: toPayload } = WB_KIND_INFO[entry.kind];
  if (entry.action === "delete") {
    // This entry means "bring back what was deleted". Applying it recreates
    // the item; reversing *that* is deleting the newly-recreated one again.
    const restored = await apiJson(base, { method: "POST", body: JSON.stringify(entry.payload) });
    wbState[list].push(restored);
    to.push({ action: "create", kind: entry.kind, id: restored.id });
  } else if (entry.action === "move") {
    // A drag, resize, or nudge's own undo — asked for directly ("account
    // for resizes, rotates, positional movement"). `before` is the item's
    // whole payload (x/y, width/height, a sketch's own `d`) as it was right
    // before the change, so this one action type covers move and resize
    // both — restoring is the same PUT either way, just a different set of
    // fields differing from the current row. Mirrors the delete/create pair
    // above: capture the *current* state before overwriting it, so the
    // pushed reverse entry can undo the undo.
    const item = wbState[list].find((i) => i.id === entry.id);
    if (!item) return true; // stale — nothing to restore, but the stack still advances
    const current = toPayload(item);
    const restored = await apiJson(`${base}/${entry.id}`, { method: "PUT", body: JSON.stringify(entry.before) });
    Object.assign(item, restored);
    to.push({ action: "move", kind: entry.kind, id: entry.id, before: current });
  } else {
    // This entry means "remove what was created". The item's current data
    // has to be captured *before* deleting it — once gone, nothing else
    // remembers what it looked like, and the reverse of this reverse (a
    // future redo/undo) needs a real payload to recreate it from, not a
    // blank one.
    const item = wbState[list].find((i) => i.id === entry.id);
    const payload = item && toPayload(item);
    await apiJson(`${base}/${entry.id}`, { method: "DELETE" });
    wbState[list] = wbState[list].filter((i) => i.id !== entry.id);
    if (payload) to.push({ action: "delete", kind: entry.kind, payload });
  }
  return true;
}

// Reverses the single most recent create or delete — a sketch stroke, a
// shape, a link, or a note card. Asked for implicitly by adding an eraser:
// a tool whose whole job is deleting things you swipe over needs a safety
// net more than any other control on this toolbar.
async function wbUndo() {
  try {
    if (!(await wbApplyHistoryEntry(wbUndoStack, wbRedoStack))) return;
    wbUpdateUndoRedoButtons();
    wbScheduleRender();
  } catch {
    toast("Couldn't undo that.", true);
  }
}

// Reapplies whatever the most recent undo took back — asked for directly
// (`wbUndoStack` "exists; nothing analogous does"). Pushes the reverse onto
// `wbUndoStack`, so undo/redo/undo/redo keeps working rather than only
// ever reversing once.
async function wbRedo() {
  try {
    if (!(await wbApplyHistoryEntry(wbRedoStack, wbUndoStack))) return;
    wbUpdateUndoRedoButtons();
    wbScheduleRender();
  } catch {
    toast("Couldn't redo that.", true);
  }
}

// Images and text boxes — the two new object kinds, created here and
// rendered by `renderWbObjects`. One shared creator (a POST plus the usual
// create-undo-entry dance every other whiteboard item already does) rather
// than a copy per kind, since only the `kind`/`data` differ.
async function wbCreateObject(kind, data, x, y, width, height) {
  const body = { kind, data, board_id: window.currentBoardId, x, y, z: 1, width, height };
  try {
    const created = await apiJson("/whiteboard/objects", { method: "POST", body: JSON.stringify(body) });
    wbState.objects = wbState.objects || [];
    wbState.objects.push(created);
    wbPushUndo({ action: "create", kind: "object", id: created.id });
    wbScheduleRender();
    await refreshBoardList();
    return created;
  } catch (err) {
    toast(err.message || "Couldn't add that to the board.", true);
    return null;
  }
}

async function wbCreateTextBox(x, y) {
  const created = await wbCreateObject(
    "text",
    { content: "" },
    x - 100, y - 40, 200, 80
  );
  if (!created) return;
  wbSelectToolRef?.("select");
  // The point of click-to-place is typing immediately — a text box with
  // nothing in it and no visible focus is a box nobody knows they can type
  // into. wbScheduleRender() just rebuilt the DOM, so the element has to be
  // looked up fresh rather than kept from before the render.
  requestAnimationFrame(() => {
    const el = document.querySelector(`.wb-object[data-id="${created.id}"] .wb-text-content`);
    el?.focus();
  });
}

// Asked for directly. Deletes every card and sketch on the *current* board
// (not other boards — clearing is scoped the same way everything else on
// this screen is). Reuses the same undo entries a single delete already
// pushes, one per item, rather than inventing a second "bulk" undo shape —
// so Ctrl+Z after Clear brings items back one at a time, exactly like an
// eraser swipe over the same items would.
async function wbClearBoard() {
  const total = wbState.nodes.length + wbState.sketches.length + (wbState.objects?.length || 0);
  if (total === 0) {
    toast("This board is already empty.");
    return;
  }
  const ok = await confirmDialog(
    `Clear this board? ${total} item${total === 1 ? "" : "s"} will be removed. ` +
    "Ctrl+Z undoes them one at a time afterward."
  );
  if (!ok) return;
  try {
    for (const kind of ["node", "sketch", "object"]) {
      const { base, list, payload } = WB_KIND_INFO[kind];
      for (const item of [...(wbState[list] || [])]) {
        await apiJson(`${base}/${item.id}`, { method: "DELETE" });
        wbPushUndo({ action: "delete", kind, payload: payload(item) });
      }
      wbState[list] = [];
    }
    wbSelectedItem = null;
    wbScheduleRender();
    await refreshBoardList();
    toast("Board cleared.");
  } catch {
    toast("Couldn't clear the whole board — reloading to show what's left.", true);
    await fetchWhiteboardState();
    wbScheduleRender();
  }
}

// --- Whiteboard export (asked for directly: "a way to screen clip a or a
// selected area and export as an image/pdf/svg etc") -----------------------
//
// No marquee/multi-select exists yet (HANDOVER's own open list), so "a
// selected area" becomes two concrete scopes instead: what's currently
// framed on screen (the literal "screen clip" reading), or the whole board
// regardless of pan/zoom. Both are built the same way — as a real SVG
// string, sized to board-space coordinates — which then serves all three
// formats: written out directly for .svg, rasterized through an off-screen
// <canvas> for .png, and for PDF, handed to the browser's own Print →
// "Save as PDF" rather than hand-rolling PDF bytes, which is what every
// pure-client web app already does for this and needs no library to do.
function wbSvgEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// A rough character-count wrap — no live font metrics are available while
// building a string that isn't in the DOM yet. Good enough for a legible
// label in an export, not typeset text. `maxLines` caps height (a card's
// own export label is deliberately short; a text box gets more room).
function wbSvgWrapLines(text, maxWidth, maxLines = 6, charWidth = 7) {
  const charsPerLine = Math.max(10, Math.floor(maxWidth / charWidth));
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = (line + " " + word).trim();
    if (next.length > charsPerLine && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function wbSvgText(lines, x, y, { fontSize = 13, fill = "#1f2430", lineHeight } = {}) {
  const dy = lineHeight || fontSize + 3;
  const tspans = lines
    .map((l, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : dy}">${wbSvgEscape(l)}</tspan>`)
    .join("");
  return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${fontSize}" fill="${fill}">${tspans}</text>`;
}

function wbSvgWrappedText(text, x, y, maxWidth) {
  return wbSvgText(wbSvgWrapLines(text, maxWidth), x, y);
}

// The board's full extent — every card and sketch, with padding — computed
// from what's actually rendered (`getBBox`/`offsetWidth`) rather than
// guessed constants, so it stays right if a card's real size ever changes.
function wbBoardBounds() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of wbState.nodes) {
    const el = document.querySelector(`.node-card[data-id="${node.id}"]`);
    const w = el ? el.offsetWidth : 250;
    const h = el ? el.offsetHeight : 150;
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + w);
    maxY = Math.max(maxY, node.y + h);
  }
  for (const sketch of wbState.sketches) {
    const el = document.querySelector(`.sketch-group[data-id="${sketch.id}"]`);
    if (!el) continue;
    try {
      const bbox = el.getBBox();
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    } catch {
      /* getBBox throws on an element the browser hasn't laid out yet */
    }
  }
  for (const obj of wbState.objects || []) {
    minX = Math.min(minX, obj.x);
    minY = Math.min(minY, obj.y);
    maxX = Math.max(maxX, obj.x + obj.width);
    maxY = Math.max(maxY, obj.y + obj.height);
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, width: 800, height: 600 };
  const pad = 60;
  return {
    minX: minX - pad,
    minY: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

//: Bounds of the current selection — asked for directly ("an export selection
//: feature"). Reuses `wbSelectionEntries()` (already shared by
//: align/distribute/nudge) for a real multi-selection; a lone
//: `wbSelectedItem` falls back to `wbItemBBox` directly since that path
//: never populates `wbMultiSelection`. A link sketch has no bbox of its
//: own (`wbItemBBox` returns null for one) — `null` here means "nothing
//: exportable selected", which the export menu's own gating already checks.
function wbSelectionBounds() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const boxes = wbMultiSelection.size > 0
    ? wbSelectionEntries().map((e) => e.bbox)
    : wbSelectedItem
      ? [wbItemBBox(wbSelectedItem.kind, (wbState[WB_LIST_BY_KIND[wbSelectedItem.kind]] || []).find((i) => i.id === wbSelectedItem.id))].filter(Boolean)
      : [];
  for (const box of boxes) {
    minX = Math.min(minX, box.minX);
    minY = Math.min(minY, box.minY);
    maxX = Math.max(maxX, box.maxX);
    maxY = Math.max(maxY, box.maxY);
  }
  if (!Number.isFinite(minX)) return null;
  const pad = 40;
  return { minX: minX - pad, minY: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
}

// What's actually framed on screen right now, in board-space coordinates —
// the inverse of the pan/zoom transform the container itself carries.
function wbVisibleBounds() {
  const container = document.getElementById("whiteboard-container");
  const transform = d3.zoomTransform(container);
  const rect = container.getBoundingClientRect();
  return {
    minX: -transform.x / transform.k,
    minY: -transform.y / transform.k,
    width: rect.width / transform.k,
    height: rect.height / transform.k,
  };
}

//: Which items an "export selection" pass should include — everything else
//: in `wbBuildExportSvg` only needs a membership check, so this is the one
//: place that reads `wbSelectedItem`/`wbMultiSelection` for it. `null` (not
//: scope "selection") means "no filter", i.e. every other scope keeps
//: exporting the whole board it always did.
function wbSelectedKeys() {
  if (wbMultiSelection.size > 0) return wbMultiSelection;
  if (wbSelectedItem) return new Set([wbMultiKey(wbSelectedItem.kind, wbSelectedItem.id)]);
  return new Set();
}

function wbBuildExportSvg(scope) {
  const bounds = scope === "selection" ? wbSelectionBounds()
    : scope === "visible" ? wbVisibleBounds() : wbBoardBounds();
  const { minX, minY, width, height } = bounds || wbBoardBounds();
  const onlyKeys = scope === "selection" ? wbSelectedKeys() : null;
  const container = document.getElementById("whiteboard-container");
  const bgColor = container ? getComputedStyle(container).backgroundColor : "#1b1f2c";

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" ` +
      `width="${Math.round(width)}" height="${Math.round(height)}">`,
    `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${bgColor}" />`,
  ];

  // Sketches already exist as real SVG — cloned as-is rather than
  // reinterpreted, so a stroke's colour/width/opacity (including the
  // highlighter's own translucency) survives into the export untouched.
  for (const sketch of wbState.sketches) {
    if (onlyKeys && !onlyKeys.has(wbMultiKey("sketch", sketch.id))) continue;
    const el = document.querySelector(`.sketch-group[data-id="${sketch.id}"]`);
    if (!el) continue;
    const clone = el.cloneNode(true);
    clone.removeAttribute("class");
    parts.push(clone.outerHTML);
  }

  // Cards are the HTML layer, which doesn't survive SVG rasterization the
  // way real SVG does — a simplified rect + label stands in for the live
  // card, matching what the live card itself shows (raw content, truncated;
  // it has no private-note masking of its own to match either).
  const exportEntriesById = new Map(allEntries.map((e) => [String(e.id), e]));
  for (const node of wbState.nodes) {
    if (onlyKeys && !onlyKeys.has(wbMultiKey("node", node.id))) continue;
    const entry = exportEntriesById.get(String(node.entry_id));
    const el = document.querySelector(`.node-card[data-id="${node.id}"]`);
    const w = el ? el.offsetWidth : 250;
    const h = el ? el.offsetHeight : 150;
    const label = entry ? notePreviewText(entry.content || "").slice(0, 160) : `Note ${node.entry_id}`;
    parts.push(`<g transform="translate(${node.x}, ${node.y})">`);
    parts.push(
      `<rect width="${w}" height="${h}" rx="10" fill="#ffffffcc" stroke="#8888aa" stroke-width="1.5" />`
    );
    parts.push(wbSvgWrappedText(label || "Empty note", 14, 24, w - 28));
    parts.push("</g>");
  }

  // Images and text boxes — the two new object kinds, neither tied to a
  // note. An <image> element rasterizes cleanly since the URL is always
  // same-origin (isRenderableUrl already guarantees that server-side); a
  // text box gets the same simplified rect+label treatment a card does,
  // but honours the colour/size it was actually given rather than a fixed
  // look, since those are the whole point of a text box.
  for (const obj of wbState.objects || []) {
    if (onlyKeys && !onlyKeys.has(wbMultiKey("object", obj.id))) continue;
    parts.push(`<g transform="translate(${obj.x}, ${obj.y})">`);
    if (obj.kind === "image" && obj.data.url) {
      // `mediaSrc`, not the bare url: rasterizing this SVG loads it through
      // a plain `<img>` (see `wbRasterizeSvg`), which never attaches
      // X-Auth-Token — the same gap that made the image never render on the
      // board itself, here too.
      parts.push(
        `<image href="${wbSvgEscape(mediaSrc(obj.data.url))}" width="${obj.width}" height="${obj.height}" ` +
          `preserveAspectRatio="xMidYMid slice" />`
      );
    } else if (obj.kind === "text") {
      const fontSize = obj.data.font_size || 16;
      const lines = wbSvgWrapLines(obj.data.content || "", obj.width - 20, 20, fontSize * 0.55);
      parts.push(
        wbSvgText(lines, 10, fontSize + 8, {
          fontSize,
          fill: obj.data.color || "#1f2430",
          lineHeight: fontSize * 1.25,
        })
      );
    }
    parts.push("</g>");
  }

  parts.push("</svg>");
  return { svg: parts.join(""), width, height };
}

function wbRasterizeSvg(svgString, width, height, mime) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Couldn't rasterize the board."))),
        mime
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't rasterize the board."));
    };
    img.src = url;
  });
}

async function wbExportSvg(scope) {
  const { svg } = wbBuildExportSvg(scope);
  await saveFile(`whiteboard-${scope}.svg`, new Blob([svg], { type: "image/svg+xml" }));
  toast("Board exported as SVG.");
}

// Shared with the background-image picker above, which inlines the same
// three lines — pulled out here because this is the second call site and a
// third (this one) is exactly when a copy-pasted upload stops being fine.
async function uploadToLibrary(filename, blob) {
  const formData = new FormData();
  formData.append("file", new File([blob], filename, { type: blob.type }));
  return apiJson("/media/upload", {
    method: "POST",
    headers: { "X-Auth-Token": authToken() },
    body: formData,
  });
}

async function wbExportPng(scope) {
  const { svg, width, height } = wbBuildExportSvg(scope);
  const blob = await wbRasterizeSvg(svg, width, height, "image/png");
  const filename = `whiteboard-${scope}.png`;
  await saveFile(filename, blob);
  // Asked for directly: an exported board should show up in the Library's
  // Images gallery, not only as a file on disk that the app has no record
  // of. Best-effort — a failed upload must not make the export itself look
  // like it failed, since the download above already succeeded.
  try {
    await uploadToLibrary(filename, blob);
    toast("Board exported as PNG, and added to your image library.");
  } catch {
    toast("Board exported as PNG.");
  }
}

async function wbExportPdf(scope) {
  const { svg, width, height } = wbBuildExportSvg(scope);
  const blob = await wbRasterizeSvg(svg, width, height, "image/png");
  const url = URL.createObjectURL(blob);
  const win = window.open("", "_blank");
  if (!win) {
    URL.revokeObjectURL(url);
    toast("Allow pop-ups to export as PDF — it opens Print, then Save as PDF.", true);
    return;
  }
  win.document.write(
    `<!doctype html><html><head><title>MemoryMap whiteboard export</title><style>` +
      `@page { margin: 0; } html,body{margin:0;padding:0;background:#fff;}` +
      `img{display:block;width:100%;height:auto;}</style></head>` +
      `<body><img src="${url}" alt="Whiteboard export"></body></html>`
  );
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
  toast('Opened Print — choose "Save as PDF" as the destination.');
}

let wbExportMenuOutsideClick = null;

function wbCloseExportMenu() {
  document.getElementById("wb-export-menu")?.remove();
  if (wbExportMenuOutsideClick) {
    document.removeEventListener("click", wbExportMenuOutsideClick, true);
    wbExportMenuOutsideClick = null;
  }
}

function wbExportBoard() {
  wbCloseExportMenu();
  const button = document.getElementById("wb-export");
  if (!button) return;
  const menu = document.createElement("div");
  menu.id = "wb-export-menu";
  menu.className = "wb-export-menu";
  const rect = button.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

  const addHeading = (text) => {
    const h = document.createElement("div");
    h.className = "wb-export-heading";
    h.textContent = text;
    menu.appendChild(h);
  };
  const addOption = (label, run) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.addEventListener("click", async () => {
      wbCloseExportMenu();
      try {
        await run();
      } catch (err) {
        toast(err.message || "Couldn't export the board.", true);
      }
    });
    menu.appendChild(btn);
  };

  // Asked for directly ("an export selection feature") — only offered when
  // something is actually selected, same reasoning as every other
  // selection-gated control in this toolbar (align/distribute/delete).
  const hasSelection = wbMultiSelection.size > 0 || !!wbSelectedItem;

  addHeading("Image (PNG)");
  if (hasSelection) addOption("Just the selection", () => wbExportPng("selection"));
  addOption("What's on screen now", () => wbExportPng("visible"));
  addOption("The whole board", () => wbExportPng("whole"));
  addHeading("Vector (SVG)");
  if (hasSelection) addOption("Just the selection", () => wbExportSvg("selection"));
  addOption("The whole board", () => wbExportSvg("whole"));
  addHeading("PDF");
  if (hasSelection) addOption("Just the selection, via Print", () => wbExportPdf("selection"));
  addOption("The whole board, via Print", () => wbExportPdf("whole"));

  document.body.appendChild(menu);
  wbExportMenuOutsideClick = (event) => {
    if (!menu.contains(event.target) && event.target !== button) wbCloseExportMenu();
  };
  setTimeout(() => document.addEventListener("click", wbExportMenuOutsideClick, true), 0);
}

async function initWhiteboard() {
  if (wbInitialized) return;
  wbInitialized = true;
  
  const container = d3.select("#whiteboard-container");
  container.call(wbZoom).on("dblclick.zoom", null);
  
  // Toolbar hooks
  document.getElementById("wb-zoom-in").addEventListener("click", () => container.transition().call(wbZoom.scaleBy, 1.2));
  document.getElementById("wb-zoom-out").addEventListener("click", () => container.transition().call(wbZoom.scaleBy, 0.8));
  document.getElementById("wb-zoom-fit").addEventListener("click", () => container.transition().call(wbZoom.transform, d3.zoomIdentity));

  // **An arrow, not the function directly.** `addEventListener` passes the
  // click event as the first argument, which would land in
  // `toggleWhiteboardFullscreen`'s own `force` parameter — a `MouseEvent` is
  // truthy, so `force === undefined` was never true and the toggle could
  // only ever turn full screen *on*. Reported as "I cant exit full screen
  // mode in the whiteboard".
  document.getElementById("wb-fullscreen")?.addEventListener("click", () => toggleWhiteboardFullscreen());
  
  // Sidebar toggling
  const setWbLibraryOpen = (open) => {
    const sidebar = $("whiteboard-sidebar");
    sidebar.classList.toggle("hidden", !open);
    $("wb-add-note")?.classList.toggle("is-on", open);
    if (open) renderWbLibrary();
  };
  $("wb-add-note").addEventListener("click", () => {
    // Toggling on the class rather than reading it back: the panel covers the
    // toggle, so "click it again to close" was not reachable.
    setWbLibraryOpen($("whiteboard-sidebar").classList.contains("hidden"));
  });
  $("wb-library-close")?.addEventListener("click", () => setWbLibraryOpen(false));

  const btnAddSketch = document.getElementById("wb-add-sketch");
  if (btnAddSketch) {
    btnAddSketch.addEventListener("click", () => {
      openSketch();
    });
  }

  const boardSelect = document.getElementById("wb-board-select");
  if (boardSelect) {
    boardSelect.addEventListener("change", async (e) => {
      window.currentBoardId = e.target.value || null;
      await fetchWhiteboardState();
      wbScheduleRender();
      // The background image is stored per board, so switching boards has
      // to re-read it — otherwise the previous board's image stays up.
      wbApplyBgImage();
    });
  }
  $("wb-new-board")?.addEventListener("click", createNewBoard);
  $("wb-rename-board")?.addEventListener("click", renameCurrentBoard);
  $("wb-empty-hint-dismiss")?.addEventListener("click", () => {
    localStorage.setItem("wbEmptyHintDismissed", "1");
    wbHintForcedOpen = false;
    $("wb-empty-hint")?.classList.add("hidden");
  });
  // Asked for directly: a way back after "Don't show this again". Overrides
  // both the dismissed flag and the has-content check below, since without
  // that override this button would do nothing on a board that isn't empty.
  $("wb-help-btn")?.addEventListener("click", () => {
    wbHintForcedOpen = true;
    $("wb-empty-hint")?.classList.remove("hidden");
  });

  // Board background colour, asked for directly — the ambient generative-art
  // canvas showed straight through the board before this (`--wb-board-bg`,
  // declared in :root, is the fix for anyone who never touches the picker).
  // `input` previews live while dragging the swatch; `change` (fires once,
  // on release/close) is what actually persists, so dragging across ten
  // hues doesn't write ten times.
  const bgColorPicker = document.getElementById("wb-bg-color-picker");
  const bgColorReset = document.getElementById("wb-bg-color-reset");
  // The real default (the theme's --modal-bg) as a hex string, read fresh
  // each time rather than cached — the whole point of "reset to theme
  // default" is that it still means the *current* theme after a switch.
  const themeDefaultBoardHex = () => {
    const rgb = getComputedStyle(container.node()).backgroundColor;
    const m = rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);
    return m ? "#" + m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("") : null;
  };
  if (bgColorPicker) {
    const savedBg = localStorage.getItem("wb-bg-color");
    if (savedBg) {
      container.node().style.setProperty("--wb-board-bg", savedBg);
      bgColorPicker.value = savedBg;
    } else {
      // Reflect the real default in the swatch, not an arbitrary placeholder
      // that doesn't match what's on screen.
      const hex = themeDefaultBoardHex();
      if (hex) bgColorPicker.value = hex;
    }
    bgColorPicker.addEventListener("input", (e) => {
      container.node().style.setProperty("--wb-board-bg", e.target.value);
    });
    bgColorPicker.addEventListener("change", (e) => {
      localStorage.setItem("wb-bg-color", e.target.value);
    });
  }
  // Asked for directly: once you've picked a colour there was no way back to
  // the theme's own board colour short of guessing its hex. Clearing the
  // saved override and re-reading the CSS the board falls back to (rather
  // than a hardcoded hex) means this still means "the theme's colour" after
  // a light/dark switch, not just "whatever it happened to be once".
  if (bgColorReset && bgColorPicker) {
    bgColorReset.addEventListener("click", () => {
      localStorage.removeItem("wb-bg-color");
      container.node().style.removeProperty("--wb-board-bg");
      const hex = themeDefaultBoardHex();
      if (hex) bgColorPicker.value = hex;
      toast("Board background reset to the theme default.");
    });
  }

  // Draggable toolbar panels, asked for directly. Only the small ⠿ grip
  // starts a drag — the panels are almost entirely buttons and inputs, so
  // "grab anywhere on the panel" would fight every click they already
  // handle. Clamped to `#library-view-whiteboard`'s own box, which is the
  // visible window for this view (it fills the tab below the header), so a
  // dragged panel stops at the edge instead of sliding out under the tab bar
  // or off the side of the screen.
  function makeWbPanelDraggable(panel, storageKey) {
    const grip = panel.querySelector(".wb-panel-grip");
    const bounds = document.getElementById("library-view-whiteboard");
    if (!grip || !bounds) return;

    function clamp(left, top) {
      const boundsRect = bounds.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const maxLeft = Math.max(0, boundsRect.width - panelRect.width);
      const maxTop = Math.max(0, boundsRect.height - panelRect.height);
      return [Math.min(Math.max(0, left), maxLeft), Math.min(Math.max(0, top), maxTop)];
    }

    function place(left, top) {
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      // The bottom-center panel is horizontally centred via `left: 50%` +
      // `transform: translateX(-50%)` — a centring trick, not a drag offset.
      // Left uncleared, an explicit `left` still renders shifted left by
      // half the panel's own width, so a drag ends up visibly ~200px from
      // wherever the pointer actually released it (found by measuring, not
      // by reading the CSS — the rendered box and the styled `left` disagreed
      // by exactly panelWidth / 2).
      panel.style.transform = "none";
    }

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const { left, top } = JSON.parse(saved);
        const [cLeft, cTop] = clamp(left, top);
        place(cLeft, cTop);
      } catch {
        // A corrupt saved value is not worth failing over — the panel just
        // keeps its CSS-anchored corner instead.
      }
    }

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    grip.addEventListener("pointerdown", (e) => {
      dragging = true;
      grip.setPointerCapture(e.pointerId);
      grip.classList.add("is-dragging");
      const panelRect = panel.getBoundingClientRect();
      const boundsRect = bounds.getBoundingClientRect();
      // Converts from whichever CSS corner (top-left/top-right/…) the panel
      // started anchored to into an explicit left/top box, so the first drag
      // of a session moves it from wherever it visually is rather than
      // snapping somewhere else first.
      startLeft = panelRect.left - boundsRect.left;
      startTop = panelRect.top - boundsRect.top;
      startX = e.clientX;
      startY = e.clientY;
      place(startLeft, startTop);
      e.preventDefault();
    });

    grip.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const [left, top] = clamp(startLeft + (e.clientX - startX), startTop + (e.clientY - startY));
      place(left, top);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      grip.classList.remove("is-dragging");
      if (e?.pointerId != null) grip.releasePointerCapture?.(e.pointerId);
      localStorage.setItem(
        storageKey,
        JSON.stringify({ left: parseFloat(panel.style.left) || 0, top: parseFloat(panel.style.top) || 0 })
      );
    }
    grip.addEventListener("pointerup", endDrag);
    grip.addEventListener("pointercancel", endDrag);

    // The box can resize (window resize, the library sidebar opening) after
    // a position was saved for a larger one — reclamp so a panel never ends
    // up partly or fully off-screen.
    new ResizeObserver(() => {
      if (!panel.style.left) return;
      const [left, top] = clamp(parseFloat(panel.style.left), parseFloat(panel.style.top));
      place(left, top);
    }).observe(bounds);
  }

  document.querySelectorAll(".whiteboard-floating-panel[data-panel-id]").forEach((panel) => {
    makeWbPanelDraggable(panel, `wb-panel-pos-${panel.dataset.panelId}`);
  });

  // Asked for directly: once a panel's been dragged there was no way back to
  // its default corner short of clearing localStorage by hand. Clears every
  // panel's saved position and its drag-time inline styles (left/top/right/
  // bottom/transform, all set by `place()` above) so each panel's own
  // top-left/top-right/bottom-center CSS class — never removed, only ever
  // overridden by the inline styles — takes back over.
  const resetPanelsBtn = document.getElementById("wb-reset-panels");
  if (resetPanelsBtn) {
    resetPanelsBtn.addEventListener("click", () => {
      document.querySelectorAll(".whiteboard-floating-panel[data-panel-id]").forEach((panel) => {
        localStorage.removeItem(`wb-panel-pos-${panel.dataset.panelId}`);
        panel.style.left = "";
        panel.style.top = "";
        panel.style.right = "";
        panel.style.bottom = "";
        panel.style.transform = "";
      });
      toast("Panel positions reset.");
    });
  }

  // Grid, snap-to-grid and a board background image (all asked for
  // directly). Each is a per-browser display preference like the board
  // colour beside them, so all three live in localStorage rather than
  // costing the notebook a schema column the server would never read.
  const gridSelect = $("wb-grid-select");
  if (gridSelect) {
    gridSelect.value = wbGridType();
    gridSelect.addEventListener("change", (e) => {
      localStorage.setItem("wb-grid", e.target.value);
      wbApplyGrid();
      // Snap only bites while a grid is visible, so the checkbox has to
      // follow the grid going away rather than silently staying "on".
      $("wb-snap-toggle").disabled = e.target.value === "none";
    });
  }
  const snapToggle = $("wb-snap-toggle");
  if (snapToggle) {
    snapToggle.checked = localStorage.getItem("wb-snap") === "on";
    snapToggle.disabled = wbGridType() === "none";
    snapToggle.addEventListener("change", (e) => {
      localStorage.setItem("wb-snap", e.target.checked ? "on" : "off");
    });
  }
  const bgImageInput = $("wb-bg-image-input");
  $("wb-bg-image")?.addEventListener("click", async () => {
    // A background already set means the button's job is to offer removing
    // it — a second "clear it" control for something most boards never use
    // would be permanent clutter on a panel that is already busy.
    if (localStorage.getItem(wbBgImageKey())) {
      if (await confirmDialog("Remove this board's background image?")) {
        localStorage.removeItem(wbBgImageKey());
        wbApplyBgImage();
        toast("Background image removed.");
        return;
      }
      return;
    }
    bgImageInput?.click();
  });
  bgImageInput?.addEventListener("change", async () => {
    const file = bgImageInput.files?.[0];
    bgImageInput.value = "";
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await apiJson("/media/upload", {
        method: "POST",
        headers: { "X-Auth-Token": authToken() },
        body: formData,
      });
      localStorage.setItem(wbBgImageKey(), uploaded.url);
      wbApplyBgImage();
      toast("Background image set.");
    } catch (err) {
      toast(err.message || "Couldn't set that background image.", true);
    }
  });
  wbApplyGrid();
  wbApplyBgImage();

  $("wb-clear-board")?.addEventListener("click", wbClearBoard);
  $("wb-export")?.addEventListener("click", wbExportBoard);

  // Tool Selection
  window.currentTool = "pan";
  let isDrawing = false;
  let currentDrawPath = null;
  let currentDrawData = []; // array of [x, y]
  // Reported directly: a white stroke, hardcoded regardless of theme, on a
  // light-theme board whose background (`--wb-board-bg: var(--modal-bg)`,
  // theme-aware) is itself light — drawing anything was invisible from the
  // first stroke. Defaults to black on light, white on dark, matching
  // whichever the board's own background actually resolves to; a saved
  // choice (persisted the same way the board's own background colour is)
  // always wins over the theme default.
  const savedStroke = localStorage.getItem("wb-stroke-color");
  window.currentStrokeColor =
    savedStroke || (document.documentElement.dataset.mode === "dark" ? "#ffffff" : "#000000");
  // Shared with the mousedown handler below, so the cursor preview drawn
  // here is never a different size than what actually gets drawn. Was a
  // fixed `const` (asked about directly: "does the whiteboard have a tool
  // for adjusting pen size... line/shape width?" — it didn't) — now `let`,
  // driven by `#wb-stroke-width` below, so every closure over this variable
  // (the highlighter's own 4x multiplier, arrowhead length, the saved
  // sketch's own width) picks up a change without needing to be rewired.
  let WB_STROKE_WIDTH = Number(localStorage.getItem("wb-stroke-width")) || 3;
  const strokeWidthInput = document.getElementById("wb-stroke-width");
  const strokeWidthBadge = document.getElementById("wb-stroke-width-badge");
  let strokeWidthBadgeTimer = null;
  function showStrokeWidthBadge() {
    if (!strokeWidthBadge || !strokeWidthInput) return;
    const r = strokeWidthInput.getBoundingClientRect();
    strokeWidthBadge.textContent = `${WB_STROKE_WIDTH}px`;
    strokeWidthBadge.style.left = `${r.left + r.width / 2}px`;
    strokeWidthBadge.style.top = `${r.top - 8}px`;
    strokeWidthBadge.classList.remove("hidden");
    clearTimeout(strokeWidthBadgeTimer);
    strokeWidthBadgeTimer = setTimeout(() => strokeWidthBadge.classList.add("hidden"), 900);
  }
  if (strokeWidthInput) {
    strokeWidthInput.value = String(WB_STROKE_WIDTH);
    strokeWidthInput.addEventListener("input", (e) => {
      WB_STROKE_WIDTH = Number(e.target.value) || 3;
      localStorage.setItem("wb-stroke-width", String(WB_STROKE_WIDTH));
      updateWbCursor();
      showStrokeWidthBadge();
    });
  }

  const toolGroup = document.getElementById("wb-tool-group");
  const colorPicker = document.getElementById("wb-color-picker");
  const arrowStyleSelect = document.getElementById("wb-arrow-style");
  // Live-reported: "I selected the line tool and it still drew with an
  // arrow head." Line and Arrow share this one control (asked for
  // directly, so a plain line *can* carry a head), but they used to share
  // a single `currentArrowStyle` value too — so drawing with Arrow first
  // (default "end") left Line permanently defaulting to an arrowhead as
  // well, since nothing ever reset it. Each tool now keeps its own
  // default (Line: none, Arrow: end) and its own localStorage key; the
  // control itself still reads/writes whichever tool is currently active,
  // via `wbCurrentEndStyleKind`/`wbSetCurrentEndStyle` below.
  window.currentLineEndStyle = localStorage.getItem("wb-line-end-style") || "none";
  window.currentArrowEndStyle = localStorage.getItem("wb-arrow-style") || "end";
  function wbCurrentEndStyleKind() {
    return window.currentTool === "line" ? "line" : "arrow";
  }
  function wbCurrentEndStyle() {
    return wbCurrentEndStyleKind() === "line" ? window.currentLineEndStyle : window.currentArrowEndStyle;
  }
  function wbSetCurrentEndStyle(value) {
    if (wbCurrentEndStyleKind() === "line") {
      window.currentLineEndStyle = value;
      localStorage.setItem("wb-line-end-style", value);
    } else {
      window.currentArrowEndStyle = value;
      localStorage.setItem("wb-arrow-style", value);
    }
  }
  wbRefreshArrowStyleControlRef = () => {
    if (arrowStyleSelect) arrowStyleSelect.value = wbCurrentEndStyle();
  };
  if (arrowStyleSelect) {
    arrowStyleSelect.value = wbCurrentEndStyle();
    arrowStyleSelect.addEventListener("change", (e) => wbSetCurrentEndStyle(e.target.value));
  }

  // Fill/stroke-style controls for the shape tools — asked for directly
  // ("stroke width, style, and colour... fill colour/transparency...
  // options for no border/stroke or background"). Persisted the same way
  // every other drawing preference here already is, so a choice survives a
  // reload instead of resetting to "no fill, solid" every session.
  const fillColorInput = document.getElementById("wb-fill-color");
  const fillOpacityInput = document.getElementById("wb-fill-opacity");
  const fillNoneInput = document.getElementById("wb-fill-none");
  const strokeStyleSelect = document.getElementById("wb-stroke-style");
  const strokeNoneInput = document.getElementById("wb-stroke-none");

  window.currentFillColor = localStorage.getItem("wb-fill-color") || "#3355ff";
  window.currentFillOpacity = Number(localStorage.getItem("wb-fill-opacity") ?? 100);
  window.currentFillNone = localStorage.getItem("wb-fill-none") !== "off"; // default on (no fill)
  window.currentDashStyle = localStorage.getItem("wb-stroke-style") || "solid";
  window.currentStrokeNone = localStorage.getItem("wb-stroke-none") === "on";

  if (fillColorInput) {
    fillColorInput.value = window.currentFillColor;
    fillColorInput.addEventListener("input", (e) => {
      window.currentFillColor = e.target.value;
      localStorage.setItem("wb-fill-color", e.target.value);
    });
  }
  if (fillOpacityInput) {
    fillOpacityInput.value = String(window.currentFillOpacity);
    fillOpacityInput.addEventListener("input", (e) => {
      window.currentFillOpacity = Number(e.target.value);
      localStorage.setItem("wb-fill-opacity", e.target.value);
    });
  }
  if (fillNoneInput) {
    fillNoneInput.checked = window.currentFillNone;
    fillNoneInput.addEventListener("change", (e) => {
      window.currentFillNone = e.target.checked;
      localStorage.setItem("wb-fill-none", e.target.checked ? "on" : "off");
    });
  }
  if (strokeStyleSelect) {
    strokeStyleSelect.value = window.currentDashStyle;
    strokeStyleSelect.addEventListener("change", (e) => {
      window.currentDashStyle = e.target.value;
      localStorage.setItem("wb-stroke-style", e.target.value);
    });
  }
  if (strokeNoneInput) {
    strokeNoneInput.checked = window.currentStrokeNone;
    strokeNoneInput.addEventListener("change", (e) => {
      window.currentStrokeNone = e.target.checked;
      localStorage.setItem("wb-stroke-none", e.target.checked ? "on" : "off");
    });
  }

  // Alignment-guide colours — asked for directly ("colours should be
  // alterable"). `wbAlignGuideColor` already reads localStorage on every
  // guide redraw, so these listeners only need to persist the choice; no
  // live guide is showing while this dropdown is open to also repaint.
  for (const kind of ["edge", "center", "spacing"]) {
    const input = document.getElementById(`wb-guide-color-${kind}`);
    if (!input) continue;
    input.value = wbAlignGuideColor(kind);
    input.addEventListener("input", (e) => {
      localStorage.setItem(`wb-guide-color-${kind}`, e.target.value);
    });
  }

  // The properties panel's own controls — each reads `wbSelectedItem` fresh
  // at change time rather than closing over it, since the panel can stay
  // open across several edits to the same selection.
  function wbSelectedSketchOrNull() {
    if (!wbSelectedItem || wbSelectedItem.kind !== "sketch") return null;
    return wbState.sketches.find((s) => s.id === wbSelectedItem.id) || null;
  }
  function wbSelectedTextObjectOrNull() {
    if (!wbSelectedItem || wbSelectedItem.kind !== "object") return null;
    const obj = wbState.objects?.find((o) => o.id === wbSelectedItem.id);
    return obj && obj.kind === "text" ? obj : null;
  }
  document.getElementById("wb-prop-color")?.addEventListener("change", async (e) => {
    const sketch = wbSelectedSketchOrNull();
    if (sketch) {
      await wbSaveSketchProps(sketch, { color: e.target.value });
      wbScheduleRender();
      return;
    }
    const obj = wbSelectedTextObjectOrNull();
    if (obj) {
      obj.data = { ...obj.data, color: e.target.value };
      await wbSaveObject(obj);
      wbScheduleRender();
    }
  });
  document.getElementById("wb-prop-width")?.addEventListener("change", async (e) => {
    const sketch = wbSelectedSketchOrNull();
    if (!sketch) return;
    const width = Math.max(1, Math.min(40, Number(e.target.value) || 3));
    await wbSaveSketchProps(sketch, { width });
    wbScheduleRender();
  });
  // Start/end cap dropdowns — independently per end (asked for directly),
  // replacing the single shared "which end gets an arrowhead" control.
  // Shared by both: reads the *other* end's current cap first (from
  // whichever field it's actually stored in — the explicit new one, or
  // the legacy `endStyle` for a link that predates it) so changing one end
  // never silently resets the other.
  async function wbSetCap(which, value) {
    const sketch = wbSelectedSketchOrNull();
    if (!sketch) return;
    let linkParsed = null;
    try {
      const candidate = JSON.parse(sketch.data);
      if (candidate && (candidate.type || "").startsWith("link-")) linkParsed = candidate;
    } catch { /* not a link */ }
    if (linkParsed) {
      // A link's caps are computed at render time from `startCap`/`endCap`
      // (`wbLinkPathD`), not baked into a stored path the way a drawn
      // arrow's is — nothing to regenerate, just persist the choice.
      const current = wbLinkCaps(linkParsed);
      current[which] = value;
      await wbSaveSketchProps(sketch, {
        startCap: current.startCap, endCap: current.endCap, endStyle: undefined,
      });
      wbScheduleRender();
      return;
    }
    const parsed = wbSketchParsedData(sketch);
    if (!parsed || !wbSketchIsArrow(parsed.d)) return;
    const current = wbSketchCaps(parsed);
    current[which] = value;
    const headLen = (parsed.width || WB_STROKE_WIDTH) * 4 + 6;
    const newD = wbRegenerateShapeCaps(parsed.d, current.startCap, current.endCap, headLen);
    await wbSaveSketchProps(sketch, { d: newD, startCap: current.startCap, endCap: current.endCap });
    wbScheduleRender();
  }
  document.getElementById("wb-prop-startcap")?.addEventListener("change", (e) => wbSetCap("startCap", e.target.value));
  document.getElementById("wb-prop-endcap")?.addEventListener("change", (e) => wbSetCap("endCap", e.target.value));
  document.getElementById("wb-prop-bg")?.addEventListener("change", async (e) => {
    const obj = wbSelectedTextObjectOrNull();
    if (!obj) return;
    obj.data = { ...obj.data, bg: e.target.value };
    document.getElementById("wb-prop-bg-none").checked = false;
    await wbSaveObject(obj);
    wbScheduleRender();
  });
  document.getElementById("wb-prop-bg-none")?.addEventListener("change", async (e) => {
    const obj = wbSelectedTextObjectOrNull();
    if (!obj) return;
    // "transparent" is a real, distinguishable value — `bg || ""` (the
    // render path) would otherwise fall back to the CSS default translucent
    // panel look for an empty string, not the "no fill at all" this asks
    // for. Asked for directly: "options for no border/stroke or background".
    obj.data = { ...obj.data, bg: e.target.checked ? "transparent" : document.getElementById("wb-prop-bg").value };
    await wbSaveObject(obj);
    wbScheduleRender();
  });
  document.getElementById("wb-prop-border")?.addEventListener("change", async (e) => {
    const obj = wbSelectedTextObjectOrNull();
    if (!obj) return;
    obj.data = { ...obj.data, border_color: e.target.value };
    document.getElementById("wb-prop-border-none").checked = false;
    await wbSaveObject(obj);
    wbScheduleRender();
  });
  document.getElementById("wb-prop-border-none")?.addEventListener("change", async (e) => {
    const obj = wbSelectedTextObjectOrNull();
    if (!obj) return;
    obj.data = { ...obj.data, border_color: e.target.checked ? "transparent" : document.getElementById("wb-prop-border").value };
    await wbSaveObject(obj);
    wbScheduleRender();
  });
  document.getElementById("wb-prop-dash")?.addEventListener("change", async (e) => {
    const sketch = wbSelectedSketchOrNull();
    if (!sketch) return;
    await wbSaveSketchProps(sketch, { dash: e.target.value === "solid" ? undefined : e.target.value });
    wbScheduleRender();
  });
  document.getElementById("wb-prop-nostroke")?.addEventListener("change", async (e) => {
    const sketch = wbSelectedSketchOrNull();
    if (!sketch) return;
    await wbSaveSketchProps(sketch, { noStroke: e.target.checked || undefined });
    wbScheduleRender();
  });
  document.getElementById("wb-prop-shapefill")?.addEventListener("change", async (e) => {
    const sketch = wbSelectedSketchOrNull();
    if (!sketch) return;
    document.getElementById("wb-prop-shapefill-on").checked = true;
    document.getElementById("wb-prop-shapefill").disabled = false;
    await wbSaveSketchProps(sketch, { fill: e.target.value, fillOpacity: 1 });
    wbScheduleRender();
  });
  document.getElementById("wb-prop-shapefill-on")?.addEventListener("change", async (e) => {
    const sketch = wbSelectedSketchOrNull();
    if (!sketch) return;
    document.getElementById("wb-prop-shapefill").disabled = !e.target.checked;
    await wbSaveSketchProps(sketch, { fill: e.target.checked ? document.getElementById("wb-prop-shapefill").value : undefined });
    wbScheduleRender();
  });
  document.getElementById("wb-prop-fontsize")?.addEventListener("change", async (e) => {
    const obj = wbSelectedTextObjectOrNull();
    if (!obj) return;
    const fontSize = Math.max(8, Math.min(200, Number(e.target.value) || 16));
    obj.data = { ...obj.data, font_size: fontSize };
    await wbSaveObject(obj);
    wbScheduleRender();
  });
  document.getElementById("wb-multi-group")?.addEventListener("click", wbGroupSelection);
  document.getElementById("wb-multi-ungroup")?.addEventListener("click", wbUngroupSelection);
  document.getElementById("wb-align-left")?.addEventListener("click", () => wbAlignSelection("left"));
  document.getElementById("wb-align-hcenter")?.addEventListener("click", () => wbAlignSelection("hcenter"));
  document.getElementById("wb-align-right")?.addEventListener("click", () => wbAlignSelection("right"));
  document.getElementById("wb-align-top")?.addEventListener("click", () => wbAlignSelection("top"));
  document.getElementById("wb-align-vcenter")?.addEventListener("click", () => wbAlignSelection("vcenter"));
  document.getElementById("wb-align-bottom")?.addEventListener("click", () => wbAlignSelection("bottom"));
  document.getElementById("wb-distribute-h")?.addEventListener("click", () => wbDistributeSelection("horizontal"));
  document.getElementById("wb-distribute-v")?.addEventListener("click", () => wbDistributeSelection("vertical"));
  document.getElementById("wb-extract-notes")?.addEventListener("click", wbExtractNotes);
  document.getElementById("wb-mindmap-tree")?.addEventListener("click", () => {
    if (wbSelectedItem?.kind === "node") wbArrangeMindMap(wbSelectedItem.id, "tree");
  });
  document.getElementById("wb-mindmap-radial")?.addEventListener("click", () => {
    if (wbSelectedItem?.kind === "node") wbArrangeMindMap(wbSelectedItem.id, "radial");
  });

  const containerEl = document.getElementById("whiteboard-container");
  const undoBtn = document.getElementById("wb-undo");

  function updateWbCursor() {
    containerEl.setAttribute("data-current-tool", window.currentTool);
    containerEl.style.cursor = wbCursorForTool(window.currentTool, window.currentStrokeColor, WB_STROKE_WIDTH);
  }

  // The six shape tools folded into the toolbar's own dropdown — asked for
  // directly ("the tool bar is getting quite long"). Kept as one list so
  // the toggle button's own icon/active-state and the arrow-style control's
  // relevance can both key off it without drifting apart.
  const WB_SHAPE_TOOLS = new Set(["line", "arrow", "rect", "circle", "triangle", "diamond"]);
  let lastShapeTool = "line"; // what a plain click on the toggle (not the caret) selects
  const shapeToggle = document.getElementById("wb-shape-toggle");
  const shapeToggleIcon = document.getElementById("wb-shape-toggle-icon");
  const shapeMenu = document.getElementById("wb-shape-menu");

  // Same dropdown pattern, for the two selection tools — asked for directly
  // ("have the selection tools as their own dropdown... like with the
  // shapes and lines").
  const WB_SELECT_TOOLS = new Set(["select", "lasso"]);
  let lastSelectTool = "select"; // what a plain click on the toggle (not the caret) selects
  const selectToggle = document.getElementById("wb-select-toggle");
  const selectToggleIcon = document.getElementById("wb-select-toggle-icon");
  const selectMenu = document.getElementById("wb-select-menu");

  // The one place a tool switch happens, so the toolbar click and the
  // keyboard shortcuts below can never drift out of sync with each other.
  function selectWbTool(tool) {
    window.currentTool = tool;
    if (toolGroup) {
      toolGroup.querySelectorAll("button[data-tool]").forEach((b) => {
        b.classList.toggle("active", b.dataset.tool === tool);
      });
    }
    if (tool !== "pan") {
      container.on(".zoom", null); // disable zoom-drag so it can't fight drawing
    } else {
      container.call(wbZoom).on("dblclick.zoom", null);
    }
    // The toggle shows whichever shape is actually active (and reads as
    // "on" the same way any other tool button does) instead of a fixed
    // icon — picking "circle" from the menu should look exactly like
    // picking "circle" used to when it was its own top-level button.
    if (shapeToggle && WB_SHAPE_TOOLS.has(tool)) {
      lastShapeTool = tool;
      const chosen = shapeMenu?.querySelector(`button[data-tool="${tool}"] svg`);
      if (chosen && shapeToggleIcon) shapeToggleIcon.innerHTML = chosen.innerHTML;
      shapeToggle.classList.add("active");
    } else if (shapeToggle) {
      shapeToggle.classList.remove("active");
    }
    if (shapeMenu && shapeToggle) wbCloseDockedMenu(shapeMenu, shapeToggle);
    if (selectToggle && WB_SELECT_TOOLS.has(tool)) {
      lastSelectTool = tool;
      const chosen = selectMenu?.querySelector(`button[data-tool="${tool}"] svg`);
      if (chosen && selectToggleIcon) selectToggleIcon.innerHTML = chosen.innerHTML;
      selectToggle.classList.add("active");
    } else if (selectToggle) {
      selectToggle.classList.remove("active");
    }
    if (selectMenu && selectToggle) wbCloseDockedMenu(selectMenu, selectToggle);
    wbRefreshArrowStyleControlRef?.();
    updateWbCursor();
  }

  wbSelectToolRef = selectWbTool;

  if (toolGroup) {
    toolGroup.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-tool]");
      if (btn) selectWbTool(btn.dataset.tool);
    });
  }

  // Docked as a sidebar, the toolbar panel scrolls (`overflow-y: auto`, so a
  // tall tool column fits above the canvas) — three attempts at this,
  // reported directly each time: (1) CSS-only positioning was clipped by
  // that same overflow (setting only `overflow-y` coerces `overflow-x` to
  // `auto` too, clipping both axes — a real CSS rule, not a bug in that one
  // declaration). (2) `position: fixed` should escape an ancestor's overflow
  // entirely, but this panel's `.glass` class sets `backdrop-filter`, which —
  // like `transform`/`filter` — creates a new containing block for fixed
  // descendants and traps them right back inside it. (3) toggling the whole
  // panel's `overflow` to `visible` while a menu was open avoided the clip,
  // but also uncapped the tool column's own `max-height` for as long as the
  // menu stayed open, spilling tools out past the panel's bottom edge with
  // no scrollbar to reach them.
  //
  // The only thing that both escapes the clip *and* leaves the scrolling
  // tool column alone is not being inside it: the open menu is reparented to
  // <body> (remembering where it came from, to put it back on close) and
  // positioned from the toggle's own `getBoundingClientRect()`, same as any
  // popover library would. Its own click listener below (rather than relying
  // on bubbling to #wb-tool-group's delegated one) is what makes that safe —
  // a tool button click needs to work identically whether the menu is
  // sitting in its normal spot (bottom-docked) or reparented to <body>
  // (side-docked, open).
  function wbOpenDockedMenu(menu, toggle) {
    menu.classList.remove("hidden");
    toggle.setAttribute("aria-expanded", "true");
    const panel = toggle.closest(".whiteboard-floating-panel");
    if (panel?.dataset.dock === "side" && !menu._wbHome) {
      menu._wbHome = { parent: menu.parentNode, next: menu.nextSibling };
      document.body.appendChild(menu);
      const toggleRect = toggle.getBoundingClientRect();
      menu.style.position = "fixed";
      menu.style.left = `${toggleRect.right + 8}px`;
      menu.style.top = `${toggleRect.top}px`;
      menu.style.bottom = "auto";
      menu.style.transform = "none";
      menu.style.zIndex = "200";
      // The menu can be bigger than the toggle it opened from — the shape
      // menu's fill/stroke/guide-colour rows run well past the toolbar's
      // own height, and a toggle near the bottom of a tall docked column
      // put `top: toggleRect.top` most of the way down the screen already.
      // Reported directly ("go out of the window"). Clamped against the
      // real viewport rather than just the toggle's position — measured
      // after being placed, since its actual rendered size isn't known
      // until it's in the DOM and visible.
      const margin = 8;
      const menuRect = menu.getBoundingClientRect();
      if (menuRect.right > window.innerWidth - margin) {
        menu.style.left = `${Math.max(margin, window.innerWidth - menuRect.width - margin)}px`;
      }
      if (menuRect.bottom > window.innerHeight - margin) {
        menu.style.top = `${Math.max(margin, window.innerHeight - menuRect.height - margin)}px`;
      }
    }
  }

  function wbCloseDockedMenu(menu, toggle) {
    menu.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
    if (menu._wbHome) {
      menu._wbHome.parent.insertBefore(menu, menu._wbHome.next);
      menu._wbHome = null;
      menu.style.position = "";
      menu.style.left = "";
      menu.style.top = "";
      menu.style.bottom = "";
      menu.style.transform = "";
      menu.style.zIndex = "";
    }
  }

  // Asked for directly: a plain click/tap on the toggle's icon selects the
  // tool it's already showing (matching every other toolbar button, and
  // matching what the toggle looks like it should do). The picker only
  // opens from the caret, a right-click, a double-click, or — touch has
  // neither of those — holding the tool down.
  function wbWireToggleGestures(toggle, menu, getLastTool) {
    if (!toggle || !menu) return;
    const picker = toggle.parentElement; // #wb-shape-picker / #wb-select-picker
    let holdTimer = null;
    let suppressClick = false; // a long-press's own release still fires a click

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      if (e.target.closest(".wb-shape-caret")) {
        if (menu.classList.contains("hidden")) wbOpenDockedMenu(menu, toggle);
        else wbCloseDockedMenu(menu, toggle);
      } else {
        selectWbTool(getLastTool());
      }
    });
    toggle.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      wbOpenDockedMenu(menu, toggle);
    });
    toggle.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      wbOpenDockedMenu(menu, toggle);
    });
    toggle.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "touch") return;
      holdTimer = setTimeout(() => {
        holdTimer = null;
        suppressClick = true;
        wbOpenDockedMenu(menu, toggle);
      }, 500);
    });
    const cancelHold = () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
    };
    toggle.addEventListener("pointerup", cancelHold);
    toggle.addEventListener("pointercancel", cancelHold);
    toggle.addEventListener("pointerleave", cancelHold);

    // Handled directly rather than relying on the click bubbling up to
    // #wb-tool-group's own delegated listener: once open+side-docked, the
    // menu is reparented to <body> (see wbOpenDockedMenu) and is no longer
    // a descendant of #wb-tool-group at all, so that bubbling path stops
    // reaching it. stopPropagation here is what it is safe now, unlike the
    // old bottom-docked-only version of this handler — this is the only
    // listener that will ever see the click, in either dock mode.
    menu.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-tool]");
      if (btn) {
        e.stopPropagation();
        selectWbTool(btn.dataset.tool);
      }
    });
    document.addEventListener("click", (e) => {
      if (!menu.classList.contains("hidden") && !picker.contains(e.target) && !menu.contains(e.target)) {
        wbCloseDockedMenu(menu, toggle);
      }
    });
  }

  wbWireToggleGestures(shapeToggle, shapeMenu, () => lastShapeTool);
  wbWireToggleGestures(selectToggle, selectMenu, () => lastSelectTool);

  // Asked for directly: the toolbar should be adjustable as a sidebar, not
  // only a bottom bar. `data-dock` drives the CSS (row vs. column layout,
  // which edge it's pinned to); persisted so the choice survives a reload
  // the same way panel positions already do.
  const toolsPanel = document.getElementById("wb-tools-panel");
  const dockToggle = document.getElementById("wb-dock-toggle");
  if (toolsPanel && dockToggle) {
    const applyDock = (dock) => {
      toolsPanel.dataset.dock = dock;
      dockToggle.title = dock === "bottom" ? "Dock as a sidebar" : "Dock as a bottom bar";
    };
    applyDock(localStorage.getItem("wb-toolbar-dock") || "bottom");
    dockToggle.addEventListener("click", () => {
      const next = toolsPanel.dataset.dock === "bottom" ? "side" : "bottom";
      localStorage.setItem("wb-toolbar-dock", next);
      applyDock(next);
    });
  }

  if (colorPicker) {
    colorPicker.value = window.currentStrokeColor;
    colorPicker.addEventListener("change", (e) => {
      window.currentStrokeColor = e.target.value;
      localStorage.setItem("wb-stroke-color", e.target.value);
      updateWbCursor();
    });
  }

  if (undoBtn) {
    undoBtn.disabled = true;
    undoBtn.addEventListener("click", wbUndo);
  }
  const redoBtn = document.getElementById("wb-redo");
  if (redoBtn) {
    redoBtn.disabled = true;
    redoBtn.addEventListener("click", wbRedo);
  }

  // Keyboard shortcuts, asked for as part of the wider usability pass: a
  // toolbar of eight icon buttons is not obviously faster than the tool you
  // already have your hand on, and every serious drawing app (Figma,
  // Excalidraw, tldraw) uses this exact letter set for exactly that reason —
  // muscle memory transfers in, rather than having to be learned from
  // scratch. Guarded to the whiteboard sub-tab and away from anything with
  // its own idea of what typing means (an input, a textarea, a
  // contenteditable note), the same guard the app's other global shortcuts
  // already use.
  const WB_TOOL_KEYS = {
    v: "pan",
    h: "pan",
    s: "select",
    k: "lasso",
    p: "draw",
    m: "highlighter",
    l: "line",
    a: "arrow",
    r: "rect",
    o: "circle",
    g: "triangle",
    d: "diamond",
    t: "text",
    e: "eraser",
    b: "bucket",
    x: "delete",
  };
  document.addEventListener("keydown", (e) => {
    const view = document.getElementById("library-view-whiteboard");
    if (!view || view.classList.contains("hidden")) return;
    const tag = (document.activeElement?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) return;
    if (e.key === "Escape") {
      clearWbSelection();
      selectWbTool("pan");
      return;
    }
    // Delete/Backspace with a selection — the other half of Select as a
    // real tool: previously the only way to delete anything was switching
    // to the Delete tool and clicking it.
    // wbMultiSelection alongside wbSelectedItem: deleteWbSelection() already
    // handles a marquee multi-select correctly, but this guard only ever
    // checked the single-item variable - the two are mutually exclusive by
    // construction, so a multi-selection left this false and Delete/
    // Backspace silently did nothing. Reported directly.
    if ((e.key === "Delete" || e.key === "Backspace") && (wbSelectedItem || wbMultiSelection.size > 0)) {
      e.preventDefault();
      deleteWbSelection();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      wbUndo();
      return;
    }
    // Both common redo chords: Ctrl+Shift+Z (the sketch pad's own
    // convention) and Ctrl+Y (Windows' more familiar one).
    if (
      (e.ctrlKey || e.metaKey) &&
      ((e.shiftKey && e.key.toLowerCase() === "z") || (!e.shiftKey && e.key.toLowerCase() === "y"))
    ) {
      e.preventDefault();
      wbRedo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "c") {
      if (wbCopySelection()) e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "x") {
      if (wbCutSelection()) e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "v") {
      e.preventDefault();
      wbPasteClipboard();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "g") {
      e.preventDefault();
      wbUngroupSelection();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "g") {
      e.preventDefault();
      wbGroupSelection();
      return;
    }
    // Mind-mapping's keyboard-driven branch entry (item 25's second piece,
    // asked for directly): Tab adds a linked child of the selected card,
    // Enter adds a sibling. The actual ergonomic difference between "a
    // whiteboard you can draw a mind map on" and "a mind-mapping tool" —
    // dragging cards one at a time to fake this defeats the point of
    // having it. Guarded to a single selected *card* — a sketch or object
    // has no "branch" of its own to add one to.
    if (e.key === "Tab" && wbSelectedItem?.kind === "node") {
      e.preventDefault();
      wbMindMapAddChild(wbSelectedItem.id);
      return;
    }
    if (e.key === "Enter" && wbSelectedItem?.kind === "node") {
      e.preventDefault();
      wbMindMapAddSibling(wbSelectedItem.id);
      return;
    }
    // Arrow-key nudge, asked for directly. Grid step while snap is on (the
    // nudge should land on the same grid a drag would), else 1px/10px —
    // Shift for the bigger jump, the same convention a slider's own arrow
    // keys use elsewhere in this app.
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) &&
      (wbSelectedItem || wbMultiSelection.size > 0)
    ) {
      e.preventDefault();
      const step = wbSnapOn() ? WB_GRID_SPACING : e.shiftKey ? 10 : 1;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      wbNudgeSelection(dx, dy);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser/OS shortcuts alone
    const mapped = WB_TOOL_KEYS[e.key.toLowerCase()];
    if (mapped) {
      if (mapped !== "select") clearWbSelection(); // switching away from Select drops it
      selectWbTool(mapped);
    }
  });

  selectWbTool("pan"); // the initial state

  // Drawing event handlers on the SVG itself or container
  const svgCanvas = document.getElementById("wb-svg-layer");
  
  function getLogicalMouse(e) {
    const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
    const rect = svgCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - transform.x) / transform.k;
    const y = (e.clientY - rect.top - transform.y) / transform.k;
    return [x, y];
  }
  
  // The eraser doesn't draw — it deletes whatever the pointer crosses while
  // held, which is renderWhiteboard's job (it owns the sketch/node elements
  // this has to hit-test against). All this needs to track is "is the
  // button currently down", on the container so it works over both the SVG
  // sketch layer and the HTML card layer.
  // Pointer events, not mouse events: they unify mouse/touch/pen into one
  // stream, which is what lets a finger draw, erase and pan here at all —
  // touch never dispatches "mouse*" events reliably, and never dispatches
  // them for a stylus. `touch-action: none` on .whiteboard-container (CSS)
  // is the other half of this: without it the browser eats the gesture for
  // page-scroll before a single pointer event reaches here.
  containerEl.addEventListener("pointerdown", (e) => {
    if (window.currentTool === "eraser") {
      wbErasing = true;
      // Reported directly: "with the eraser, I can't touch and drag to
      // delete items" (the pen works fine touch-dragged the same way).
      // Touch — unlike a mouse — implicitly captures the pointer to
      // whatever element received this pointerdown, so a dragging finger
      // never fires `pointerenter` on the *other* sketches/cards it passes
      // over; the eraser's per-element `pointerenter` handlers (below) can
      // only ever catch the one thing first touched. Releasing capture
      // explicitly restores normal per-element pointer events for the rest
      // of the gesture, and `pointermove` here (coordinate-based, not
      // target-based) is the second half — it doesn't depend on capture
      // behaving correctly at all, so it also covers browsers/pens where
      // pointerenter is delivered unreliably during a fast drag.
      e.target.releasePointerCapture?.(e.pointerId);
    }
  });
  window.addEventListener("pointerup", () => {
    wbErasing = false;
  });
  containerEl.addEventListener("pointermove", (e) => {
    if (window.currentTool !== "eraser" || !wbErasing) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const sketchEl = el?.closest(".sketch-group");
    if (sketchEl) {
      const item = wbState.sketches.find((s) => s.id === Number(sketchEl.dataset.id));
      if (item) wbDeleteSketchRef?.(item);
      return;
    }
    const cardEl = el?.closest(".node-card");
    if (cardEl) {
      const item = wbState.nodes.find((n) => n.id === Number(cardEl.dataset.id));
      if (item) wbDeleteNodeRef?.(item);
      return;
    }
    const objEl = el?.closest(".wb-object");
    if (objEl) {
      const item = (wbState.objects || []).find((o) => o.id === Number(objEl.dataset.id));
      if (item) wbDeleteObjectRef?.(item);
    }
  });
  // Clicking empty canvas with Select active clears the selection — every
  // card/sketch's own click handler calls stopPropagation() under Select,
  // so a click that reaches here was never on an item. A completed marquee
  // drag (below) also ends on empty canvas, which fires this same native
  // `click` right afterward (unlike d3.drag, a plain addEventListener drag
  // gets no automatic click-suppression) — `wbMarqueeJustSelected` is the
  // one-shot flag that stops it from wiping out the selection the marquee
  // just made.
  containerEl.addEventListener("click", (e) => {
    if (window.currentTool === "select" || window.currentTool === "lasso") {
      if (wbMarqueeJustSelected) {
        wbMarqueeJustSelected = false;
      } else {
        clearWbSelection();
      }
    }
    // A text box is placed by clicking, not dragged like a shape — it has
    // no natural "size while dragging" the way a rect does, so click-to-drop
    // at a sensible default size (typed into afterward) is the same model
    // OneNote and every sticky-note tool already use.
    // No `e.target` check: like the Select-clear branch above, this relies
    // on an item's own click handler having already called stopPropagation()
    // if the click actually landed on a card/sketch/object — a click that
    // reaches here bubbled up from truly empty canvas either way.
    if (window.currentTool === "text") {
      const [x, y] = getLogicalMouse(e);
      wbCreateTextBox(x, y);
    }
  });

  // Rectangle marquee select — reported directly ("area select... missing").
  // Only engages when the pointerdown target is genuinely empty canvas: a
  // card/sketch/object's own drag already claims the gesture otherwise (the
  // node/object drags' `.filter()`, the sketch drag's own tool check), so
  // checking the target here is enough without a second stopPropagation
  // dance.
  function wbIsEmptyCanvasTarget(target) {
    return !target.closest?.(".node-card, .sketch-group, .wb-object");
  }
  function rectsIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }
  let wbMarqueeStart = null;
  let wbMarqueeEl = null;
  let wbMarqueeJustSelected = false;
  containerEl.addEventListener("pointerdown", (e) => {
    if (window.currentTool !== "select" || !wbIsEmptyCanvasTarget(e.target)) return;
    const [x, y] = getLogicalMouse(e);
    wbMarqueeStart = { x, y, shiftKey: e.shiftKey };
    wbMarqueeEl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    wbMarqueeEl.setAttribute("class", "wb-marquee");
    wbMarqueeEl.setAttribute("x", x);
    wbMarqueeEl.setAttribute("y", y);
    wbMarqueeEl.setAttribute("width", 0);
    wbMarqueeEl.setAttribute("height", 0);
    document.getElementById("wb-zoom-group").appendChild(wbMarqueeEl);
  });
  containerEl.addEventListener("pointermove", (e) => {
    if (!wbMarqueeStart) return;
    const [x, y] = getLogicalMouse(e);
    const mx = Math.min(wbMarqueeStart.x, x), my = Math.min(wbMarqueeStart.y, y);
    const w = Math.abs(x - wbMarqueeStart.x), h = Math.abs(y - wbMarqueeStart.y);
    wbMarqueeEl.setAttribute("x", mx);
    wbMarqueeEl.setAttribute("y", my);
    wbMarqueeEl.setAttribute("width", w);
    wbMarqueeEl.setAttribute("height", h);
  });
  // Anchor points weren't discoverable until a link drag was already under
  // way — asked for directly: "when I hover over objects, their anchor
  // points should display... so I can connect them." A plain hover with a
  // link-type tool selected, no drag started yet, now shows the same 8
  // fixed-point hints the in-progress drag already draws (`wbShowAnchorHints`,
  // shared so the two can't drift visually apart). Skips while an actual
  // link drag is running (`wbLinkDragActive`) — that path already redraws
  // hints every frame from the live pointer position, and this would just
  // be a second, slightly-stale write to the same DOM nodes.
  containerEl.addEventListener("pointermove", (e) => {
    if (!window.currentTool || !window.currentTool.startsWith("link-")) return;
    if (wbLinkDragActive) return;
    const [x, y] = getLogicalMouse(e);
    let hoverNode = null;
    for (const node of wbState.nodes || []) {
      const box = wbItemBBox("node", node);
      if (box && x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY) { hoverNode = node; break; }
    }
    if (hoverNode) wbShowAnchorHints("node", hoverNode, wbNearestAnchor("node", hoverNode, x, y));
    else wbClearAnchorHints();
  });

  containerEl.addEventListener("pointerup", (e) => {
    if (!wbMarqueeStart) return;
    const [x, y] = getLogicalMouse(e);
    const mx = Math.min(wbMarqueeStart.x, x), my = Math.min(wbMarqueeStart.y, y);
    const mw = Math.abs(x - wbMarqueeStart.x), mh = Math.abs(y - wbMarqueeStart.y);
    const shiftKey = wbMarqueeStart.shiftKey;
    wbMarqueeEl?.remove();
    wbMarqueeEl = null;
    wbMarqueeStart = null;
    // Too small to be a deliberate drag — the plain "click" listener above
    // already handles this as a click-to-clear-selection instead.
    if (mw < 4 && mh < 4) return;
    if (!shiftKey) wbMultiSelection.clear();
    for (const node of wbState.nodes) {
      const el = document.querySelector(WB_SELECTOR_BY_KIND.node(node.id));
      const w = el?.offsetWidth || 250, h = el?.offsetHeight || 150;
      if (rectsIntersect(mx, my, mw, mh, node.x, node.y, w, h)) {
        wbMultiSelection.add(wbMultiKey("node", node.id));
      }
    }
    for (const obj of wbState.objects || []) {
      if (rectsIntersect(mx, my, mw, mh, obj.x, obj.y, obj.width, obj.height)) {
        wbMultiSelection.add(wbMultiKey("object", obj.id));
      }
    }
    for (const sketch of wbState.sketches) {
      const parsed = wbSketchParsedData(sketch);
      if (!parsed) continue; // a link sketch — nothing here to select as a shape
      const bbox = wbPathBBox(parsed.d);
      if (bbox && rectsIntersect(mx, my, mw, mh, bbox.minX, bbox.minY, bbox.width, bbox.height)) {
        wbMultiSelection.add(wbMultiKey("sketch", sketch.id));
      }
    }
    wbSelectedItem = null;
    wbMarqueeJustSelected = true;
    wbApplySelectionHighlight();
  });

  // Freeform lasso select — asked for directly ("all the selection tools
  // (e.g. rectangle select and lasso)"). Same shape as the marquee just
  // above (empty-canvas-only pointerdown, shift to add, `wbMarqueeJustSelected`
  // shared so the trailing native "click" doesn't wipe the result) but hit-
  // tests each item's *centre point* against the traced polygon rather than
  // rectangle-intersecting its bounding box — a lasso is a freeform loop, so
  // "is this item's middle inside the loop" is the one test that stays
  // cheap (one ray-cast per item, not a polygon-clip against every edge) and
  // still matches what a user visually circled.
  function wbPointInPolygon(px, py, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i], [xj, yj] = points[j];
      const crosses = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (crosses) inside = !inside;
    }
    return inside;
  }
  let wbLassoPoints = null;
  let wbLassoEl = null;
  let wbLassoShift = false;
  containerEl.addEventListener("pointerdown", (e) => {
    // Unlike the marquee (`wbIsEmptyCanvasTarget`, above — empty canvas
    // only, since a drag starting *on* a card there means "move it"), a
    // lasso loop is drawn freeform and routinely starts right at the edge
    // of the first thing it means to circle — reported directly as "the
    // lasso tool doesn't work properly". Still excludes an actual handle,
    // which needs its own drag gesture to keep working.
    if (window.currentTool !== "lasso" || e.target.closest?.(".wb-resize-handle, .wb-rotate-handle, .wb-object-grip, .wb-link-endpoint-handle")) return;
    const [x, y] = getLogicalMouse(e);
    wbLassoPoints = [[x, y]];
    wbLassoShift = e.shiftKey;
    wbLassoEl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    wbLassoEl.setAttribute("class", "wb-lasso");
    wbLassoEl.setAttribute("points", `${x},${y}`);
    document.getElementById("wb-zoom-group").appendChild(wbLassoEl);
  });
  containerEl.addEventListener("pointermove", (e) => {
    if (!wbLassoPoints) return;
    const [x, y] = getLogicalMouse(e);
    wbLassoPoints.push([x, y]);
    wbLassoEl.setAttribute("points", wbLassoPoints.map(([px, py]) => `${px},${py}`).join(" "));
  });
  containerEl.addEventListener("pointerup", () => {
    if (!wbLassoPoints) return;
    const points = wbLassoPoints, shiftKey = wbLassoShift;
    wbLassoEl?.remove();
    wbLassoEl = null;
    wbLassoPoints = null;
    if (points.length < 3) return; // a tap, not a loop — nothing to select
    if (!shiftKey) wbMultiSelection.clear();
    for (const node of wbState.nodes) {
      const el = document.querySelector(WB_SELECTOR_BY_KIND.node(node.id));
      const w = el?.offsetWidth || 250, h = el?.offsetHeight || 150;
      if (wbPointInPolygon(node.x + w / 2, node.y + h / 2, points)) {
        wbMultiSelection.add(wbMultiKey("node", node.id));
      }
    }
    for (const obj of wbState.objects || []) {
      if (wbPointInPolygon(obj.x + obj.width / 2, obj.y + obj.height / 2, points)) {
        wbMultiSelection.add(wbMultiKey("object", obj.id));
      }
    }
    for (const sketch of wbState.sketches) {
      const parsed = wbSketchParsedData(sketch);
      if (!parsed) continue; // a link sketch — nothing here to select as a shape
      const bbox = wbPathBBox(parsed.d);
      if (bbox && wbPointInPolygon(bbox.minX + bbox.width / 2, bbox.minY + bbox.height / 2, points)) {
        wbMultiSelection.add(wbMultiKey("sketch", sketch.id));
      }
    }
    wbSelectedItem = null;
    wbMarqueeJustSelected = true;
    wbApplySelectionHighlight();
  });

  // Images: paste, drag-and-drop, or the upload button — asked for
  // directly, and all three funnel through the same upload+place path
  // `handleFileUpload` already established for notes (POST /media/upload,
  // then a placed reference — a board object here instead of markdown text).
  async function wbPlaceUploadedImage(file, x, y) {
    if (!file || !file.type?.startsWith("image/")) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await apiJson("/media/upload", {
        method: "POST",
        headers: { "X-Auth-Token": authToken() },
        body: formData,
      });
      const img = new Image();
      const naturalSize = await new Promise((resolve) => {
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 300, h: 200 });
        img.src = mediaSrc(uploaded.url);
      });
      const width = Math.min(400, naturalSize.w || 300);
      const height = width * ((naturalSize.h || 200) / (naturalSize.w || 300));
      await wbCreateObject("image", { url: uploaded.url }, x - width / 2, y - height / 2, width, height);
    } catch (err) {
      toast(err.message || "Couldn't add that image.", true);
    }
  }

  containerEl.addEventListener("dragover", (e) => {
    if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
  });
  containerEl.addEventListener("drop", (e) => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    const [x, y] = getLogicalMouse(e);
    for (const file of e.dataTransfer.files) wbPlaceUploadedImage(file, x, y);
  });
  // Paste has no drop coordinate to place at — the centre of whatever's
  // currently in view reads better than always the same fixed board
  // position, which would stack every pasted image on top of the last one.
  containerEl.addEventListener("paste", (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [...items].filter((i) => i.kind === "file").map((i) => i.getAsFile());
    if (!files.length) return;
    e.preventDefault();
    const rect = containerEl.getBoundingClientRect();
    const [x, y] = getLogicalMouse({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
    for (const file of files) wbPlaceUploadedImage(file, x, y);
  });
  const imageFileInput = document.getElementById("wb-image-file-input");
  document.getElementById("wb-add-image")?.addEventListener("click", () => imageFileInput?.click());
  imageFileInput?.addEventListener("change", () => {
    const rect = containerEl.getBoundingClientRect();
    const [x, y] = getLogicalMouse({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
    for (const file of imageFileInput.files) wbPlaceUploadedImage(file, x, y);
    imageFileInput.value = "";
  });

  // On `containerEl`, not `svgCanvas` — the same reasoning the eraser
  // listener above already follows. `svgCanvas` only ever sees a
  // pointerdown that lands directly on it or on something inside it; a
  // click that starts on a card (`#wb-html-layer`, a sibling painted on
  // top) never reaches it at all, which is the exact mechanism behind
  // "drawing over a note just moves the note". `containerEl` is an
  // ancestor of both layers, so it sees every pointerdown either way —
  // and, with the card/object drags above now filtered out while a brush
  // tool is active, nothing else claims the gesture first.
  containerEl.addEventListener("pointerdown", (e) => {
    if (!WB_BRUSH_TOOLS.has(window.currentTool)) return;
    e.stopPropagation();
    isDrawing = true;
    const [x, y] = getLogicalMouse(e);
    
    currentDrawData = [[x, y]];
    currentDrawPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    // Fill only applies to the four closed shapes, and only when "no fill"
    // isn't checked — asked for directly ("fill colour/transparency...
    // options for no border/stroke or background").
    if (WB_FILLABLE_SHAPES.has(window.currentTool) && !window.currentFillNone) {
      currentDrawPath.setAttribute("fill", window.currentFillColor);
      currentDrawPath.setAttribute("fill-opacity", String(window.currentFillOpacity / 100));
    } else {
      currentDrawPath.setAttribute("fill", "none");
    }
    currentDrawPath.setAttribute("stroke", window.currentStrokeNone ? "none" : window.currentStrokeColor);
    // A highlighter needs to be visibly wider and translucent, or it isn't a
    // highlighter — the sketch pad's own version of this exact control had
    // its opacity so low it was reported as invisible (HISTORY.md §46).
    currentDrawPath.setAttribute(
      "stroke-width",
      String(window.currentTool === "highlighter" ? WB_STROKE_WIDTH * 4 : WB_STROKE_WIDTH)
    );
    if (window.currentTool === "highlighter") {
      currentDrawPath.setAttribute("stroke-opacity", String(WB_HIGHLIGHTER_ALPHA));
      currentDrawPath.setAttribute("stroke-linecap", "square");
    } else {
      currentDrawPath.setAttribute("stroke-linecap", "round");
    }
    currentDrawPath.setAttribute("stroke-linejoin", "round");
    const dashArray = wbDashArray(window.currentDashStyle, WB_STROKE_WIDTH);
    if (dashArray) currentDrawPath.setAttribute("stroke-dasharray", dashArray);
    currentDrawPath.setAttribute("d", `M ${x} ${y}`);
    document.getElementById("wb-zoom-group").appendChild(currentDrawPath);
  });
  
  containerEl.addEventListener("pointermove", (e) => {
    if (!isDrawing || !WB_BRUSH_TOOLS.has(window.currentTool)) return;
    e.stopPropagation();
    const [x, y] = getLogicalMouse(e);
    
    if (window.currentTool === "draw" || window.currentTool === "highlighter") {
      currentDrawData.push([x, y]);
      const d = currentDrawData.map((pt, i) => (i === 0 ? `M ${pt[0]} ${pt[1]}` : `L ${pt[0]} ${pt[1]}`)).join(" ");
      currentDrawPath.setAttribute("d", d);
    } else {
      // Shape tools: only start and current point matter
      const [sx, sy] = currentDrawData[0];
      if (window.currentTool === "line" || window.currentTool === "arrow") {
        // One path, one or more subpaths — a plain SVG `d` string can hold
        // more than one `M`, and every subpath in it shares the same
        // stroke, so this is the shaft plus whichever head strokes the
        // *active tool's own* end-style calls for in a single element,
        // rather than several sketches that would each need their own undo
        // entry and could drift apart. Asked for directly: "regular lines
        // should also get line end options... arrow heads" — the Line and
        // Arrow tools share the same "Line ends" control, so a plain line
        // *can* carry an arrowhead, but each tool keeps its own remembered
        // default (Line: none, Arrow: end) — see the live-reported bug fix
        // on `currentLineEndStyle`/`currentArrowEndStyle` in `initWhiteboard`.
        const angle = Math.atan2(y - sy, x - sx);
        const headLen = WB_STROKE_WIDTH * 4 + 6;
        let d = `M ${sx} ${sy} L ${x} ${y}`;
        const style = (window.currentTool === "line" ? window.currentLineEndStyle : window.currentArrowEndStyle) || "none";
        if (style === "end" || style === "both") d += " " + wbArrowHeadPath(x, y, angle, headLen);
        if (style === "start" || style === "both") d += " " + wbArrowHeadPath(sx, sy, angle + Math.PI, headLen);
        currentDrawPath.setAttribute("d", d);
      } else if (window.currentTool === "rect") {
        const mx = Math.min(sx, x), my = Math.min(sy, y);
        const { w, h } = wbShapeDims(x - sx, y - sy, e.shiftKey);
        currentDrawPath.setAttribute("d", `M ${mx} ${my} h ${w} v ${h} h ${-w} Z`);
      } else if (window.currentTool === "circle") {
        const { w: rx, h: ry } = wbShapeDims(x - sx, y - sy, e.shiftKey);
        currentDrawPath.setAttribute("d", `M ${sx - rx} ${sy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0`);
      } else if (window.currentTool === "triangle") {
        // Asked for directly ("more types of shapes"). Plain `L` commands,
        // same as the pen/line tools — no new command type for
        // wbTransformPathD/wbPathBBox to learn.
        const mx = Math.min(sx, x), my = Math.min(sy, y);
        const { w, h } = wbShapeDims(x - sx, y - sy, e.shiftKey);
        currentDrawPath.setAttribute(
          "d",
          `M ${mx + w / 2} ${my} L ${mx + w} ${my + h} L ${mx} ${my + h} Z`
        );
      } else if (window.currentTool === "diamond") {
        const mx = Math.min(sx, x), my = Math.min(sy, y);
        const { w, h } = wbShapeDims(x - sx, y - sy, e.shiftKey);
        currentDrawPath.setAttribute(
          "d",
          `M ${mx + w / 2} ${my} L ${mx + w} ${my + h / 2} L ${mx + w / 2} ${my + h} L ${mx} ${my + h / 2} Z`
        );
      }
    }
  });
  
  containerEl.addEventListener("pointerup", async (e) => {
    if (!isDrawing || !WB_BRUSH_TOOLS.has(window.currentTool)) return;
    e.stopPropagation();
    isDrawing = false;
    
    const [x, y] = getLogicalMouse(e);
    const [sx, sy] = currentDrawData[0];
    
    // A plain click with no drag — reported directly: the pen tool "doesn't
    // respond to a single click, only a drag", which the sketch pad's own
    // pen never had wrong (see `sketchEnd`'s own `!sketchMoved` branch, the
    // same fix mirrored here). A `moveto` with no `lineto` after it draws
    // nothing at all, so a stationary click has to add a near-zero-length
    // segment — round linecaps turn that into a visible dot — rather than
    // being discarded as "no shape to save".
    const isFreehand = window.currentTool === "draw" || window.currentTool === "highlighter";
    if (isFreehand && currentDrawData.length < 2) {
      currentDrawPath.setAttribute("d", `M ${sx} ${sy} L ${sx} ${sy + 0.1}`);
    } else if (!isFreehand && Math.abs(x - sx) < 2 && Math.abs(y - sy) < 2) {
      // Shape tools (line/arrow/rect/circle) need an actual drag to have a
      // size — a zero-size shape isn't a reasonable click-to-draw default
      // the way a pen dot is, so these are still discarded.
      if (currentDrawPath) currentDrawPath.remove();
      currentDrawPath = null;
      return;
    }
    
    // Save sketch to API. The backend schema has no width/opacity/fill/dash
    // columns, so all of it has to travel inside `data` — otherwise a saved
    // stroke reloads at the hardcoded 3px default regardless of what
    // #wb-stroke-width was actually set to when it was drawn (a real bug,
    // caught while wiring that control up: only the highlighter branch here
    // ever saved its own width; a plain pen/line/shape stroke silently lost
    // whatever size it was actually drawn at the moment the page reloaded).
    const d = currentDrawPath.getAttribute("d");
    const isHighlighter = window.currentTool === "highlighter";
    const isFillable = WB_FILLABLE_SHAPES.has(window.currentTool);
    const blob = {
      d,
      color: currentStrokeColor,
      width: isHighlighter ? WB_STROKE_WIDTH * 4 : WB_STROKE_WIDTH,
      shape: window.currentTool,
    };
    if (isHighlighter) {
      blob.opacity = WB_HIGHLIGHTER_ALPHA;
    } else {
      if (window.currentDashStyle !== "solid") blob.dash = window.currentDashStyle;
      if (window.currentStrokeNone) blob.noStroke = true;
      if (isFillable && !window.currentFillNone) {
        blob.fill = window.currentFillColor;
        blob.fillOpacity = window.currentFillOpacity / 100;
      }
    }
    const sketchData = {
      data: JSON.stringify(blob),
      x: 0,
      y: 0,
      z: 5,
      board_id: window.currentBoardId
    };

    try {
      const res = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify(sketchData) });
      wbState.sketches.push(res);
      wbPushUndo({ action: "create", kind: "sketch", id: res.id });
      // Hand off to renderWhiteboard's own data-bound element for this
      // sketch — a real bug found while adding the eraser: this raw `<path>`
      // is not part of the `g.sketch-group` selection renderWhiteboard binds
      // wbState.sketches to, so a stroke just drawn had no way to be deleted
      // or erased until a full reload re-fetched it from the server and
      // rendered it "properly" the first time.
      currentDrawPath.remove();
      wbScheduleRender();
    } catch (err) {
      console.error("Failed to save sketch:", err);
      if (currentDrawPath) currentDrawPath.remove();
    }

    currentDrawPath = null;
    currentDrawData = [];
  });

  // Drop handler for Library
  document.getElementById("whiteboard-container").addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });
  
  document.getElementById("whiteboard-container").addEventListener("drop", async (e) => {
    e.preventDefault();
    const entryId = e.dataTransfer.getData("text/plain");
    if (!entryId) return;
    
    // We need to figure out coordinates relative to the transformed html layer
    const canvasEl = document.getElementById("wb-html-layer");
    const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
    const rect = canvasEl.getBoundingClientRect();
    
    // Calculate logical x,y
    const logicalX = (e.clientX - rect.left - transform.x) / transform.k;
    const logicalY = (e.clientY - rect.top - transform.y) / transform.k;

    // Reported directly: a dropped note lands "quite offset from where I
    // dropped it". `d.x`/`d.y` are the card's own top-left corner (that's
    // what `renderWhiteboard`'s `translate(d.x, d.y)` positions), so storing
    // the raw drop point put the *corner* under the cursor, not the card —
    // for the app's own ~250×150 default card size that reads as up to
    // 125px right and 75px down from where you actually let go. Centring it
    // on the drop point instead matches how a text box/image already places
    // itself on click/drop (`wbCreateTextBox`, `wbPlaceUploadedImage`).
    const nodeData = {
      entry_id: parseInt(entryId, 10),
      x: logicalX - 125,
      y: logicalY - 75,
      z: 10,
      board_id: window.currentBoardId
    };
    
    try {
      const res = await apiJson("/whiteboard/nodes", { method: "POST", body: JSON.stringify(nodeData) });
      // If it exists in state already, replace it. Otherwise push.
      const idx = wbState.nodes.findIndex(n => n.id === res.id);
      if (idx !== -1) wbState.nodes[idx] = res;
      else wbState.nodes.push(res);
      wbScheduleRender();
    } catch (err) {
      console.error("Error creating node:", err);
    }
  });


  
  await fetchWhiteboardState();
  wbScheduleRender();
}

function renderWbLibrary() {
  const list = document.getElementById("wb-library-list");
  list.innerHTML = "";
  for (const entry of allEntries) {
    const li = document.createElement("li");
    li.className = "wb-library-item";
    const text = entry.content || entry.preview || "";
    li.textContent = text ? (text.length > 40 ? text.substring(0, 40) + "…" : text) : entry.id;
    li.draggable = true;
    li.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", entry.id);
      e.dataTransfer.effectAllowed = "copy";
    });
    list.appendChild(li);
  }
}

window.currentBoardId = null;

async function fetchWhiteboardState() {
  try {
    const url = window.currentBoardId ? `/whiteboard/?board_id=${window.currentBoardId}` : "/whiteboard/";
    const res = await apiJson(url);
    wbState = res;
    await refreshBoardList();
  } catch (err) {
    console.error("Whiteboard fetch error:", err);
  }
}

// Reported directly: "the different board options confuse me." It used to
// be every note in the notebook, since architecturally any note can serve as
// a board_id — the picker took that literally and offered a 50-item dropdown
// of notes that had never been anywhere near the whiteboard. GET
// /whiteboard/boards lists only notes something is actually on, plus the
// always-present default board (see routes_whiteboard.py for the full
// writeup). Re-fetched on every state load rather than cached once: creating
// or first-using a board should show up in the picker without a reload.
// `justCreated`: a board this session just made, which won't come back from
// the server yet — nothing is on it, and the endpoint only lists boards
// something has actually been placed on (see its own docstring). Without
// this, switching straight to a brand-new board made the dropdown fall back
// to whatever option happened to match nothing, which looked like the new
// board had failed to switch to at all.
async function refreshBoardList(justCreated = null) {
  const select = document.getElementById("wb-board-select");
  if (!select) return;
  const boards = await apiJson("/whiteboard/boards", { silent: true }).catch(() => null);
  if (!boards) return;
  if (justCreated && !boards.some((b) => b.id === justCreated.id)) {
    boards.push({ ...justCreated, node_count: 0, sketch_count: 0, object_count: 0 });
  }
  select.replaceChildren();
  for (const board of boards) {
    const opt = document.createElement("option");
    opt.value = board.id ?? "";
    // Images and text boxes count too — a board holding only those (no
    // cards or sketches) read as "(0 items)" here, which is exactly what
    // exposed this: a board with three text boxes on it, live-verified.
    const count = board.node_count + board.sketch_count + (board.object_count || 0);
    opt.textContent = board.id === null
      ? board.title
      : `${board.title} (${count} item${count === 1 ? "" : "s"})`;
    select.appendChild(opt);
  }
  select.value = window.currentBoardId || "";
  // The default scratch board (`board_id=null`) has no underlying note to
  // rename — `rename_board` 404s on anything that isn't a real positive id.
  const renameBtn = document.getElementById("wb-rename-board");
  if (renameBtn) renameBtn.disabled = !window.currentBoardId;
}

async function renameCurrentBoard() {
  if (!window.currentBoardId) return;
  const current = document.getElementById("wb-board-select")?.selectedOptions?.[0]?.textContent
    .replace(/\s*\(\d+ items?\)$/, "") || "";
  const name = await promptDialog("Rename this board:", current);
  if (!name || !name.trim()) return;
  try {
    const board = await apiJson(`/whiteboard/boards/${window.currentBoardId}`, {
      method: "PUT",
      body: JSON.stringify({ title: name.trim() }),
    });
    await refreshBoardList(board);
    toast(`Board renamed to "${board.title}".`);
  } catch (err) {
    toast(err.message || "Couldn't rename that board.", true);
  }
}

async function createNewBoard() {
  const name = await promptDialog("Name the new board:", "");
  if (!name || !name.trim()) return;
  try {
    const board = await apiJson("/whiteboard/boards", {
      method: "POST",
      body: JSON.stringify({ name: name.trim() }),
    });
    window.currentBoardId = board.id;
    // `list_boards` only lists a board once something is actually placed on
    // it (see its own docstring) — an empty new one is invisible to both
    // this dropdown (already handled below via `justCreated`) and the
    // landing gallery, which would otherwise make a board someone just
    // created appear to vanish the moment they go back to the list.
    window.wbLastCreatedBoard = board;
    const url = `/whiteboard/?board_id=${board.id}`;
    wbState = await apiJson(url);
    await refreshBoardList(board);
    wbScheduleRender();
    toast(`Board "${board.title}" created.`);
  } catch (err) {
    toast(err.message || "Couldn't create that board.", true);
  }
}

// --- Sketch move/resize (ROADMAP.md Tier 2 §11 / user-reported: "can't
// move objects drawn on the whiteboard", "can't resize... can't shorten
// lines") -------------------------------------------------------------------
//
// Cards and objects have real x/y/width/height columns; a sketch is just an
// SVG path string (`d`), so "move" and "resize" both mean rewriting the
// coordinates inside that string rather than moving a positioned element.
// This is *not* a general SVG path parser — it only has to round-trip
// exactly the commands this app's own drawing tools ever emit (see the
// `pointermove` handler above: `M`/`L` for pen and lines, `C` for link
// curves, `h`/`v`/`Z` for rect, `a` for circle) — a path from anywhere else
// was never a possibility, so there is no reason to handle SVG's full
// command set.
//: `rotate` (degrees, about `anchorX`/`anchorY`) is what a sketch didn't
//: have — cards and objects rotate (a drag handle + a stored `rotation`
//: column), but a sketch *is* its path data, and rotating a path correctly
//: needs care `dx`/`sx` alone don't: `h`/`v` (a purely horizontal/vertical
//: relative line — this app's own rect tool emits them) can't represent a
//: rotated line at all, since rotating "purely horizontal" by anything
//: other than a multiple of 90° makes it not horizontal any more, so each
//: becomes an absolute `L` instead once rotation is non-zero. `a` (the
//: circle tool's arc pairs) stays relative — a rotation adds straight onto
//: the arc's own `x-axis-rotation` parameter and rotates its endpoint
//: delta; `rx`/`ry`/large-arc/sweep are unchanged, which is exact for a
//: *pure* rotation (no reflection) — this app never emits a negative
//: scale, so that combination doesn't need handling here.
function wbTransformPathD(d, { dx = 0, dy = 0, sx = 1, sy = 1, rotate = 0, anchorX = 0, anchorY = 0 } = {}) {
  const theta = (rotate * Math.PI) / 180;
  const cos = Math.cos(theta), sin = Math.sin(theta);
  const mapPoint = (x, y) => {
    const scaledX = anchorX + (x - anchorX) * sx;
    const scaledY = anchorY + (y - anchorY) * sy;
    const relX = scaledX - anchorX, relY = scaledY - anchorY;
    return [anchorX + relX * cos - relY * sin + dx, anchorY + relX * sin + relY * cos + dy];
  };
  // A relative delta scales the same way a point's offset from the anchor
  // does, but never translates (dx/dy are a position's own change, not a
  // vector's).
  const mapDelta = (ddx, ddy) => {
    const scaledX = ddx * sx, scaledY = ddy * sy;
    return [scaledX * cos - scaledY * sin, scaledX * sin + scaledY * cos];
  };
  const tokens = d.match(/[MLCHVAZmlchvaz]|-?\d*\.?\d+(?:[eE]-?\d+)?/g);
  if (!tokens) return d;
  let i = 0, px = 0, py = 0; // current point, tracked only for h/v → L under rotation
  const out = [];
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === "M" || cmd === "L") {
      const x = parseFloat(tokens[i++]), y = parseFloat(tokens[i++]);
      const [mx, my] = mapPoint(x, y);
      out.push(cmd, mx, my);
      px = x; py = y;
    } else if (cmd === "C") {
      const n = [];
      for (let k = 0; k < 6; k++) n.push(parseFloat(tokens[i++]));
      const [x1, y1] = mapPoint(n[0], n[1]);
      const [x2, y2] = mapPoint(n[2], n[3]);
      const [x3, y3] = mapPoint(n[4], n[5]);
      out.push(cmd, x1, y1, x2, y2, x3, y3);
      px = n[4]; py = n[5];
    } else if (cmd === "h") {
      const ddx = parseFloat(tokens[i++]);
      if (rotate) {
        const [mx, my] = mapPoint(px + ddx, py);
        out.push("L", mx, my);
      } else {
        out.push(cmd, ddx * sx);
      }
      px += ddx;
    } else if (cmd === "v") {
      const ddy = parseFloat(tokens[i++]);
      if (rotate) {
        const [mx, my] = mapPoint(px, py + ddy);
        out.push("L", mx, my);
      } else {
        out.push(cmd, ddy * sy);
      }
      py += ddy;
    } else if (cmd === "a") {
      const rx = parseFloat(tokens[i++]) * sx, ry = parseFloat(tokens[i++]) * sy;
      const rot = parseFloat(tokens[i++]) + rotate, large = tokens[i++], sweep = tokens[i++];
      const edx = parseFloat(tokens[i++]), edy = parseFloat(tokens[i++]);
      const [mdx, mdy] = mapDelta(edx, edy);
      out.push(cmd, rx, ry, rot, large, sweep, mdx, mdy);
      px += edx; py += edy;
    } else if (cmd === "Z" || cmd === "z") {
      out.push(cmd);
    } else {
      return d; // an unrecognised token — leave the path untouched rather than corrupt it
    }
  }
  return out.join(" ");
}

//: The bounding box of a path this app drew, walked the same way a real SVG
//: renderer would (tracking the pen's current point through relative
//: commands) rather than just min/maxing every raw number — `h`/`v`/`a`'s
//: numbers are deltas and radii, not coordinates, and mixing them into a
//: coordinate min/max would produce a nonsense box.
function wbPathBBox(d) {
  const tokens = d.match(/[MLCHVAZmlchvaz]|-?\d*\.?\d+(?:[eE]-?\d+)?/g);
  if (!tokens) return null;
  let i = 0, px = 0, py = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = (x, y) => {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  };
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === "M" || cmd === "L") {
      px = parseFloat(tokens[i++]); py = parseFloat(tokens[i++]);
      visit(px, py);
    } else if (cmd === "C") {
      const n = [];
      for (let k = 0; k < 6; k++) n.push(parseFloat(tokens[i++]));
      visit(n[0], n[1]); visit(n[2], n[3]); visit(n[4], n[5]);
      px = n[4]; py = n[5];
    } else if (cmd === "h") {
      px += parseFloat(tokens[i++]);
      visit(px, py);
    } else if (cmd === "v") {
      py += parseFloat(tokens[i++]);
      visit(px, py);
    } else if (cmd === "a") {
      const rx = parseFloat(tokens[i++]), ry = parseFloat(tokens[i++]);
      i += 3; // x-axis-rotation, large-arc-flag, sweep-flag — unused for a bbox
      const ex = parseFloat(tokens[i++]), ey = parseFloat(tokens[i++]);
      // Exact for the axis-aligned circle/ellipse this tool ever draws: two
      // half-arcs whose shared chord's midpoint is the ellipse's own centre.
      const midX = px + ex / 2, midY = py + ey / 2;
      visit(midX - rx, midY - ry);
      visit(midX + rx, midY + ry);
      px += ex; py += ey;
    }
    // Z/z closes back to the last M — doesn't move the pen for bbox purposes.
  }
  return isFinite(minX) ? { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY } : null;
}

//: A handle drag's dx/dy (board-space) turned into the same
//: {sx, sy, anchorX, anchorY} shape `wbTransformPathD` takes — the opposite
//: corner/edge from whichever handle moved stays fixed, mirroring
//: `resizeDrag`'s own width/height-and-floor logic for image/text objects.
const WB_SKETCH_MIN_SIZE = 10;
function wbSketchResizeTransform(bbox, handle, dx, dy, shiftKey) {
  const { minX, minY, maxX, maxY } = bbox;
  let newMinX = minX, newMaxX = maxX, newMinY = minY, newMaxY = maxY;
  if (handle.includes("e")) newMaxX = Math.max(minX + WB_SKETCH_MIN_SIZE, maxX + dx);
  if (handle.includes("w")) newMinX = Math.min(maxX - WB_SKETCH_MIN_SIZE, minX + dx);
  if (handle.includes("s")) newMaxY = Math.max(minY + WB_SKETCH_MIN_SIZE, maxY + dy);
  if (handle.includes("n")) newMinY = Math.min(maxY - WB_SKETCH_MIN_SIZE, minY + dy);
  // Reported directly: shift while resizing didn't snap to a square. Only a
  // corner handle ("nw"/"ne"/"se"/"sw" — length 2) has two free axes to lock
  // together; the larger of the two free-form extents wins, and the corner
  // *opposite* the one being dragged stays anchored, matching `anchorX`/
  // `anchorY` below rather than recentring the shape.
  const isCorner = handle.length === 2;
  if (isCorner && shiftKey) {
    const size = Math.max(newMaxX - newMinX, newMaxY - newMinY, WB_SKETCH_MIN_SIZE);
    if (handle.includes("e")) newMaxX = newMinX + size; else newMinX = newMaxX - size;
    if (handle.includes("s")) newMaxY = newMinY + size; else newMinY = newMaxY - size;
  }
  const oldW = maxX - minX || 1, oldH = maxY - minY || 1;
  const sx = handle.includes("e") || handle.includes("w") ? (newMaxX - newMinX) / oldW : 1;
  const sy = handle.includes("n") || handle.includes("s") ? (newMaxY - newMinY) / oldH : 1;
  return { sx, sy, anchorX: handle.includes("w") ? maxX : minX, anchorY: handle.includes("n") ? maxY : minY };
}

//: A sketch's own `data` blob, whether it's `{d, color}` or the wider
//: `{d, color, width, opacity}` a highlighter carries (HISTORY.md) — parsed
//: once so move/resize can rewrite just `d` and leave every other field
//: (colour, the highlighter's width/opacity) exactly as it was.
// Detected from the path data itself, not a stored "kind" field (sketches
// don't have one): rect/triangle/diamond's own preview-drawing code (above,
// in the pointermove handler) closes its path with Z; circle instead
// returns to its start point via two arc ("a") commands. Line/arrow/pen/
// highlighter never do either.
function wbSketchIsClosedShape(sketch) {
  const d = wbSketchParsedData(sketch)?.d || "";
  const trimmed = d.trim();
  return /[Zz]\s*$/.test(trimmed) || /\ba\s/i.test(trimmed);
}

function wbSketchParsedData(sketch) {
  try {
    const parsed = JSON.parse(sketch.data);
    return parsed && typeof parsed.d === "string" ? parsed : null;
  } catch {
    return null;
  }
}

//: Merges `partial` into the sketch's own parsed data blob and saves the
//: whole thing back — the general form `wbSaveSketchD` (move/resize) and
//: the properties panel (colour/width/arrowhead) both reduce to. Unlike
//: `wbSketchParsedData` (which deliberately stays strict to `.d`-shaped
//: data for the move/resize code that assumes it), this also accepts a
//: link sketch — asked for directly ("customisable links... colour"),
//: which silently did nothing before this: the colour/width properties-
//: panel rows already called this function for *any* selected sketch, but
//: a link has no `.d`, so `wbSketchParsedData` returned null and the save
//: was a silent no-op.
async function wbSaveSketchProps(sketch, partial) {
  let parsed;
  try {
    const candidate = JSON.parse(sketch.data);
    if (candidate && (typeof candidate.d === "string" || (candidate.type || "").startsWith("link-"))) {
      parsed = candidate;
    }
  } catch {
    parsed = null;
  }
  if (!parsed) return;
  Object.assign(parsed, partial);
  sketch.data = JSON.stringify(parsed);
  try {
    const saved = await apiJson(`/whiteboard/sketches/${sketch.id}`, {
      method: "PUT",
      body: JSON.stringify({
        data: sketch.data, board_id: sketch.board_id, x: sketch.x, y: sketch.y, z: sketch.z,
        group_id: sketch.group_id ?? null,
      }),
    });
    Object.assign(sketch, saved);
  } catch {
    recordBrowserLog("WARN", [`[Whiteboard] sketch ${sketch.id} is stale — reloading the board`]);
    await fetchWhiteboardState();
    wbScheduleRender();
  }
}

async function wbSaveSketchD(sketch, newD) {
  await wbSaveSketchProps(sketch, { d: newD });
}

// Paint-bucket tool: recolour whatever's clicked with the main toolbar's
// stroke colour. Closed shapes (rect/circle/triangle/diamond) get their
// fill set, since that's the area a bucket click reads as "inside" of;
// anything else (line/arrow/pen stroke) has no interior, so its stroke is
// recoloured instead - the same colour the properties panel would show.
async function wbBucketFillSketch(sketch) {
  const color = document.getElementById("wb-color-picker")?.value || "#3355ff";
  let parsed;
  try {
    parsed = JSON.parse(sketch.data);
  } catch {
    return;
  }
  if (parsed && WB_FILLABLE_SHAPES.has(parsed.shape)) {
    await wbSaveSketchProps(sketch, { fill: color });
  } else {
    await wbSaveSketchProps(sketch, { color });
  }
  wbScheduleRender();
}

//: True once a sketch's `d` has more than one `M` — every shape this app's
//: own tools ever draw uses exactly one *except* an arrow (shaft + one or
//: two head subpaths, `wbArrowHeadPath`'s own `M`s). Good enough to tell
//: "this is an arrow" apart from a line/rect/circle/triangle/diamond/pen
//: stroke without a dedicated `kind` field on every sketch.
function wbSketchIsArrow(d) {
  return (d.match(/M/g) || []).length > 1;
}

//: Rebuilds a line/arrow's own two end caps from its shaft — the shaft is
//: always the sketch's first subpath, `M sx sy L ex ey` (every arrow this
//: app draws starts that way), so either end's cap can be changed after
//: the fact without needing to have stored which shape was originally
//: chosen. Independently per end (`WB_CAP_KINDS` each) — asked for
//: directly ("a full line/arrow end-cap system... circle/square/multi-line
//: ends"), replacing the single shared arrowhead-only version.
function wbRegenerateShapeCaps(d, startCap, endCap, headLen) {
  const m = d.match(/^M\s*(-?[\d.]+(?:e-?\d+)?)\s+(-?[\d.]+(?:e-?\d+)?)\s+L\s*(-?[\d.]+(?:e-?\d+)?)\s+(-?[\d.]+(?:e-?\d+)?)/);
  if (!m) return d;
  const sx = parseFloat(m[1]), sy = parseFloat(m[2]), ex = parseFloat(m[3]), ey = parseFloat(m[4]);
  const angle = Math.atan2(ey - sy, ex - sx);
  let out = `M ${sx} ${sy} L ${ex} ${ey}`;
  if (endCap && endCap !== "none") out += " " + wbCapPath(endCap, ex, ey, angle, headLen);
  if (startCap && startCap !== "none") out += " " + wbCapPath(startCap, sx, sy, angle + Math.PI, headLen);
  return out;
}

//: What style a drawn line/arrow's own path is *actually* carrying —
//: needed because the properties panel used to just show whatever the
//: active drawing tool's current default was (live-reported bug, same
//: session as the Line-tool-always-drew-an-arrowhead one above), which
//: lies the moment a sketch's real style differs from that default.
//: `wbArrowHeadPath` always starts its own subpath at the tip it's drawn
//: for, so a head is detected by which of the shaft's two endpoints each
//: extra `M` lands on — exact, not guessed, since these are the same
//: coordinates the shaft itself was drawn from.
function wbDetectArrowStyle(d) {
  const m = d.match(/^M\s*(-?[\d.]+(?:e-?\d+)?)\s+(-?[\d.]+(?:e-?\d+)?)\s+L\s*(-?[\d.]+(?:e-?\d+)?)\s+(-?[\d.]+(?:e-?\d+)?)/);
  if (!m) return "none";
  const sx = parseFloat(m[1]), sy = parseFloat(m[2]), ex = parseFloat(m[3]), ey = parseFloat(m[4]);
  let hasEnd = false, hasStart = false;
  for (const extra of d.matchAll(/M\s*(-?[\d.]+(?:e-?\d+)?)\s+(-?[\d.]+(?:e-?\d+)?)/g)) {
    const x = parseFloat(extra[1]), y = parseFloat(extra[2]);
    if (Math.hypot(x - ex, y - ey) < 0.5) hasEnd = true;
    else if (Math.hypot(x - sx, y - sy) < 0.5) hasStart = true;
  }
  if (hasEnd && hasStart) return "both";
  if (hasEnd) return "end";
  if (hasStart) return "start";
  return "none";
}

//: A drawn line/arrow's own two cap kinds — the explicit `startCap`/
//: `endCap` fields (any of `WB_CAP_KINDS`) if this sketch has them, or
//: `wbDetectArrowStyle`'s older binary read translated to "arrow"/"none"
//: for one saved before the full end-cap system existed. Explicit fields
//: rather than shape-sniffing every cap kind out of the raw path: circle
//: and square are geometrically ambiguous with plenty of things a pen
//: stroke could also draw, where an arrow's two-line V (`wbDetectArrowStyle`)
//: is not — so a *new* cap choice is trusted and stored, and only a link
//: with no stored choice at all falls back to inferring one.
function wbSketchCaps(parsed) {
  if (parsed.startCap !== undefined || parsed.endCap !== undefined) {
    return { startCap: parsed.startCap || "none", endCap: parsed.endCap || "none" };
  }
  const legacy = wbDetectArrowStyle(parsed.d);
  return {
    startCap: legacy === "start" || legacy === "both" ? "arrow" : "none",
    endCap: legacy === "end" || legacy === "both" ? "arrow" : "none",
  };
}

//: Two draggable handles at a selected link's own resolved endpoints —
//: asked for directly: "I should be able to move the points where lines,
//: arrows and links connect on objects to other points or even make it a
//: dangling unattached point not attached to an object." Dragging one
//: rewrites *that end's* own reference (`sourceId`/`sourceAnchor` or
//: `targetId`/`targetAnchor` — reattach, snapping to the nearest of the
//: hovered card's 8 fixed anchors the same way creating a link already
//: does) or, released over empty canvas, `sourcePoint`/`targetPoint` — a
//: fixed board-space point with no card at all. `wbResolveLinkEndpoints`
//: already reads both shapes, so nothing else needs to change to render one.
// Remove every sketch handle group, from **both** layers it can live in.
//
// Reported with a screenshot: "when I change where links are connected on
// notes or objects on the whiteboard, these weird small circles are left
// hanging." They are link endpoint handles, and the cause was a layer split
// that the cleanup never caught up with — handles for a *link* are appended to
// `#wb-overlay-zoom-group` (they sit on a card's own border, which the base
// SVG paints underneath the card's HTML, so they had to move up a layer),
// while both existing clears only ever swept `#wb-zoom-group`. Every
// re-render appended a fresh group and none of the old ones was ever removed,
// so the circles accumulated.
//
// One helper, used by all three call sites, so a third layer cannot
// reintroduce the same gap quietly.
function wbClearSketchHandles() {
  for (const layer of ["#wb-zoom-group", "#wb-overlay-zoom-group"]) {
    d3.select(layer).selectAll(".wb-sketch-handle-group").remove();
  }
}

function wbRenderLinkEndpointHandles(sketch, parsed) {
  const endpoints = wbResolveLinkEndpoints(parsed);
  if (!endpoints) return;
  // The overlay layer (see its own comment in index.html) — an endpoint
  // sits *on a card's own border* by definition, which the base SVG layer
  // paints underneath the card's HTML element. A handle there would be
  // both invisible and unclickable exactly where it's needed most.
  // Clear before drawing: this appends rather than data-joining, so without
  // it every call leaves its predecessor behind on the board.
  wbClearSketchHandles();
  const group = d3.select("#wb-overlay-zoom-group").append("g").attr("class", "wb-sketch-handle-group");

  const hoveredNodeAt = (px, py) => {
    for (const node of wbState.nodes) {
      const box = wbItemBBox("node", node);
      if (px >= box.minX && px <= box.maxX && py >= box.minY && py <= box.maxY) return node;
    }
    return null;
  };

  for (const end of ["source", "target"]) {
    const other = end === "source" ? "target" : "source";
    const live = { x: endpoints[end].x, y: endpoints[end].y };
    group.append("circle")
      .attr("class", "wb-link-endpoint-handle")
      .attr("data-end", end)
      .attr("cx", live.x).attr("cy", live.y)
      .attr("r", 7)
      .style("cursor", "crosshair")
      .call(
        d3.drag()
          .on("start", (event) => event.sourceEvent.stopPropagation())
          .on("drag", function (event) {
            const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
            live.x += event.dx / transform.k;
            live.y += event.dy / transform.k;
            d3.select(this).attr("cx", live.x).attr("cy", live.y);
            const previewPts = end === "source" ? [live, endpoints[other]] : [endpoints[other], live];
            const previewD = wbLinkPathD(parsed.type, previewPts[0], previewPts[1], wbLinkCaps(parsed), parsed.width);
            document.querySelector(`.sketch-group[data-id="${sketch.id}"] .sketch-path`)?.setAttribute("d", previewD);
            document.querySelector(`.sketch-group[data-id="${sketch.id}"] .sketch-hitbox`)?.setAttribute("d", previewD);

            const hoverNode = hoveredNodeAt(live.x, live.y);
            if (hoverNode) wbShowAnchorHints("node", hoverNode, wbNearestAnchor("node", hoverNode, live.x, live.y));
            else wbClearAnchorHints();
          })
          .on("end", async () => {
            wbClearAnchorHints();
            const before = WB_KIND_INFO.sketch.payload(sketch);
            const hoverNode = hoveredNodeAt(live.x, live.y);
            const partial = {};
            if (hoverNode) {
              partial[end + "Id"] = hoverNode.id;
              partial[end + "Anchor"] = wbNearestAnchor("node", hoverNode, live.x, live.y) || undefined;
              partial[end + "Point"] = undefined;
            } else {
              partial[end + "Id"] = undefined;
              partial[end + "Anchor"] = undefined;
              partial[end + "Point"] = { x: live.x, y: live.y };
            }
            await wbSaveSketchProps(sketch, partial);
            wbPushUndo({ action: "move", kind: "sketch", id: sketch.id, before });
            wbScheduleRender();
          })
      );
  }
}

// The handles themselves — a fresh SVG group per selection, since (unlike a
// card/object's own always-present handles) a sketch has no fixed element to
// attach 8 children to; it's rebuilt on every selection change and after
// every `wbScheduleRender()` re-applies the current selection.
function wbRenderSketchHandles() {
  wbClearSketchHandles();
  if (!wbSelectedItem || wbSelectedItem.kind !== "sketch") return;
  const sketch = wbState.sketches.find((s) => s.id === wbSelectedItem.id);
  if (!sketch) return;
  // A link sketch has no `.d` of its own — `wbSketchParsedData` returns
  // null for it, and the 8-point bbox resize handles below make no sense
  // for a path recomputed fresh from its endpoints every render anyway.
  // It gets its own two endpoint handles instead (below).
  let rawParsed;
  try { rawParsed = JSON.parse(sketch.data); } catch { rawParsed = null; }
  if (rawParsed && (rawParsed.type || "").startsWith("link-")) {
    wbRenderLinkEndpointHandles(sketch, rawParsed);
    return;
  }
  const parsed = wbSketchParsedData(sketch);
  if (!parsed) return;
  const bbox = wbPathBBox(parsed.d);
  if (!bbox) return;

  const group = d3.select("#wb-zoom-group")
    .append("g")
    .attr("class", "wb-sketch-handle-group");

  for (const handle of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) {
    const hx = handle.includes("w") ? bbox.minX : handle.includes("e") ? bbox.maxX : (bbox.minX + bbox.maxX) / 2;
    const hy = handle.includes("n") ? bbox.minY : handle.includes("s") ? bbox.maxY : (bbox.minY + bbox.maxY) / 2;
    let rawDX = 0, rawDY = 0; // this handle's own running total for the drag closure below
    group.append("rect")
      .attr("class", "wb-sketch-resize-handle")
      .attr("data-handle", handle)
      .attr("x", hx - 5).attr("y", hy - 5)
      .attr("width", 10).attr("height", 10)
      .style("cursor", `${handle}-resize`)
      .call(
        d3.drag()
          .on("start", (event) => {
            event.sourceEvent.stopPropagation();
            // event.dx/dy are per-frame deltas (since the *previous* event,
            // not since the drag started) — recomputing the transform from
            // the original bbox using only the latest frame's delta each
            // time would apply just that one frame's worth of movement and
            // throw the rest away. Accumulated from the start instead, the
            // same fix as the drag-snap accumulation bug above.
            rawDX = 0;
            rawDY = 0;
            sketch._resizeUndoBefore = WB_KIND_INFO.sketch.payload(sketch);
          })
          .on("drag", (event) => {
            const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
            rawDX += event.dx / transform.k;
            rawDY += event.dy / transform.k;
            const t = wbSketchResizeTransform(bbox, handle, rawDX, rawDY, event.sourceEvent.shiftKey);
            const newD = wbTransformPathD(parsed.d, t);
            document.querySelector(`.sketch-group[data-id="${sketch.id}"] .sketch-path`)?.setAttribute("d", newD);
            document.querySelector(`.sketch-group[data-id="${sketch.id}"] .sketch-hitbox`)?.setAttribute("d", newD);
            sketch._liveD = newD; // read at drag end, without waiting for a full render
          })
          .on("end", async () => {
            const before = sketch._resizeUndoBefore;
            delete sketch._resizeUndoBefore;
            if (sketch._liveD) {
              const finalD = sketch._liveD;
              delete sketch._liveD;
              await wbSaveSketchD(sketch, finalD);
              if (before) wbPushUndo({ action: "move", kind: "sketch", id: sketch.id, before });
            }
            wbScheduleRender();
          })
      );
  }

  // Rotation — asked for directly, the one thing cards/objects already had
  // (a drag handle above the item, Shift snaps to 15°) that a sketch
  // didn't, since its "shape" is its path data rather than a stored
  // rotation column. Baked into `d` on release via `wbTransformPathD`'s new
  // `rotate` support, the same "commit into the path" convention move and
  // resize already use for a sketch — not a live CSS transform, which
  // would need a rotation to remember and re-apply on every future edit
  // instead of just being the shape's own coordinates.
  const centerX = (bbox.minX + bbox.maxX) / 2, centerY = (bbox.minY + bbox.maxY) / 2;
  const handleY = bbox.minY - 28;
  group.append("line")
    .attr("class", "wb-rotate-handle-stem")
    .attr("x1", centerX).attr("y1", bbox.minY).attr("x2", centerX).attr("y2", handleY);
  // Absolute, not incremental — the handle sits straight above the shape's
  // centre (0°, the same reference `wbAngleFromCenterDeg` uses), so the
  // rotation applied is exactly the pointer's own angle from vertical, the
  // same "the handle follows your cursor" feel `nodeRotateDrag` above
  // already established for cards.
  let rotateOriginalD = null, rotateLiveD = null;
  group.append("circle")
    .attr("class", "wb-sketch-rotate-handle")
    .attr("cx", centerX).attr("cy", handleY).attr("r", 7)
    .style("cursor", "grab")
    .call(
      d3.drag()
        .on("start", (event) => {
          event.sourceEvent.stopPropagation();
          rotateOriginalD = parsed.d;
          sketch._rotateUndoBefore = WB_KIND_INFO.sketch.payload(sketch);
        })
        .on("drag", (event) => {
          const currentAngle = wbSketchAngleFromCenterDeg(centerX, centerY, event.sourceEvent, event.sourceEvent.shiftKey);
          const newD = wbTransformPathD(rotateOriginalD, { rotate: currentAngle, anchorX: centerX, anchorY: centerY });
          rotateLiveD = newD;
          document.querySelector(`.sketch-group[data-id="${sketch.id}"] .sketch-path`)?.setAttribute("d", newD);
          document.querySelector(`.sketch-group[data-id="${sketch.id}"] .sketch-hitbox`)?.setAttribute("d", newD);
        })
        .on("end", async () => {
          const before = sketch._rotateUndoBefore;
          delete sketch._rotateUndoBefore;
          if (rotateLiveD) {
            const finalD = rotateLiveD;
            rotateLiveD = null;
            await wbSaveSketchD(sketch, finalD);
            if (before) wbPushUndo({ action: "move", kind: "sketch", id: sketch.id, before });
          }
          wbScheduleRender();
        })
    );
}

// Coalesce a burst of state changes into one paint.
//
// **This is the cause of the whiteboard feeling "janky and uncomfortable".**
// renderWhiteboard() below is a full d3 data-join over every sketch, node and
// object on the board, and it was called directly from 48 places. A single
// user action routinely touches several of them — move a card, update its
// links, mark the board dirty, refresh the selection — so one drag or one
// paste could repaint the entire board three or four times in the same frame,
// each pass re-joining every item and re-binding every handler.
//
// Nothing here makes the render itself cheaper. It makes it happen once per
// frame instead of once per state change, which is where the wasted work
// actually was. requestAnimationFrame rather than a microtask because the
// point is to land exactly one paint per displayed frame.
//
// **Safe to batch because no caller reads the DOM straight after rendering** —
// checked across all 48 sites before converting them; a call followed by a
// getBoundingClientRect or querySelector would have needed to stay synchronous
// and none was. `renderWhiteboardNow()` is kept for anything that ever does.
let wbRenderQueued = false;

function wbScheduleRender() {
  if (wbRenderQueued) return;
  wbRenderQueued = true;
  requestAnimationFrame(() => {
    wbRenderQueued = false;
    renderWhiteboard();
  });
}

// The unbatched escape hatch. Prefer wbScheduleRender(); use this only when
// the very next statement has to read the rendered DOM.
function renderWhiteboardNow() {
  wbRenderQueued = false;
  renderWhiteboard();
}

function renderWhiteboard() {
  // Built once per render, not once per card: `allEntries.find(...)` inside
  // a per-card callback is O(cards × notebook size) on every single render
  // — for a large notebook that is real, measurable work paid on every
  // whiteboard update, not just once. A note's id never changes shape
  // (string vs number) across a session, so this Map stays valid for the
  // whole render pass below.
  const entriesById = new Map(allEntries.map((e) => [String(e.id), e]));

  document
    .getElementById("wb-empty-hint")
    ?.classList.toggle(
      "hidden",
      // Objects count too — a board holding only a text box or an image is
      // not empty, and left out of this sum the hint sat on top of them.
      // Asked for directly: an option to turn the hint off entirely, once
      // it's served its purpose — `localStorage`, the same durability the
      // onboarding tour's own "don't show again" already uses.
      // `wbHintForcedOpen` overrides both checks — the "?" help button's way
      // back after a dismiss, or on a board that already has content.
      !wbHintForcedOpen &&
        ((wbState.nodes?.length || 0) +
          (wbState.sketches?.length || 0) +
          (wbState.objects?.length || 0) >
          0 || localStorage.getItem("wbEmptyHintDismissed") === "1")
    );

  // Render Sketches (SVG)
  const svgGroup = d3.select("#wb-zoom-group");
  const sketchSelection = svgGroup.selectAll("g.sketch-group")
    .data(wbState.sketches || [], d => d.id);
    
  // Deleting a sketch two ways: "delete" is a click on the one thing you
  // mean to remove; "eraser" is a drag — mouseenter fires for everything the
  // pointer crosses while wbErasing is true, matching how an eraser tool
  // behaves in every other drawing app.
  async function deleteSketch(d) {
    const deletingKey = `sketch:${d.id}`;
    if (wbDeleting.has(deletingKey)) return;
    wbDeleting.add(deletingKey);
    wbPushUndo({
      action: "delete",
      kind: "sketch",
      payload: { data: d.data, board_id: d.board_id, x: d.x, y: d.y, z: d.z },
    });
    try {
      await apiJson(`/whiteboard/sketches/${d.id}`, { method: "DELETE" });
      wbState.sketches = wbState.sketches.filter((s) => s.id !== d.id);
      wbScheduleRender();
    } catch (e) {
      console.error(e);
      wbUndoStack.pop(); // the delete never happened, so neither did the undo entry
    } finally {
      wbDeleting.delete(deletingKey);
    }
  }
  // `deleteSketch`/`deleteNode` are re-created on every render (they close
  // over this render's own `d3` selections), so the Delete-key handler set
  // up once in `initWhiteboard` can't reference them directly — it always
  // needs *this* render's version, not whichever one existed when it was
  // first wired.
  wbDeleteSketchRef = deleteSketch;

  // Move — reported directly: "can't move objects made or drawn on
  // whiteboard". Cards/objects get this from their own `d3.drag`; a sketch
  // never had one at all. Filtered to the Select tool only, the same as a
  // click here means "select" rather than "erase" — under any other tool
  // (pan, a brush, eraser/delete) this must stay out of the way entirely,
  // pan in particular, since the canvas's own zoom/pan drag needs an
  // unclaimed pointerdown to reach it.
  const sketchDrag = d3.drag()
    .filter(() => window.currentTool === "select")
    .on("start", (event, d) => {
      event.sourceEvent.stopPropagation();
      const parsed = wbSketchParsedData(d);
      d._dragOriginalD = parsed ? parsed.d : null;
      d._moveUndoBefore = WB_KIND_INFO.sketch.payload(d);
      // Raw (never-snapped) running totals, applied fresh from the
      // *original* d each frame — the same fix as `dragging`'s own comment
      // above: re-snapping an already-snapped value every frame discards
      // the sub-grid remainder and can get stuck.
      d._dragRawDX = 0;
      d._dragRawDY = 0;
      // Selection itself is deliberately *not* touched here — it lives
      // entirely in the 'click' listener below, which only ever fires for a
      // genuinely unmoved gesture (d3 suppresses the native click once real
      // movement crosses the threshold). Doing it here too, keyed off "did
      // this drag start", was tried and had a real bug: `wbDragIsBulkMove`
      // is also true for a second shift-click meant to *toggle a member
      // back off* an existing multi-selection, so treating every "start" as
      // "begin a bulk move" swallowed that click's toggle entirely — a
      // second shift-click on an already-selected item did nothing.
      // `d._bulkOrigin` itself is decided lazily, on the first real "drag"
      // frame below, for the same reason.
    })
    .on("drag", (event, d) => {
      if (d._dragOriginalD == null) return;
      // First real movement of this gesture — decide once whether this is
      // a solo move or a bulk move of the whole multi-selection. Deferred
      // to here rather than "start" (see its own comment) specifically so
      // a zero-movement click never reaches this at all.
      if (d._bulkOrigin === undefined) {
        d._bulkOrigin = wbDragIsBulkMove("sketch", d.id)
          ? wbCaptureBulkMoveOrigin(wbMultiKey("sketch", d.id))
          : null;
      }
      const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
      d._dragRawDX += event.dx / transform.k;
      d._dragRawDY += event.dy / transform.k;
      const bypassSnap = event.sourceEvent?.altKey;
      const dx = wbSnap(d._dragRawDX, bypassSnap), dy = wbSnap(d._dragRawDY, bypassSnap);
      const newD = wbTransformPathD(d._dragOriginalD, { dx, dy });
      d._dragLiveD = newD;
      const el = document.querySelector(`.sketch-group[data-id="${d.id}"]`);
      el?.querySelector(".sketch-path")?.setAttribute("d", newD);
      el?.querySelector(".sketch-hitbox")?.setAttribute("d", newD);
      if (d._bulkOrigin) wbApplyBulkMove(d._bulkOrigin, dx, dy);
      // Handles would otherwise trail the sketch by a whole render — cheap
      // to keep in step since there are at most 8 of them.
      wbClearSketchHandles();
    })
    .on("end", async (event, d) => {
      if (d._dragOriginalD == null) return;
      const finalD = d._dragLiveD;
      const bulkOrigin = d._bulkOrigin;
      const moveBefore = d._moveUndoBefore;
      delete d._dragOriginalD;
      delete d._dragRawDX;
      delete d._dragRawDY;
      delete d._dragLiveD;
      delete d._bulkOrigin;
      delete d._moveUndoBefore;
      // `finalD`/`bulkOrigin` are only ever set once real movement occurred
      // (in "drag" above) — a zero-movement click leaves both undefined, so
      // this correctly does nothing rather than a wasted save.
      if (finalD) {
        await wbSaveSketchD(d, finalD);
        if (moveBefore) wbPushUndo({ action: "move", kind: "sketch", id: d.id, before: moveBefore });
      }
      if (bulkOrigin) await wbSaveBulkMove(bulkOrigin);
      wbScheduleRender();
    });

  const sketchEnter = sketchSelection.enter()
    .append("g")
    .attr("class", "sketch-group")
    .attr("data-id", d => d.id)
    .style("cursor", () => (window.currentTool === "delete" || window.currentTool === "eraser" || window.currentTool === "select") ? "pointer" : "default")
    .call(sketchDrag)
    .on("click", (event, d) => {
      if (window.currentTool === "select") {
        event.stopPropagation(); // don't also hit the "empty canvas clears selection" handler
        wbHandleItemClick("sketch", d.id, event);
        return;
      }
      // Reported directly, same family as the pen's single-click dot: a
      // plain click with the eraser (no drag across anything) did nothing —
      // only `mouseenter` while `wbErasing` was true caught a stroke, which
      // needs movement to fire at all. The eraser is "delete, but you can
      // also drag across several" — a single click should erase the one
      // thing clicked, the same as the delete tool does.
      if (window.currentTool === "delete" || window.currentTool === "eraser") deleteSketch(d);
      if (window.currentTool === "bucket") { event.stopPropagation(); wbBucketFillSketch(d); }
    })
    .on("pointerenter", (event, d) => {
      if (window.currentTool === "eraser" && wbErasing) deleteSketch(d);
    });

  sketchEnter.append("path")
    .attr("class", "sketch-hitbox")
    .attr("fill", "none")
    .attr("stroke", "transparent")
    .attr("stroke-width", "20")
    // A closed shape (rect/circle/triangle/diamond) reads as solid, so
    // clicking its interior should select it — not just the ~20px band
    // around its outline that's the only sensible hit-area an open pen/line
    // squiggle has. Reported directly ("shapes are hard to select"): every
    // sketch used `pointer-events: stroke`, so a rectangle's hollow middle
    // silently didn't count as a click on it.
    .attr("pointer-events", (d) => wbSketchIsClosedShape(d) ? "all" : "stroke");

  sketchEnter.append("path")
    .attr("class", "sketch-path")
    .attr("fill", "none")
    .attr("stroke-width", "3")
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .attr("pointer-events", "none");

  wbWireContextMenu(sketchEnter, "sketch");

  const sketchUpdate = sketchEnter.merge(sketchSelection);

  sketchUpdate.each(function(d) {
    let pathData = d.data;
    let stroke = "var(--text-color)";
    let strokeWidth = "3";
    let strokeOpacity = 1;
    let fill = "none";
    let fillOpacity = 1;
    let dashArray = null;
    try {
      const parsed = JSON.parse(d.data);
      if (parsed.d) {
        pathData = parsed.d;
        stroke = parsed.noStroke ? "none" : (parsed.color || stroke);
        // Highlighter strokes carry their own width/opacity (see the mouseup
        // handler that writes them) — everything else keeps the defaults
        // above, set explicitly every render so a reused element can't keep
        // a stale highlighter width after its data changes.
        if (parsed.width) strokeWidth = String(parsed.width);
        if (parsed.opacity != null) strokeOpacity = parsed.opacity;
        // Fill/dash — asked for directly ("fill colour/transparency...
        // stroke width, style, and colour"). Absent on any sketch drawn
        // before this existed, which is exactly why these default to "no
        // fill, solid" rather than reading undefined.
        if (parsed.fill) {
          fill = parsed.fill;
          fillOpacity = parsed.fillOpacity != null ? parsed.fillOpacity : 1;
        }
        dashArray = wbDashArray(parsed.dash || "solid", parsed.width || 3);
      } else if (parsed.type && parsed.type.startsWith("link-")) {
        stroke = parsed.color || stroke;
        strokeWidth = String(parsed.width || 3);
        dashArray = wbDashArray(parsed.dash || "solid", parsed.width || 3);
        const endpoints = wbResolveLinkEndpoints(parsed);
        pathData = endpoints ? wbLinkPathD(parsed.type, endpoints.source, endpoints.target, wbLinkCaps(parsed), parsed.width) : "";
      }
    } catch(e) {}
    d3.select(this).select(".sketch-hitbox").attr("d", pathData);
    d3.select(this).select(".sketch-path")
      .attr("d", pathData)
      .attr("stroke", stroke)
      .attr("stroke-width", strokeWidth)
      .attr("stroke-opacity", strokeOpacity)
      .attr("fill", fill)
      .attr("fill-opacity", fillOpacity)
      // `null` removes the attribute entirely (d3's own convention) rather
      // than setting `stroke-dasharray=""`, which some renderers treat as
      // "zero-length dashes" instead of "solid" — a reused element from a
      // dashed sketch must not leave a stale dasharray on a solid one.
      .attr("stroke-dasharray", dashArray);
  });
    
  sketchSelection.exit().remove();

  // Render Nodes (Cards)
  const canvas = d3.select("#wb-html-layer");
  const nodeSelection = canvas.selectAll(".wb-card.node-card")
    .data(wbState.nodes, d => d.id);
    
  async function deleteNode(d) {
    const deletingKey = `node:${d.id}`;
    if (wbDeleting.has(deletingKey)) return;
    wbDeleting.add(deletingKey);
    wbPushUndo({
      action: "delete",
      kind: "node",
      payload: { entry_id: d.entry_id, board_id: d.board_id, x: d.x, y: d.y, z: d.z },
    });
    try {
      await apiJson(`/whiteboard/nodes/${d.id}`, { method: "DELETE" });
      wbState.nodes = wbState.nodes.filter((n) => n.id !== d.id);
      // also delete links connected to it? For MVP just delete the node.
      wbScheduleRender();
    } catch (e) {
      console.error(e);
      wbUndoStack.pop();
    } finally {
      wbDeleting.delete(deletingKey);
    }
  }
  wbDeleteNodeRef = deleteNode; // see the matching comment on wbDeleteSketchRef above

  //: Card resize — asked for directly ("resizing... cards"). `width`/`height`
  //: are nullable (unset means "auto", the CSS-sized default every card used
  //: before this existed); a resize sets them explicitly for the first time.
  //: Shares `resizeDrag`'s own maths (see `renderWbObjects`) rather than a
  //: second copy — the two differ only in which element/datum they close
  //: over, so it's built inline here with the same shape.
  function nodeResizeDrag(handle) {
    let rawDX = 0, rawDY = 0;
    return d3.drag()
      .on("start", (event, d) => {
        event.sourceEvent.stopPropagation();
        rawDX = 0;
        rawDY = 0;
        d._resizeUndoBefore = WB_KIND_INFO.node.payload(d);
      })
      .on("drag", (event, d) => {
        const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
        rawDX += event.dx / transform.k;
        rawDY += event.dy / transform.k;
        const startW = d._resizeStartW ?? (d._resizeStartW = d.width || WB_CARD_DEFAULT_SIZE.w);
        const startH = d._resizeStartH ?? (d._resizeStartH = d.height || WB_CARD_DEFAULT_SIZE.h);
        const startX = d._resizeStartX ?? (d._resizeStartX = d.x);
        const startY = d._resizeStartY ?? (d._resizeStartY = d.y);
        let width = startW, height = startH, x = startX, y = startY;
        if (handle.includes("e")) width = Math.max(WB_OBJECT_MIN_SIZE, startW + rawDX);
        if (handle.includes("w")) width = Math.max(WB_OBJECT_MIN_SIZE, startW - rawDX);
        if (handle.includes("s")) height = Math.max(WB_OBJECT_MIN_SIZE, startH + rawDY);
        if (handle.includes("n")) height = Math.max(WB_OBJECT_MIN_SIZE, startH - rawDY);
        // Reported directly: shift while resizing didn't snap to a square.
        // Only a corner handle has two free axes to lock together — the
        // larger of the two free-form sizes wins. Computed before the x/y
        // anchor adjustment below so a w/n handle's anchor math sees the
        // final, square-constrained size rather than the pre-shift one.
        if (handle.length === 2 && event.sourceEvent.shiftKey) {
          width = height = Math.max(width, height);
        }
        if (handle.includes("w")) x = startX + (startW - width);
        if (handle.includes("n")) y = startY + (startH - height);
        d.width = width;
        d.height = height;
        d.x = x;
        d.y = y;
        const el = document.querySelector(`.node-card[data-id="${d.id}"]`);
        if (el) {
          el.style.width = `${width}px`;
          el.style.height = `${height}px`;
          el.style.transform = wbItemTransform(d);
        }
      })
      .on("end", async (event, d) => {
        delete d._resizeStartW;
        delete d._resizeStartH;
        delete d._resizeStartX;
        delete d._resizeStartY;
        await wbSaveNode(d);
        const before = d._resizeUndoBefore;
        delete d._resizeUndoBefore;
        if (before) wbPushUndo({ action: "move", kind: "node", id: d.id, before });
        wbScheduleRender();
      });
  }

  //: Rotation — asked for directly, more than once ("rotations", "anchor
  //: points, rotations, resizing, cropping"). A single handle above the
  //: item's own top-centre, the same convention every drawing app uses;
  //: `getBoundingClientRect()`'s centre stays correct even mid-rotation
  //: (an axis-aligned box's centre coincides with the true rotation centre
  //: regardless of how far the box itself has turned), so this needs no
  //: zoom/pan math the way position drags do — only the *angle* to the
  //: cursor matters, and angle is unaffected by uniform scale/pan.
  function nodeRotateDrag() {
    return d3.drag()
      .on("start", (event, d) => {
        event.sourceEvent.stopPropagation();
        d._rotateUndoBefore = WB_KIND_INFO.node.payload(d);
      })
      .on("drag", (event, d) => {
        const el = document.querySelector(`.node-card[data-id="${d.id}"]`);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        d.rotation = wbAngleFromCenterDeg(
          rect.left + rect.width / 2, rect.top + rect.height / 2,
          event.sourceEvent.clientX, event.sourceEvent.clientY,
          event.sourceEvent.shiftKey
        );
        el.style.transform = wbItemTransform(d);
      })
      .on("end", async (event, d) => {
        await wbSaveNode(d);
        const before = d._rotateUndoBefore;
        delete d._rotateUndoBefore;
        if (before) wbPushUndo({ action: "move", kind: "node", id: d.id, before });
      });
  }

  const nodeEnter = nodeSelection.enter()
    .append("div")
    .attr("class", "wb-card node-card")
    .attr("data-id", (d) => d.id)
    .style("transform", wbItemTransform)
    .style("width", (d) => (d.width ? `${d.width}px` : ""))
    .style("height", (d) => (d.height ? `${d.height}px` : ""))
    .style("z-index", d => d.z)
    .call(d3.drag()
      // Reported directly: drawing over a note "just moves the note
      // instead" of drawing on it. Cards sit in `#wb-html-layer`, a sibling
      // painted on top of `#wb-svg-layer` — a pointerdown that lands on a
      // card never reaches the SVG layer's own draw listener at all, and
      // this drag (bound directly to the card) intercepted it first
      // regardless of which tool was active. Filtering it out here, rather
      // than only inside the start/drag handlers below, stops d3 from
      // capturing the gesture in the first place, so the same pointerdown
      // is free to bubble to `containerEl`'s brush listener instead.
      // A resize handle (below) owns its own drag — same reasoning as
      // `objDrag`'s own filter, and a real bug this filter's absence caused:
      // without the exclusion, this card-level drag also engaged for the
      // exact same pointerdown, and whichever one's gesture-tracking the
      // browser resolved first silently won, so a resize handle drag never
      // visibly resized anything.
      // `currentTool !== "lasso"`: reported directly ("the lasso tool
      // doesn't work properly") — a lasso loop is meant to start from
      // anywhere, including right at a card's own edge, but this filter
      // (unlike the lasso's own pointerdown listener) never excluded the
      // lasso tool the way it already excludes the brush tools, so a lasso
      // gesture begun on top of a card silently moved the card instead of
      // ever reaching the lasso's own draw logic.
      // `.wb-card-more`: the Show more/less toggle added below — without this
      // exclusion its pointerdown started a card drag the same way a resize
      // handle's did before it was excluded (see that comment above), so the
      // click never registered and the toggle silently did nothing.
      .filter((event) => !WB_BRUSH_TOOLS.has(window.currentTool) && window.currentTool !== "lasso" && !event.ctrlKey && !event.button && !event.target.closest(".wb-resize-handle, .wb-rotate-handle, .wb-card-more"))
      .on("start", dragStart)
      .on("drag", dragging)
      .on("end", dragEndNode))
    .on("click", (event, d) => {
      if (window.currentTool === "select") {
        event.stopPropagation();
        wbHandleItemClick("node", d.id, event);
        return;
      }
      // Same fix as the sketch group above: a single eraser click, no drag,
      // now erases the one card clicked instead of needing movement to
      // trigger a mouseenter.
      if (window.currentTool === "delete" || window.currentTool === "eraser") deleteNode(d);
    })
    .on("pointerenter", (event, d) => {
      if (window.currentTool === "eraser" && wbErasing) deleteNode(d);
    });
      
  // Reported directly: "when I attach notes to a whiteboard I want to see
  // the WHOLE note, not a cut-off version". This used to hard-truncate to
  // 100 plain-text characters with no way back to the rest — worse than the
  // Notes list's own long-note handling, which this now matches: render the
  // full note through the app's real markdown renderer (not textContent —
  // a note can have headings, code, links), clamp it only past a height cap,
  // and give it the same "Show more"/"Show less" control and wording as
  // `.entry-more`, keyed by this whiteboard node's id in `wbExpandedNodes`
  // (not the note's own id — the same note can sit on the board twice).
  nodeEnter.each(function (d) {
    const card = d3.select(this);
    const entry = entriesById.get(String(d.entry_id));
    if (!entry) {
      // **"Loading…" with nothing loading.** `entriesById` is built from
      // `allEntries`, the app's in-memory note list — so a card whose note
      // was created *after* the last `loadEntries()` said "Loading…"
      // forever, because nothing here ever fetched it. Every path that
      // creates a note and immediately places it now refreshes that list
      // first (`wbMindMapAddCard`, `createConceptMap`), which is the real
      // fix; this branch is the honest fallback for the case that remains:
      // a card pointing at a note that has actually been deleted.
      card.append("div").attr("class", "wb-card-content muted").node().textContent =
        "This note is no longer here";
      return;
    }
    // A sketch's actual content is a file attachment, not text — never
    // reflected here before (§89 item 10): thumb_attachment_id/thumb_url
    // covers that, entry.attachments covers a note with a real attached
    // image. Same priority libraryCard() (library.js) already uses. A
    // pasted/dropped image living as inline markdown in entry.content is
    // NOT handled here — that already renders through renderMarkdown below,
    // and would be shown twice if it were.
    const firstImageAttachment = (entry.attachments || []).find((a) => a.is_image);
    const thumbSrc = entry.thumb_attachment_id
      ? mediaSrc(`/files/${entry.thumb_attachment_id}`)
      : entry.thumb_url
      ? mediaSrc(entry.thumb_url)
      : firstImageAttachment
      ? mediaSrc(`/files/${firstImageAttachment.id}`)
      : null;
    if (thumbSrc) {
      card.append("img").attr("class", "wb-card-thumb").attr("src", thumbSrc).attr("alt", "").attr("loading", "lazy");
    }
    const contentEl = card.append("div").attr("class", "wb-card-content").node();
    const text = entry.content || entry.preview || "";
    if (!text) {
      // The thumbnail above IS the content for a sketch/image-only note —
      // "Empty note" next to a picture would read as a bug, not a note.
      if (!thumbSrc) contentEl.textContent = "Empty note";
      return;
    }
    renderMarkdown(contentEl, text);
    const isLong = text.length > LONG_NOTE_CHARS || text.split("\n").length > LONG_NOTE_LINES;
    if (!isLong) return;
    const expanded = () => wbExpandedNodes.has(d.id);
    contentEl.classList.toggle("wb-card-content-clamped", !expanded());
    const toggle = card.append("button")
      .attr("type", "button")
      .attr("class", "entry-more wb-card-more")
      .text(expanded() ? "Show less" : "Show more");
    toggle.on("click", (event) => {
      event.stopPropagation();
      if (expanded()) wbExpandedNodes.delete(d.id);
      else wbExpandedNodes.add(d.id);
      contentEl.classList.toggle("wb-card-content-clamped", !expanded());
      toggle.text(expanded() ? "Show less" : "Show more");
    });
  });

  for (const handle of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) {
    nodeEnter.append("div")
      .attr("class", "wb-resize-handle")
      .attr("data-handle", handle)
      .call(nodeResizeDrag(handle));
  }
  nodeEnter.append("div")
    .attr("class", "wb-rotate-handle")
    .attr("title", "Drag to rotate — hold Shift to snap to 15°")
    .call(nodeRotateDrag());

  wbWireContextMenu(nodeEnter, "node");

  nodeSelection.merge(nodeEnter)
    .style("transform", wbItemTransform)
    .style("width", (d) => (d.width ? `${d.width}px` : ""))
    .style("height", (d) => (d.height ? `${d.height}px` : ""))
    .style("z-index", d => d.z);

  nodeSelection.exit().remove();

  renderWbObjects(canvas);

  // Every element above was just rebuilt, so any `.wb-selected` class set
  // before this render is gone with it — re-apply from the state that
  // actually persists (`wbSelectedItem`), not the DOM.
  wbApplySelectionHighlight();
}

//: Min size a resize can shrink an object to — small enough for a sticky
//: note, too small to lose an image/text box entirely off the canvas.
const WB_OBJECT_MIN_SIZE = 40;

//: One PUT body builder for a node, shared by every call site that saves
//: one (drag-end, resize-end, bulk-move, grouping) — three of those used to
//: each build the body by hand, and it was exactly that duplication that
//: let a save silently drop `group_id` back to null the first time this
//: file added it (nothing reminded the third copy to include the new field).
async function wbSaveNode(node) {
  try {
    const saved = await apiJson(`/whiteboard/nodes/${node.id}`, {
      method: "PUT",
      body: JSON.stringify({
        entry_id: node.entry_id,
        board_id: node.board_id ?? window.currentBoardId ?? null,
        x: node.x, y: node.y, z: node.z,
        width: node.width ?? null, height: node.height ?? null,
        rotation: node.rotation ?? null,
        group_id: node.group_id ?? null,
      }),
    });
    Object.assign(node, saved);
  } catch {
    recordBrowserLog("WARN", [`[Whiteboard] card ${node.id} is stale — reloading the board`]);
    await fetchWhiteboardState();
    wbScheduleRender();
  }
}

async function wbSaveObject(d) {
  const body = {
    kind: d.kind, data: d.data, board_id: d.board_id,
    x: d.x, y: d.y, z: d.z, width: d.width, height: d.height,
    rotation: d.rotation ?? null,
    group_id: d.group_id ?? null,
  };
  try {
    const saved = await apiJson(`/whiteboard/objects/${d.id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    Object.assign(d, saved);
  } catch {
    // Same recoverable-stale-client shape every other whiteboard write here
    // already follows — a 404 means this object (or its board) is gone.
    recordBrowserLog("WARN", [`[Whiteboard] object ${d.id} is stale — reloading the board`]);
    await fetchWhiteboardState();
    wbScheduleRender();
  }
}

// Cards and sketches each render in their own function, inlined into
// renderWhiteboard directly; objects get their own function instead — two
// genuinely different element shapes (an <img>, a contenteditable <div>)
// sharing one drag+resize+select scaffold reads better factored out than
// inlined a third time.
function renderWbObjects(canvas) {
  async function deleteObject(d) {
    const deletingKey = `object:${d.id}`;
    if (wbDeleting.has(deletingKey)) return;
    wbDeleting.add(deletingKey);
    wbPushUndo({ action: "delete", kind: "object", payload: WB_KIND_INFO.object.payload(d) });
    try {
      await apiJson(`/whiteboard/objects/${d.id}`, { method: "DELETE" });
      wbState.objects = wbState.objects.filter((o) => o.id !== d.id);
      wbScheduleRender();
    } catch (e) {
      console.error(e);
      wbUndoStack.pop();
    } finally {
      wbDeleting.delete(deletingKey);
    }
  }
  wbDeleteObjectRef = deleteObject;

  // Shared by both `objDrag` (bound to the whole `.wb-object`) and
  // `gripDrag` (bound only to `.wb-object-grip`, see below) — `this` is
  // whichever element the gesture actually started on, so every DOM write
  // goes through `this.closest(".wb-object")` rather than `this` directly,
  // the same convention `resizeDrag`'s own "drag" handler already uses.
  function objDragStart(event, d) {
    if (window.currentTool === "eraser" || window.currentTool === "delete" || window.currentTool === "bucket") return;
    // `.raise()` deliberately does NOT happen here — moved to objDragMove.
    // See the matching comment on the card drag's own `dragging` for the
    // real bug this caused (raising mid-`start` breaks the browser's click
    // synthesis, so a plain click-to-select on an object never fired).
    // See the matching comment on the card drag's own `dragStart`: a raw,
    // never-snapped running position, so small per-frame deltas actually
    // accumulate instead of being rounded away against the previous
    // frame's already-snapped value.
    d._rawX = d.x;
    d._rawY = d.y;
    d._dragOriginX = d.x;
    d._dragOriginY = d.y;
    d._moveUndoBefore = WB_KIND_INFO.object.payload(d);
    // Bulk-move detection is deliberately deferred to the first real
    // "drag" frame below, not decided here — see the matching comment on
    // the sketch drag's own "start" for the click-toggle bug that caused.
  }
  function objDragMove(event, d) {
    if (window.currentTool === "eraser" || window.currentTool === "delete" || window.currentTool === "bucket") return;
    if (d._bulkOrigin === undefined) {
      d._bulkOrigin = wbDragIsBulkMove("object", d.id)
        ? wbCaptureBulkMoveOrigin(wbMultiKey("object", d.id))
        : null;
    }
    d3.select(this.closest(".wb-object")).raise();
    // d3.drag's dx/dy are raw screen pixels, not board-space — the
    // resize handles below already divide by the zoom scale for exactly
    // this reason; a plain drag has to as well, or a card/object moves
    // faster than the cursor when zoomed out and slower when zoomed in.
    const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
    d._rawX = (d._rawX ?? d.x) + event.dx / transform.k;
    d._rawY = (d._rawY ?? d.y) + event.dy / transform.k;
    const bypassSnap = event.sourceEvent?.altKey;
    d.x = wbSnap(d._rawX, bypassSnap);
    d.y = wbSnap(d._rawY, bypassSnap);
    // Smart alignment guides — asked for directly ("draw.io and Microsoft
    // PowerPoint have... dotted alignment rule guides"). Same Alt bypass as
    // grid-snap just above: holding it means "no snap assistance at all
    // for this drag", one concept, not two separate modifier keys to learn.
    if (!bypassSnap && !d._bulkOrigin) {
      const { dx, dy, guideLines } = wbAlignmentGuides("object", d.id, d.x, d.y, d.width, d.height);
      d.x += dx;
      d.y += dy;
      wbShowAlignmentGuides(guideLines);
    } else {
      wbClearAlignmentGuides();
    }
    d3.select(this.closest(".wb-object")).style("transform", wbItemTransform(d));
    if (d._bulkOrigin) wbApplyBulkMove(d._bulkOrigin, d.x - d._dragOriginX, d.y - d._dragOriginY);
  }
  async function objDragEnd(event, d) {
    if (window.currentTool === "eraser" || window.currentTool === "delete" || window.currentTool === "bucket") return;
    wbClearAlignmentGuides();
    const bulkOrigin = d._bulkOrigin;
    // Reset unconditionally — a solo drag sets this to `null` (see
    // "drag" above), and leaving it there would make the *next* gesture's
    // `=== undefined` check think bulk-move was already decided and skip
    // redetecting it, permanently treating this object as "never bulk"
    // even after it later joins a multi-selection.
    delete d._bulkOrigin;
    await wbSaveObject(d);
    const moveBefore = d._moveUndoBefore;
    delete d._moveUndoBefore;
    if (moveBefore && (moveBefore.x !== d.x || moveBefore.y !== d.y)) {
      wbPushUndo({ action: "move", kind: "object", id: d.id, before: moveBefore });
    }
    if (bulkOrigin) await wbSaveBulkMove(bulkOrigin);
  }

  const objDrag = d3.drag()
    // A resize handle owns its own drag (below); a text box's own text
    // needs plain clicks/selection to reach it, not a canvas-wide drag. And,
    // same reasoning as the card drag's own filter above: a brush tool must
    // be able to draw over an image/text object, not drag it. `.wb-object-grip`
    // has its own separate drag instance (`gripDrag`, below) — excluded here
    // so a grip grab doesn't *also* start this instance for the same
    // gesture. A real bug caught live: excluding it here alone isn't enough
    // — `objDrag` is one shared behaviour object bound to both the object
    // and the grip, so its filter runs for *both* elements' own pointerdown,
    // and target-closest can't tell "the grip's own listener" from "the
    // object's listener catching a bubbled grip click" apart. `gripDrag`
    // below exists precisely because that distinction needs two behaviour
    // objects, not one filter.
    .filter((event) => !WB_BRUSH_TOOLS.has(window.currentTool) && window.currentTool !== "lasso" && !event.target.closest(".wb-resize-handle, .wb-rotate-handle, .wb-text-content, .wb-object-grip"))
    .on("start", objDragStart)
    .on("drag", objDragMove)
    .on("end", objDragEnd);

  // The grip's own drag instance (see the comment above) — `stopPropagation`
  // on start is the same fix `resizeDrag`/`objectRotateDrag` already use to
  // keep their own handle grabs from also bubbling into the object's own
  // `objDrag` listener.
  const gripDrag = d3.drag()
    .filter((event) => !WB_BRUSH_TOOLS.has(window.currentTool) && window.currentTool !== "lasso")
    .on("start", function (event, d) {
      event.sourceEvent.stopPropagation();
      objDragStart.call(this, event, d);
    })
    .on("drag", objDragMove)
    .on("end", objDragEnd);

  function resizeDrag(handle) {
    return d3.drag()
      .on("start", function (event, d) {
        event.sourceEvent.stopPropagation(); // don't also start objDrag
        d._resizeUndoBefore = WB_KIND_INFO.object.payload(d);
      })
      .on("drag", function (event, d) {
        const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
        const dx = event.dx / transform.k;
        const dy = event.dy / transform.k;
        let newWidth = d.width, newHeight = d.height;
        if (handle.includes("e")) newWidth = Math.max(WB_OBJECT_MIN_SIZE, d.width + dx);
        if (handle.includes("w")) newWidth = Math.max(WB_OBJECT_MIN_SIZE, d.width - dx);
        if (handle.includes("s")) newHeight = Math.max(WB_OBJECT_MIN_SIZE, d.height + dy);
        if (handle.includes("n")) newHeight = Math.max(WB_OBJECT_MIN_SIZE, d.height - dy);
        // Reported directly: shift while resizing didn't snap to a square —
        // same fix as nodeResizeDrag's own copy just above.
        if (handle.length === 2 && event.sourceEvent.shiftKey) {
          newWidth = newHeight = Math.max(newWidth, newHeight);
        }
        if (handle.includes("w")) d.x += d.width - newWidth;
        if (handle.includes("n")) d.y += d.height - newHeight;
        d.width = newWidth;
        d.height = newHeight;
        const el = d3.select(this.closest(".wb-object"));
        el.style("width", `${d.width}px`)
          .style("height", `${d.height}px`)
          .style("transform", wbItemTransform(d));
      })
      .on("end", async (event, d) => {
        await wbSaveObject(d);
        const before = d._resizeUndoBefore;
        delete d._resizeUndoBefore;
        if (before) wbPushUndo({ action: "move", kind: "object", id: d.id, before });
      });
  }

  //: Same as `nodeRotateDrag` above — kept as two small copies rather than
  //: one shared function because they close over different elements/PUT
  //: helpers (`.node-card` vs `.wb-object`, `wbSaveNode` vs `wbSaveObject`),
  //: the same reasoning `nodeResizeDrag`'s own comment already gives for not
  //: sharing with `resizeDrag`.
  function objectRotateDrag() {
    return d3.drag()
      .on("start", (event, d) => {
        event.sourceEvent.stopPropagation();
        d._rotateUndoBefore = WB_KIND_INFO.object.payload(d);
      })
      .on("drag", (event, d) => {
        const el = document.querySelector(`.wb-object[data-id="${d.id}"]`);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        d.rotation = wbAngleFromCenterDeg(
          rect.left + rect.width / 2, rect.top + rect.height / 2,
          event.sourceEvent.clientX, event.sourceEvent.clientY,
          event.sourceEvent.shiftKey
        );
        el.style.transform = wbItemTransform(d);
      })
      .on("end", async (event, d) => {
        await wbSaveObject(d);
        const before = d._rotateUndoBefore;
        delete d._rotateUndoBefore;
        if (before) wbPushUndo({ action: "move", kind: "object", id: d.id, before });
      });
  }

  const objectSelection = canvas.selectAll(".wb-object")
    .data(wbState.objects || [], (d) => d.id);

  const objectEnter = objectSelection.enter()
    .append("div")
    .attr("class", (d) => `wb-object wb-object-${d.kind}`)
    .attr("data-id", (d) => d.id)
    .style("transform", wbItemTransform)
    .style("width", (d) => `${d.width}px`)
    .style("height", (d) => `${d.height}px`)
    .style("z-index", (d) => d.z)
    .call(objDrag)
    .on("click", (event, d) => {
      if (window.currentTool === "select") {
        event.stopPropagation();
        wbHandleItemClick("object", d.id, event);
        return;
      }
      if (window.currentTool === "delete" || window.currentTool === "eraser") deleteObject(d);
    })
    .on("pointerenter", (event, d) => {
      if (window.currentTool === "eraser" && wbErasing) deleteObject(d);
    });

  objectEnter.each(function (d) {
    const el = d3.select(this);
    if (d.kind === "image") {
      // Asked for directly: an image deleted out from under a board (via
      // the Library gallery's own delete, or by hand off disk) left a
      // plain broken-image glyph — "there should probably be a placeholder
      // or closable box that says it is deleted in its place." The close
      // button removes the object outright rather than leaving a
      // permanently-broken box on the board.
      el.append("img").attr("src", mediaSrc(d.data.url) || "").attr("alt", "")
        .on("error", function () {
          d3.select(this).remove();
          if (el.select(".wb-object-deleted").empty()) {
            const placeholder = el.append("div").attr("class", "wb-object-deleted");
            placeholder.append("span").text("Image deleted");
            placeholder.append("button")
              .attr("type", "button")
              .attr("class", "ghost small icon-button")
              .attr("title", "Remove this")
              .text("✕")
              .on("click", (event) => { event.stopPropagation(); deleteObject(d); });
          }
        });
    } else {
      // Fill/border, asked for directly (the properties panel) — set on the
      // outer object div, which is what `.wb-object-text`'s own default
      // background/border style, so an unset value falls back to the CSS
      // default rather than an empty override.
      el.style("background", d.data.bg || "").style("border-color", d.data.border_color || "");
      // Asked for directly ("objects are also difficult and annoying to
      // move around"): `.wb-text-content` fills the entire box and both
      // the filter above and its own pointerdown handler below correctly
      // keep drag away from it while typing — which meant the *only*
      // draggable surface left was the ~0.5rem padding strip around the
      // text, the same width as the resize handles that sit right on top
      // of it. A dedicated grip, same convention as the panels' own
      // `.wb-panel-grip`, gives a guaranteed, adequately-sized place to
      // grab regardless of how much text is in the box. Text objects only —
      // an image has no competing contenteditable claim on its body, so it
      // was already fully draggable once the resize-handle bug above was
      // fixed.
      el.append("div")
        .attr("class", "wb-object-grip")
        .attr("title", "Drag to move")
        .text("⠿")
        .call(gripDrag);
      const content = el.append("div")
        .attr("class", "wb-text-content")
        .attr("contenteditable", "true")
        .style("color", d.data.color || "")
        .style("font-size", d.data.font_size ? `${d.data.font_size}px` : "")
        .text(d.data.content || "");
      // Saved on blur, not on every keystroke — a PUT per character would
      // flood the server and make undo/redo of everything *else* land
      // between two half-typed states.
      content.on("blur", function () {
        d.data = { ...d.data, content: this.textContent };
        wbSaveObject(d);
      });
      // Typing is text-box business, not the canvas's — Delete/Backspace
      // here must edit the text, not delete the whole box the way the same
      // keys do when an object is merely *selected*.
      content.on("keydown", (event) => event.stopPropagation());
      content.on("pointerdown", (event) => event.stopPropagation());
    }
    for (const handle of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) {
      el.append("div")
        .attr("class", "wb-resize-handle")
        .attr("data-handle", handle)
        .call(resizeDrag(handle));
    }
    el.append("div")
      .attr("class", "wb-rotate-handle")
      .attr("title", "Drag to rotate — hold Shift to snap to 15°")
      .call(objectRotateDrag());
  });

  wbWireContextMenu(objectEnter, "object");

  const objectUpdate = objectEnter.merge(objectSelection);
  objectUpdate
    .style("transform", wbItemTransform)
    .style("width", (d) => `${d.width}px`)
    .style("height", (d) => `${d.height}px`)
    .style("z-index", (d) => d.z);
  // An image's own src can change (rare — nothing in this UI replaces one
  // yet, but a future paste-to-replace shouldn't need this rewritten) and a
  // text box's saved colour/size might have changed elsewhere (undo/redo);
  // the text itself is deliberately left alone here so a re-render mid-edit
  // (another item moving, say) can't overwrite what's being typed.
  objectUpdate.each(function (d) {
    const el = d3.select(this);
    if (d.kind === "image") {
      el.select("img").attr("src", mediaSrc(d.data.url) || "");
    } else {
      el.style("background", d.data.bg || "").style("border-color", d.data.border_color || "");
      const textEl = el.select(".wb-text-content");
      textEl.style("color", d.data.color || "").style("font-size", d.data.font_size ? `${d.data.font_size}px` : "");
      if (document.activeElement !== textEl.node()) textEl.text(d.data.content || "");
    }
  });

  objectSelection.exit().remove();
}

//: The sketches touching `nodeId`, pre-parsed once. `wbUpdateLinkedSketches`
//: used to do this same JSON.parse-and-scan of *every* sketch on the board on
//: every single mousemove frame of a card drag — a board with a few hundred
//: sketches (strokes plus link lines) turns a drag into dozens of full-board
//: parses a second, visible as stutter on a busy board. `dragStart` below
//: builds this list once per drag instead; a card gains or loses a link only
//: between drags, never mid-drag, so it doesn't need to be live.
function wbLinkedSketchesFor(nodeId) {
  const found = [];
  for (const sketch of wbState.sketches) {
    let parsed;
    try {
      parsed = JSON.parse(sketch.data);
    } catch {
      continue;
    }
    if (!parsed.type || !parsed.type.startsWith("link-")) continue;
    if (parsed.sourceId !== nodeId && parsed.targetId !== nodeId) continue;
    found.push({ sketch, parsed });
  }
  return found;
}

//: Recomputes just the link-sketch paths touching `nodeId`, without a full
//: `wbScheduleRender()` — reported directly as "resizing and drawing shapes
//: is glitchy and slow to update". `dragging` below used to call the full
//: render on every single mousemove frame of a card drag, purely to keep a
//: link line's endpoint following the card — which re-binds *every* card,
//: sketch and object on the board, dozens of times a second, for one card's
//: own link. Mirrors the link-path maths in `renderWhiteboard`'s own
//: `sketchUpdate.each` exactly, so the two can't drift apart.
//: `precomputed`, when given, skips the board-wide scan — see
//: `wbLinkedSketchesFor`'s own comment for why `dragging` always passes one.
function wbUpdateLinkedSketches(nodeId, precomputed) {
  const pairs = precomputed || wbLinkedSketchesFor(nodeId);
  for (const { sketch, parsed } of pairs) {
    const endpoints = wbResolveLinkEndpoints(parsed);
    if (!endpoints) continue;
    const pathData = wbLinkPathD(parsed.type, endpoints.source, endpoints.target, wbLinkCaps(parsed), parsed.width);
    const el = document.querySelector(`.sketch-group[data-id="${sketch.id}"]`);
    el?.querySelector(".sketch-path")?.setAttribute("d", pathData);
    el?.querySelector(".sketch-hitbox")?.setAttribute("d", pathData);
  }
}

function dragStart(event, d) {
  // Eraser/delete don't move cards — a swipe meant to erase a run of cards
  // must not also drag the first one it touches out from under the pointer.
  if (window.currentTool === "eraser" || window.currentTool === "delete" || window.currentTool === "bucket") return;
  if (window.currentTool && window.currentTool.startsWith("link-")) {
    // Real anchors: snap the link's own start to whichever of the source
    // card's 8 fixed points the drag actually began near, so a link from a
    // specific corner stays pinned there through a later resize — `null`
    // (nothing near enough) is the free/floating case, resolved fresh every
    // render in `wbLinkEndpoints` instead of frozen at drag-start.
    const startTransform = d3.zoomTransform(document.getElementById("whiteboard-container"));
    const startRect = document.getElementById("wb-svg-layer").getBoundingClientRect();
    const startX = (event.sourceEvent.clientX - startRect.left - startTransform.x) / startTransform.k;
    const startY = (event.sourceEvent.clientY - startRect.top - startTransform.y) / startTransform.k;
    d.linkSourceAnchor = wbNearestAnchor("node", d, startX, startY);
    wbLinkDragActive = true;
    wbShowAnchorHints("node", d, d.linkSourceAnchor);
    d.linkingPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    d.linkingPath.setAttribute("fill", "none");
    d.linkingPath.setAttribute("stroke", window.currentStrokeColor || "#ffffff");
    d.linkingPath.setAttribute("stroke-width", "3");
    document.getElementById("wb-zoom-group").appendChild(d.linkingPath);
  } else {
    // `.raise()` deliberately does NOT happen here — see the matching
    // comment in `dragging` below for a real bug this caused.
    // Reported directly: "hard to move notes diagonally when on grid lock".
    // `dragging` below used to re-snap the *already-snapped* `d.x`/`d.y`
    // every frame — each small per-frame delta got rounded straight back to
    // the same grid line it started from, discarding the sub-grid remainder
    // instead of carrying it forward, so many frames of real motion could
    // add up to nothing until one single frame happened to cross a whole
    // grid step by itself. A raw (never-snapped) running position, seeded
    // here and only read through `wbSnap` when applying/saving, fixes it:
    // every pixel of real cursor motion accumulates, and only the *display*
    // rounds to the grid.
    d._rawX = d.x;
    d._rawY = d.y;
    d._dragOriginX = d.x;
    d._dragOriginY = d.y;
    // See wbLinkedSketchesFor's own comment: parsed once here rather than on
    // every frame of the drag that's about to start.
    d._linkedSketches = wbLinkedSketchesFor(d.id);
    // Asked for directly: undo should cover a move, not only create/delete.
    // Snapshotted before anything below can mutate `d`.
    d._moveUndoBefore = WB_KIND_INFO.node.payload(d);
    // Bulk-move detection is deliberately deferred to the first real
    // "drag" frame below, not decided here — see the matching comment on
    // the sketch drag's own "start" for the click-toggle bug that caused.
  }
}

function dragging(event, d) {
  if (window.currentTool === "eraser" || window.currentTool === "delete" || window.currentTool === "bucket") return;
  if (window.currentTool && window.currentTool.startsWith("link-")) {
    const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
    const rect = document.getElementById("wb-svg-layer").getBoundingClientRect();
    const mx = (event.sourceEvent.clientX - rect.left - transform.x) / transform.k;
    const my = (event.sourceEvent.clientY - rect.top - transform.y) / transform.k;

    // A fixed source anchor stays put; a floating one re-aims at the live
    // pointer every frame — the same rectangle-intersection the render path
    // uses, not the old fixed centre-point.
    const fixedStart = wbAnchorPoint("node", d, d.linkSourceAnchor);
    const start = fixedStart || wbBoxRayIntersection(wbItemBBox("node", d), mx, my);
    d.linkingPath.setAttribute("d", wbLinkPathD(window.currentTool, start, { x: mx, y: my }));

    // Anchor hints follow whichever node the pointer is currently over, so
    // the drop target's own snap points are visible before release.
    let hoverNode = null;
    for (const node of wbState.nodes) {
      if (node.id === d.id) continue;
      const box = wbItemBBox("node", node);
      if (mx >= box.minX && mx <= box.maxX && my >= box.minY && my <= box.maxY) { hoverNode = node; break; }
    }
    if (hoverNode) wbShowAnchorHints("node", hoverNode, wbNearestAnchor("node", hoverNode, mx, my));
    else wbShowAnchorHints("node", d, d.linkSourceAnchor);
  } else {
    // Pre-existing gap, not introduced this session, caught while adding
    // snap-to-grid here: event.dx/dy are raw screen pixels — the
    // link-drawing branch just above already divides by the zoom scale for
    // the same reason. Without it, a card dragged while zoomed moved faster
    // than the cursor when zoomed out and slower when zoomed in, and snap
    // would round a wrongly-scaled delta.
    if (d._bulkOrigin === undefined) {
      d._bulkOrigin = wbDragIsBulkMove("node", d.id)
        ? wbCaptureBulkMoveOrigin(wbMultiKey("node", d.id))
        : null;
    }
    // Real bug, found live while testing click-to-select on a card: this
    // used to run in `dragStart`, unconditionally, on *every* pointerdown —
    // including a plain click with zero movement. `.raise()` reappends the
    // node as its parent's last child (for z-order while actively
    // dragging), and doing that mid-gesture is enough to make the browser
    // never synthesize the following "click" event at all — confirmed by
    // instrumenting both the card's own click handler and the container's
    // "empty canvas" one and seeing *neither* fire, while an ordinary
    // sketch (whose own drag "start" never calls `.raise()`) selected
    // correctly the same way. Moved here, into `dragging`, which — unlike
    // `dragStart` — only ever runs after real movement has already
    // happened, so a plain click's click event is never touched.
    d3.select(this).raise();
    const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
    d._rawX = (d._rawX ?? d.x) + event.dx / transform.k;
    d._rawY = (d._rawY ?? d.y) + event.dy / transform.k;
    // Asked for directly: Alt held during a drag temporarily releases the
    // grid lock, the same convention Figma/Illustrator use — a per-call
    // bypass rather than touching the snap toggle itself.
    const bypassSnap = event.sourceEvent?.altKey;
    d.x = wbSnap(d._rawX, bypassSnap);
    d.y = wbSnap(d._rawY, bypassSnap);
    // Smart alignment guides — asked for directly ("draw.io and Microsoft
    // PowerPoint have... dotted alignment rule guides"). Same Alt bypass as
    // grid-snap just above: one modifier, "no snap assistance", not two.
    if (!bypassSnap && !d._bulkOrigin) {
      const w = d.width || WB_CARD_DEFAULT_SIZE.w, h = d.height || WB_CARD_DEFAULT_SIZE.h;
      const { dx, dy, guideLines } = wbAlignmentGuides("node", d.id, d.x, d.y, w, h);
      d.x += dx;
      d.y += dy;
      wbShowAlignmentGuides(guideLines);
    } else {
      wbClearAlignmentGuides();
    }
    d3.select(this).style("transform", wbItemTransform(d));
    // Update this card's own link lines directly rather than a full
    // wbScheduleRender() — see wbUpdateLinkedSketches's own comment for why
    // that was the "glitchy and slow to update" report.
    wbUpdateLinkedSketches(d.id, d._linkedSketches);
    if (d._bulkOrigin) wbApplyBulkMove(d._bulkOrigin, d.x - d._dragOriginX, d.y - d._dragOriginY);
  }
}

async function dragEndNode(event, d) {
  if (window.currentTool && window.currentTool.startsWith("link-")) {
    if (d.linkingPath) d.linkingPath.remove();
    d.linkingPath = null;
    wbLinkDragActive = false;
    wbClearAnchorHints();

    const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
    const rect = document.getElementById("wb-svg-layer").getBoundingClientRect();
    const mx = (event.sourceEvent.clientX - rect.left - transform.x) / transform.k;
    const my = (event.sourceEvent.clientY - rect.top - transform.y) / transform.k;

    let targetNode = null;
    for (const node of wbState.nodes) {
       if (node.id === d.id) continue;
       const box = wbItemBBox("node", node);
       if (mx >= box.minX && mx <= box.maxX && my >= box.minY && my <= box.maxY) {
           targetNode = node; break;
       }
    }

    if (targetNode) {
       // The release point's own nearest anchor on the target, same as the
       // source got at drag-start — `null` (nothing near enough) persists
       // as a free/floating end, same as the source's own case.
       const targetAnchor = wbNearestAnchor("node", targetNode, mx, my);
       const sketchData = {
         data: JSON.stringify({
            type: window.currentTool,
            sourceId: d.id,
            targetId: targetNode.id,
            color: window.currentStrokeColor || "#ffffff",
            sourceAnchor: d.linkSourceAnchor || undefined,
            targetAnchor: targetAnchor || undefined,
         }),
         x: 0, y: 0, z: 1,
         board_id: window.currentBoardId
       };
       try {
         const res = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify(sketchData) });
         wbState.sketches.push(res);
         wbPushUndo({ action: "create", kind: "sketch", id: res.id });
         wbScheduleRender();
       } catch (err) {
         console.error(err);
       }
    }
    d.linkSourceAnchor = null;
  } else {
    wbClearAlignmentGuides();
    // Sync back to API.
    //
    // `board_id` has to go with it. The server takes the whole node on a PUT,
    // so omitting it read as "move this to the global board" — dragging a card
    // on a named board silently moved it off that board.
    //
    // And a 404 here is recoverable rather than fatal: it means this client's
    // copy of the board is stale (the note was purged, or the board was
    // rebuilt). Refetching puts the screen back in step; leaving it, as this
    // did, shows a card sitting where you dropped it that is not saved
    // anywhere — the worst of both answers.
    await wbSaveNode(d);
    // The directly-dragged item's own move-undo. A bulk drag's *other*
    // members don't get one each — undo after a group move puts back only
    // the card actually dragged, not the whole group; a real limitation,
    // not attempted further this session.
    const moveBefore = d._moveUndoBefore;
    delete d._moveUndoBefore;
    if (moveBefore && (moveBefore.x !== d.x || moveBefore.y !== d.y)) {
      wbPushUndo({ action: "move", kind: "node", id: d.id, before: moveBefore });
    }
    // Reset unconditionally, even when this gesture wasn't a bulk move —
    // see the matching comment in objDrag's own "end" for why leaving a
    // solo drag's `null` in place would break bulk-move detection later.
    const bulkOrigin = d._bulkOrigin;
    delete d._bulkOrigin;
    if (bulkOrigin) await wbSaveBulkMove(bulkOrigin);
  }
}

// The Whiteboards sub-tab's own two controls. This DOMContentLoaded
// listener used to also hold the #library-subtabs switcher and the
// Documents/Media sub-tabs' refresh/search/upload wiring — none of that is
// whiteboard's own code (it switches between and wires OTHER Library
// sub-tabs), and it has moved to library.js, which is the Library's actual
// home now (ROADMAP.md §88.3 flagged this as "an accident worth fixing
// while splitting"). Only these two survive here, unchanged.
document.addEventListener("DOMContentLoaded", () => {
  $("wb-boards-new")?.addEventListener("click", async () => {
    wbShowCanvasView();
    await createNewBoard();
  });
  $("wb-back-to-boards")?.addEventListener("click", wbShowBoardsLanding);
  $("library-boards-search")?.addEventListener("input", renderLibraryBoardsGallery);
  // The Reload button beside "+ New board". Its id says `library-media-refresh`
  // — a copy-paste leftover from the Media sub-tab's own refresh button, and
  // the reason it was missed: library.js wires the Media one by that name, so
  // a search for the id finds a listener, just not one attached to *this*
  // button. It sits in the Whiteboards header and had none of its own, so it
  // did nothing. Renaming the id would be the tidier fix and is not worth
  // breaking a selector over; wiring it is what makes it work.
  $("library-media-refresh")?.addEventListener("click", renderLibraryBoardsGallery);
});

// The Whiteboards tab has two views sharing one subtab: a boards gallery
// (the landing view) and the actual canvas — asked for directly, replacing
// two separate doors onto the whiteboard (a bare canvas tab defaulting to
// whatever board was last open, plus a picker tab) with one. Canvas init
// is lazy and idempotent (`wbInitialized` guards it), so switching between
// the two views repeatedly costs nothing after the first time.
function wbShowCanvasView() {
  $("wb-boards-landing")?.classList.add("hidden");
  $("wb-canvas-view")?.classList.remove("hidden");
  setTimeout(initWhiteboard, 50);
}

function wbShowBoardsLanding() {
  // First, because the boards list lives inside the element full screen
  // pins to the viewport — see `wbLeaveFullscreen` for what that looked
  // like when it was left on.
  wbLeaveFullscreen();
  $("wb-canvas-view")?.classList.add("hidden");
  $("wb-boards-landing")?.classList.remove("hidden");
  renderLibraryBoardsGallery();
}

async function renderLibraryBoardsGallery() {
  const grid = $("library-boards-grid");
  const empty = $("library-boards-empty");
  const noMatch = $("library-boards-no-match");
  if (!grid) return;
  const boards = await apiJson("/whiteboard/boards", { silent: true }).catch(() => null);
  if (!boards) { grid.replaceChildren(); empty?.classList.remove("hidden"); noMatch?.classList.add("hidden"); return; }
  // See `createNewBoard`'s own comment: a board with nothing on it yet
  // doesn't come back from the server at all.
  const created = window.wbLastCreatedBoard;
  if (created && !boards.some((b) => b.id === created.id)) {
    boards.push({ ...created, node_count: 0, sketch_count: 0, object_count: 0 });
  }
  const needle = ($("library-boards-search")?.value || "").trim().toLowerCase();
  const shown = needle ? boards.filter((b) => b.title.toLowerCase().includes(needle)) : boards;
  grid.replaceChildren();
  if (!shown.length) {
    const isFilteredEmpty = Boolean(needle) && boards.length > 0;
    empty?.classList.toggle("hidden", isFilteredEmpty);
    noMatch?.classList.toggle("hidden", !isFilteredEmpty);
    if (noMatch && isFilteredEmpty) {
      noMatch.textContent = `No boards match “${needle}”.`;
    }
    return;
  }
  empty?.classList.add("hidden");
  noMatch?.classList.add("hidden");
  for (const board of shown) {
    // An `<article>` with role="button", the same shape libraryCard() and
    // the Documents subtab's doc-list-item use — a plain <button> can't
    // also host the kebab menu's own <button>, and reported live: "can't
    // rename or delete a board from the Whiteboards subtab", the exact gap
    // that shape already closed for documents.
    const card = document.createElement("article");
    card.className = "library-card library-board-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    const open = () => openWhiteboardBoard(board.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target !== card) return; // a key pressed inside the menu is its own
      event.preventDefault();
      open();
    });

    const top = document.createElement("div");
    top.className = "library-card-top";
    const icon = document.createElement("span");
    icon.className = "library-card-icon";
    setLabel(icon, "ph:squares-four");
    icon.setAttribute("aria-hidden", "true");
    top.appendChild(icon);

    const title = document.createElement("strong");
    title.className = "library-card-title";
    title.textContent = board.title;

    const nodeCount = board.node_count || 0;
    const sketchCount = board.sketch_count || 0;
    const objectCount = board.object_count || 0;
    const total = nodeCount + sketchCount + objectCount;
    const parts = [];
    if (nodeCount) parts.push(`${nodeCount} card${nodeCount === 1 ? "" : "s"}`);
    if (sketchCount) parts.push(`${sketchCount} sketch${sketchCount === 1 ? "" : "es"}`);
    if (objectCount) parts.push(`${objectCount} image${objectCount === 1 ? "" : "s"}`);
    const meta = document.createElement("span");
    meta.className = "muted library-card-meta";
    meta.textContent = parts.length ? parts.join(" · ") : "Empty board";

    // **A thumbnail of the board itself**, rather than the same icon on every
    // card. Asked for directly: the Boards & maps sub-tab is "boring and
    // should probably have previews". `preview_points` is up to 40 of the
    // board's card positions, already normalised into 0..1 against the
    // board's own bounds by `routes_whiteboard._preview_points` — so this
    // draws the real layout without the client ever holding the board.
    //
    // Built as inline SVG with attributes rather than a `style` string: this
    // app's CSP rejects inline styles outright, and thirty-five of them
    // shipped once as silently-dead markup (CLAUDE.md, "a policy silently
    // refusing the work"). An empty board draws nothing and keeps its
    // "Empty board" line, which says more than a blank rectangle would.
    const points = Array.isArray(board.preview_points) ? board.preview_points : [];
    if (points.length) {
      const NS = "http://www.w3.org/2000/svg";
      const map = document.createElementNS(NS, "svg");
      map.setAttribute("class", "board-minimap");
      map.setAttribute("viewBox", "0 0 100 56");
      map.setAttribute("preserveAspectRatio", "none");
      map.setAttribute("aria-hidden", "true");
      for (const [nx, ny] of points) {
        const dot = document.createElementNS(NS, "rect");
        // Inset by the dot's own size so a card at the extreme edge of the
        // board is drawn inside the thumbnail rather than half outside it.
        dot.setAttribute("x", String(3 + nx * 88));
        dot.setAttribute("y", String(3 + ny * 44));
        dot.setAttribute("width", "9");
        dot.setAttribute("height", "6");
        dot.setAttribute("rx", "1.5");
        map.appendChild(dot);
      }
      card.append(top, title, map, meta);
    } else {
      card.append(top, title, meta);
    }

    // The default (id === null) scratch board isn't a note and can't be
    // renamed or deleted the way a real board (a plain Entry — see
    // create_board in routes_whiteboard.py) can.
    if (board.id !== null) {
      const menu = kebabMenu(
        [
          makeMenuItem("ph:pencil-simple Rename", "Rename this board", async () => {
            const next = await promptDialog("Rename this board:", board.title);
            if (!next) return;
            await apiJson(`/whiteboard/boards/${board.id}`, {
              method: "PUT",
              body: JSON.stringify({ title: next }),
            }).catch((e) => toast(e.message, true));
            renderLibraryBoardsGallery();
          }),
          makeMenuItem("ph:trash Delete", "Delete this board", async () => {
            if (!(await confirmDialog(`Delete "${board.title}"? This cannot be undone.`))) return;
            await apiJson(`/entries/${board.id}`, { method: "DELETE" }).catch((e) => toast(e.message, true));
            renderLibraryBoardsGallery();
          }),
        ],
        `Actions for "${board.title}"`
      );
      menu.classList.add("library-card-menu");
      menu.addEventListener("click", (event) => event.stopPropagation());
      card.appendChild(menu);
    }

    grid.appendChild(card);
  }
}

//: Leaving the canvas has to leave full screen with it.
//:
//: Reported: "if i am still in whiteboard fullscreen and press the back to
//: boards button, the ui is broken." It was: `wb-fullscreen` pins
//: `#library-view-whiteboard` to `position: fixed; inset: 0` at z-index
//: 1000, and the *boards list* lives inside that same element — so going
//: back left the list covering the entire window, over the app header, the
//: Library sub-tabs and everything else, with no visible way out because the
//: control that turns it off is on the canvas you just left.
//:
//: Called from every exit rather than only from the back button: the board
//: picker, a board card and the Library sub-tabs can all take you off the
//: canvas too, and each would have had the same bug.
function wbLeaveFullscreen() {
  document.getElementById("library-view-whiteboard")?.classList.remove("wb-fullscreen");
  const button = document.getElementById("wb-fullscreen");
  if (button) {
    button.classList.remove("is-on");
    button.title = "Full screen (Esc to leave)";
    const icon = button.querySelector("i");
    if (icon) icon.className = "ph ph-arrows-out";
  }
}

// Jump to the real whiteboard canvas with a specific board loaded.
async function openWhiteboardBoard(boardId) {
  switchTab("library");
  const wbSubtab = document.querySelector('#library-subtabs button[data-target="library-view-whiteboard"]');
  wbSubtab?.click();
  wbShowCanvasView();
  await new Promise((resolve) => setTimeout(resolve, 60));
  window.currentBoardId = boardId ?? null;
  await fetchWhiteboardState();
  wbScheduleRender();
  wbApplyBgImage();
}

/** A new concept map: a board that opens with a core idea on it, selected
 *  and ready to branch from.
 *
 *  Asked for directly: "I want ways to make custom knowledge graphs that are
 *  like mindmaps where I can add and remove nodes, move them around, change
 *  how they connect and reasons, and just make my own thought process map",
 *  and on where it belongs, "I should be able to make and manage map graphs
 *  (maybe in library??)".
 *
 *  **Deliberately not a new canvas.** Everything a concept map needs already
 *  exists on the whiteboard — freely placed cards whose positions persist, a
 *  link tool, `Tab` for a new branch off the selected card and `Enter` for a
 *  sibling, "Arrange as mind map" to re-tidy, pan/zoom, undo, spaces,
 *  export. A parallel implementation would have been a second set of all of
 *  that, immediately behind on every fix either one got.
 *
 *  So what this adds is the three things that were actually missing, and
 *  they are all about *entry*:
 *
 *  1. **A name.** Nothing in the app said the words "concept map", so the
 *     feature was reachable only through a button called "New board" on a
 *     tab called Whiteboards. A feature nobody can name is a feature nobody
 *     finds — reported as missing while fully built.
 *  2. **A root.** An empty board is a blank rectangle; `Tab` and `Enter` do
 *     nothing until something is selected, so the one gesture that makes
 *     this a mind map was unreachable from the state the board opens in.
 *  3. **The gestures, said out loud, once**, at the moment they apply.
 *
 *  The map is a board, so a concept map exported to the whiteboard is a
 *  concept map — which closes the "maybe with a way to export that into a
 *  visual diagram on the whiteboard" half of the ask by construction rather
 *  than by building an exporter.
 */
async function createConceptMap() {
  const name = await promptDialog("What is this map about?", "");
  if (!name || !name.trim()) return;
  const title = name.trim();
  try {
    const board = await apiJson("/whiteboard/boards", {
      method: "POST",
      body: JSON.stringify({ name: title }),
    });
    // The root idea is a real note, the same as every other card on a board.
    // That is the app's own premise rather than a shortcut: an idea here *is*
    // a short note, which is what lets a map node carry tags, links, search
    // and everything else a note has. `defer_filing` keeps the AI's
    // categorisation off the critical path — the map should open now.
    const root = await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({ content: `# ${title}`, tags: [], defer_filing: true }),
    });
    await apiJson("/whiteboard/nodes", {
      method: "POST",
      body: JSON.stringify({
        entry_id: root.id,
        board_id: board.id,
        // Centre of the default view. The board opens unzoomed and unpanned,
        // so this is where the middle of the canvas is.
        x: 400,
        y: 260,
        z: 1,
      }),
    });
    window.wbLastCreatedBoard = board;
    // Same reason as `wbMindMapAddCard`: the root card reads its text out of
    // `allEntries`, and this note is newer than the last fetch.
    await loadEntries();
    await openWhiteboardBoard(board.id);
    // Selected, because `Tab`/`Enter` act on the selection and an unselected
    // root leaves the map's whole point one undiscoverable click away.
    const placed = wbState.nodes.find((n) => n.entry_id === root.id);
    if (placed) selectWbItem("node", placed.id);
    toast(`“${title}” — press Tab for a branch, Enter for a sibling.`);
  } catch (err) {
    toast(err.message || "Couldn't create that map.", true);
  }
}
window.createConceptMap = createConceptMap;

/** Full screen for the board — asked for directly ("the whiteboard
 *  definately needs a fullscreen mode because it feels too squished").
 *
 *  Measured before building: the canvas is 1376x676 inside a 1440x900
 *  window, so a quarter of the height is the app header, the Library
 *  sub-tab bar and the status bar. None of those help while drawing.
 *
 *  The class goes on `#library-view-whiteboard`, not on `#wb-canvas-view`.
 *  That looks like the wrong element and is not: `#wb-canvas-view` is a
 *  wrapper whose children are all absolutely positioned, so it measures
 *  **0px tall** — giving it `position: fixed; inset: 0` would size it, but
 *  the board would then be sized by a parent that had not been, which is
 *  the shape of bug this file already has a comment about further down.
 *  `#library-view-whiteboard` is the element that actually carries the
 *  board's height today, so it is the one to promote.
 *
 *  Escape leaves, matching every other full-screen surface in the app.
 */
function toggleWhiteboardFullscreen(force) {
  const host = document.getElementById("library-view-whiteboard");
  if (!host) return;
  // Only a real boolean forces a state; anything else (notably a DOM event
  // arriving from a listener registered by reference) means "toggle". Belt
  // and braces with the arrow at the call site — this one is what makes the
  // function safe to pass around at all.
  const on =
    typeof force === "boolean" ? force : !host.classList.contains("wb-fullscreen");
  host.classList.toggle("wb-fullscreen", on);
  const button = document.getElementById("wb-fullscreen");
  if (button) {
    button.classList.toggle("is-on", on);
    button.title = on ? "Leave full screen (Esc)" : "Full screen (Esc to leave)";
    const icon = button.querySelector("i");
    if (icon) icon.className = on ? "ph ph-arrows-in" : "ph ph-arrows-out";
  }
  // d3's zoom reads the container's size when it clamps a pan, and the
  // floating panels are positioned against it — neither notices a class
  // change on an ancestor on its own.
  window.dispatchEvent(new Event("resize"));
}

// Escape leaves full screen. Capture phase and a check that we are actually
// in it, so this never swallows an Escape meant for a dialog opened *over*
// the board (the properties panel's own inputs, a confirm) — those are the
// common case and closing the whole board instead would be maddening.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const host = document.getElementById("library-view-whiteboard");
  if (!host || !host.classList.contains("wb-fullscreen")) return;
  if (document.querySelector(".modal-overlay:not(.hidden), .lightbox")) return;
  toggleWhiteboardFullscreen(false);
});
