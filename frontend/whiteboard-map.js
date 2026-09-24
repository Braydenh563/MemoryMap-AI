// whiteboard-map.js: the mind map layer (split out of whiteboard.js on
// 2026-09-24).
//
// What is here: a board with a real tree on it (MINDMAP_PLAN.md §5, from
// Phase 2 on), as one contiguous block moved verbatim out of whiteboard.js:
// the map's kinds, themes, perspectives, focus, metrics and templates; the
// node builder and painter; branch drag and drop, transplant and join; the
// edges (anchors, curves, ribbons, labels, the plus points); editing a map
// (add, outdent, navigate, delete); tidy (Reingold-Tilford with variable
// node sizes); the cross-link tool; the edit strip; the node and link radial
// menus; and the map's chrome, layout and pin-on-drag. No function was
// renamed and none changed.
//
// What stayed in whiteboard.js: the concept map (`wbArrangeMindMap` and the
// `wbMindMap*` helpers just above where this block was, which work on cards
// joined by link sketches, a different data model: see this file's own
// "maps:" section comment), the selection, the object renderer that calls
// into this file, and `initWhiteboard`, which wires the map's controls.
//
// **Loaded in the Library bundle, before whiteboard.js** (`LAZY_MODULES` in
// app.js), for the reason documents-code.js gives: measured with a scope
// analysis of both files, this file's top level reads nothing from
// whiteboard.js (declarations, tables, `window.wbMapState = null` and two
// window listeners that clear this file's own cache), while whiteboard.js's
// top-level wiring names functions defined here. Listed first, every one of
// them exists before whiteboard.js runs.

// --- maps: a board with a real tree on it (MINDMAP_PLAN.md §5, Phase 2) -----
//
// The backend half (§9) already stores, serves and exports all of this. Until
// this section existed the object renderer drew only `image` and `text`, so a
// map's nodes were in the database, in `GET /tree` and in every export except
// the one place anyone would look for them, the canvas. That is the blocker
// §9.3 names, and everything below is the frontend half of it.
//
// **This is not `wbArrangeMindMap` in whiteboard.js.** That is the concept
// map: whiteboard *cards* (a card is a real note) joined by link sketches,
// with a spanning tree inferred by BFS because a link carries no direction. A
// map node is a `WhiteboardObject` with a real `parent_id`, so its tree is
// stored rather than guessed, and a `topic` can exist with no note behind it.
// MINDMAP_PLAN.md §9.2 records why the two data models stayed separate. They
// share a canvas and nothing else, and neither function here calls that one.

//: The object kinds that are map nodes. `topic` is text that lives only on
//: the map; the other four are pointers at library items, drawn with that
//: item's own icon and its *resolved* title, never a copy of it, since a
//: copied title goes stale the moment the note behind it is renamed (§9.2).
const WB_MAP_KINDS = new Set(["topic", "note", "document", "file", "link"]);
const WB_MAP_REFERENCE_KINDS = new Set(["note", "document", "file", "link"]);

//: The Phosphor icon per kind, matching what the same item already shows in
//: the Library: a node has to read as the same object in both places, and
//: picking a second icon for a document here is exactly how it stops doing so.
const WB_MAP_ICONS = {
  topic: "ph-circle",
  note: "ph-note",
  document: "ph-file-text",
  file: "ph-paperclip",
  link: "ph-link-simple",
};

//: How far apart `wbMapTidy` puts things: the gap between two siblings on the
//: breadth axis, and between one depth and the next. Deliberately *not*
//: `MAP_ROW`/`MAP_COL` from routes_whiteboard.py: those are where the server
//: drops a node when nobody said, which only has to be "not on top of its
//: parent"; a tidy layout measures real node sizes and needs only the gap.
const WB_MAP_GAP_BREADTH = 26;
const WB_MAP_GAP_DEPTH = 76;

//: A node's size when it is not in the DOM, collapsed away, or being laid
//: out before its first paint. Matches `wbMapCreateNode`'s own defaults, so a
//: tidy run immediately after a Tab does not jump when the node then renders.
const WB_MAP_NODE_W = 200;
const WB_MAP_NODE_H = 56;

//: What the open board is, as far as maps are concerned: `{type, layout,
//: labels, crossLinks}`, or `null` on an ordinary whiteboard (which is every
//: board that predates this feature, and stays one).
//:
//: On `window` because library.js's gallery asks too, and a module-level
//: `let` here would be invisible to it, the same reason `window.currentBoardId`
//: lives there rather than here.
window.wbMapState = null;

function wbIsMap() {
  return window.wbMapState?.type === "map";
}

function wbMapLayout() {
  return window.wbMapState?.layout || "free";
}

//: **The map's own look** (MINDMAP_PLAN.md §13e). Ten of the eleven things a
//: topic can be given are set here once for the whole map, and a topic that
//: was never told otherwise follows. `{}` for every map that has never been
//: themed, which is every map made before this existed, so the fast path out
//: of `wbMapThemedData` is the one an unthemed map takes.
//: One frozen empty object rather than a fresh `{}` per call, and a `for
//: ... in` rather than `Object.keys` below, for one reason: this is called
//: once per node and three or four times per edge on every render and every
//: drag frame, and 13a's whole finding was that the drag's cost was per-member
//: work nobody noticed writing. An allocation per edge per frame is exactly
//: that shape.
const WB_MAP_NO_THEME = Object.freeze({});

function wbMapTheme() {
  return window.wbMapState?.theme || WB_MAP_NO_THEME;
}

//: One node's data with the map's theme underneath it: what this topic
//: actually draws, as opposed to what it was told.
//:
//: **The node always wins, and `false` is a value.** This is the whole of the
//: theme's safety: a field the topic carries is left alone, so a map-wide
//: change can never overwrite a choice somebody made. `null`, `undefined` and
//: `""` all mean "nothing was chosen here" (`wbMapSetNodeStyle` writes `null`
//: to unset, and every select in the strip stores `""` as no value at all),
//: while an explicit `false` is somebody saying "not on this one" against a
//: theme that says on: the same three-state `edge_arrow` has always used.
//:
//: Resolved on every read rather than written onto the nodes, which is what
//: makes changing the theme one request instead of one per topic, and what
//: makes it reversible.
function wbMapThemedData(node) {
  const data = node?.data || {};
  const theme = wbMapTheme();
  let merged = null;
  for (const field in theme) {
    const own = data[field];
    if (own !== undefined && own !== null && own !== "") continue;
    if (!merged) merged = { ...data };
    merged[field] = theme[field];
  }
  return merged || data;
}

//: What this topic would draw for one field if it said nothing: the map's, or
//: `undefined` for the app's own. The strip's write handlers ask, so that
//: choosing what the topic already draws stores nothing rather than pinning
//: it (`edge_arrow`'s rule, applied to the rest of the strip).
function wbMapThemeDefault(field) {
  return wbMapTheme()[field];
}

//: What a strip toggle writes when it is pressed: `true`, `false` or `null`.
//:
//: `null` is "say nothing and follow the map", which is the right answer only
//: when the map is not already saying the opposite: on a themed map the
//: unset state *is* the theme's, so turning a themed-on field off has to be
//: stored as an explicit `false`. Three values rather than two because a
//: boolean cannot hold three states, and the third one ("I chose off") is the
//: only thing that distinguishes a deliberate choice from an untouched topic.
function wbMapToggleValue(node, field) {
  const want = !wbMapThemedData(node)[field];
  const fallback = Boolean(wbMapThemeDefault(field));
  if (want === fallback) return null;
  return want ? true : false;
}

//: Refresh `window.wbMapState` from `GET /boards/{id}/tree`.
//:
//: One request, because that endpoint is the only one carrying all three
//: things this needs: the board's `type`, its `layout`, and the **resolved
//: label** of every reference node. `GET /whiteboard/` returns objects whose
//: `data.ref_id` says which note a node points at and nothing about what that
//: note is called: so without this a map full of notes draws as a column of
//: identical blank boxes.
//:
//: Structure is deliberately *not* taken from here. `parent_id` is already on
//: every object `GET /whiteboard/` returned, so the tree is rebuilt locally on
//: every render (`wbMapIndex`) and a Tab keypress redraws immediately instead
//: of waiting on a round trip to be told what it already knows. This call is
//: for the two facts only the server has.
async function wbRefreshMapState() {
  const boardId = window.currentBoardId ?? null;
  if (!boardId) {
    // The default scratch board has no note behind it, so it has nowhere to
    // store settings and is always an ordinary board (`list_boards`' own
    // comment says so). Nothing to ask for.
    window.wbMapState = null;
    return null;
  }
  try {
    const tree = await apiJson(`/whiteboard/boards/${boardId}/tree`, { silent: true });
    const labels = new Map();
    const facets = new Map();
    // Iterative and seen-guarded: `parent_id` has no database constraint
    // behind it (§9.1), so a ring is possible in principle and has to end this
    // walk rather than the tab.
    const frontier = [...(tree.roots || [])];
    const seen = new Set();
    while (frontier.length) {
      const node = frontier.pop();
      if (!node || seen.has(node.id)) continue;
      seen.add(node.id);
      labels.set(node.id, node.text || "");
      //: What the notebook knows about the note behind this node, for the
      //: perspectives (§5 item 19). Only reference nodes have any, and only
      //: the server can resolve it, so it rides along with the labels rather
      //: than being a second request per node.
      if (node.ref_category || node.ref_updated_at) {
        facets.set(node.id, {
          category: node.ref_category || null,
          updated_at: node.ref_updated_at || null,
        });
      }
      frontier.push(...(node.children || []));
    }
    window.wbMapState = {
      type: tree.type,
      layout: tree.layout,
      theme: tree.theme && typeof tree.theme === "object" ? tree.theme : {},
      labels,
      facets,
      crossLinks: tree.cross_links || [],
    };
  } catch {
    // A board that 404s here (the default board; a note deleted mid-session)
    // is simply not a map. Failing soft matters because this runs on every
    // board load: an ordinary whiteboard must not break because of it.
    window.wbMapState = null;
  }
  return window.wbMapState;
}

// --- Phase 5: perspectives, focus, metrics, templates ------------------------
//
//: MINDMAP_PLAN.md §5 items 18 to 21. Four things that make a map worth
//: keeping rather than worth making, and all four are *views* of the same
//: tree: none of them changes a node, and nothing here writes to the server
//: except a template, which creates nodes exactly as the keyboard does.
//:
//: They live together because they share one idea. A map's own structure is
//: all the canvas knew: which node is whose child, and what each is called.
//: The notebook knows more than that about half the nodes, what they are
//: filed under and when they were last touched, and item 19's own note says
//: this is "the thing a general mindmapper cannot do". `wbMapState.facets`
//: is that knowledge, resolved server-side in `/tree` (a reference node's
//: category and age) and never guessed here.

//: What a node's colour means. Branch is Coggle's rule and the default: the
//: other three answer a question about the notebook instead.
const WB_MAP_PERSPECTIVES = [
  { key: "branch", label: "Branch", hint: "Coggle's own rule: one colour per first-level branch" },
  { key: "category", label: "Category", hint: "The category each note behind a node is filed under" },
  { key: "age", label: "Age", hint: "When the note behind each node was last edited" },
  { key: "notes", label: "Behind a note", hint: "Which nodes stand for a real note and which are just topics" },
];

//: Kept in the browser, not on the board: a perspective is how *you* are
//: looking at a map right now, not a property of the map, and two people
//: opening the same notebook should not change each other's view. Same
//: reasoning as the Library's Cards/Rows preference, which is stored the same
//: way.
function wbMapPerspective() {
  try {
    const stored = localStorage.getItem("wbMapPerspective");
    return WB_MAP_PERSPECTIVES.some((p) => p.key === stored) ? stored : "branch";
  } catch {
    return "branch";
  }
}

function wbMapSetPerspective(key) {
  try {
    localStorage.setItem("wbMapPerspective", key);
  } catch {
    // A browser with storage switched off still gets the view it asked for
    // for this session; it just will not be remembered.
  }
  wbSyncMapChrome();
  renderWhiteboardNow();
}

//: The categories and ages the tree endpoint resolved, by node id. Empty for
//: every topic (a topic has nothing behind it) and for a private note, whose
//: facts stay behind the same boundary its text does.
function wbMapFacets() {
  return window.wbMapState?.facets || new Map();
}

//: Age, in the four buckets a person actually thinks in. Not a continuous
//: ramp: "how old is this" is answered as today / this week / this month /
//: older, and a gradient over six months makes two notes a fortnight apart
//: look identical anyway.
const WB_MAP_AGE_BUCKETS = [
  { key: "today", label: "Today", days: 1 },
  { key: "week", label: "This week", days: 7 },
  { key: "month", label: "This month", days: 31 },
  { key: "older", label: "Older", days: Infinity },
];

function wbMapAgeBucket(iso) {
  if (!iso) return null;
  const then = Date.parse(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`);
  if (Number.isNaN(then)) return null;
  const days = (Date.now() - then) / 86400000;
  return WB_MAP_AGE_BUCKETS.find((bucket) => days < bucket.days) || WB_MAP_AGE_BUCKETS[3];
}

//: The palette every perspective draws from, `d3.schemeTableau10`, which is
//: what branch colour already uses and what `graph.js` colours clusters with.
//: One scale for the whole app rather than a second list of hex per view.
function wbMapPalette() {
  return (window.d3?.schemeTableau10 || []).slice(0, 10);
}

//: A grey for "this node has nothing to say under this perspective": a topic
//: with no note behind it, or a note whose category is unknown. Read off the
//: stylesheet rather than written here, so it follows the theme: a hard-coded
//: grey is invisible in dark mode, which is the failure `--wb-branch` was
//: introduced to avoid.
function wbMapQuietColour() {
  const style = getComputedStyle(document.documentElement);
  return (style.getPropertyValue("--muted") || "#8a8f98").trim();
}

//: Every node's colour under the current perspective, `Map<id, colour>`, the
//: same shape `wbMapColors` returns, so the renderer, the edge pass and the
//: export all keep taking one map and asking it for a colour.
function wbMapNodeColors(index) {
  const perspective = wbMapPerspective();
  if (perspective === "branch") return wbMapColors(index);
  const facets = wbMapFacets();
  const palette = wbMapPalette();
  const quiet = wbMapQuietColour();
  const colors = new Map();

  if (perspective === "notes") {
    for (const node of index.nodes) {
      colors.set(node.id, WB_MAP_REFERENCE_KINDS.has(node.kind) ? palette[0] : quiet);
    }
    return colors;
  }
  if (perspective === "age") {
    for (const node of index.nodes) {
      const bucket = wbMapAgeBucket(facets.get(node.id)?.updated_at);
      const at = bucket ? WB_MAP_AGE_BUCKETS.indexOf(bucket) : -1;
      // Newest darkest: `schemeBlues[4]` runs light to dark, so the index is
      // read from the end. More ink on the thing you touched today is the
      // reading a ramp is for.
      const blues = window.d3?.schemeBlues?.[4];
      colors.set(node.id, at < 0 || !blues ? quiet : blues[blues.length - 1 - at]);
    }
    return colors;
  }
  // Category. The order is the order they appear walking the tree, so the
  // same map draws the same colours twice running.
  const seen = new Map();
  for (const node of index.nodes) {
    const name = facets.get(node.id)?.category;
    if (!name) {
      colors.set(node.id, quiet);
      continue;
    }
    if (!seen.has(name)) seen.set(name, palette[seen.size % palette.length] || quiet);
    colors.set(node.id, seen.get(name));
  }
  return colors;
}

//: What the colours mean, on screen, while they are on screen. A view that
//: recolours a map and does not say what the colours are is a puzzle: the
//: legend is the difference between "these are blue" and "these were edited
//: this week".
function wbRenderMapLegend(passed = null) {
  const box = document.getElementById("wb-map-legend");
  if (!box) return;
  const perspective = wbMapPerspective();
  if (!wbIsMap() || perspective === "branch") {
    box.hidden = true;
    box.replaceChildren();
    return;
  }
  const index = passed || wbMapIndex();
  const facets = wbMapFacets();
  const palette = wbMapPalette();
  const quiet = wbMapQuietColour();
  const rows = [];
  if (perspective === "notes") {
    rows.push({ label: "Stands for a note", colour: palette[0] });
    rows.push({ label: "A topic of its own", colour: quiet });
  } else if (perspective === "age") {
    const blues = window.d3?.schemeBlues?.[4] || [];
    WB_MAP_AGE_BUCKETS.forEach((bucket, at) => {
      rows.push({ label: bucket.label, colour: blues[blues.length - 1 - at] || quiet });
    });
    rows.push({ label: "No note behind it", colour: quiet });
  } else {
    const seen = new Map();
    for (const node of index.nodes) {
      const name = facets.get(node.id)?.category;
      if (!name || seen.has(name)) continue;
      seen.set(name, palette[seen.size % palette.length] || quiet);
    }
    for (const [name, colour] of seen) rows.push({ label: name, colour });
    rows.push({ label: "No note behind it", colour: quiet });
  }

  const title = document.createElement("span");
  title.className = "wb-map-legend-title";
  title.textContent = `Colour: ${WB_MAP_PERSPECTIVES.find((p) => p.key === perspective)?.label || perspective}`;
  const list = document.createElement("div");
  list.className = "wb-map-legend-rows";
  for (const row of rows) {
    const line = document.createElement("span");
    line.className = "wb-map-legend-row";
    const swatch = document.createElement("i");
    swatch.className = "wb-map-legend-swatch";
    swatch.setAttribute("aria-hidden", "true");
    // Through the CSSOM, not an inline `style` attribute in markup: the CSP
    // drops those (CLAUDE.md, "a policy silently refusing the work").
    swatch.style.background = row.colour;
    const text = document.createElement("span");
    text.textContent = row.label;
    line.append(swatch, text);
    list.appendChild(line);
  }
  box.replaceChildren(title, list);
  box.hidden = false;
}

//: **Focus** (§5 item 18, Kumu's): start at one node and reveal the map a
//: step at a time, so a map of two hundred nodes can be read as the six that
//: matter right now.
//:
//: Never persisted, unlike the perspective above: focus is a gesture inside
//: one reading of a map, and coming back tomorrow to a map that only shows
//: four of its nodes, with no memory of having asked for that, is a map that
//: looks broken.
let wbMapFocusState = null;

//: How far focus reaches by default. One step shows the node, its parent and
//: its children, which is the smallest view that still says where you are.
const WB_MAP_FOCUS_DEFAULT_DEPTH = 1;
const WB_MAP_FOCUS_MAX_DEPTH = 6;

//: Everything focus is hiding: every node more than `depth` steps from the
//: focused one, counting parents, children *and* cross-links.
//:
//: Cross-links count because a map's own answer to "what is near this" cannot
//: exclude the edges the user drew to say exactly that; and the walk is a
//: plain breadth-first one over an undirected view of the tree, because
//: "near" is not a direction.
function wbMapFocusHidden(index) {
  const hidden = new Set();
  if (!wbMapFocusState) return hidden;
  const start = index.byId.get(wbMapFocusState.id);
  if (!start) {
    // The focused node was deleted while focus was on. Clearing it here
    // rather than leaving an empty canvas: a view pinned to something that no
    // longer exists shows nothing and explains nothing.
    wbMapFocusState = null;
    return hidden;
  }
  const near = new Map([[start.id, 0]]);
  const queue = [start.id];
  const crossed = new Map();
  for (const link of window.wbMapState?.crossLinks || []) {
    if (!crossed.has(link.source_id)) crossed.set(link.source_id, []);
    if (!crossed.has(link.target_id)) crossed.set(link.target_id, []);
    crossed.get(link.source_id).push(link.target_id);
    crossed.get(link.target_id).push(link.source_id);
  }
  while (queue.length) {
    const id = queue.shift();
    const step = near.get(id);
    if (step >= wbMapFocusState.depth) continue;
    const node = index.byId.get(id);
    const neighbours = [
      ...(index.childrenOf.get(id) || []).map((child) => child.id),
      ...(node?.parent_id != null && index.byId.has(node.parent_id) ? [node.parent_id] : []),
      ...(crossed.get(id) || []),
    ];
    for (const next of neighbours) {
      if (near.has(next) || !index.byId.has(next)) continue;
      near.set(next, step + 1);
      queue.push(next);
    }
  }
  for (const node of index.nodes) {
    if (!near.has(node.id)) hidden.add(node.id);
  }
  return hidden;
}

//: Everything not on screen: a collapsed branch, and whatever focus is
//: holding back. One function so the renderer, the arrow keys and the edge
//: pass cannot disagree about what is visible, which is how a key once moved
//: the selection to a node nobody could see.
function wbMapConcealed(index) {
  // A copy, not the set `wbMapHidden` returned: adding focus's own hidden ids
  // to that one would be this function editing another function's answer.
  const concealed = new Set(wbMapHidden(index));
  for (const id of wbMapFocusHidden(index)) concealed.add(id);
  return concealed;
}

function wbMapSetFocus(id, depth = WB_MAP_FOCUS_DEFAULT_DEPTH) {
  const index = wbMapIndex();
  if (!index.byId.has(id)) return;
  wbMapFocusState = { id, depth: Math.max(1, Math.min(WB_MAP_FOCUS_MAX_DEPTH, depth)) };
  wbSyncMapFocusChrome();
  renderWhiteboardNow();
}

function wbMapClearFocus() {
  if (!wbMapFocusState) return;
  wbMapFocusState = null;
  wbSyncMapFocusChrome();
  renderWhiteboardNow();
}

function wbMapStepFocus(by) {
  if (!wbMapFocusState) return;
  wbMapSetFocus(wbMapFocusState.id, wbMapFocusState.depth + by);
}

//: The focus bar: what is focused, how far it reaches, and the way out.
//:
//: Over the canvas rather than in the top bar, beside the gesture hints, for
//: two reasons: the bar is already fifteen controls wide, and a state this
//: strong (most of the map is not being drawn) has to be visible *where the
//: map is*, not in a strip above it that the eye has learned to skip.
function wbSyncMapFocusChrome(passed = null) {
  const bar = document.getElementById("wb-map-focus");
  if (!bar) return;
  if (!wbIsMap() || !wbMapFocusState) {
    bar.hidden = true;
    return;
  }
  const label = document.getElementById("wb-map-focus-label");
  const depth = document.getElementById("wb-map-focus-depth");
  const index = passed || wbMapIndex();
  const node = index.byId.get(wbMapFocusState.id);
  const name = node ? wbMapLabel(node) : "";
  if (label) label.textContent = name.length > 40 ? `${name.slice(0, 39)}…` : name;
  const shown = index.nodes.length - wbMapFocusHidden(index).size;
  if (depth) {
    depth.textContent = `${wbMapFocusState.depth} step${wbMapFocusState.depth === 1 ? "" : "s"}, ${shown} of ${index.nodes.length} nodes`;
  }
  bar.hidden = false;
}

//: **Map metrics** (§5 item 20), and only the honest ones. Node count, depth
//: and how much of the map stands for something real are facts about this
//: tree; "influence" and the rest of the centrality family need a graph with
//: cycles in it to mean anything, so the one graph measure here is the count
//: of cross-links, which is the thing that makes a map a network at all.
//:
//: An orphan branch is a root that is not the *first* root: a map has one
//: trunk by construction (the creation flow makes one), so a second root is
//: either deliberate or a node that lost its parent, and either way it is
//: worth being told about rather than left to be noticed.
function wbMapStats(index) {
  const facets = wbMapFacets();
  let deepest = 0;
  const depthOf = new Map();
  for (const root of index.roots) {
    const stack = [[root, 1]];
    while (stack.length) {
      const [node, depth] = stack.pop();
      if (depthOf.has(node.id)) continue;
      depthOf.set(node.id, depth);
      deepest = Math.max(deepest, depth);
      for (const child of index.childrenOf.get(node.id) || []) stack.push([child, depth + 1]);
    }
  }
  const references = index.nodes.filter((n) => WB_MAP_REFERENCE_KINDS.has(n.kind));
  const leaves = index.nodes.filter((n) => !(index.childrenOf.get(n.id) || []).length);
  const widest = index.nodes.reduce(
    (best, node) => {
      const kids = (index.childrenOf.get(node.id) || []).length;
      return kids > best.kids ? { node, kids } : best;
    },
    { node: null, kids: 0 }
  );
  const filed = new Set();
  for (const node of index.nodes) {
    const name = facets.get(node.id)?.category;
    if (name) filed.add(name);
  }
  return {
    nodes: index.nodes.length,
    topics: index.nodes.length - references.length,
    references: references.length,
    depth: deepest,
    roots: index.roots.length,
    orphans: Math.max(0, index.roots.length - 1),
    leaves: leaves.length,
    crossLinks: (window.wbMapState?.crossLinks || []).length,
    collapsed: index.nodes.filter((n) => n.data?.collapsed).length,
    categories: filed.size,
    widest: widest.node ? { label: wbMapLabel(widest.node), kids: widest.kids } : null,
  };
}

//: --- the map's own look (MINDMAP_PLAN.md §13e) -----------------------------
//:
//: The owner, INBOX 305: "the customisation features are lacking severely."
//: §13.4 measured what that meant and it was not the topic: a topic has
//: eleven fields, and the map as a whole had none, so every one of the eleven
//: was set one topic at a time and "Reset to branch" on a single node was the
//: only bulk operation of any kind.
//:
//: **Ten fields, and the question that chose them** is asked once of each:
//: does this describe *this topic*, or how *this map* draws topics? An icon,
//: a core mark, a picture, a link out, a line's label and a line's waypoint
//: are the first kind, and a map-wide default for any of them would be a bug
//: rather than a theme. The ten below are the second.
const WB_MAP_THEME_GROUPS = [
  {
    label: "Text",
    fields: [
      { key: "font_size", label: "Size", kind: "select", number: true, options: [
        ["", "The app's own"], ["12", "S"], ["19", "L"], ["25", "XL"],
      ] },
      { key: "align", label: "Alignment", kind: "select", options: [
        ["", "The app's own"], ["left", "Left"], ["center", "Centre"], ["right", "Right"],
      ] },
      { key: "bold", label: "Bold", kind: "check" },
      { key: "italic", label: "Italic", kind: "check" },
    ],
  },
  {
    label: "The topic box",
    fields: [
      { key: "shape", label: "Box", kind: "select", options: [
        ["", "Rounded"], ["pill", "Pill"], ["rect", "Box"],
        ["ellipse", "Ellipse"], ["none", "Plain"],
      ] },
      { key: "spine", label: "Edge bar", kind: "select", options: [
        ["", "Solid bar"], ["dashed", "Dashed bar"], ["none", "No bar"],
      ] },
    ],
  },
  {
    label: "The branch line",
    fields: [
      { key: "edge_style", label: "Shape", kind: "select", options: [
        ["", "Curved line"], ["elbow", "Elbow line"], ["straight", "Straight line"],
      ] },
      { key: "edge_width", label: "Thickness", kind: "select", options: [
        ["", "Line"], ["thin", "Thin line"], ["thick", "Thick line"],
      ] },
      { key: "edge_dashed", label: "Dashed", kind: "check" },
      { key: "edge_arrow", label: "Arrowhead", kind: "select", options: [
        ["", "As the line draws"], ["on", "Always"], ["off", "Never"],
      ] },
    ],
  },
];

//: Write one patch onto the map's theme and redraw.
//:
//: One request whatever the map's size, because the theme is resolved when a
//: topic is painted rather than written onto every topic: that is what makes
//: it reversible, and what makes a deliberate per-topic choice impossible to
//: overwrite with it.
async function wbMapSetTheme(patch) {
  const boardId = window.currentBoardId;
  if (!boardId || !wbIsMap()) return false;
  try {
    await apiJson(`/whiteboard/boards/${boardId}`, {
      method: "PUT",
      body: JSON.stringify({ theme: patch }),
    });
    const theme = { ...wbMapTheme() };
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === false || value === "") delete theme[key];
      else theme[key] = value;
    }
    window.wbMapState = { ...window.wbMapState, theme };
    renderWhiteboardNow();
    const selected = wbSelectedMapNode();
    if (selected) wbSyncMapStrip(selected);
    return true;
  } catch (err) {
    toast(err.message || "Couldn't change how this map draws.", true);
    return false;
  }
}

//: **"Back to the branch" at the map's scope, not a second idea** (§13e).
//: The ring's reset drops one topic's own look so it follows what it
//: inherits; with a theme, what a topic inherits is the map, so the same
//: sentence said about every topic is the bulk operation §13.4 found missing.
//: One endpoint and one transaction, `move-many`'s own reason: a reset that
//: is one request per topic leaves a two-hundred-topic map half done if any
//: one of them fails.
async function wbMapClearEveryTopic() {
  const boardId = window.currentBoardId;
  if (!boardId || !wbIsMap()) return;
  const ok = await confirmDialog(
    "Every topic goes back to following this map, losing the colours, shapes "
    + "and line styles that were set on them one at a time. Pictures stay.",
    { confirmLabel: "Back to the map", cancelLabel: "Leave them" }
  );
  if (!ok) return;
  try {
    const out = await apiJson(`/whiteboard/boards/${boardId}/nodes/clear-style`, { method: "POST" });
    const count = Number(out?.cleared) || 0;
    //: A full re-fetch rather than a patch of `wbState`: the endpoint dropped
    //: a key from every topic's data in one transaction, and the objects this
    //: tab is holding are now wrong about all of them.
    await fetchWhiteboardState();
    renderWhiteboardNow();
    toast(count
      ? `${count} topic${count === 1 ? "" : "s"} back to following this map.`
      : "Every topic was already following this map.");
  } catch (err) {
    toast(err.message || "Couldn't reset the topics.", true);
  }
}

//: The dialog, from the recipe index's own two rows: a `.card.modal-card`
//: through the app's helper (`wbInfoDialog`), a plain `<select>` for a
//: dropdown of values and a `label.setting-check` for an on/off. Nothing new
//: is drawn on the canvas for it: §13b took the topic strip from fourteen
//: controls to five and §13's decision 5 says nothing is added, so this is
//: one row inside the View menu's existing Map section.
//:
//: Every control saves as it is changed, the way the View menu's own
//: background and grid do; there is no OK, because a dialog of looks with an
//: OK asks what you are agreeing to when what you want is to watch the map
//: change behind it.
function wbMapThemeDialog() {
  if (!wbIsMap()) {
    toast("A theme is a map's: this board is a free canvas.");
    return;
  }
  const body = document.createElement("div");
  body.className = "wb-map-theme";
  const lead = document.createElement("p");
  lead.className = "muted wb-map-theme-lead";
  lead.textContent = "Every topic that was never given one of these follows the map.";
  body.appendChild(lead);

  for (const group of WB_MAP_THEME_GROUPS) {
    const head = document.createElement("h4");
    head.className = "setting-subhead";
    head.textContent = group.label;
    body.appendChild(head);
    for (const field of group.fields) {
      body.appendChild(field.kind === "check"
        ? wbMapThemeCheck(field)
        : wbMapThemeSelect(field));
    }
  }

  const foot = document.createElement("div");
  foot.className = "row wb-map-theme-foot";
  const reset = smallButton(
    "ph:arrow-counter-clockwise Bring every topic back to the map",
    "Drop the look set on each topic one at a time, so they all follow this map",
    () => { close(); wbMapClearEveryTopic(); }
  );
  foot.appendChild(reset);
  body.appendChild(foot);
  const close = wbInfoDialog("How this map draws topics", body);
}

function wbMapThemeSelect(field) {
  //: A `div`, not a `label`, deliberately: `enhanceSelect` leaves the real
  //: `<select>` in the DOM aria-hidden at 1px and draws its own opener beside
  //: it, so a label wrapping one sends the click to the half nobody can see.
  //: The name is on the select itself instead (`aria-label`).
  const row = document.createElement("div");
  row.className = "wb-menu-row wb-map-theme-row";
  const name = document.createElement("span");
  name.textContent = field.label;
  const select = document.createElement("select");
  select.className = "ghost small";
  select.setAttribute("aria-label", `${field.label}, for every topic on this map`);
  for (const [value, label] of field.options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }
  select.value = String(wbMapTheme()[field.key] ?? "");
  select.addEventListener("change", () => {
    const raw = select.value;
    //: `null`, not `""`: the empty option is "this map says nothing", and the
    //: endpoint reads a null as the field being dropped from the theme.
    const value = raw === "" ? null : (field.number ? Number(raw) : raw);
    wbMapSetTheme({ [field.key]: value });
  });
  row.append(name, select);
  return row;
}

function wbMapThemeCheck(field) {
  const row = document.createElement("label");
  row.className = "setting-check wb-map-theme-check";
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = Boolean(wbMapTheme()[field.key]);
  const name = document.createElement("span");
  name.textContent = field.label;
  //: `null` rather than `false` when it is turned off, for the reason the
  //: whole theme is a sparse blob: a map that says nothing about a field
  //: draws exactly the map that was drawn before any of this existed.
  box.addEventListener("change", () => {
    wbMapSetTheme({ [field.key]: box.checked ? true : null });
  });
  row.append(box, name);
  return row;
}

function wbShowMapStats() {
  if (!wbIsMap()) {
    toast("Stats are about a map's tree: this board is a free canvas.");
    return;
  }
  const stats = wbMapStats(wbMapIndex());
  const rows = [
    ["Nodes", `${stats.nodes} (${stats.references} from the library, ${stats.topics} topics of their own)`],
    ["Depth", `${stats.depth} level${stats.depth === 1 ? "" : "s"}`],
    ["Ends", `${stats.leaves} node${stats.leaves === 1 ? "" : "s"} with nothing under them`],
    ["Widest branch", stats.widest ? `${stats.widest.label} (${stats.widest.kids} children)` : "None yet"],
    ["Cross-links", `${stats.crossLinks}`],
    ["Categories behind it", `${stats.categories}`],
    ["Collapsed", `${stats.collapsed}`],
  ];
  if (stats.orphans) {
    rows.push([
      "Loose roots",
      `${stats.orphans} branch${stats.orphans === 1 ? "" : "es"} not hanging off the first one`,
    ]);
  }
  const body = document.createElement("dl");
  body.className = "wb-map-stats";
  for (const [term, value] of rows) {
    const name = document.createElement("dt");
    name.textContent = term;
    const said = document.createElement("dd");
    said.textContent = value;
    body.append(name, said);
  }
  wbInfoDialog("What this map is made of", body);
}

//: A read-only dialog: a title, a block of content, one way out.
//:
//: `confirmDialog` is the app's dialog for a *question*, and its shape says
//: so: a sentence and two buttons, one of them destructive by default.
//: Reporting facts through it would put an OK and a Cancel under a table of
//: numbers, which asks the reader what they are agreeing to.
function wbInfoDialog(title, body) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay confirm-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", title);
  const card = document.createElement("div");
  card.className = "card modal-card confirm-card";
  const head = document.createElement("div");
  head.className = "row confirm-head";
  const heading = document.createElement("h3");
  heading.className = "confirm-title";
  heading.textContent = title;
  head.appendChild(heading);
  const row = document.createElement("div");
  row.className = "row confirm-actions";
  const returnFocus = document.activeElement;
  const close = () => {
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
    returnFocus?.focus?.();
  };
  const onKey = (event) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    close();
  };
  row.append(smallButton("Close", "Close", close, false));
  card.append(head, body, row);
  overlay.appendChild(card);
  wireBackdropClose(overlay, close);
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  //: The close, handed back: a dialog whose body holds an action that leads
  //: somewhere else (the map theme's "bring every topic back") has to be able
  //: to get out of the way first, because the confirmation it opens installs
  //: its own capture-phase Escape handler behind this one's.
  return close;
}

//: **Templates** (§5 item 21). The plan's reason, quoted: "an empty canvas is
//: the main reason mindmap features go unused."
//:
//: Offered on the canvas of a map that has nothing but its root, and never
//: again after that: this is the one moment the offer helps, and a panel that
//: kept appearing over a map someone was building would be the opposite of
//: helpful. Dismissing it is remembered per board.
//:
//: Each template is a plain nested list, applied by creating nodes through
//: the same endpoint Tab uses. No new endpoint and no server-side template
//: table: a template *is* a few Tab presses, and writing it as data here
//: keeps it that way.
const WB_MAP_TEMPLATES = [
  {
    key: "brainstorm",
    label: "Brainstorm",
    hint: "Ideas, questions and what to do next",
    nodes: [
      { text: "Ideas", children: [{ text: "First idea" }] },
      { text: "Questions", children: [{ text: "What do I not know yet?" }] },
      { text: "Themes" },
      { text: "Next steps" },
    ],
  },
  {
    key: "decision",
    label: "Decision",
    hint: "Options, what they cost, and what would change your mind",
    nodes: [
      { text: "Options", children: [{ text: "Option A" }, { text: "Option B" }] },
      { text: "What matters", children: [{ text: "Cost" }, { text: "Time" }] },
      { text: "Risks" },
      { text: "What would change my mind" },
    ],
  },
  {
    key: "project",
    label: "Project",
    hint: "Goal, milestones, tasks and who is involved",
    nodes: [
      { text: "Goal" },
      { text: "Milestones", children: [{ text: "First milestone" }] },
      { text: "Tasks" },
      { text: "People" },
      { text: "Risks" },
    ],
  },
  {
    key: "causes",
    label: "Cause and effect",
    hint: "Ishikawa's four: people, process, tools, surroundings",
    nodes: [
      { text: "People" },
      { text: "Process" },
      { text: "Tools" },
      { text: "Surroundings" },
      { text: "What actually happened" },
    ],
  },
];

//: The three panels, resynced together.
//:
//: Called from the render as well as from `wbSyncMapChrome`, because all three
//: describe the map as it is *now*: the template offer has to go the moment a
//: second node exists, the legend has to grow a row when a node arrives from a
//: category nothing else on the map is filed under, and the focus bar counts
//: nodes. Syncing them only on board load left the offer sitting over a map
//: someone had already started building.
//:
//: `index` is passed in where the caller already has one: `wbMapIndex` walks
//: every object, and the render has just done that.
function wbSyncMapViews(index = null) {
  wbSyncMapFocusChrome(index);
  wbRenderMapLegend(index);
  wbRenderMapTemplates();
  wbSyncMapTemplates(index);
  wbSyncMapEmpty(index);
}

//: The way back from an empty map.
//:
//: Reported: "if i delete all nodes in a mindmap, I cant make more nodes."
//: Measured on the running app before touching anything: a map with zero
//: nodes drew no node to press Tab against, no node to right-click, and the
//: template offer is dismissible for good per board, so a map someone had
//: cleared had no route to a first topic at all.
//:
//: Shown at zero nodes only. At one node the template offer takes over, which
//: is the richer thing to say at that moment, and the two would otherwise
//: stack over the same canvas.
function wbSyncMapEmpty(passed = null) {
  const panel = document.getElementById("wb-map-empty");
  if (!panel) return;
  const index = wbIsMap() ? passed || wbMapIndex() : null;
  panel.hidden = !index || index.nodes.length > 0;
}

function wbMapTemplatesDismissedKey(boardId) {
  return `wbMapTemplatesDone:${boardId}`;
}

//: Shown when the map is still just its root, which is exactly when a
//: starting shape is worth offering and never after.
function wbSyncMapTemplates(passed = null) {
  const panel = document.getElementById("wb-map-templates");
  if (!panel) return;
  const boardId = window.currentBoardId;
  let dismissed = false;
  try {
    dismissed = Boolean(boardId && localStorage.getItem(wbMapTemplatesDismissedKey(boardId)));
  } catch {
    dismissed = false;
  }
  const index = wbIsMap() ? passed || wbMapIndex() : null;
  // Not while focus is on: they share the strip under the top bar, and a map
  // being read one branch at a time is not a map anyone wants a starting shape
  // for.
  panel.hidden = !index || dismissed || Boolean(wbMapFocusState) || index.nodes.length > 1;
  wbSyncMapFirstHint(index);
}

//: **The first-open hint, shown once for this browser** (MINDMAP_PLAN §12.5,
//: "the empty map says how to start"; the audit in `agent-remaining/mindmap.md`
//: found six actions reachable only from a ring nobody meets by accident).
//:
//: The lifetime the decision asks for is "gone on the first topic added and
//: never shown again", which is a *browser* flag rather than the templates
//: card's own per-board one: the point of the sentence is to teach that a topic
//: carries a ring, and a person who has built a branch has learned it. So the
//: flag is written the moment any map is seen with more than its root, which is
//: the same event the templates offer withdraws on.
//:
//: Written on the way past rather than on a node-created event on purpose:
//: this runs on every map render, so a map built in another tab, imported from
//: an outline or grown by the agent retires the hint just as a Tab press does.
const WB_MAP_FIRST_HINT_KEY = "wbMapFirstHintDone";

function wbSyncMapFirstHint(index) {
  const hint = document.getElementById("wb-map-first-hint");
  if (!hint) return;
  let done = false;
  try {
    done = Boolean(localStorage.getItem(WB_MAP_FIRST_HINT_KEY));
  } catch {
    // A browser that refuses storage shows the hint every time, which is the
    // gentler of the two failures: the alternative is never showing it.
    done = false;
  }
  if (!done && index && index.nodes.length > 1) {
    done = true;
    try {
      localStorage.setItem(WB_MAP_FIRST_HINT_KEY, "1");
    } catch {
      // Same reason as above.
    }
  }
  hint.hidden = done;
}

function wbDismissMapTemplates() {
  try {
    if (window.currentBoardId) {
      localStorage.setItem(wbMapTemplatesDismissedKey(window.currentBoardId), "1");
    }
  } catch {
    // Not remembering the dismissal is a smaller failure than refusing to
    // dismiss it, so this is deliberately silent.
  }
  wbSyncMapTemplates();
}

//: Fill the map from a template, under whatever root it already has.
//:
//: Sequential rather than parallel on purpose: every child needs its parent's
//: real id, and a template is a dozen nodes at most, so this is a fraction of
//: a second either way and the order the nodes land in is the order they are
//: written here.
async function wbApplyMapTemplate(key) {
  const template = WB_MAP_TEMPLATES.find((t) => t.key === key);
  if (!template || !wbIsMap()) return;
  const index = wbMapIndex();
  const root = index.roots[0] || null;
  let made = 0;
  const place = async (nodes, parentId) => {
    for (const node of nodes) {
      const created = await wbMapCreateNode({ parentId, text: node.text });
      if (!created) return;
      made += 1;
      if (node.children?.length) await place(node.children, created.id);
    }
  };
  await place(template.nodes, root ? root.id : null);
  wbDismissMapTemplates();
  await wbRefreshMapState();
  await wbMapTidy({ quiet: true });
  renderWhiteboardNow();
  toast(`Started from the ${template.label.toLowerCase()} template: ${made} nodes.`);
}

//: The template panel's own buttons, built once from the list above so a
//: fifth template is one entry rather than one entry and one button.
function wbRenderMapTemplates() {
  const row = document.getElementById("wb-map-template-row");
  if (!row || row.childElementCount) return;
  for (const template of WB_MAP_TEMPLATES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost small";
    button.dataset.wbTemplate = template.key;
    button.textContent = template.label;
    button.title = template.hint;
    button.addEventListener("click", () => wbApplyMapTemplate(template.key));
    row.appendChild(button);
  }
}

//: The board's map nodes as a tree, rebuilt from `wbState.objects`.
//:
//: **A node whose parent is not on this board is a root**, which is why this
//: is not a walk down from `parent_id == null`. Same rule as `_build_tree`
//: server-side, for the same reason (§9.1): a stale pointer would otherwise
//: make every node under it vanish from the canvas while still sitting in the
//: database, which is the worst way to lose something.
function wbMapIndex() {
  const nodes = (wbState.objects || []).filter((o) => WB_MAP_KINDS.has(o.kind));
  const byId = new Map(nodes.map((o) => [o.id, o]));
  const childrenOf = new Map();
  const roots = [];
  for (const obj of nodes) {
    const parent = obj.parent_id != null ? byId.get(obj.parent_id) : null;
    if (!parent || parent.id === obj.id) {
      roots.push(obj);
    } else {
      if (!childrenOf.has(parent.id)) childrenOf.set(parent.id, []);
      childrenOf.get(parent.id).push(obj);
    }
  }
  // Creation order throughout, so a sibling added with Enter lands after the
  // one it was added from rather than wherever the object array happens to
  // sit: and so two renders of an unchanged map are identical.
  for (const list of childrenOf.values()) list.sort((a, b) => a.id - b.id);
  roots.sort((a, b) => a.id - b.id);
  return { nodes, byId, childrenOf, roots };
}

//: Every node reachable from `id`, itself first, deepest last. Seen-guarded
//: for the ring case above; every walk in this section goes through it.
function wbMapSubtree(index, id) {
  const start = index.byId.get(id);
  if (!start) return [];
  const found = [start];
  const seen = new Set([id]);
  for (let i = 0; i < found.length; i += 1) {
    for (const child of index.childrenOf.get(found[i].id) || []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      found.push(child);
    }
  }
  return found;
}

//: Branch colour, which is Coggle's rule: a **first-level** topic takes the
//: next colour of the palette and every descendant inherits it, unless a node
//: carries its own `data.color`, which then becomes what *its* subtree
//: inherits, so recolouring a branch recolours the branch, not one box.
//:
//: The palette is the categorical scale the graph tab already colours its
//: clusters with (`d3.schemeTableau10`, graph.js ~1405), not a new list of
//: hex. Two surfaces colouring "one group of related things" differently is
//: this app's recurring failure, and a map branch and a graph cluster are the
//: same idea seen twice.
//:
//: Computed for the whole board in one walk rather than per node: a node's
//: colour depends on its ancestors, so a per-node lookup would walk the tree
//: once per node to learn what a single walk already knew.
function wbMapColors(index) {
  const palette = (window.d3?.schemeTableau10 || []).slice(0, 10);
  const colors = new Map();
  const seen = new Set();
  let branch = 0;
  const walk = (node, inherited) => {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    const own = node.data?.color || inherited || null;
    colors.set(node.id, own);
    for (const child of index.childrenOf.get(node.id) || []) {
      // `inherited == null` is true for exactly one generation, the roots'
      // own children, which *are* the first-level topics. Starting the colours
      // at the root instead would give every branch on the map the same
      // colour, which is the one thing branch colour exists not to do.
      const next = child.data?.color
        || (inherited == null && palette.length ? palette[branch++ % palette.length] : own);
      walk(child, next);
    }
  };
  for (const root of index.roots) walk(root, null);
  return colors;
}

//: The nodes a collapsed branch hides. The collapsed node itself stays, it
//: is the thing you click to get the branch back, and it carries the count
//: badge that says how much is behind it.
function wbMapHidden(index) {
  const hidden = new Set();
  for (const node of index.nodes) {
    if (!node.data?.collapsed) continue;
    for (const descendant of wbMapSubtree(index, node.id)) {
      if (descendant.id !== node.id) hidden.add(descendant.id);
    }
  }
  return hidden;
}

//: What a node is *called*. A topic says what it says; a reference node's
//: label was resolved server-side (`_reference_label`) and arrives in
//: `wbMapState.labels`, with `data.content` as the fallback covering the
//: moment between creating one and the next tree refresh.
function wbMapLabel(obj) {
  if (obj.kind === "topic") return obj.data?.content || "";
  const resolved = window.wbMapState?.labels?.get(obj.id);
  if (resolved) return resolved;
  return obj.data?.content || `${obj.kind} ${obj.data?.ref_id ?? ""}`.trim();
}

//: `**bold**`, `*italic*` and `` `code` `` inside a node's own text.
//:
//: **Built as DOM nodes, never as an HTML string.** A node's text is the one
//: thing on a map guaranteed to be arbitrary user input, and this app's own
//: rule (and its CSP) says the same thing twice: nothing user-written reaches
//: `innerHTML`. `document.createTextNode` cannot be escaped wrongly because
//: there is no escaping step to get wrong.
//:
//: Inline only. A node label is a phrase, not a document, the full markdown
//: pass (`renderMarkdown`, which a text box reaches through `data.md`) builds
//: paragraphs and headings, which inside a 56px box is a worse answer than no
//: formatting at all.
//:
//: Each alternative is anchored and bounded by a negated class, so there is no
//: nested quantifier for CodeQL's polynomial-ReDoS shape to find.
const WB_MAP_INLINE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/;

function wbMapInlineText(el, raw) {
  if (!el) return;
  el.replaceChildren();
  for (const piece of String(raw || "").split(WB_MAP_INLINE)) {
    if (!piece) continue;
    let tag = null;
    let inner = piece;
    if (piece.length > 4 && piece.startsWith("**") && piece.endsWith("**")) {
      tag = "strong";
      inner = piece.slice(2, -2);
    } else if (piece.length > 2 && piece.startsWith("*") && piece.endsWith("*")) {
      tag = "em";
      inner = piece.slice(1, -1);
    } else if (piece.length > 2 && piece.startsWith("`") && piece.endsWith("`")) {
      tag = "code";
      inner = piece.slice(1, -1);
    }
    if (!tag) {
      el.append(document.createTextNode(piece));
      continue;
    }
    const marked = document.createElement(tag);
    marked.textContent = inner;
    el.append(marked);
  }
}

//: The static half of a map node, built once as the node enters the DOM.
//:
//: Everything that changes while a map is edited, text, colour, the chevron's
//: direction, the count badge, lives in `wbPaintMapNode` instead, and the
//: chevron and badge are created here *always* and hidden when they have
//: nothing to say. Creating them on demand would mean the enter selection and
//: the update selection each had to know how to build one, which is exactly
//: how the same control ends up drawn two slightly different ways.
function wbBuildMapNode(el, d) {
  el.classed("wb-map-node", true);
  const body = el.append("div").attr("class", "wb-map-node-body");
  //: **Built for every node, hidden when it has nothing to say**, the same
  //: rule the chevron and the count badge already follow here and for the
  //: same reason: a reference node's kind icon and a topic's own chosen icon
  //: (§12.1 item 2) are one element, so the enter selection cannot build one
  //: shape and `wbPaintMapNode` a slightly different one. The class is set in
  //: the paint pass, which is the only place that knows what the node wears.
  body.append("i").attr("class", "wb-map-node-icon").attr("aria-hidden", "true");
  //: **A topic whose body is a picture** (MINDMAP_PLAN.md §12.1 item 2's
  //: fourth, Coggle's text/link/image/icon). Built for every node and hidden
  //: when there is nothing to show, the same rule the icon above and the
  //: chevron below already follow, and for the same reason: one element built
  //: one way, rather than the enter selection and the paint pass each knowing
  //: how to make one.
  //:
  //: `alt` is deliberately empty and the element is `aria-hidden`: the topic's
  //: own label is right beside it and says what this node is, so a screen
  //: reader that also announced the picture would say the same thing twice.
  //: A caption nobody wrote is not a description.
  //: **`draggable="false"`, and deliberately no `pointerdown` guard.** The two
  //: look interchangeable and are opposites here. The link button beside this
  //: stops the press because it is a control: pressing it must not also start
  //: a node drag. The picture is the node's *body*, the largest thing to take
  //: hold of on a picture topic, so a stopped press would make the card
  //: undraggable by the part of it anyone would grab. What does have to be
  //: refused is the browser's own image drag, which would otherwise start an
  //: HTML5 drag of the file over a canvas that has a `drop` handler for
  //: exactly that, and that is what this attribute is for.
  body.append("img")
    .attr("class", "wb-map-node-picture")
    .attr("alt", "")
    .attr("aria-hidden", "true")
    .attr("draggable", "false")
    .property("hidden", true);
  const text = body.append("div")
    .attr("class", "wb-map-text")
    .attr("contenteditable", "false");
  //: Where a topic points (§12.1 item 2's "link"). A real button, not a
  //: decoration: the whole point of setting a link is opening it, and a
  //: marker you have to go back to the strip to follow is a label. Hidden
  //: until there is one. `pointerdown` is stopped so following the link is
  //: not also the first frame of a node drag, the same guard the chevron and
  //: the two add buttons below already carry.
  body.append("button")
    .attr("type", "button")
    .attr("class", "wb-map-link")
    .property("hidden", true)
    .on("pointerdown", (event) => event.stopPropagation())
    .on("click", (event) => {
      event.stopPropagation();
      wbMapOpenLink(d);
    })
    .append("i").attr("class", "ph ph-link").attr("aria-hidden", "true");

  if (d.kind === "topic") {
    // A topic is renamed in place, through the same two functions a text box
    // uses: one edit path for the board, not two. A reference node has no
    // text of its own to edit: its label belongs to the note behind it, so
    // double-clicking one opens that note instead (below).
    text.on("dblclick", function (event) {
      event.stopPropagation();
      wbBeginTextEdit(this);
    });
    text.on("blur", function () {
      wbEndTextEdit(this);
      const edited = wbEditedText(this);
      //: A rename is undoable like every other change to a topic, and only a
      //: real change is saved or recorded.
      if (d.data.content !== edited) {
        wbPushUndo({ action: "move", kind: "object", id: d.id, before: WB_KIND_INFO.object.payload(d) });
        d.data = { ...d.data, content: edited };
        wbSaveObject(d);
      }
      // Back to the formatted view: `wbBeginTextEdit` put the raw source in
      // for editing, and without this the markers stay on screen as literal
      // asterisks until something else triggers a render.
      wbMapInlineText(this, d.data.content);
    });
    text.on("keydown", function (event) {
      if (!this.isContentEditable) return;
      // While typing, Tab/Enter are text and the branch gestures must not
      // fire: the same `stopPropagation` the card editor above needs, and
      // for the same reason.
      event.stopPropagation();
      if (event.key === "Escape" || (event.key === "Enter" && !event.shiftKey)) {
        event.preventDefault();
        this.blur();
      }
    });
    text.on("pointerdown", function (event) {
      if (this.isContentEditable) event.stopPropagation();
    });
  } else {
    el.on("dblclick", (event) => {
      event.stopPropagation();
      wbMapOpenReference(d);
    });
  }

  //: The count badge: how much a collapsed branch is holding. Without it a
  //: collapsed node is indistinguishable from a leaf, which is the difference
  //: between "folded away" and "not there".
  //:
  //: **A button, because §12.1 item 7 says it reopens on click.** It was a
  //: `<span aria-hidden>` and read as a decoration: the number told you
  //: something was folded away and the only way back was the chevron beside
  //: it. As a button it also answers Space and Enter for free once focused,
  //: which is the other half of the same item (and of §12.0's Space
  //: decision).
  el.append("button")
    .attr("type", "button")
    .attr("class", "wb-map-count")
    .property("hidden", true)
    .on("pointerdown", (event) => event.stopPropagation())
    .on("click", (event) => {
      event.stopPropagation();
      wbMapToggleCollapse(d.id);
    });

  // The chevron (collapse) and the `+` (add a child) are the pointer half of
  // the keyboard gestures: `.ghost.small.icon-only`, the app's own tonal
  // icon-button recipe, not a shape invented for the canvas. Both stop
  // `pointerdown` so grabbing one is not also the start of a node drag.
  const stopDrag = (event) => event.stopPropagation();
  el.append("button")
    .attr("type", "button")
    .attr("class", "ghost small icon-only wb-map-collapse")
    .property("hidden", true)
    .on("pointerdown", stopDrag)
    .on("click", (event) => {
      event.stopPropagation();
      wbMapToggleCollapse(d.id);
    })
    .append("i").attr("class", "ph ph-caret-down").attr("aria-hidden", "true");
  //: **Two ways to grow the map, in one row.** `+` makes a topic; the second
  //: button makes a node that *points at* a real note, document, file or link
  //: (§5 item 11: the half §10.4 recorded as missing: "a reference node was
  //: never placed by hand", so the kind rendered and was unreachable outside
  //: the AI tools).
  //:
  //: A second button rather than a mode on `+`: the two are different acts,
  //: not two settings of one, and a `+` that sometimes opens a dialog is the
  //: "a second modal that only appears after you commit the first" shape
  //: CLAUDE.md records costing five reports on bookmark URLs. Both are also
  //: in the node's context menu, because a right-click is where people look
  //: for "what can I do with this" and these only appear on hover.
  //:
  //: A flex row rather than two absolutely-positioned buttons: two of them
  //: hand-placed off the same corner is how they come to overlap by a few
  //: pixels that a screenshot does not show, which this file has already had
  //: to fix twice for the count badge (see `.wb-map-count`'s own comment).
  //: **The text-size grip** (MINDMAP_PLAN.md §12.1 item 6): drag the node's
  //: own corner and the words get bigger. The strip has four sizes, which is
  //: the right control for "make this a heading"; this is the one for
  //: "a little bigger than that", and mind-mapping tools all have it because
  //: a map's hierarchy is carried as much by size as by position.
  //:
  //: Plain pointer events with capture, not a d3 drag: `preventDefault` on
  //: `pointerdown` suppresses the compatibility `mousedown` that `objDrag`
  //: listens for, so grabbing the grip cannot also be the first frame of a
  //: node drag. The class is in `objDrag`'s own filter as well, because one
  //: guard for this is what the resize handles already learned is not enough.
  //: **Both grips in one row**, rather than each hand-placed off the same
  //: corner. That is the lesson `.wb-map-actions` already carries a paragraph
  //: about, and this is the second time it has been paid for: the size grip
  //: was first put at the node's *other* bottom corner and landed underneath
  //: the add buttons' own row, which hangs off that corner from outside and
  //: takes the pointer first, so the drag never started at all. Measured
  //: before this row existed: pointerdown on the grip was never received.
  const grips = el.append("div").attr("class", "wb-map-grips");
  grips.append("button")
    .attr("type", "button")
    .attr("class", "wb-map-size-grip")
    .attr("title", "Drag to change the text size")
    .attr("aria-label", "Drag to change the text size")
    .on("pointerdown", function (event) {
      event.stopPropagation();
      event.preventDefault();
      wbMapStartSizeDrag(this, event, d);
    })
    .append("i").attr("class", "ph ph-text-aa").attr("aria-hidden", "true");

  //: **The size grip** (MINDMAP_PLAN.md's item 177, the owner's fourth, asked
  //: for twice): drag the topic's own corner and the topic gets bigger, the
  //: same gesture a card on a board already has. It is a grip rather than one
  //: of the board's eight `.wb-resize-handle`s for the reason `renderWbObjects`
  //: gives for not giving a map node those: eight handles and a rotate grip
  //: sit exactly where the chevron, the count badge and the two add buttons
  //: already are, and would swallow all four. One corner is enough here
  //: because a resize on a map may not move the node: the layout owns x and y.
  //:
  //: Pointer events with capture rather than a d3 drag, for the same reason
  //: the text-size grip beside it uses them: `preventDefault` on `pointerdown`
  //: suppresses the compatibility `mousedown` that `objDrag` listens for, so
  //: grabbing the grip cannot also be the first frame of a node drag.
  grips.append("button")
    .attr("type", "button")
    .attr("class", "wb-map-resize-grip")
    .attr("title", "Drag to resize this topic")
    .attr("aria-label", "Drag to resize this topic")
    .on("pointerdown", function (event) {
      event.stopPropagation();
      event.preventDefault();
      wbMapStartResizeDrag(this, event, d);
    })
    .append("i").attr("class", "ph ph-arrow-down-right" ).attr("aria-hidden", "true");

  const actions = el.append("div").attr("class", "wb-map-actions");
  actions.append("button")
    .attr("type", "button")
    .attr("class", "ghost small icon-only wb-map-add")
    .attr("title", "Add a child (Tab)")
    .attr("aria-label", "Add a child topic")
    .on("pointerdown", stopDrag)
    .on("click", (event) => {
      event.stopPropagation();
      wbMapAddChild(d.id);
    })
    .append("i").attr("class", "ph ph-plus").attr("aria-hidden", "true");
  actions.append("button")
    .attr("type", "button")
    .attr("class", "ghost small icon-only wb-map-ref")
    .attr("title", "Add a child from the library…")
    .attr("aria-label", "Add a child that points at a note, document, file or link")
    .on("pointerdown", stopDrag)
    .on("click", (event) => {
      event.stopPropagation();
      wbMapAddReference(d.id);
    })
    .append("i").attr("class", "ph ph-bookmarks-simple").attr("aria-hidden", "true");
}

//: **The ink a core node's label takes on its own fill** (INBOX 201: "I want
//: more and better ways to differentiate core idea nodes in the mindmap", and
//: MINDMAP_PLAN §12.5's decision that a core idea is told apart by shape,
//: weight and size at once).
//:
//: A core node is filled in its branch colour, so its label sits on a
//: saturated surface rather than on the card, and nothing in CSS can work out
//: which of black or white to write on `var(--wb-branch)`: `color-mix` cannot
//: branch on luminance, and a branch colour is a palette entry or anything the
//: colour picker was pointed at. So it is computed here, once per painted
//: node, by WCAG relative luminance.
//:
//: **Pure black and pure white, not the app's ink tokens.** The worst case is
//: a colour exactly at the crossover, where both candidates contrast equally:
//: with 0 and 1 that tie is 4.58:1, over the 4.5 bar, and every softer pair
//: drops it under (a `#0f1115` dark ink brings the same tie to 4.32:1, which
//: is a fail on some part of any palette). On a coloured fill this reads as
//: chart ink rather than as text on a page, which is what it is.
//:
//: The two themes need no second branch: the fill is the same palette entry in
//: both, so the contrast this returns holds in both.
const WB_CORE_INK_DARK = "#000000";
const WB_CORE_INK_LIGHT = "#ffffff";

function wbColourChannels(colour) {
  const value = String(colour || "").trim();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1];
    const wide = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
    return [0, 2, 4].map((i) => parseInt(wide.slice(i, i + 2), 16));
  }
  const rgb = value.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const parts = rgb[1].split(",").map((n) => parseFloat(n));
    if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) return parts.slice(0, 3);
  }
  return null;
}

function wbRelativeLuminance(channels) {
  const [r, g, b] = channels.map((c) => {
    const v = Math.min(255, Math.max(0, c)) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function wbCoreInkFor(colour) {
  const channels = wbColourChannels(colour);
  if (!channels) return null;
  const l = wbRelativeLuminance(channels);
  const onDark = (l + 0.05) / 0.05;
  const onLight = 1.05 / (l + 0.05);
  return onDark >= onLight ? WB_CORE_INK_DARK : WB_CORE_INK_LIGHT;
}

//: The half that changes: label, branch colour, chevron, badge. Runs for
//: every visible map node on every render, so it does no work that the enter
//: selection could have done once.
function wbPaintMapNode(el, d, index, colors) {
  const node = el.node();
  if (!node) return;
  const text = node.querySelector(".wb-map-text");
  // Never while it is being typed into: a render triggered by something else
  // moving on the board would otherwise replace the caret and the half-typed
  // word: the exact bug `objectUpdate` already avoids for a text box.
  if (text && document.activeElement !== text) {
    wbMapInlineText(text, wbMapLabel(d));
  }

  // A custom property rather than a colour on each part: the fill, the edge
  // and the branch's own edges all derive from one value in CSS, so a
  // recoloured branch cannot end up with a border of the old colour.
  // Set through CSSOM (`style.setProperty`), not a `style=` attribute: the
  // CSP rejects those outright, and thirty-five of them once shipped as
  // silently dead markup (CLAUDE.md).
  const colour = colors?.get(d.id);
  if (colour) node.style.setProperty("--wb-branch", colour);
  else node.style.removeProperty("--wb-branch");
  //: A core node is filled in that colour, so its label needs the ink that
  //: reads on it: see `wbCoreInkFor`. Written for every node rather than only
  //: the core ones, because a node marked core after this pass ran would
  //: otherwise take the previous node's ink until the next render.
  const ink = colour ? wbCoreInkFor(colour) : null;
  if (ink) node.style.setProperty("--wb-core-ink", ink);
  else node.style.removeProperty("--wb-core-ink");

  const children = index?.childrenOf.get(d.id) || [];
  const collapsed = Boolean(d.data?.collapsed);
  const chevron = node.querySelector(".wb-map-collapse");
  if (chevron) {
    chevron.hidden = children.length === 0;
    chevron.title = collapsed ? "Expand this branch" : "Collapse this branch";
    chevron.setAttribute("aria-label", chevron.title);
    chevron.setAttribute("aria-expanded", collapsed ? "false" : "true");
    const icon = chevron.querySelector("i");
    if (icon) icon.className = collapsed ? "ph ph-caret-right" : "ph ph-caret-down";
  }
  const badge = node.querySelector(".wb-map-count");
  if (badge) {
    // The whole subtree, not just the direct children: what the badge is
    // answering is "how much is folded away here", and a branch three deep
    // that reported "2" would be understating itself by an order of magnitude.
    const buried = collapsed && index ? wbMapSubtree(index, d.id).length - 1 : 0;
    badge.hidden = buried <= 0;
    badge.textContent = String(buried);
    const label = `Open the ${buried} topic${buried === 1 ? "" : "s"} folded in here`;
    badge.title = label;
    badge.setAttribute("aria-label", label);
  }
  el.classed("wb-map-collapsed", collapsed);
  el.classed("wb-map-pinned", Boolean(d.data?.pinned));
  //: **The spine is on the edge the parent is on** (MINDMAP_PLAN §13e). It is
  //: the left edge in every layout that grows right, the top edge downward
  //: (a class on the view, `wb-map-down`), and the *right* edge for a topic
  //: whose parent is to its right: a bar on the far side from the branch it
  //: belongs to points at nothing, which is the reason the downward case
  //: exists at all. Per node rather than per view, because both-sides has
  //: topics of both kinds on one map.
  const layout = wbMapLayout();
  let mirrored = layout === "tree-left";
  if (layout === "tree-both" && index) {
    const parent = index.byId.get(d.parent_id);
    if (parent) mirrored = d.x + (d.width || WB_MAP_NODE_W) / 2 < parent.x + (parent.width || WB_MAP_NODE_W) / 2;
  }
  el.classed("wb-map-node-mirrored", Boolean(mirrored));
  wbPaintMapNodeStyle(node, d);
}

//: What the node edit strip sets, drawn on the node (§12.1 item 2).
//:
//: Split out of `wbPaintMapNode` rather than inlined into it because the
//: strip changes one node at a time and a full render is the wrong price for
//: a bold toggle: `wbMapSetNodeStyle` calls this directly for the node it
//: just changed, and the render calls it for every node, and both get the
//: same result by construction rather than by two lists of properties being
//: kept in step.
function wbPaintMapNodeStyle(node, d) {
  //: The map's theme underneath the node's own choices (§13e): this is the
  //: one place a topic's look is turned into classes and attributes, so it is
  //: the one place the theme has to be resolved for a topic to inherit it.
  const data = wbMapThemedData(d);
  node.classList.toggle("wb-map-bold", Boolean(data.bold));
  node.classList.toggle("wb-map-italic", Boolean(data.italic));
  //: A core idea (MINDMAP_PLAN.md item 177). A class rather than a data
  //: attribute because it is not one of a set of exclusive values the way the
  //: shape and the alignment are: it is on or it is off, and it composes with
  //: whichever shape the node is wearing.
  node.classList.toggle("wb-map-core", Boolean(data.core));
  //: The shape is a data attribute rather than four classes for the same
  //: reason `align` is: they are exclusive, and a class per value is a class
  //: somebody forgets to remove. The stylesheet holds the four looks; an
  //: unset shape is the rounded card this map has always drawn.
  if (data.shape) node.dataset.shape = data.shape;
  else delete node.dataset.shape;
  //: The bar down the node's leading edge (MINDMAP_PLAN.md item 177), an
  //: attribute for the same reason the shape is: three exclusive values, and
  //: an unset one is the solid bar every map has always drawn.
  if (data.spine) node.dataset.spine = data.spine;
  else delete node.dataset.spine;
  if (data.align) node.dataset.align = data.align;
  else delete node.dataset.align;
  // Px through CSSOM, which is what a text box's own `font_size` already
  // does (`renderWbObjects`): the value is per node and arbitrary, so it
  // cannot be a token, and the stylesheet's own `var(--text-md)` is the
  // default this replaces only when there is something to replace it with.
  if (data.font_size) node.style.fontSize = `${data.font_size}px`;
  else node.style.removeProperty("font-size");

  //: A hand-resized topic's height, as a floor (see `wbMapStartResizeDrag`).
  //: The width needs nothing here: `renderWbObjects` already writes every
  //: object's own `width`, and a map node is the one kind whose *height* it
  //: deliberately leaves to the text.
  if (data.sized && d.height) node.style.minHeight = `${d.height}px`;
  else node.style.removeProperty("min-height");

  const icon = node.querySelector(".wb-map-node-icon");
  if (icon) {
    // A topic wears what it was given; a reference node falls back to the
    // icon for its kind, which is what says "this is a note, not a topic".
    //: **A star before the label on a core idea** (INBOX 201, the fourth of the
    //: four ways: shape, weight, size and a glyph). It is the icon element the
    //: node already has rather than a fifth child, so a core node that was
    //: given an icon of its own keeps that one: an explicit choice beats a
    //: mark, the same rule bold already follows against core's own weight.
    const core = Boolean(data.core) && !WB_MAP_REFERENCE_KINDS.has(d.kind);
    const chosen = data.icon || (core ? "star" : (WB_MAP_REFERENCE_KINDS.has(d.kind) ? null : ""));
    const name = chosen || (WB_MAP_REFERENCE_KINDS.has(d.kind)
      ? (WB_MAP_ICONS[d.kind] || WB_MAP_ICONS.topic).replace(/^ph-/, "")
      : "");
    icon.hidden = !name;
    icon.className = name ? `ph ph-${name} wb-map-node-icon` : "wb-map-node-icon";
  }

  //: The picture, and the node shape that goes with it (§12.1 item 2's
  //: fourth). `data-body` rather than a class for the same reason `shape` and
  //: `align` are attributes: it is one of a set of exclusive body layouts, and
  //: the absence of the attribute is the label-only node this map has always
  //: drawn. The stylesheet turns the body from a row into a column on it, so a
  //: picture node is a second node *shape*, not a label with a thumbnail
  //: wedged in beside it.
  const picture = node.querySelector(".wb-map-node-picture");
  if (picture) {
    const url = typeof data.image === "string" ? data.image : "";
    picture.hidden = !url;
    if (url) {
      // `mediaSrc`, never the raw url: media is served behind the unlock, so
      // the token has to ride on the query string exactly as it does for a
      // board image and a note's own attachment.
      const src = mediaSrc(url);
      if (picture.getAttribute("src") !== src) picture.setAttribute("src", src);
      node.dataset.body = "picture";
    } else {
      picture.removeAttribute("src");
      delete node.dataset.body;
    }
  }

  const link = node.querySelector(".wb-map-link");
  if (link) {
    const href = typeof data.link === "string" ? data.link : "";
    link.hidden = !href;
    if (href) {
      link.title = `Open ${href}`;
      link.setAttribute("aria-label", `Open the page this topic links to`);
    }
  }
}

//: The three schemes a topic's link may have, checked again at the click.
//:
//: The schema validator (`_safe_link_scheme`) refuses anything else on the
//: way in, so this is the second of two doors, and it is here because a value
//: stored before that validator existed, or written by a tool that talks to
//: the database another way, would otherwise reach `window.open` unexamined.
//: CLAUDE.md's own rule for the map's delete policy says it plainly: a rule
//: enforced at one of two doors is not a rule.
const WB_MAP_LINK_SCHEMES = /^(https?:\/\/|mailto:)/i;

function wbMapOpenLink(d) {
  const href = d.data?.link;
  if (!href || !WB_MAP_LINK_SCHEMES.test(String(href).trim())) {
    toast("That topic's link is not a web address.", true);
    return;
  }
  window.open(String(href).trim(), "_blank", "noopener,noreferrer");
}

//: The grip's drag, from pointerdown to drop.
//:
//: Live on the element and stored once, at the end: a PUT per pixel of drag
//: is the flood `wbBeginTextEdit`'s own blur-save comment warns about, and the
//: node is already showing the new size, so there is nothing to see for it.
//: Divided by the zoom, so the gesture means the same amount of text at every
//: scale rather than four times as much when zoomed out.
function wbMapStartSizeDrag(grip, event, d) {
  const node = grip.closest(".wb-object");
  if (!node) return;
  const container = document.getElementById("whiteboard-container");
  const k = container ? d3.zoomTransform(container).k : 1;
  const startY = event.clientY;
  const startSize = d.data?.font_size || WB_MAP_TEXT_DEFAULT;
  let size = startSize;
  grip.setPointerCapture?.(event.pointerId);
  const move = (moveEvent) => {
    // Four pixels of drag to one of type: the whole useful range (10 to 44)
    // is then about 140px of travel, which is a gesture rather than a twitch.
    const next = startSize + ((moveEvent.clientY - startY) / k) / 4;
    size = Math.round(Math.min(WB_MAP_TEXT_MAX, Math.max(WB_MAP_TEXT_MIN, next)));
    node.style.fontSize = `${size}px`;
  };
  const done = async () => {
    grip.removeEventListener("pointermove", move);
    grip.removeEventListener("pointerup", done);
    grip.removeEventListener("pointercancel", done);
    if (size === startSize) return;
    await wbMapSetNodeStyle(d, { font_size: size });
  };
  grip.addEventListener("pointermove", move);
  grip.addEventListener("pointerup", done);
  grip.addEventListener("pointercancel", done);
}

//: How small a topic may be dragged. Narrower than this is a box too small to
//: hold the grip that is resizing it, which is a node you cannot get back.
const WB_MAP_NODE_MIN_W = 72;
const WB_MAP_NODE_MIN_H = 40;

//: **A topic's own resize**, from pointerdown to drop.
//:
//: **It writes width and height and never x or y.** The map's layout owns the
//: positions (§12.0: auto-arrange is a command, so a hand-placed node stays
//: put), so a resize that also moved the node would fight the thing that put
//: it there. The siblings make room at the next tidy, not during the drag,
//: which is the same bargain every other edit on a map makes.
//:
//: **The height is a floor, not a ceiling.** A map node is deliberately
//: `height: auto` (`objectHeight`): its own text decides how tall it is, so a
//: long topic can never be sliced by `overflow`. Writing the dragged height as
//: `height` would take that guarantee away the first time somebody dragged a
//: node shorter than its own words. `min-height` keeps both promises: the node
//: is as tall as it was asked to be, or as tall as its text, whichever is
//: more, and `wbMapNodeSize` reads the answer off the DOM either way.
//:
//: `data.sized` is what says a person chose these numbers. Every topic is
//: created with a width and a height already (`WB_MAP_NODE_W`/`_H`), so the
//: stored values cannot say by themselves whether anybody meant them, and a
//: `min-height` applied to every node on every map would pin the whole map to
//: a default that was only ever a starting guess.
function wbMapStartResizeDrag(grip, event, d) {
  const node = grip.closest(".wb-object");
  if (!node) return;
  const container = document.getElementById("whiteboard-container");
  const k = container ? d3.zoomTransform(container).k : 1;
  const startX = event.clientX;
  const startY = event.clientY;
  const startW = d.width || WB_MAP_NODE_W;
  // The *drawn* height, not the stored one: an unresized node's stored height
  // is the creation default and its real height is whatever its text needs,
  // so starting from the stored number would jump the node on the first pixel.
  const startH = node.offsetHeight || d.height || WB_MAP_NODE_H;
  const before = WB_KIND_INFO.object.payload(d);
  // Collected once, before the drag: the two ends of an edge move with the
  // box, so the lines have to be redrawn per frame or they detach from the
  // node being resized, which is INBOX 42's report in a different gesture.
  const edges = wbMapEdgesFor(d.id);
  let width = startW;
  let height = startH;
  grip.setPointerCapture?.(event.pointerId);
  const move = (moveEvent) => {
    width = Math.max(WB_MAP_NODE_MIN_W, startW + (moveEvent.clientX - startX) / k);
    height = Math.max(WB_MAP_NODE_MIN_H, startH + (moveEvent.clientY - startY) / k);
    width = Math.round(width);
    height = Math.round(height);
    node.style.width = `${width}px`;
    node.style.minHeight = `${height}px`;
    d.width = width;
    d.height = height;
    //: This gesture is the one thing that changes a node's measured box
    //: without a render, so it drops that node's cached size itself; without
    //: this the edges would follow the size the node had when the grip was
    //: taken hold of. See `wbMapNodeSize`.
    wbForgetMapNodeSize(d.id);
    wbUpdateMapEdges(edges);
  };
  const done = async () => {
    grip.removeEventListener("pointermove", move);
    grip.removeEventListener("pointerup", done);
    grip.removeEventListener("pointercancel", done);
    if (width === startW && height === startH) return;
    // One write for both halves: `wbMapSetNodeStyle` saves the whole object,
    // and `width`/`height` are already on it.
    // `undo: false`: the size was already live on `d`, so the helper's own
    // snapshot would hold the new size; `before` below is the true one.
    await wbMapSetNodeStyle(d, { sized: true }, { undo: false });
    wbPushUndo({ action: "move", kind: "object", id: d.id, before });
    wbScheduleRender();
  };
  grip.addEventListener("pointermove", move);
  grip.addEventListener("pointerup", done);
  grip.addEventListener("pointercancel", done);
}

//: Open every folded branch on the map (§12.1 item 7's third route, after the
//: badge and the chevron). One PUT per folded node rather than a bulk call,
//: which is the same bargain `wbSaveBulkMove` makes and for the same reason:
//: there is no bulk endpoint, and the number of *folded* nodes on a map is
//: small even when the map is not.
async function wbMapExpandAll() {
  const folded = wbMapIndex().nodes.filter((o) => o.data?.collapsed);
  if (!folded.length) {
    toast("Nothing is folded away on this map.");
    return;
  }
  for (const node of folded) {
    node.data = { ...node.data, collapsed: false };
    await wbSaveObject(node);
  }
  renderWhiteboardNow();
  wbSyncMapToolState();
  toast(`Opened ${folded.length} branch${folded.length === 1 ? "" : "es"}.`);
}

//: --- drag a branch onto a new parent (MINDMAP_PLAN.md §12.1 item 8) --------
//:
//: Three things, and they are one gesture: dragging a topic takes its branch
//: with it, dropping it on another topic re-parents the branch there, and
//: Ctrl held moves the topic alone and lets its children up to its old parent.

//: The whole branch's starting positions, in the shape `wbApplyBulkMove`
//: already understands. Reusing the marquee's own machinery rather than
//: writing a second mover: it already recomputes from a fixed baseline each
//: frame (rather than compounding a delta), and it already keeps each moved
//: node's tree edges and link sketches live, both of which this needs and
//: neither of which is obvious until they are missing.
function wbMapBranchDragOrigin(d, alone) {
  if (alone || !wbIsMap() || !WB_MAP_KINDS.has(d.kind)) return null;
  const index = wbMapIndex();
  const keys = wbMapSubtree(index, d.id)
    .filter((o) => o.id !== d.id)
    .map((o) => wbMultiKey("object", o.id));
  return keys.length ? wbCaptureBulkMoveOrigin(null, keys) : null;
}

//: The topic under the pointer that this branch could be dropped on, or null.
//:
//: **Geometry, not `elementFromPoint`.** The dragged node follows the pointer,
//: so it is the element under it for the whole gesture; the usual answer is to
//: turn its pointer events off mid-drag, which is a second state to get wrong.
//: The board already knows where everything is, so this asks it.
//:
//: A node's own descendants are excluded because dropping a branch inside
//: itself is the ring `/move` refuses, and an offer the server will reject is
//: worse than no offer.
function wbMapDropTargetAt(d, clientX, clientY) {
  const container = document.getElementById("whiteboard-container");
  if (!container || !wbIsMap() || !WB_MAP_KINDS.has(d.kind)) return null;
  //: The shared, per-gesture box rather than a fresh measurement: this runs
  //: on every frame of a branch drag, after that frame has already written
  //: every moved edge's geometry. See `wbCanvasOriginRect`.
  const rect = wbCanvasOriginRect();
  const t = d3.zoomTransform(container);
  const [bx, by] = t.invert([clientX - rect.left, clientY - rect.top]);
  const index = wbMapIndex();
  const forbidden = new Set(wbMapSubtree(index, d.id).map((o) => o.id));
  const hidden = wbMapConcealed(index);
  for (const node of index.nodes) {
    if (forbidden.has(node.id) || hidden.has(node.id)) continue;
    const size = wbMapNodeSize(node);
    if (bx >= node.x && bx <= node.x + size.w && by >= node.y && by <= node.y + size.h) {
      return node;
    }
  }
  return null;
}

//: The highlight, and the one place it is cleared. A class rather than an
//: inline style: the CSP rejects `style=` and a drop cue that silently did
//: nothing is the fourth shape CLAUDE.md §6 lists.
let wbMapDropTargetId = null;

function wbMapShowDropTarget(id) {
  if (wbMapDropTargetId === id) return;
  wbMapClearDropTarget();
  if (id == null) return;
  document.querySelector(`.wb-object[data-id="${id}"]`)?.classList.add("wb-map-drop-target");
  wbMapDropTargetId = id;
}

function wbMapClearDropTarget() {
  if (wbMapDropTargetId == null) return;
  document.querySelector(`.wb-object[data-id="${wbMapDropTargetId}"]`)
    ?.classList.remove("wb-map-drop-target");
  wbMapDropTargetId = null;
}

//: The drop. `alone` is Ctrl held: the topic moves by itself and its children
//: go up to its old parent first, so nothing is orphaned and nothing travels
//: that was not asked for.
//:
//: The node is unpinned on the way: it was dragged, so `wbMapPinOnDrag` would
//: otherwise fix it exactly where the pointer let go, which is the one place
//: it should not stay now that it belongs to a different parent.
//:
//: **Laid out as the new parent's child, branch and all, and one Undo**
//: (INBOX 410: "when I relink or newly link two mindmap nodes, they clump
//: together??"). Measured with `scratchpad/ui-sweeps/maprelink.js`: on a map
//: whose layout is Free the tidy below does nothing, so a dropped branch
//: stayed exactly where the pointer let go of it, on top of the topic it was
//: dropped on, and a joined one stayed wherever it had been; a descendant
//: pinned by an earlier drag kept its old place on every layout, so the branch
//: arrived without it; and none of it could be undone, because `/move` is the
//: only write of `parent_id` and the history had no entry that makes one.
//: `before` is the positions the gesture started from (a drag's own origin),
//: so Undo puts a dragged branch back where it was picked up rather than
//: where it was dropped.
async function wbMapTransplant(d, targetId, alone, { via = "drag", before = null } = {}) {
  const boardId = window.currentBoardId;
  const index = wbMapIndex();
  const target = index.byId.get(targetId);
  if (!boardId || !target) return false;
  if (d.parent_id === targetId && !alone) return false;
  const oldParent = index.byId.has(d.parent_id) ? d.parent_id : null;
  const movedChildren = alone ? [...(index.childrenOf.get(d.id) || [])] : [];
  //: Every topic's row as it stands, for the one history entry at the end:
  //: whatever the layout moves, the undo restores, and nothing else.
  const payload = WB_KIND_INFO.object.payload;
  const rows = new Map(index.nodes.map((node) => {
    const row = payload(node);
    const from = before?.get(node.id);
    return [node.id, from ? { ...row, x: from.x, y: from.y } : row];
  }));
  const move = (id, parentId) => apiJson(
    `/whiteboard/boards/${boardId}/nodes/${id}/move`,
    { method: "PUT", body: JSON.stringify({ parent_id: parentId }) }
  );
  try {
    for (const child of movedChildren) {
      Object.assign(child, await move(child.id, oldParent));
    }
    Object.assign(d, await move(d.id, targetId));
  } catch (err) {
    toast(err.message || "Couldn't move that branch.", true);
    return false;
  }
  if (d.data?.pinned) {
    d.data = { ...d.data, pinned: false };
    await wbSaveObject(d);
  }
  const branch = wbMapSubtree(wbMapIndex(), d.id);
  const landed = new Map(branch.map((node) => [node.id, { x: node.x, y: node.y }]));
  if (wbMapLayout() === "free") {
    await wbMapPlaceAsChild(d, target, branch);
  } else {
    await wbMapTidyBranch(targetId);
    if (oldParent != null) await wbMapTidyBranch(oldParent);
    //: A tidy leaves a pinned topic where it is, which is right for a topic
    //: someone placed inside its own branch and wrong for one whose whole
    //: branch has just moved: it would stay behind. So a pinned descendant
    //: travels by exactly what its moved topic travelled, which keeps the
    //: place it was given relative to it.
    const start = landed.get(d.id);
    const dx = d.x - start.x, dy = d.y - start.y;
    const carry = new Map();
    for (const node of branch) {
      if (node === d || !node.data?.pinned) continue;
      const was = landed.get(node.id);
      if (node.x !== was.x || node.y !== was.y || (!dx && !dy)) continue;
      carry.set(wbMultiKey("object", node.id), { kind: "object", id: node.id, item: node, x: was.x + dx, y: was.y + dy });
    }
    if (carry.size) {
      wbApplyBulkMove(carry, 0, 0);
      await wbSaveBulkMove(carry);
    }
  }
  const history = [{ action: "reparent", kind: "object", id: d.id, parentId: oldParent }];
  for (const child of movedChildren) {
    history.push({ action: "reparent", kind: "object", id: child.id, parentId: d.id });
  }
  for (const node of wbMapIndex().nodes) {
    const row = rows.get(node.id);
    if (!row) continue;
    const pinChanged = node === d && row.data !== node.data;
    if (row.x !== node.x || row.y !== node.y || pinChanged) {
      history.push({ action: "move", kind: "object", id: node.id, before: row });
    }
  }
  wbPushUndo({ action: "batch", entries: history });
  renderWhiteboardNow();
  //: A line drawn between two topics and a branch dragged onto one are the
  //: same move and want different words: the first connected something, the
  //: second moved it.
  toast(via === "link"
    ? `Connected to "${wbMapLabel(target)}" as a branch.`
    : alone
      ? `Moved this topic under "${wbMapLabel(target)}", its branches stayed.`
      : `Moved this branch under "${wbMapLabel(target)}".`);
  return true;
}

//: **Where a re-parented branch goes on a Free map** (INBOX 410). Free means
//: the tidy never runs, so this is the one placement a free map gets: the
//: branch is moved as a whole so its topic sits where a topic added under the
//: same parent would, beside the parent and under its last child, or level
//: with the parent when it is the first. The gaps are
//: the tidy's own (`WB_MAP_GAP_DEPTH`, `WB_MAP_GAP_BREADTH`), so a free map
//: and a tidied one space a branch alike. A free map has no growing side, so
//: "beside" is the right, where the server puts a new child of a topic on a
//: free map too (`_next_position`). "Under its last child" is under that
//: child's whole branch, so the new arrival never lands on a grandchild.
async function wbMapPlaceAsChild(d, target, branch) {
  const index = wbMapIndex();
  const moving = new Set(branch.map((node) => node.id));
  const size = (node) => wbMapNodeSize(node);
  const targetSize = size(target);
  const siblings = (index.childrenOf.get(target.id) || []).filter((node) => !moving.has(node.id));
  let x = target.x + targetSize.w + WB_MAP_GAP_DEPTH;
  let y = target.y + (targetSize.h - size(d).h) / 2;
  if (siblings.length) {
    x = Math.min(...siblings.map((node) => node.x));
    let bottom = -Infinity;
    for (const sibling of siblings) {
      for (const node of wbMapSubtree(index, sibling.id)) bottom = Math.max(bottom, node.y + size(node).h);
    }
    y = bottom + WB_MAP_GAP_BREADTH;
  }
  const dx = x - d.x, dy = y - d.y;
  if (!dx && !dy) return;
  const origin = new Map();
  for (const node of branch) {
    origin.set(wbMultiKey("object", node.id), { kind: "object", id: node.id, item: node, x: node.x + dx, y: node.y + dy });
  }
  wbApplyBulkMove(origin, 0, 0);
  await wbSaveBulkMove(origin);
}

//: **A link tool, on a map, joins the tree** (INBOX 180: "I cant properly
//: reconnect things that are disconnected" and "the connections between stuff
//: in the mindmap should be different from the ones in the whiteboard").
//:
//: On a board a link is a drawn connector, and that is the whole of what it
//: is. On a map the connections *are* the structure: a node hanging off
//: nothing is a loose root, the tidy skips it, the outline does not contain
//: it, and collapsing its would-be parent leaves it on screen. Drawing a
//: curve from one topic to it looked like a repair and was not one: it made a
//: cross-link, a decoration over a tree the node still was not part of, which
//: is exactly the "I tried the link tools and they didn't work" report.
//:
//: So a link drawn between two topics, where one of them has no parent, is
//: read as the obvious thing: attach the loose one to the other. Both ends
//: are tried, because a person draws the line in whichever direction they are
//: thinking in. Two nodes that are both already in the tree keep the old
//: behaviour, a cross-link, which is a real thing to want and is already
//: drawn dashed to say it is not the tree.
//:
//: Returns true when it took the gesture, false to let the cross-link happen.
async function wbMapJoinByLink(source, target) {
  if (!wbIsMap() || !source || !target) return false;
  if (!WB_MAP_KINDS.has(source.kind) || !WB_MAP_KINDS.has(target.kind)) return false;
  const index = wbMapIndex();
  //: **The map's own first root is in the tree, not loose.** It is the one
  //: node that legitimately has no parent (`wbMapStats` counts every *other*
  //: parentless node as a loose root), so reading "no parent" as "loose"
  //: would have let a line drawn from the root to a branch hang the whole map
  //: under one of its own children.
  const mainRoot = index.roots[0] || null;
  const inTree = (node) => index.byId.has(node.parent_id) || node.id === mainRoot?.id;
  //: A node cannot be adopted by its own descendant: the server's `/move`
  //: refuses the ring, and an offer it will reject is worse than no offer.
  const subtreeOf = (node) => new Set(wbMapSubtree(index, node.id).map((o) => o.id));
  let parent = null;
  let child = null;
  if (!inTree(target) && !subtreeOf(target).has(source.id)) {
    parent = source;
    child = target;
  } else if (!inTree(source) && !subtreeOf(source).has(target.id)) {
    parent = target;
    child = source;
  }
  if (!parent || !child) return false;
  //: `wbMapTransplant` is the one mover: it moves the branch, unpins the
  //: node, tidies both ends and says what it did. A second copy of that here
  //: is how the two would drift apart.
  return wbMapTransplant(child, parent.id, false, { via: "link" });
}

//: Open the library item a reference node stands for. One place, because
//: "double-click opens it" is the whole reason a reference node is different
//: from a topic with the same words in it.
function wbMapOpenReference(d) {
  const refId = d.data?.ref_id;
  if (!refId) return;
  //: `flashEntry` is the app's one door to a note: it switches to Notes,
  //: puts the "browse" sub-tab up, clears the filters that would hide the
  //: target, and scrolls to the card. This named `openEntryEditor`, which no
  //: file defines, and the `typeof` guard meant the failure was silent: a
  //: double-click on a note node fell through to the "open it from the
  //: Library" toast, which is the message for the kinds that have no door.
  if (d.kind === "note" && typeof flashEntry === "function") {
    flashEntry(refId);
    return;
  }
  if (d.kind === "document" && typeof openDocument === "function") {
    openDocument(refId);
    return;
  }
  // A file and a bookmark have no single "open this" entry point that is safe
  // to guess at from here, so both go to the Library, which is where the item
  // actually lives. Saying so beats a click that appears to do nothing.
  toast(`This node points at a ${d.kind}: open it from the Library.`);
}

//: A node's drawn size. The DOM first, because a map node is `height: auto`
//: (its text decides how tall it is, so nothing can clip) and the stored
//: `height` column is therefore only ever an approximation of it. Falls back
//: to the stored value, then to the creation defaults, for a node that is not
//: in the DOM at all, collapsed away, or being laid out before first paint.
//:
//: **Measured once per node between renders, not once per edge per frame**
//: (MINDMAP_PLAN.md §13a). Every edge redraw asks this for both of its ends,
//: and a drag redraws every edge of every topic it is carrying, so the two
//: lines below used to run a document-wide attribute query and a layout read
//: a few thousand times inside a single frame. A CPU profile of one 500-topic
//: drag put `querySelector` and this function's own `offsetWidth`/
//: `offsetHeight` reads at the top of the list by a wide margin; nothing else
//: on the drag path came close, and the maths around them was noise.
//:
//: A map node's *size* cannot change without something that also clears this:
//: a render (which rebuilds the element), the size grip (which deletes its
//: own node's entry as it drags), or the end of any gesture. Its *position*
//: changes constantly during a drag and is not cached here, because position
//: is read from the datum, not from the DOM. Only a real measurement is
//: cached: the fallback below is what a node that has not been laid out yet
//: returns, and freezing that would keep the wrong number after first paint.
let wbMapNodeSizeCache = null;

function wbMapNodeSize(d) {
  const cached = wbMapNodeSizeCache?.get(d.id);
  if (cached) return cached;
  const el = document.querySelector(`.wb-object[data-id="${d.id}"]`);
  if (el && el.offsetHeight) {
    const size = { w: el.offsetWidth, h: el.offsetHeight };
    if (!wbMapNodeSizeCache) wbMapNodeSizeCache = new Map();
    wbMapNodeSizeCache.set(d.id, size);
    return size;
  }
  return { w: d.width || WB_MAP_NODE_W, h: d.height || WB_MAP_NODE_H };
}

function wbClearMapNodeSizeCache() {
  wbMapNodeSizeCache = null;
}

//: **Every topic's element and box in one pass, for the gesture that is about
//: to want all of them** (MINDMAP_PLAN.md §13a). Picking up a topic with a
//: branch under it needs, on its first frame, the element of every topic it
//: is carrying and the box of both ends of every edge between them: one
//: `querySelector` each is five hundred separate walks of the document, and
//: the first layout read after each of them is a fresh flush. One
//: `querySelectorAll` and one batch of reads is the same information for one
//: walk and one flush, which is what turns the pick-up from a stall into a
//: frame.
//:
//: First element wins, matching what `wbMapNodeSize`'s own `querySelector`
//: would have returned had two layers ever carried the same id. Only real
//: measurements are kept, for the reason `wbMapNodeSize` gives.
function wbIndexMapNodeElements() {
  const byId = new Map();
  if (!wbMapNodeSizeCache) wbMapNodeSizeCache = new Map();
  for (const el of document.querySelectorAll(".wb-object[data-id]")) {
    const id = Number(el.dataset.id);
    if (byId.has(id)) continue;
    byId.set(id, el);
    if (!wbMapNodeSizeCache.has(id) && el.offsetHeight) {
      wbMapNodeSizeCache.set(id, { w: el.offsetWidth, h: el.offsetHeight });
    }
  }
  return byId;
}

//: One node's measurement dropped, for the gesture that is changing that one
//: node's box while it runs (the size grip). Clearing the whole cache there
//: would put the board-wide re-measure back into every frame of a resize.
function wbForgetMapNodeSize(id) {
  wbMapNodeSizeCache?.delete(id);
}

// Every drag ends in one of these, whichever element it started on, and the
// same two events already clear the alignment guides' own box cache.
window.addEventListener("pointerup", wbClearMapNodeSizeCache, true);
window.addEventListener("pointercancel", wbClearMapNodeSizeCache, true);

//: Where an edge leaves its parent and where it meets its child, by layout, 
//: right/left for a map that grows sideways, bottom/top for one that grows
//: down. `radial` and `free` have no fixed direction, so the axis is chosen
//: per edge from whichever delta is larger, which is what makes a radial map's
//: edges leave a node on the side the child is actually on.
function wbMapEdgeAnchors(parent, child, layout) {
  const p = wbMapNodeSize(parent);
  const c = wbMapNodeSize(child);
  //: Every sideways layout is horizontal, whichever way it grows: the
  //: `leftward` test below already reads the direction off the two boxes, so
  //: tree-left and both-sides need nothing of their own here.
  let horizontal = layout === "tree-right" || layout === "tree-left" || layout === "tree-both";
  if (layout === "radial" || layout === "free") {
    horizontal = Math.abs(child.x - parent.x) >= Math.abs(child.y - parent.y);
  }
  if (horizontal) {
    const leftward = child.x + c.w / 2 < parent.x + p.w / 2;
    return {
      horizontal,
      x1: leftward ? parent.x : parent.x + p.w,
      y1: parent.y + p.h / 2,
      x2: leftward ? child.x + c.w : child.x,
      y2: child.y + c.h / 2,
    };
  }
  const upward = child.y + c.h / 2 < parent.y + p.h / 2;
  return {
    horizontal,
    x1: parent.x + p.w / 2,
    y1: upward ? parent.y : parent.y + p.h,
    x2: child.x + c.w / 2,
    y2: upward ? child.y + c.h : child.y,
  };
}

//: **Where the line into a topic bends** (MINDMAP_PLAN.md §12.1 item 5's
//: third, "the control points on a curve drag to reshape it").
//:
//: A tree edge has no row of its own (it *is* `parent_id`), so the waypoint
//: lives on the child, in `edge_slide` and `edge_bend`, as two fractions of
//: the line's own length: along it from the halfway mark, and across it. The
//: frame is rebuilt from the anchors every time it is read, which is what
//: makes the stored pair survive a tidy, a drag, a zoom and a layout switch:
//: two board coordinates would be right until either end moved, which on a
//: map that lays itself out is about one gesture later.
//:
//: `bent` is what an unset pair means: the point is the anchors' own midpoint,
//: every shape below is the shape it has always drawn, and the `d` string a
//: plain map produces is the same string character for character.
function wbMapEdgeWaypoint(a, child) {
  const slide = Number(child?.data?.edge_slide) || 0;
  const bend = Number(child?.data?.edge_bend) || 0;
  const mx = (a.x1 + a.x2) / 2;
  const my = (a.y1 + a.y2) / 2;
  const dx = a.x2 - a.x1;
  const dy = a.y2 - a.y1;
  const len = Math.hypot(dx, dy) || 1;
  // Along the line, and the normal to it: the pair (ux, uy), (-uy, ux).
  const ux = dx / len;
  const uy = dy / len;
  return {
    bent: Boolean(slide || bend),
    x: mx + (ux * slide - uy * bend) * len,
    y: my + (uy * slide + ux * bend) * len,
  };
}

//: The same frame read the other way: a board point back into the two
//: fractions the drag stores. Held to the same bounds the schema enforces, so
//: a drag can never compose a value the PUT would then refuse (a gesture that
//: works until you let go is the worst shape a control can have).
const WB_MAP_BEND_MAX = 4;
const WB_MAP_SLIDE_MAX = 0.45;

function wbMapEdgeFractions(a, x, y) {
  const mx = (a.x1 + a.x2) / 2;
  const my = (a.y1 + a.y2) / 2;
  const dx = a.x2 - a.x1;
  const dy = a.y2 - a.y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const vx = x - mx;
  const vy = y - my;
  const hold = (value, limit) => Math.max(-limit, Math.min(limit, value));
  //: Three decimals, which at the 45-degree worst case is under a hundredth
  //: of a pixel on the longest branch this canvas allows: enough that the
  //: line lands where it was dropped, and short enough that the number in an
  //: exported file is a number a person can read.
  const round = (value) => Math.round(value * 1000) / 1000;
  return {
    edge_slide: round(hold((vx * ux + vy * uy) / len, WB_MAP_SLIDE_MAX)),
    edge_bend: round(hold((vx * -uy + vy * ux) / len, WB_MAP_BEND_MAX)),
  };
}

//: The cubic a curved edge is drawn from, as four points, so the stroke and
//: the ribbon are two drawings of one curve rather than two curves that drift
//: (the same bargain `wbMapEdgePathD`'s own comment makes about the render and
//: the per-frame drag follow).
//:
//: **The bend is 4/3 of the distance the point moved, and the number is the
//: whole trick.** A cubic's own midpoint is `(p0 + 3c0 + 3c1 + p1) / 8`, so
//: shifting *both* control points by d moves that midpoint by 6d/8: to put the
//: curve through a point the pointer is holding, the control points move 4/3
//: as far. Which means the handle is not near the line, it is exactly on it,
//: at t = 0.5, at every zoom and in both orientations, and the probe can say
//: so with a number rather than a screenshot.
function wbMapEdgeCubic(a, child) {
  const mx = (a.x1 + a.x2) / 2;
  const my = (a.y1 + a.y2) / 2;
  const p0 = { x: a.x1, y: a.y1 };
  const p1 = { x: a.x2, y: a.y2 };
  // Control points on the axis the edge leaves by, at half the span: the
  // curve leaves the parent square to its own edge and arrives square to
  // the child's, which is what makes a column of siblings read as one
  // branch rather than a fan of straight lines crossing each other.
  const c0 = a.horizontal ? { x: mx, y: a.y1 } : { x: a.x1, y: my };
  const c1 = a.horizontal ? { x: mx, y: a.y2 } : { x: a.x2, y: my };
  const w = wbMapEdgeWaypoint(a, child);
  if (w.bent) {
    const dx = (w.x - mx) * (4 / 3);
    const dy = (w.y - my) * (4 / 3);
    c0.x += dx;
    c0.y += dy;
    c1.x += dx;
    c1.y += dy;
  }
  return { p0, c0, c1, p1 };
}

//: Where an elbow turns, which is the one thing a right-angled line has to
//: give a waypoint. Held between the two anchors on both axes: a turn outside
//: the span is a line that doubles back on itself, and the point it returns is
//: then guaranteed to sit on the elbow's own crossing leg, which is what lets
//: the handle be drawn on the line for this shape as well as the other two.
function wbMapEdgeElbowTurn(a, w) {
  const hold = (value, p, q) => Math.max(Math.min(p, q), Math.min(Math.max(p, q), value));
  return { x: hold(w.x, a.x1, a.x2), y: hold(w.y, a.y1, a.y2) };
}

//: How far apart a line's two controls sit, in board units. The `+` is 24
//: units across and the handle 14, so 26 is the first number at which neither
//: covers the other at any zoom (both live in the zoomed layer and scale
//: together). They were on the same point in the first build of this, and the
//: `+` is HTML above the SVG: `elementFromPoint` at the handle's centre
//: returned the button, and the drag could not start at all.
const WB_MAP_EDGE_CONTROL_GAP = 26;

//: The point on the drawn line where the handle belongs, per line shape
//: (§12.1 item 5's third has to compose with item 4's three shapes). The curve
//: and the straight line pass through the waypoint itself by construction; the
//: elbow passes through its turn.
function wbMapEdgeHandlePoint(parent, child, layout) {
  const a = wbMapEdgeAnchors(parent, child, layout);
  const w = wbMapEdgeWaypoint(a, child);
  if ((wbMapThemedData(child).edge_style || "curve") === "elbow") return wbMapEdgeElbowTurn(a, w);
  return { x: w.x, y: w.y };
}

//: One tree edge's `d`, from the two nodes' live `x`/`y` and their rendered
//: sizes. Factored out of `wbRenderMapEdges` below so the per-frame drag
//: follow (`wbUpdateMapEdges`) recomputes an edge with exactly the maths the
//: render uses: two copies of a cubic drifted apart is precisely the bug
//: `wbUpdateLinkedSketches` warns about for link sketches.
function wbMapEdgePathD(parent, child, layout) {
  const a = wbMapEdgeAnchors(parent, child, layout);
  //: The line's own shape, from the link radial (§12.1 item 4). Read from the
  //: *child*, which is the end of a tree edge that has exactly one incoming
  //: line, and defaulting to the curve, so a map made before this existed
  //: draws exactly as it did.
  //:
  //: All three share the anchors above, so switching between them cannot move
  //: where a line meets a node: the difference is only what happens between
  //: the two points. The elbow turns at the same midpoint the curve's control
  //: points sit on, which is what keeps a column of siblings reading as one
  //: branch in either style.
  const style = wbMapThemedData(child).edge_style || "curve";
  //: The waypoint composes with all three shapes rather than only the curve
  //: (§12.1 item 5's third: "it now has to compose with the three line shapes
  //: item 4 added"). Each shape bends in the way that shape can: the curve
  //: passes through the point, the straight line kinks at it, and the elbow
  //: moves its turn to it. An unbent line is the same string it always was.
  const w = wbMapEdgeWaypoint(a, child);
  if (style === "straight") {
    return w.bent
      ? `M${a.x1} ${a.y1} L${w.x} ${w.y} L${a.x2} ${a.y2}`
      : `M${a.x1} ${a.y1} L${a.x2} ${a.y2}`;
  }
  if (style === "elbow") {
    const turn = wbMapEdgeElbowTurn(a, w);
    return a.horizontal
      ? `M${a.x1} ${a.y1} L${turn.x} ${a.y1} L${turn.x} ${a.y2} L${a.x2} ${a.y2}`
      : `M${a.x1} ${a.y1} L${a.x1} ${turn.y} L${a.x2} ${turn.y} L${a.x2} ${a.y2}`;
  }
  const c = wbMapEdgeCubic(a, child);
  return `M${c.p0.x} ${c.p0.y} C${c.c0.x} ${c.c0.y} ${c.c1.x} ${c.c1.y} ${c.p1.x} ${c.p1.y}`;
}

//: **A branch is a shape, not a line** (INBOX 180: "can you give the direction
//: connectors a better and more modern professional look??", after 177 asked
//: for Coggle's refined thick branches).
//:
//: Coggle's branches are not strokes: each one is a filled ribbon, wide where
//: it leaves the parent and narrow where it reaches the child, which is what
//: makes a map read as a tree growing outwards rather than as a diagram of
//: boxes joined by wires. It also carries the direction the earlier report
//: asked for without an arrowhead on every line: thick end to thin end says
//: which way the branch runs, at every zoom, with nothing extra drawn.
//:
//: Sampled rather than solved: the offset curve of a cubic is not itself a
//: cubic, so the honest way to draw one is to walk the curve, take the normal
//: at each step, and push out by half the width wanted there. Twenty-four
//: steps is smooth at every zoom this canvas allows (the curve is at most a
//: few hundred units across and the error between samples is well under a
//: pixel at 4x), and the whole ribbon is one closed path either way.
//:
//: Only the default curve is drawn this way. An edge explicitly set to
//: straight, elbow or dashed through the link ring keeps its stroke: a dash
//: is a property of a stroke and has no meaning on a fill, and a person who
//: chose a plain line asked for a plain line.
const WB_MAP_RIBBON_STEPS = 24;
const WB_MAP_RIBBON_WIDE = 6.5;
const WB_MAP_RIBBON_THIN = 2;

//: **Per-branch thickness** (MINDMAP_PLAN.md item 177, "connection line
//: styles: per-branch thickness, dash and arrowhead"). A multiplier rather
//: than a width, because the same value has to scale two different drawings:
//: the ribbon, whose two ends are 6.5 and 2 units apart, and the stroke the
//: other three line shapes keep, which is 3px in the stylesheet. A number of
//: pixels would have to be written twice and would drift.
//:
//: Three steps and not a slider: a map's lines are read against each other, so
//: what matters is that one branch is heavier than its neighbour, and a
//: continuum of widths nobody can tell apart is a control that only makes
//: maps inconsistent. Medium is stored as nothing at all, like every other
//: default this strip writes.
const WB_MAP_EDGE_WEIGHTS = { thin: 0.55, thick: 1.7 };

function wbMapEdgeWeight(child) {
  return WB_MAP_EDGE_WEIGHTS[wbMapThemedData(child).edge_width] || 1;
}

//: Whether *this* line ends in an arrowhead.
//:
//: The default differs by drawing, which is why this is a function and not a
//: boolean field: a ribbon carries its direction in the taper and gets no
//: head (a marker on a closed outline would be placed at the end of the
//: outline, back at the parent), while a plain stroke has no taper and has
//: had a head since the branch-direction report. `edge_arrow` overrides
//: whichever default applies, so the strip's toggle can add a head to a
//: ribbon and take one off a straight line.
function wbMapEdgeHasArrow(child) {
  const set = wbMapThemedData(child).edge_arrow;
  if (set === "on") return true;
  if (set === "off") return false;
  return !wbMapEdgeIsRibbon(child);
}

function wbMapCubicAt(t, p0, c0, c1, p1) {
  const u = 1 - t;
  const x = u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x;
  const y = u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y;
  //: The derivative, for the normal. Taken analytically because a difference
  //: between two samples is wrong at exactly the two places it matters most,
  //: the ends, where there is no sample on one side.
  const dx = 3 * u * u * (c0.x - p0.x) + 6 * u * t * (c1.x - c0.x) + 3 * t * t * (p1.x - c1.x);
  const dy = 3 * u * u * (c0.y - p0.y) + 6 * u * t * (c1.y - c0.y) + 3 * t * t * (p1.y - c1.y);
  return { x, y, dx, dy };
}

function wbMapRibbonD(parent, child, layout) {
  const a = wbMapEdgeAnchors(parent, child, layout);
  //: The same four points the stroked curve is drawn from, waypoint and all
  //: (`wbMapEdgeCubic`): a ribbon that ignored the bend would be the default
  //: line shape on this map quietly refusing the control, which is the one
  //: way a feature can be "built" and do nothing on most of a map.
  const { p0, c0, c1, p1 } = wbMapEdgeCubic(a, child);
  const weight = wbMapEdgeWeight(child);
  //: An arrowhead on a ribbon is part of the ribbon, not a marker: the shape
  //: is closed, so a `marker-end` would be placed at the end of the outline,
  //: which is back at the parent. The body therefore stops short and the last
  //: sixth of the run becomes a barb and a tip, which is also the only way the
  //: head can taper out of a shape whose width is already varying.
  const arrow = wbMapEdgeHasArrow(child);
  const bodyEnd = arrow ? 0.84 : 1;
  const left = [];
  const right = [];
  const halfAt = (t) => weight * (WB_MAP_RIBBON_THIN
    + (WB_MAP_RIBBON_WIDE - WB_MAP_RIBBON_THIN) * (1 - t) * (1 - t)) / 2;
  for (let i = 0; i <= WB_MAP_RIBBON_STEPS; i += 1) {
    //: Eased rather than linear, so the branch keeps its weight for the first
    //: part of its run and tapers over the second, which is how a real branch
    //: (and Coggle's) looks; a straight ramp reads as a wedge.
    const t = (i / WB_MAP_RIBBON_STEPS) * bodyEnd;
    const point = wbMapCubicAt(t, p0, c0, c1, p1);
    const length = Math.hypot(point.dx, point.dy) || 1;
    const nx = -point.dy / length;
    const ny = point.dx / length;
    const half = halfAt(t);
    left.push([point.x + nx * half, point.y + ny * half]);
    right.push([point.x - nx * half, point.y - ny * half]);
  }
  let tip = null;
  if (arrow) {
    const barb = wbMapCubicAt(bodyEnd, p0, c0, c1, p1);
    const length = Math.hypot(barb.dx, barb.dy) || 1;
    const nx = -barb.dy / length;
    const ny = barb.dx / length;
    // Wide enough to read as a head against the body it grew out of, and
    // scaled with the branch so a thin line does not get a fat point.
    const wide = Math.max(halfAt(bodyEnd) * 2.4, 3.4 * weight);
    left.push([barb.x + nx * wide, barb.y + ny * wide]);
    right.push([barb.x - nx * wide, barb.y - ny * wide]);
    const end = wbMapCubicAt(1, p0, c0, c1, p1);
    tip = [end.x, end.y];
  }
  const at = ([x, y]) => `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
  const forward = left.map((pt, i) => `${i ? "L" : "M"}${at(pt)}`).join("");
  const point = tip ? `L${at(tip)}` : "";
  const back = right.reverse().map((pt) => `L${at(pt)}`).join("");
  return `${forward}${point}${back}Z`;
}

//: Which of the two drawings this edge gets. One place, because the render,
//: the per-frame drag update and the class that styles it all have to agree:
//: a ribbon painted with a stroke rule is a blob, and a stroke painted with a
//: fill rule is invisible.
function wbMapEdgeIsRibbon(child) {
  const themed = wbMapThemedData(child);
  return (themed.edge_style || "curve") === "curve" && !themed.edge_dashed;
}

//: The tree edges touching `id` (its own edge up to its parent, and one per
//: child), each with the `<path>` that drew it, collected once per drag.
//:
//: **This is the single-node half of the "connections get left behind when i
//: move the notes/nodes around" report** (INBOX 42, with a screenshot of a
//: curve attached to neither node). A tree edge is not a link sketch, so
//: `wbUpdateLinkedSketches` never touched one, and nothing else ran between
//: `dragStart` and the drop: measured before this fix, the edge sat 155.6px
//: from the node it joins through a single-node drag, and stayed there after
//: the drop for any node already pinned (`wbMapPinOnDrag` returns early once
//: `data.pinned` is set, so its `wbScheduleRender` never fired a second
//: time). Precomputed for the same reason `wbLinkedSketchesFor` is: a node
//: gains or loses a parent between drags, never during one.
//:
//: **The three lines an edge is drawn from, found in one pass over the edge
//: group rather than by three document-wide attribute queries per edge**
//: (MINDMAP_PLAN.md §13a). `wbCaptureBulkMoveOrigin` calls `wbMapEdgesFor`
//: once per topic in a dragged branch, so on a 500-topic map the old shape
//: ran several thousand `document.querySelector` calls, and rebuilt the map
//: index and read the layout once per topic on top of them, all before the
//: pointer had moved. Passing one context in makes the whole capture linear
//: in the branch rather than quadratic in the board.
function wbMapEdgeContext() {
  const els = new Map();
  const group = document.querySelector(".wb-map-edges");
  if (group) {
    for (const el of group.querySelectorAll(
      ".wb-map-edge, .wb-map-edge-hit, .wb-map-edge-handle"
    )) {
      const key = `${el.dataset.parent}:${el.dataset.child}`;
      let slot = els.get(key);
      if (!slot) els.set(key, (slot = {}));
      // `wb-map-edge` is the visible path's own token; the ribbon, dash and
      // thickness classes ride alongside it on the same element, and the twin
      // and the handle carry neither it nor each other.
      if (el.classList.contains("wb-map-edge")) slot.el = el;
      else if (el.classList.contains("wb-map-edge-hit")) slot.hit = el;
      else slot.grip = el;
    }
  }
  return { index: wbMapIndex(), layout: wbMapLayout(), els };
}

function wbMapEdgesFor(id, ctx) {
  if (!wbIsMap()) return [];
  const { index, layout, els } = ctx || wbMapEdgeContext();
  const self = index.byId.get(id);
  if (!self) return [];
  const found = [];
  const add = (parent, child) => {
    const slot = els.get(`${parent.id}:${child.id}`);
    // No element means the edge is not drawn right now (a collapsed or
    // filtered branch), which is not an error: there is simply nothing to
    // follow the drag.
    if (!slot || !slot.el) return;
    // The invisible twin has to follow the drag as well, or the line you can
    // point at stays where the line used to be: a target that is right until
    // the first time anything moves is worse than no target.
    if (slot.hit) slot.el._wbHitTwin = slot.hit;
    // And the waypoint handle (§12.1 item 5's third), for the same reason the
    // hit twin is here: a handle that stays where the line used to be is a
    // control pointing at nothing the moment either end of the line moves.
    if (slot.grip) slot.el._wbHandle = slot.grip;
    found.push({ parent, child, el: slot.el, layout });
  };
  const parent = self.parent_id != null ? index.byId.get(self.parent_id) : null;
  if (parent) add(parent, self);
  for (const child of index.childrenOf.get(id) || []) add(self, child);
  return found;
}

//: Redraws the edges `wbMapEdgesFor` collected, without a full render. Same
//: bargain as `wbUpdateLinkedSketches`: a full `renderWhiteboardNow()` on
//: every mousemove frame re-binds every card, sketch and object on the board
//: for the sake of two curves, which is the "glitchy and slow to update"
//: report this file already carries.
function wbUpdateMapEdges(edges) {
  for (const { parent, child, el, layout } of edges || []) {
    const d = wbMapEdgePathD(parent, child, layout);
    // The visible path is the ribbon where the edge has one; the hit twin is
    // always the centreline, which is what a person is actually pointing at.
    el.setAttribute("d", wbMapEdgeIsRibbon(child) ? wbMapRibbonD(parent, child, layout) : d);
    if (el._wbHitTwin) el._wbHitTwin.setAttribute("d", d);
    if (el._wbHandle) {
      const point = wbMapEdgeHandlePoint(parent, child, layout);
      el._wbHandle.setAttribute("cx", String(point.x));
      el._wbHandle.setAttribute("cy", String(point.y));
    }
  }
}

//: The parent→child edges, drawn as cubic curves into their own group.
//:
//: A tree edge is deliberately **not** a link sketch. A sketch is a row in the
//: database that has to be created, moved and deleted alongside the node it
//: joins, and `parent_id` already says everything an edge means, so the edge
//: is derived on every render and there is no second thing to keep in step.
//: Cross-links stay real sketches, because they are the edges `parent_id`
//: cannot express (§9.1).
//:
//: The group is the first child of the zoom group so edges sit *under* every
//: sketch and node, which is the only z-order a tree reads correctly in.
function wbRenderMapEdges() {
  const zoomGroup = document.getElementById("wb-zoom-group");
  if (!zoomGroup) return;
  let group = zoomGroup.querySelector(".wb-map-edges");
  if (!wbIsMap()) {
    group?.remove();
    return;
  }
  if (!group) {
    group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "wb-map-edges");
    group.setAttribute("aria-hidden", "true");
    zoomGroup.insertBefore(group, zoomGroup.firstChild);
  }
  const index = wbMapIndex();
  const colors = wbMapNodeColors(index);
  const hidden = wbMapConcealed(index);
  const layout = wbMapLayout();
  //: **A line is keyed by its two ends and updated in place**
  //: (MINDMAP_PLAN.md §13a, the render pass). This loop used to build four
  //: SVG elements per edge and `replaceChildren` the lot on every render: at
  //: 500 topics that is two thousand elements created, wired and thrown away
  //: because one of them moved, and it measured 122.2ms of a 527ms render.
  //:
  //: The old note here said an edge has no identity of its own, it *is* its
  //: two endpoints, so there was nothing for a join to key on. The first half
  //: is still true and the conclusion was wrong: those two endpoints are a
  //: perfectly good key, and `wbMapEdgesFor` has been finding a line by them
  //: mid-drag ever since. What an edge does not have is a *row*, which is why
  //: this is a hand-rolled cache rather than a d3 data join.
  //:
  //: The cache hangs off the group element, not off the module: a board that
  //: is not a map removes the group above, which takes the cache with it, so
  //: a stale element can never be handed to the next board.
  const cache = group._wbMapEdges instanceof Map ? group._wbMapEdges : (group._wbMapEdges = new Map());
  const drawn = new Set();
  //: **The group stays in the tree's own order**, which is what rebuilding it
  //: gave for free. Two things read that order: SVG paints in document order,
  //: so it decides which of two overlapping lines is on top, and
  //: `mapstrip.js` pairs the first line with the first mid-line `+` (the
  //: pluses are still rebuilt in index order). Appending new lines at the end
  //: instead cost that sweep its insert check, which is the order saying out
  //: loud that it is load-bearing. Nothing moves while the tree is unchanged:
  //: this compares first and writes only when a line is out of place.
  let slot = 0;
  for (const parent of index.nodes) {
    if (hidden.has(parent.id) || parent.data?.collapsed) continue;
    for (const child of index.childrenOf.get(parent.id) || []) {
      if (hidden.has(child.id)) continue;
      const key = `${parent.id}:${child.id}`;
      drawn.add(key);
      const geom = wbMapEdgeGeometry(parent, child, layout, colors);
      const held = cache.get(key);
      //: `isConnected`, because something else can take the element out from
      //: under this cache: `group.remove()` above on a board that stopped
      //: being a map, and an export that clones and replaces the layer.
      let wrap;
      if (held && held.wrap.isConnected) {
        wrap = held.wrap;
        if (held.paint !== geom.paint) {
          wbMapEdgeApply(wrap, geom);
          held.paint = geom.paint;
        }
      } else {
        wrap = wbMapEdgeElement(parent.id, child.id);
        wbMapEdgeApply(wrap, geom);
        cache.set(key, { wrap, paint: geom.paint });
      }
      if (group.childNodes[slot] !== wrap) group.insertBefore(wrap, group.childNodes[slot] || null);
      slot += 1;
    }
  }
  //: The lines whose two ends are no longer joined: a re-parent, a delete, a
  //: branch folded away. This is the one thing a keyed update has to do that
  //: rebuilding the group got for free, and leaving it out is how a keyed
  //: render grows edges that point at nothing.
  for (const [key, held] of cache) {
    if (drawn.has(key)) continue;
    held.wrap.remove();
    cache.delete(key);
  }
  wbRenderMapEdgePluses(index, hidden, layout);
  wbSyncMapEdgeHandles();
}

//: Everything one tree edge draws, worked out from the two topics it joins,
//: plus `paint`: the same values as one string, which is what decides whether
//: the line already on screen is the line this render wants. A property this
//: function starts reading goes into `paint` too, exactly as it does for a
//: node's own `wbObjectPaintKey`.
function wbMapEdgeGeometry(parent, child, layout, colors) {
  const ribbon = wbMapEdgeIsRibbon(child);
  //: The line's own classes (MINDMAP_PLAN.md item 177). Thickness is a class
  //: rather than a `stroke-width` attribute for the same reason the colour is
  //: a custom property: a presentation attribute sits below every author
  //: rule, so `.wb-map-edge`'s own `stroke-width` would win and the control
  //: would do nothing. The ribbon needs no thickness class, since its width
  //: is in the path it is drawn from, and no arrow class, since its head is
  //: too.
  const classes = ["wb-map-edge"];
  if (ribbon) classes.push("wb-map-edge-ribbon");
  else {
    const themedEdge = wbMapThemedData(child);
    if (themedEdge.edge_dashed) classes.push("wb-map-edge-dashed");
    if (themedEdge.edge_width) classes.push(`wb-map-edge-${themedEdge.edge_width}`);
    if (!wbMapEdgeHasArrow(child)) classes.push("wb-map-edge-headless");
  }
  //: The centreline, which is both the plain line's own path and, for a
  //: ribbon, the hit target underneath it: a stroke around a closed shape is
  //: a hit area shaped like a hoop, with a hole down the middle of the very
  //: line it is supposed to catch.
  const line = wbMapEdgePathD(parent, child, layout);
  const className = classes.join(" ");
  const d = ribbon ? wbMapRibbonD(parent, child, layout) : line;
  const grip = wbMapEdgeHandlePoint(parent, child, layout);
  const colour = colors.get(child.id) || "";
  //: What the line says (§12.1 items 3 and 4), at the curve's own middle.
  //: `wbMapEdgeHandlePoint` rather than the anchors' own midpoint: for an
  //: unbent line the two are the same point (the curve passes through it at
  //: t = 0.5, worked out in `wbMapEdgeCubic`), and for a bent one this is the
  //: one that is still on the line.
  const label = child.data?.edge_label ? String(child.data.edge_label) : "";
  const ldx = Number(child.data?.edge_label_dx) || 0;
  const ldy = Number(child.data?.edge_label_dy) || 0;
  const lx = grip.x + ldx;
  const ly = grip.y + ldy;
  return {
    className, d, line, grip, colour, label, lx, ly,
    paint: `${className}|${d}|${line}|${grip.x},${grip.y}|${colour}|${label}|${lx},${ly}`,
  };
}

//: One edge's elements, with no geometry on them yet: built once per edge and
//: then kept, which is what `wbRenderMapEdges`'s cache is for.
//:
//: **One `<g>` per edge**, so the whole line is one hover target: the stroke,
//: the target twin and the handle together. That is what lets the handle be
//: revealed by pointing at the line (§12.1 item 5's third, and Coggle's own
//: gesture) rather than only by selecting a topic, and it matters for a
//: reason the first build of this measured: the map strip opens 44px above
//: the selected topic and is several hundred pixels wide, so for a child laid
//: out a little below its parent the strip lands exactly on the middle of the
//: line into it. Measured on a child 200 units below its trunk:
//: `elementFromPoint` at the handle's own centre returned the strip, and the
//: drag never started. Hover needs no selection, so it needs no strip.
//:
//: Nothing keys off the group's own shape: every selector in this file and in
//: the sweeps reaches an edge by class under `.wb-map-edges`.
function wbMapEdgeElement(parentId, childId) {
  const NS = "http://www.w3.org/2000/svg";
  const wrap = document.createElementNS(NS, "g");
  wrap.setAttribute("class", "wb-map-edge-group");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("class", "wb-map-edge");
  // The two ends' ids, so a drag can find *this* edge again and redraw it per
  // frame (`wbMapEdgesFor`), and so this render can find it again next time.
  path.setAttribute("data-parent", String(parentId));
  path.setAttribute("data-child", String(childId));
  wrap.appendChild(path);
  //: The same curve again, transparent and wide enough to grab (§12.1 item
  //: 4). Appended *after* the visible path so it sits above it in the group,
  //: which is what an SVG hit test needs; it is invisible either way, and the
  //: visible line is inert.
  const hit = document.createElementNS(NS, "path");
  hit.setAttribute("class", "wb-map-edge-hit");
  hit.setAttribute("data-parent", String(parentId));
  hit.setAttribute("data-child", String(childId));
  wrap.appendChild(hit);
  //: **The waypoint handle** (§12.1 item 5's third): the third target on a
  //: line, after the visible stroke and the invisible one you can point at. A
  //: circle rather than a button because it has to sit *on* the line at a
  //: board coordinate and scale with the zoom, which is what the edge group
  //: already is; the mid-line `+` is HTML for the opposite reason (it is a
  //: button from the app's own ramp).
  //:
  //: Drawn for every line and shown only for the selected topic's own
  //: (`wbSyncMapEdgeHandles`), so a map of two hundred lines is not a map of
  //: two hundred grab dots, which is the same rule the `+` follows.
  const handle = document.createElementNS(NS, "circle");
  handle.setAttribute("class", "wb-map-edge-handle");
  handle.setAttribute("r", "7");
  handle.setAttribute("data-parent", String(parentId));
  handle.setAttribute("data-child", String(childId));
  //: The same sentence the link's own bend grip carries, because it is the
  //: same control: a `<title>` is the tooltip an SVG shape gets, and it is
  //: the only place either gesture is written down on the thing itself.
  const gripTitle = document.createElementNS(NS, "title");
  gripTitle.textContent = "Drag to bend this line · double-click to straighten";
  handle.appendChild(gripTitle);
  wbWireMapEdgeHandle(handle, parentId, childId);
  wrap.appendChild(handle);
  //: On the group, not on the hit stroke: a right-click and a hold belong to
  //: the *line*, and the line now has two targets in it. Wired on the stroke
  //: alone, the ring stopped opening wherever the handle was, since the
  //: handle is a sibling of the stroke and the event never reached it
  //: (measured by `mapstrip.js`, which caught it the moment the handle
  //: landed: "right-click on a line opens the line's own ring" came back
  //: `open: false`). This is the same fault the mid-line `+` already carries
  //: its own forwarding for, and the same fix one level up: every part of the
  //: line answers the line's own gestures.
  wbWireMapEdgeGestures(wrap, childId);
  return wrap;
}

//: One edge's geometry written onto the elements it already has.
//:
//: **A custom property, not a `stroke` attribute**, and the difference is the
//: whole branch-colour feature. `.wb-map-edge` declares `stroke` in
//: 07-whiteboard-misc.css, and a presentation attribute is a declaration at
//: the bottom of the cascade, below every author rule however unspecific: so
//: the attribute was dead markup and every edge on every map drew in the
//: accent. Measured on a five-edge map: three distinct `stroke` attributes
//: from the branch palette, one computed colour, `rgb(70, 100, 240)`, which
//: is `--accent`. `tests/test_svg_paint_attributes.py` is the lint that found
//: it, and `el.style` sits above the stylesheet where the attribute sat
//: below. Removed as well as set, which a rebuilt element never had to do:
//: a branch that loses its colour has to lose it on the line too.
//: **A line's label follows the pointer, in board units.** The first
//: version rode d3-drag's `dx`, which is measured in the edge layer's SVG
//: space; that layer is scaled by the board's CSS zoom, which Chromium's
//: `getScreenCTM` does not see, so at any zoom but 1x the label ran ahead of
//: or behind the hand (owner: "it goes a bit off my mouse"). It also stopped
//: only the mouse event, after the canvas had already taken the pointerdown
//: and started a selection box. This takes the pointer itself: the screen
//: delta divided by the zoom, captured so a fast drag cannot lose it, and a
//: stopped pointerdown so nothing behind the label reacts. One undo step,
//: through `wbMapSetNodeStyle`, on release.
function wbWireEdgeLabelDrag(text, wrap) {
  text.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const childId = Number(wrap.querySelector(".wb-map-edge")?.dataset.child);
    const node = wbMapIndex().byId.get(childId);
    if (!node) return;
    event.stopPropagation();
    event.preventDefault();
    const container = document.getElementById("whiteboard-container");
    const k = d3.zoomTransform(container).k || 1;
    const startX = event.clientX;
    const startY = event.clientY;
    const fromDx = Number(node.data?.edge_label_dx) || 0;
    const fromDy = Number(node.data?.edge_label_dy) || 0;
    const baseX = Number(text.getAttribute("x")) - fromDx;
    const baseY = Number(text.getAttribute("y")) - fromDy;
    let dx = fromDx;
    let dy = fromDy;
    text.setPointerCapture(event.pointerId);
    text.classList.add("is-dragging");
    const move = (e) => {
      dx = fromDx + (e.clientX - startX) / k;
      dy = fromDy + (e.clientY - startY) / k;
      text.setAttribute("x", String(baseX + dx));
      text.setAttribute("y", String(baseY + dy));
    };
    const done = async () => {
      text.removeEventListener("pointermove", move);
      text.removeEventListener("pointerup", done);
      text.removeEventListener("pointercancel", done);
      text.classList.remove("is-dragging");
      if (Math.round(dx) === fromDx && Math.round(dy) === fromDy) return;
      await wbMapSetNodeStyle(node, { edge_label_dx: Math.round(dx), edge_label_dy: Math.round(dy) });
      wbScheduleRender();
    };
    text.addEventListener("pointermove", move);
    text.addEventListener("pointerup", done);
    text.addEventListener("pointercancel", done);
  });
}

function wbMapEdgeApply(wrap, geom) {
  //: By class, not by position: the group's order is the hit test's (the
  //: invisible twin has to sit above the visible line), so reaching for a
  //: child by index here would tie this to that order for no reason.
  const path = wrap.querySelector("path.wb-map-edge");
  path.setAttribute("class", geom.className);
  path.setAttribute("d", geom.d);
  if (geom.colour) path.style.setProperty("--wb-map-edge-colour", geom.colour);
  else path.style.removeProperty("--wb-map-edge-colour");
  const hit = wrap.querySelector(".wb-map-edge-hit");
  hit.setAttribute("d", geom.line);
  const handle = wrap.querySelector(".wb-map-edge-handle");
  handle.setAttribute("cx", String(geom.grip.x));
  handle.setAttribute("cy", String(geom.grip.y));
  if (geom.colour) handle.style.setProperty("--wb-map-edge-colour", geom.colour);
  else handle.style.removeProperty("--wb-map-edge-colour");
  let text = wrap.querySelector(".wb-map-edge-label");
  if (!geom.label) {
    text?.remove();
    return;
  }
  if (!text) {
    text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("class", "wb-map-edge-label");
    text.setAttribute("dy", "-0.4em");
    // bounding-box creates a solid hit area matching the text's box, preventing mis-clicks
    text.style.pointerEvents = "bounding-box";
    text.style.cursor = "move";
    text.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      const childId = Number(wrap.querySelector(".wb-map-edge").dataset.child);
      if (childId) wbMapLabelEdge(childId);
    });

    wbWireEdgeLabelDrag(text, wrap);

    wrap.appendChild(text);
  }
  text.setAttribute("x", String(geom.lx));
  text.setAttribute("y", String(geom.ly));
  text.textContent = geom.label;
}

//: Where the mid-line `+` sits: a short step along the line from the handle,
//: towards the child, so a line's two controls are side by side on it rather
//: than one on top of the other (see `WB_MAP_EDGE_CONTROL_GAP`).
//:
//: Along the line and not merely along the chord: the step is taken down the
//: curve's own tangent at its middle, the elbow's own crossing leg, or the
//: kinked straight line's second half, so the `+` stays on the line it
//: inserts into whatever shape that line is and however far it has been bent.
//: On a line too short to hold both, the step shrinks rather than running the
//: `+` off the end.
function wbMapEdgePlusPoint(parent, child, layout) {
  const a = wbMapEdgeAnchors(parent, child, layout);
  const style = wbMapThemedData(child).edge_style || "curve";
  const middle = wbMapEdgeHandlePoint(parent, child, layout);
  let dx;
  let dy;
  let room = Math.hypot(a.x2 - a.x1, a.y2 - a.y1);
  if (style === "elbow") {
    // The leg the turn sits on, which is the one that crosses the edge's axis.
    dx = a.horizontal ? 0 : a.x2 - a.x1;
    dy = a.horizontal ? a.y2 - a.y1 : 0;
    room = Math.hypot(dx, dy);
  } else if (style === "straight") {
    const w = wbMapEdgeWaypoint(a, child);
    dx = a.x2 - w.x;
    dy = a.y2 - w.y;
  } else {
    const c = wbMapEdgeCubic(a, child);
    const tangent = wbMapCubicAt(0.5, c.p0, c.c0, c.c1, c.p1);
    dx = tangent.dx;
    dy = tangent.dy;
  }
  // Two siblings at the same height make a horizontal elbow with no crossing
  // leg at all: the line is straight, and the step goes along it instead.
  if (!dx && !dy) {
    dx = a.x2 - a.x1;
    dy = a.y2 - a.y1;
    room = Math.hypot(dx, dy);
  }
  const len = Math.hypot(dx, dy) || 1;
  const step = Math.min(WB_MAP_EDGE_CONTROL_GAP, room * 0.35);
  return { x: middle.x + (dx / len) * step, y: middle.y + (dy / len) * step };
}

//: **A `+` at the middle of every line, to put a topic between two others**
//: (MINDMAP_PLAN.md §12.1 item 5, Coggle's own mid-point add). The other half
//: of that item, the `+` at the far end of a branch, is the node's own
//: `.wb-map-add` and has been there since Phase 2.
//:
//: Drawn in `#wb-html-layer` rather than in the edge group, and that is the
//: whole reason this is a separate pass: the layer carries the same pan and
//: zoom the edges do, so a button placed at board coordinates lands on the
//: line and scales with it, *and* it can be a real `button.ghost.small
//: .icon-only` from the app's own ramp instead of a shape drawn in SVG that
//: would be a control nothing else in the app looks like.
//:
//: Invisible until the pointer is on it (CSS), which is what keeps a map of
//: two hundred lines from being a map of two hundred buttons.
function wbRenderMapEdgePluses(index, hidden, layout) {
  const host = document.getElementById("wb-html-layer");
  if (!host) return;
  let layer = host.querySelector(".wb-map-plus-layer");
  if (!wbIsMap()) {
    layer?.remove();
    return;
  }
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "wb-map-plus-layer";
    host.appendChild(layer);
  }
  const next = [];
  for (const parent of index.nodes) {
    if (hidden.has(parent.id) || parent.data?.collapsed) continue;
    for (const child of index.childrenOf.get(parent.id) || []) {
      if (hidden.has(child.id)) continue;
      const a = wbMapEdgeAnchors(parent, child, layout);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ghost small icon-only wb-map-edge-plus";
      // The two ends, so `wbSyncMapEdgeHandles` can stand this button aside
      // for the waypoint handle, which lives at the same point on the line.
      button.dataset.parent = String(parent.id);
      button.dataset.child = String(child.id);
      button.title = "Put a topic between these two";
      button.setAttribute("aria-label", "Put a topic between these two");
      // Half the button's own 1.5rem, so its centre is on the line rather
      // than its top-left corner. In board units, which is what this layer
      // is measured in.
      // The *line's* middle, not the anchors': a bent line (§12.1 item 5's
      // third) no longer passes through the halfway point between its ends,
      // and a `+` floating off the line it inserts into is a button that
      // looks like it belongs to something else.
      const middle = wbMapEdgePlusPoint(parent, child, layout);
      button.style.left = `${middle.x - 12}px`;
      button.style.top = `${middle.y - 12}px`;
      const glyph = document.createElement("i");
      glyph.className = "ph ph-plus";
      glyph.setAttribute("aria-hidden", "true");
      button.appendChild(glyph);
      button.addEventListener("pointerdown", (event) => event.stopPropagation());
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        wbMapInsertBetween(parent.id, child.id);
      });
      //: **It sits exactly where you would right-click the line**, so it has
      //: to pass that gesture on. Found by the sweep the moment this landed:
      //: the link ring stopped opening at a line's middle, because an
      //: invisible button was in front of the hit stroke and a right-click on
      //: a button is not a click. Forwarding it means the whole line answers
      //: the same gesture, middle included.
      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        wbOpenMapLinkRadial(child.id, event.clientX, event.clientY);
      });
      //: And the hold, for the same reason: a finger has no second button, so
      //: the button that sits on the line's middle has to answer the line's
      //: own gesture there too. `wireLongPress` (app.js) is the app's one
      //: hold, and it swallows the click the lift makes, which this button's
      //: own click (insert a topic here) would otherwise run the moment the
      //: ring opened.
      wireLongPress(button, (event, point) => wbOpenMapLinkRadial(child.id, point.x, point.y));
      next.push(button);
    }
  }
  layer.replaceChildren(...next);
}

//: Put a new topic between a parent and one of its children: the new topic
//: takes the parent, and the child takes the new topic.
//:
//: Two steps, and the second is a `/move` rather than a create-with-parent,
//: because the child already exists and `parent_id` is only writable through
//: the endpoint that runs the cycle check. The new topic opens for typing
//: like every other add on this map.
async function wbMapInsertBetween(parentId, childId) {
  const boardId = window.currentBoardId;
  if (!boardId) return;
  const created = await wbMapCreateNode({ parentId });
  if (!created) return;
  const child = (wbState.objects || []).find((o) => o.id === childId);
  if (!child) return;
  try {
    const moved = await apiJson(`/whiteboard/boards/${boardId}/nodes/${childId}/move`, {
      method: "PUT",
      body: JSON.stringify({ parent_id: created.id }),
    });
    Object.assign(child, moved);
  } catch (err) {
    toast(err.message || "Couldn't move that topic under the new one.", true);
    return;
  }
  selectWbItem("object", created.id);
  await wbMapTidyBranch(parentId);
  renderWhiteboardNow();
  wbMapEditNode(created.id);
}

// --- editing a map ----------------------------------------------------------
//
// Obsidian Canvas Mindmap's set (§5 item 5), which is the de-facto standard:
// Tab is a child, Enter a sibling, Shift+Tab outdents, the arrows walk the
// tree, F2 renames and Delete takes the subtree. The point of copying it
// rather than inventing one is that these are the gestures that make a mind
// map fast; dragging boxes one at a time is a drawing tool with a tree drawn
// on it.

//: The selected object, if it is a map node on a map. Everything keyboard
//: below goes through this rather than reading `wbSelectedItem` directly, so
//: "am I editing a map right now" is decided in one place.
function wbSelectedMapNode() {
  if (!wbIsMap() || wbSelectedItem?.kind !== "object") return null;
  const obj = (wbState.objects || []).find((o) => o.id === wbSelectedItem.id);
  return obj && WB_MAP_KINDS.has(obj.kind) ? obj : null;
}

//: Add one node, letting the **server** place it (§9.3: "Omit `x`/`y` and the
//: server places it"). A client that invents coordinates gets them wrong, and
//: gets them wrong differently from the AI tools and the OPML import, which is
//: how one map ends up looking like three tools' opinions of a map.
//: What a topic is called before you have called it anything.
//:
//: **Not an empty string**, which is what the first version created and what
//: looking at the result showed the problem with: five nodes on screen, four
//: of them blank white boxes with no way to tell a node you had not named yet
//: from a rendering fault. `wbMindMapAddCard` above reached the same
//: conclusion for the concept map and calls its own "New branch"; the label is
//: selected on creation, so the first keystroke replaces it either way.
const WB_MAP_NEW_TOPIC = "New topic";

async function wbMapCreateNode({ parentId = null, kind = "topic", text = WB_MAP_NEW_TOPIC, refId = null } = {}) {
  const boardId = window.currentBoardId;
  if (!boardId) return null;
  const body = { kind, parent_id: parentId, text };
  if (refId != null) body.ref_id = refId;
  try {
    const created = await apiJson(`/whiteboard/boards/${boardId}/nodes`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    wbState.objects = wbState.objects || [];
    wbState.objects.push(created);
    wbPushUndo({ action: "create", kind: "object", id: created.id });
    return created;
  } catch (err) {
    toast(err.message || "Couldn't add that node.", true);
    return null;
  }
}

//: Add a child of `parentId`, select it, tidy its branch and open it for
//: typing. **A new branch is an empty thought, so it opens ready to be typed**
//:, the same rule (and the same wording) the concept map's own branch gesture
//: follows further up this file; a node that makes you go and find the way to
//: name it is the difference between a mind-mapping tool and a diagram editor.
async function wbMapAddChild(parentId) {
  const created = await wbMapCreateNode({ parentId });
  if (!created) return null;
  // Expanding first: adding a child to a collapsed node would otherwise put
  // the new node straight into the hidden set, so the gesture would appear to
  // do nothing at all.
  const parent = (wbState.objects || []).find((o) => o.id === parentId);
  if (parent?.data?.collapsed) {
    parent.data = { ...parent.data, collapsed: false };
    await wbSaveObject(parent);
  }
  selectWbItem("object", created.id);
  await wbMapTidyBranch(parentId);
  renderWhiteboardNow();
  wbMapEditNode(created.id);
  return created;
}

//: **A new trunk where the person pointed** (MINDMAP_PLAN §13, the owner:
//: the map's tools "dont show themselves how id expect"). Double-clicking
//: empty canvas is how a new topic is made in Coggle, XMind and every
//: whiteboard in this app's own reference list, and on a map it did nothing
//: at all: measured, 3 topics before and 3 after. The rail's "Add a
//: top-level topic" was the only route, and it puts the new trunk wherever
//: the layout decides.
//:
//: Pinned, because the position is a decision the person made with the
//: pointer: that is the same bargain `wbMapPinOnDrag` strikes for a dragged
//: node, and without it the next tidy would move the new trunk away from the
//: spot that was just chosen.
async function wbMapAddRootAt(x, y) {
  const created = await wbMapCreateNode({ parentId: null });
  if (!created) return null;
  created.x = Math.round(x - (created.width || WB_MAP_NODE_W) / 2);
  created.y = Math.round(y - (created.height || WB_MAP_NODE_H) / 2);
  created.data = { ...created.data, pinned: true };
  await wbSaveObject(created);
  selectWbItem("object", created.id);
  renderWhiteboardNow();
  wbMapEditNode(created.id);
  return created;
}

//: Add a child that **points at something the library already holds**
//: (MINDMAP_PLAN.md §5 item 11).
//:
//: The label is *not* sent. `POST /boards/{id}/nodes` takes the kind and the
//: id and resolves the title itself, and `GET /tree` re-resolves it on every
//: load (§9.2): so renaming the note renames the node, which is the whole
//: reason a reference node is different from a topic with the same words in
//: it. `text` is left empty deliberately: a copy of the title stored here
//: would be the value that goes stale, and `wbMapLabel` prefers the resolved
//: one anyway.
//:
//: `wbRefreshMapState` is re-run before the render because the resolved label
//: lives in `wbMapState.labels`, which only that call fills, without it the
//: new node draws with no text at all until the next board load, which is
//: exactly the "renders as a blank box" failure §10.2 already fixed once for
//: topics.
async function wbMapAddReference(parentId) {
  if (typeof pickLibraryItemDialog !== "function") return null;
  const chosen = await pickLibraryItemDialog("Point a new node at…");
  if (!chosen) return null;
  const created = await wbMapCreateNode({
    parentId,
    kind: chosen.kind,
    text: "",
    refId: chosen.id,
  });
  if (!created) return null;
  const parent = (wbState.objects || []).find((o) => o.id === parentId);
  if (parent?.data?.collapsed) {
    parent.data = { ...parent.data, collapsed: false };
    await wbSaveObject(parent);
  }
  await wbRefreshMapState();
  selectWbItem("object", created.id);
  await wbMapTidyBranch(parentId);
  renderWhiteboardNow();
  toast(`Added “${chosen.label}” to the map.`);
  return created;
}

//: Enter: a sibling, which is a child of *this* node's parent. A root has no
//: parent to be a sibling under, so Enter there adds another root, which is
//: the only reading of "a sibling of the root" that means anything.
async function wbMapAddSibling(id) {
  const index = wbMapIndex();
  const node = index.byId.get(id);
  if (!node) return null;
  // A dangling `parent_id` counts as no parent, exactly as `wbMapIndex` and
  // `_build_tree` already treat it: so a node under a stale pointer gets a
  // sibling at the top level rather than one hung off a parent that is not
  // on this board.
  const parentId = node.parent_id != null && index.byId.has(node.parent_id)
    ? node.parent_id
    : null;
  return wbMapAddChild(parentId);
}

//: Shift+Tab: outdent: this node becomes a sibling of its own parent.
//:
//: Through `/move`, never `PUT /objects/{id}`, because the move endpoint is
//: the only one that runs the cycle check, §9.3 says so in as many words, and
//: `PUT` deliberately does not touch `parent_id` so the check cannot be
//: bypassed by using the wrong endpoint.
async function wbMapOutdent(id) {
  const boardId = window.currentBoardId;
  const index = wbMapIndex();
  const node = index.byId.get(id);
  if (!boardId || !node) return;
  const parent = node.parent_id != null ? index.byId.get(node.parent_id) : null;
  if (!parent) {
    toast("This is already a top-level topic.");
    return;
  }
  try {
    const moved = await apiJson(`/whiteboard/boards/${boardId}/nodes/${id}/move`, {
      method: "PUT",
      body: JSON.stringify({ parent_id: parent.parent_id ?? null }),
    });
    Object.assign(node, moved);
    await wbMapTidyBranch(moved.parent_id ?? null);
    renderWhiteboardNow();
  } catch (err) {
    toast(err.message || "Couldn't move that node.", true);
  }
}

//: The arrows, in tree terms rather than screen terms: up/down are the
//: siblings either side, left is the parent and right is the first child.
//:
//: Deliberately *not* "whatever box is nearest in that direction on screen".
//: A tree already knows what is above and below a node, and a spatial search
//: gives a different answer the moment two branches overlap, which is
//: precisely when you most need the keys to be predictable.
function wbMapNavigate(id, key) {
  const index = wbMapIndex();
  const node = index.byId.get(id);
  if (!node) return false;
  const hidden = wbMapConcealed(index);
  const siblings = node.parent_id != null && index.byId.has(node.parent_id)
    ? index.childrenOf.get(node.parent_id) || []
    : index.roots;
  const at = siblings.findIndex((s) => s.id === id);
  let target = null;
  if (key === "ArrowUp") target = siblings[at - 1];
  else if (key === "ArrowDown") target = siblings[at + 1];
  else if (key === "ArrowLeft") target = index.byId.get(node.parent_id);
  else if (key === "ArrowRight" && !node.data?.collapsed) {
    target = (index.childrenOf.get(id) || [])[0];
  }
  if (!target || hidden.has(target.id)) return false;
  selectWbItem("object", target.id);
  wbApplySelectionHighlight();
  wbUpdateSelectionBar();
  // Bring it on screen, but **only when it is actually off screen**.
  // Navigating into a node past the edge of the viewport reads exactly like
  // the key having done nothing, so the scroll has to happen; recentring on
  // every arrow instead makes the whole map lurch under you while you are
  // simply walking a branch you can already see, which is worse than either.
  const el = document.querySelector(`.wb-object[data-id="${target.id}"]`);
  const container = document.getElementById("whiteboard-container");
  if (el && container) {
    const node = el.getBoundingClientRect();
    const view = container.getBoundingClientRect();
    const offScreen = node.left < view.left || node.right > view.right
      || node.top < view.top || node.bottom > view.bottom;
    const box = offScreen ? wbItemBBox("object", target) : null;
    if (box) wbCenterOn(box, { animate: true });
  }
  return true;
}

//: F2 / double-click: rename in place, through the same two functions a text
//: box uses. A reference node has no text of its own: its label is the note's,
//: and editing it here would either lie or silently rename the note.
function wbMapEditNode(id) {
  const node = (wbState.objects || []).find((o) => o.id === id);
  if (!node) return;
  if (node.kind !== "topic") {
    toast("This node's name comes from the item it points at.");
    return;
  }
  // The render that just ran replaced this element, so it is looked up fresh
  // rather than kept from before, the same trap `wbCreateTextBox` documents.
  requestAnimationFrame(() => {
    const el = document.querySelector(`.wb-object[data-id="${id}"] .wb-map-text`);
    if (!el) return;
    wbBeginTextEdit(el);
    // Select the whole label so the first keystroke replaces it: a new node
    // arrives empty, and a renamed one is almost always being replaced rather
    // than edited.
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

//: **A map always keeps one topic** (MINDMAP_PLAN.md §12.0, decided after the
//: owner asked "should the user even be able to delete the primary core
//: node??").
//:
//: Not a taste call: every way of adding a node hangs off a node that is
//: already on the map (Tab on the selection, the hover +, the node's own
//: right-click menu), so the delete that empties a map is the delete that
//: removes the way to undo itself. The empty-state panel is the net under
//: this; the refusal is the rule.
//:
//: Refusing without an alternative would just be a wall, so the refusal
//: carries the action someone emptying a map actually wants: clear it and
//: start again from one blank topic.
function wbMapDeleteEmptiesMap(id) {
  if (!wbIsMap()) return false;
  const index = wbMapIndex();
  if (!index.byId.has(id)) return false;
  return index.nodes.length - wbMapSubtree(index, id).length <= 0;
}

function wbMapRefuseLastTopic() {
  toastAction(
    "A map keeps at least one topic, so this one stays.",
    "Clear the map",
    wbMapClearToOneTopic
  );
}

//: The explicit version of what deleting the last node would have done by
//: accident: take everything away, then leave one blank topic open for
//: typing, which is the state a new map starts in.
//:
//: Deleting the roots is enough to delete the map: `DELETE
//: /whiteboard/objects/{id}` takes a node's whole subtree with it (§9.1), so
//: one request per root removes every descendant too.
async function wbMapClearToOneTopic() {
  if (!wbIsMap()) return;
  const roots = wbMapIndex().roots;
  for (const root of roots) {
    try {
      const res = await apiJson(`/whiteboard/objects/${root.id}`, { method: "DELETE" });
      const gone = new Set((Array.isArray(res?.deleted) ? res.deleted : []).map((row) => row.id));
      gone.add(root.id);
      wbState.objects = (wbState.objects || []).filter((o) => !gone.has(o.id));
    } catch (err) {
      toast(err.message || "Couldn't clear the map.", true);
      return;
    }
  }
  clearWbSelection();
  await wbMapAddChild(null);
}

//: Delete: the subtree, with a real Undo rather than a confirm dialog.
//:
//: `DELETE /whiteboard/objects/{id}` returns the whole deleted subtree, rows
//: and positions included, precisely so this can put it back (§9.1). A confirm
//: dialog asks you to predict what you are about to lose; an undo shows you.
//: The re-create walks the returned list in order, it comes back parents
//: first: and maps each old id to its new one, so the tree comes back with
//: the shape it had rather than as a heap of roots.
async function wbMapDeleteSubtree(id) {
  const boardId = window.currentBoardId;
  const node = (wbState.objects || []).find((o) => o.id === id);
  if (!boardId || !node) return;
  if (wbMapDeleteEmptiesMap(id)) {
    wbMapRefuseLastTopic();
    return;
  }
  let deleted = [];
  try {
    const res = await apiJson(`/whiteboard/objects/${id}`, { method: "DELETE" });
    deleted = Array.isArray(res.deleted) ? res.deleted : [];
  } catch (err) {
    toast(err.message || "Couldn't delete that.", true);
    return;
  }
  const gone = new Set(deleted.map((row) => row.id));
  wbState.objects = (wbState.objects || []).filter((o) => !gone.has(o.id));
  clearWbSelection();
  wbScheduleRender();
  const count = deleted.length;
  toastAction(
    `Deleted ${count} node${count === 1 ? "" : "s"}.`,
    "Undo",
    async () => {
      const remap = new Map();
      for (const row of deleted) {
        // **A parent that was not itself deleted keeps its own id.** The first
        // version fell back to `null` whenever `remap` had no entry, which is
        // true for exactly one row, the top of the deleted subtree, whose
        // parent is still sitting on the board. So the branch came back as a
        // *root* instead of reattaching where it was taken from: five nodes
        // restored, four parent links gone down to three, measured. Only a
        // parent inside `deleted` needs translating, because only those have
        // new ids.
        const parent = row.parent_id == null
          ? null
          : remap.get(row.parent_id) ?? row.parent_id;
        const body = {
          kind: row.kind,
          parent_id: parent,
          text: row.data?.content || "",
          x: row.x,
          y: row.y,
        };
        if (row.data?.ref_id != null) body.ref_id = row.data.ref_id;
        if (row.data?.color) body.color = row.data.color;
        try {
          const recreated = await apiJson(`/whiteboard/boards/${boardId}/nodes`, {
            method: "POST",
            body: JSON.stringify(body),
          });
          remap.set(row.id, recreated.id);
          wbState.objects.push(recreated);
        } catch (err) {
          toast(err.message || "Couldn't restore that node.", true);
          break;
        }
      }
      await wbRefreshMapState();
      renderWhiteboardNow();
    }
  );
}

//: The chevron: fold a branch away, or bring it back. `collapsed` is per-node
//: view state in the object's own JSON blob (§9.1), so it survives a reload
//: and the tree endpoint hands it back, a fold you made yesterday is still
//: folded today, which is the only version of this that is worth having.
async function wbMapToggleCollapse(id) {
  const node = (wbState.objects || []).find((o) => o.id === id);
  if (!node) return;
  node.data = { ...node.data, collapsed: !node.data?.collapsed };
  wbScheduleRender();
  await wbSaveObject(node);
}

// --- tidy: Reingold–Tilford with variable node sizes (§5 item 6) ------------
//
// Implemented here rather than pulled in, because the app is offline-first and
// there is no CDN to pull from, and because `graph.js` already hand-rolls its
// own layout, so this is a sibling of existing code rather than a new
// dependency. The reference is Buchheim, Jünger and Leipert's linear-time form
// of Reingold–Tilford, with d3-flextree's extension: the distance between two
// nodes is half of each one's own size plus a gap, instead of a constant.
// Variable sizes are not a nicety here, a map node is as tall as its text.
//
// The breadth axis (siblings) is exact, per node. The depth axis is one offset
// per level, taken from the widest node on that level: that is what `d3.tree`
// itself does, and a per-node depth would let two nodes on the same level sit
// at different distances from the root, which reads as a broken tree rather
// than a tidy one.

//: One tidy pass. `roots` are wrapper objects `{obj, children}`; everything
//: else on a wrapper is the algorithm's own bookkeeping.
function wbTidyFirstWalk(v, breadthOf, gap) {
  if (!v.children.length) {
    v.prelim = v.number > 0 && v.parent
      ? v.parent.children[v.number - 1].prelim + wbTidyDistance(v, v.parent.children[v.number - 1], breadthOf, gap)
      : 0;
    return;
  }
  let defaultAncestor = v.children[0];
  for (const w of v.children) {
    wbTidyFirstWalk(w, breadthOf, gap);
    defaultAncestor = wbTidyApportion(w, defaultAncestor, breadthOf, gap);
  }
  wbTidyExecuteShifts(v);
  const midpoint = (v.children[0].prelim + v.children[v.children.length - 1].prelim) / 2;
  const left = v.number > 0 && v.parent ? v.parent.children[v.number - 1] : null;
  if (left) {
    v.prelim = left.prelim + wbTidyDistance(v, left, breadthOf, gap);
    v.mod = v.prelim - midpoint;
  } else {
    v.prelim = midpoint;
  }
}

//: How far apart two nodes on the same level must sit: half of each one's own
//: breadth plus the gap. The constant this replaces is the whole difference
//: between a tidy tree of identical boxes and one of real, differently-sized
//: nodes: with a constant, a tall node overlaps its neighbours and a short
//: one leaves a hole.
function wbTidyDistance(a, b, breadthOf, gap) {
  return (breadthOf(a) + breadthOf(b)) / 2 + gap;
}

function wbTidyNextLeft(v) {
  return v.children.length ? v.children[0] : v.thread;
}

function wbTidyNextRight(v) {
  return v.children.length ? v.children[v.children.length - 1] : v.thread;
}

function wbTidyMoveSubtree(wm, wp, shift) {
  const subtrees = wp.number - wm.number;
  if (!subtrees) return;
  wp.change -= shift / subtrees;
  wp.shift += shift;
  wm.change += shift / subtrees;
  wp.prelim += shift;
  wp.mod += shift;
}

function wbTidyExecuteShifts(v) {
  let shift = 0;
  let change = 0;
  for (let i = v.children.length - 1; i >= 0; i -= 1) {
    const w = v.children[i];
    w.prelim += shift;
    w.mod += shift;
    change += w.change;
    shift += w.shift + change;
  }
}

function wbTidyAncestor(vim, v, defaultAncestor) {
  return vim.ancestor && vim.ancestor.parent === v.parent ? vim.ancestor : defaultAncestor;
}

//: The part that makes the tree *tidy*: walk the right contour of everything
//: to the left and the left contour of this subtree in step, and push this
//: subtree right by however much they overlap. The threads (`nextLeft` /
//: `nextRight` falling back to `.thread`) are what keep it linear-time instead
//: of re-walking whole subtrees.
function wbTidyApportion(v, defaultAncestor, breadthOf, gap) {
  const left = v.number > 0 && v.parent ? v.parent.children[v.number - 1] : null;
  if (!left) return defaultAncestor;
  let vip = v;
  let vop = v;
  let vim = left;
  let vom = vip.parent.children[0];
  let sip = vip.mod;
  let sop = vop.mod;
  let sim = vim.mod;
  let som = vom.mod;
  while (wbTidyNextRight(vim) && wbTidyNextLeft(vip)) {
    vim = wbTidyNextRight(vim);
    vip = wbTidyNextLeft(vip);
    vom = wbTidyNextLeft(vom);
    vop = wbTidyNextRight(vop);
    vop.ancestor = v;
    const shift = vim.prelim + sim - (vip.prelim + sip) + wbTidyDistance(vim, vip, breadthOf, gap);
    if (shift > 0) {
      wbTidyMoveSubtree(wbTidyAncestor(vim, v, defaultAncestor), v, shift);
      sip += shift;
      sop += shift;
    }
    sim += vim.mod;
    sip += vip.mod;
    som += vom.mod;
    sop += vop.mod;
  }
  if (wbTidyNextRight(vim) && !wbTidyNextRight(vop)) {
    vop.thread = wbTidyNextRight(vim);
    vop.mod += sim - sop;
  }
  if (wbTidyNextLeft(vip) && !wbTidyNextLeft(vom)) {
    vom.thread = wbTidyNextLeft(vip);
    vom.mod += sip - som;
    return v;
  }
  return defaultAncestor;
}

//: The tidy positions for every map node, as `Map(id -> {x, y})`.
//:
//: Pure: it reads sizes and the tree and returns coordinates, touching neither
//: the DOM nor the network. That is what lets `wbMapTidy` below run the whole
//: layout, then paint once and save once, §8's "auto-layout must run off the
//: paint path", which is a real constraint here because the whiteboard already
//: had a lag bug of exactly that shape (task #71).
function wbMapTidyPositions(index, layout) {
  if (!index.roots.length) return new Map();
  //: **Both sides, Coggle's signature** (MINDMAP_PLAN §12.0's own list of
  //: eight layouts, §13.4: "tree-left and both-sides are missing, and
  //: both-sides is Coggle's signature"). It is not a third algorithm: it is
  //: this one twice, with the trunk's children split between the two runs and
  //: the left run mirrored, which is exactly what a both-sides map *is*. Both
  //: runs anchor on the same trunk (the shift at the bottom of this function
  //: keeps `roots[0]` where it already was), so the two halves meet on it
  //: without any arithmetic here.
  //:
  //: **By weight, in order, greedily**: each branch goes to whichever side is
  //: currently lighter, counting the whole subtree rather than the branch
  //: itself. Alternating was the first version and it is wrong on any map
  //: that is not already balanced: measured on a 40-topic map whose four
  //: branches held 1, 1, 1 and 36 topics, alternating put 37 on one side and
  //: 2 on the other, because it counts branches and a person sees topics.
  //: Greedy by weight gives the best split that keeps the branches in the
  //: order they were written, which is the property a person notices second.
  if (layout === "tree-both") {
    const trunk = index.roots[0];
    const kids = index.childrenOf.get(trunk.id) || [];
    if (kids.length < 2) return wbMapTidyPositions(index, "tree-right");
    const rightKids = [];
    const leftKids = [];
    let rightWeight = 0;
    let leftWeight = 0;
    for (const kid of kids) {
      const weight = wbMapSubtree(index, kid.id).length;
      if (rightWeight <= leftWeight) {
        rightKids.push(kid);
        rightWeight += weight;
      } else {
        leftKids.push(kid);
        leftWeight += weight;
      }
    }
    //: One side taking everything is not a both-sides map: with a single
    //: branch, or with one branch heavier than every other put together, the
    //: honest answer is the sideways tree it would have been anyway.
    if (!rightKids.length || !leftKids.length) return wbMapTidyPositions(index, "tree-right");
    const side = (keep, onlyTrunk) => ({
      ...index,
      roots: onlyTrunk ? [trunk] : index.roots,
      childrenOf: new Map([...index.childrenOf, [trunk.id, keep]]),
    });
    //: The right run keeps every other root as well, so a map with a second
    //: trunk lays that one out once; the left run is the first trunk's own
    //: branches and nothing else.
    const right = wbMapTidyPositions(side(rightKids, false), "tree-right");
    const left = wbMapTidyPositions(side(leftKids, true), "tree-left");
    const both = new Map(right);
    for (const [id, pos] of left) if (id !== trunk.id) both.set(id, pos);
    return both;
  }
  const vertical = layout === "tree-down" || layout === "radial";
  //: A map that grows to the left is the sideways tree with the depth axis
  //: negated, and the node's own width taken off it because `x` is a left
  //: edge: without that, each level would start where the last one ended and
  //: the boxes would overlap by their own widths.
  const leftward = layout === "tree-left";
  // Breadth is the axis siblings spread along: heights for a map that grows
  // sideways, widths for one that grows downward. Radial spreads siblings
  // around a ring, so its breadth is a width too, arc length, before it is
  // turned into an angle.
  const sizes = new Map(index.nodes.map((o) => [o.id, wbMapNodeSize(o)]));
  //: **Radial measures breadth in angle, not in pixels**, and that is not a
  //: refinement: it is what makes the layout correct near the middle. The
  //: breadth axis becomes the angle, so a fixed pixel gap buys a *wide* angle
  //: at the first ring and a narrow one at the fifth: laid out in pixels, the
  //: nodes closest to the root overlap each other while the outer rings sit in
  //: empty space. Measured before this existed: two overlapping boxes out of
  //: five on the first radial layout. Dividing each node's width by its own
  //: ring number asks for the angle that width actually needs at that radius,
  //: which is d3's own `separation(a, b) / a.depth` in another form. The gap
  //: is folded in here for the same reason, so the distance function keeps
  //: working in one unit.
  const radial = layout === "radial";
  const breadthOf = (w) => {
    if (!w.obj) return 0; // the virtual root below has no size of its own
    const s = sizes.get(w.obj.id) || { w: WB_MAP_NODE_W, h: WB_MAP_NODE_H };
    if (radial) return (s.w + WB_MAP_GAP_BREADTH) / Math.max(1, w.depth);
    return vertical ? s.w : s.h;
  };
  const gap = radial ? 0 : WB_MAP_GAP_BREADTH;

  // One virtual root over the real ones, so a map with two top-level topics
  // is laid out as one tree rather than two overlapping ones. It is dropped
  // before any coordinate is written.
  const wrap = (obj, parent, number, depth) => {
    const node = {
      obj, parent, number, depth, children: [],
      prelim: 0, mod: 0, shift: 0, change: 0, thread: null, ancestor: null,
    };
    node.ancestor = node;
    const kids = obj ? index.childrenOf.get(obj.id) || [] : index.roots;
    // A collapsed branch is not laid out: its children are not on screen, and
    // reserving room for them would leave a hole where the fold is.
    if (!obj || !obj.data?.collapsed) {
      kids.forEach((child, i) => node.children.push(wrap(child, node, i, depth + 1)));
    }
    return node;
  };
  const virtual = wrap(null, null, 0, -1);

  wbTidyFirstWalk(virtual, breadthOf, gap);

  // Depth offsets: one per level, from the widest (or tallest) node on it.
  const perDepth = [];
  const collect = (w) => {
    if (w.obj) {
      const s = sizes.get(w.obj.id) || { w: WB_MAP_NODE_W, h: WB_MAP_NODE_H };
      perDepth[w.depth] = Math.max(perDepth[w.depth] || 0, vertical ? s.h : s.w);
    }
    w.children.forEach(collect);
  };
  collect(virtual);
  const ring = Math.max(...perDepth.filter(Number.isFinite), WB_MAP_NODE_W) + WB_MAP_GAP_DEPTH;
  const offsets = [0];
  for (let d = 1; d < perDepth.length; d += 1) {
    // Radial does not use these: its radius per ring is worked out below,
    // from the span the first walk actually produced.
    offsets[d] = offsets[d - 1] + (perDepth[d - 1] || 0) + WB_MAP_GAP_DEPTH;
  }

  const flat = [];
  const second = (w, m) => {
    if (w.obj) flat.push({ obj: w.obj, breadth: w.prelim + m, depth: w.depth });
    for (const child of w.children) second(child, m + w.mod);
  };
  second(virtual, 0);
  if (!flat.length) return new Map();

  const positions = new Map();
  if (layout === "radial") {
    // x as angle, y as radius, the same call `d3.tree().size([2π, 1])` makes
    // and the same reading of it: the breadth axis, normalised, *is* the angle.
    // The span is padded so the first and last branch do not meet back at the
    // top: by the *smallest* node extent in the layout, which is one node's
    // worth of angle at the outermost ring. Padding by a raw pixel constant
    // was wrong for the same reason the breadths above are divided by depth:
    // it is not a quantity in this unit at all.
    const extentOf = (f) =>
      ((sizes.get(f.obj.id)?.w || WB_MAP_NODE_W) + WB_MAP_GAP_BREADTH) / Math.max(1, f.depth);
    const min = Math.min(...flat.map((f) => f.breadth));
    const max = Math.max(...flat.map((f) => f.breadth));
    const span = max - min + Math.min(...flat.map(extentOf)) || 1;
    //: **The rings grow when the circle runs out of room**, and without this
    //: a radial map overlaps itself as soon as it has more nodes than one
    //: turn can hold. The breadth axis is normalised onto 2π, so the factor
    //: from a breadth unit to an angle is `2π / span`, while the arc a node
    //: needs at depth `d` is its own breadth divided by the ring spacing (the
    //: breadths above are already divided by depth for exactly this reason).
    //: The two agree only while `span <= 2π * ring`; past that the normalise
    //: silently compresses every node into less arc than it occupies. So the
    //: spacing is whichever is larger, which spreads a big map over wider
    //: rings instead of stacking it on top of itself, and is a no-op on any
    //: map small enough that the base spacing was already sufficient.
    //: Measured (WHITEBOARD_PLAN Phase 4, `wbphase4.js`): 30 nodes in radial
    //: gave 6 overlapping pairs, the worst 38x28 board units, and 0 after.
    const ringRadius = Math.max(ring, span / (2 * Math.PI));
    for (const f of flat) {
      const size = sizes.get(f.obj.id) || { w: WB_MAP_NODE_W, h: WB_MAP_NODE_H };
      const angle = ((f.breadth - min) / span) * 2 * Math.PI - Math.PI / 2;
      const radius = f.depth * ringRadius;
      // Centres, then back to the top-left corner an object's `x`/`y` mean.
      positions.set(f.obj.id, {
        x: radius * Math.cos(angle) - size.w / 2,
        y: radius * Math.sin(angle) - size.h / 2,
      });
    }
  } else {
    for (const f of flat) {
      const size = sizes.get(f.obj.id) || { w: WB_MAP_NODE_W, h: WB_MAP_NODE_H };
      const along = offsets[f.depth] || 0;
      positions.set(f.obj.id, vertical
        ? { x: f.breadth - size.w / 2, y: along }
        : { x: leftward ? -along - size.w : along, y: f.breadth - size.h / 2 });
    }
  }

  // Shift the whole layout so the first root keeps the position it already
  // had. "Tidy this map" means tidy it, not "recentre my board", the same
  // choice, for the same reason, `wbArrangeMindMap` makes further up.
  const anchor = positions.get(index.roots[0].id);
  if (anchor) {
    const dx = index.roots[0].x - anchor.x;
    const dy = index.roots[0].y - anchor.y;
    for (const pos of positions.values()) {
      pos.x += dx;
      pos.y += dy;
    }
  }
  return positions;
}

//: Lay the map out and save it: compute everything, paint once, then write.
//:
//: The three phases are the point. `wbMapTidyPositions` touches nothing;
//: `wbApplyBulkMove` moves every element in one pass; `wbSaveBulkMove` is the
//: only part that goes near the network, and it runs after the paint. That is
//: §8's "auto-layout must run off the paint path", and it reuses the two
//: functions a multi-item drag already uses rather than writing a third way to
//: move a set of things.
async function wbMapTidy({ onlyBranch = null, quiet = false } = {}) {
  if (!wbIsMap()) return 0;
  const layout = wbMapLayout();
  if (layout === "free") {
    if (!quiet) toast("This map's layout is Free, pick a layout to tidy it.");
    return 0;
  }
  const index = wbMapIndex();
  const positions = wbMapTidyPositions(index, layout);
  if (!positions.size) return 0;

  // Which nodes this run is allowed to move. A branch tidy (after adding a
  // child) touches only that branch, so the rest of the map does not jump
  // under you while you are typing into a new node.
  const scope = onlyBranch != null
    ? new Set(wbMapSubtree(index, onlyBranch).map((o) => o.id))
    : null;

  const origin = new Map();
  for (const [id, pos] of positions) {
    const obj = index.byId.get(id);
    if (!obj) continue;
    if (scope && !scope.has(id)) continue;
    // **A dragged node is pinned, and a pinned node keeps its place.** That is
    // Coggle's bargain: tidy is on demand, and anything you positioned by hand
    // is a decision, not a thing to be undone by the next tidy. Its children
    // still take their tidy positions, the fold is in the branch, not the
    // whole map.
    if (obj.data?.pinned) continue;
    if (Math.abs(obj.x - pos.x) < 0.5 && Math.abs(obj.y - pos.y) < 0.5) continue;
    origin.set(wbMultiKey("object", id), { kind: "object", id, item: obj, x: pos.x, y: pos.y });
  }
  if (!origin.size) return 0;
  // Zero delta, because each entry already carries its own target, the
  // bulk-move helper adds `dx`/`dy` to the origin it was given, so handing it
  // the destinations and no delta is how one shared helper does a per-node
  // layout as well as a rigid drag.
  wbApplyBulkMove(origin, 0, 0);
  renderWhiteboardNow();
  //: **A tidy that pushed the map off the canvas frames it again.** Recorded
  //: by the seventh run and left as a decision rather than a bug: measured at
  //: 390x844 after a tidy, the trunk's own box sat at x=-95 and
  //: `elementFromPoint` at its centre returned the shell behind the canvas, so
  //: the one node a person would reach for was not on screen. §12.0 says
  //: auto-arrange is a command and not a constant, which is why this does not
  //: frame on every tidy: it frames only a *whole-map* tidy, and only when
  //: something has actually gone past an edge. A branch tidy is the silent
  //: half of pressing Tab and must never move the view while someone is
  //: typing, and a tidy whose result already fits is a view nobody asked to
  //: have changed.
  if (onlyBranch == null && wbMapSpillsOffCanvas()) wbZoomToFit({ animate: false });
  await wbSaveBulkMove(origin);
  return origin.size;
}

//: Is any part of the map outside the canvas right now? Read off the rendered
//: boxes rather than off the stored coordinates, because what matters is what
//: is on screen at the zoom in force, which is the thing the report was about.
function wbMapSpillsOffCanvas() {
  const container = document.getElementById("whiteboard-container");
  if (!container) return false;
  const box = container.getBoundingClientRect();
  let spilled = false;
  for (const el of document.querySelectorAll("#wb-html-layer .wb-object")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.left < box.left || r.top < box.top || r.right > box.right || r.bottom > box.bottom) {
      spilled = true;
      break;
    }
  }
  return spilled;
}

//: Re-tidy one branch after a node was added to it, when the layout asks for
//: it. Silent by design: this runs as part of Tab, and a toast per keystroke
//: while building a map out is noise, not feedback.
async function wbMapTidyBranch(parentId) {
  if (!wbIsMap() || wbMapLayout() === "free") return;
  // Whole-map when a root gained a child: a new top-level branch changes where
  // every other branch has to sit, so tidying only the new one would leave it
  // sitting on top of its neighbour.
  const index = wbMapIndex();
  const parent = parentId != null ? index.byId.get(parentId) : null;
  const scope = parent && parent.parent_id != null ? parent.parent_id : null;
  await wbMapTidy({ onlyBranch: scope, quiet: true });
}

//: The board top bar's map controls: a "Map" chip that says what this board
//: is, the layout picker, and Tidy. All three are hidden on an ordinary
//: whiteboard rather than disabled, a control that can never apply here is
//: not a control you want to read past on every other board.
//:
//: The chip is `.library-chip`, which is the app's own filter-chip recipe
//: (DESIGN.md, "the interactive filter chip"), not a badge invented for the
//: canvas.
//: The whiteboard tools a map has no use for, by the tool name the dock
//: button carries. Freehand, the highlighter, the eraser and the fill paint on
//: a surface a map does not have; the six shapes, the sticky, the free text
//: box and the image place things a tree cannot hold, since everything on a
//: map is a node with a parent. Kept as a set rather than read off the hidden
//: sections, because this also has to answer "was the tool that is *currently*
//: selected one of these" after a board-to-map switch.
const WB_BOARD_ONLY_TOOLS = new Set([
  "draw", "highlighter", "eraser", "bucket",
  "line", "arrow", "rect", "circle", "triangle", "diamond",
  "sticky", "text",
]);

//: Which dock sections a map shows (MINDMAP_PLAN.md §12.0).
//:
//: The owner: "even though it is built off the whiteboard, it isnt the white
//: board and they needs to stay relatively separate with the mindmap having
//: controls specific to it, but the mindmap can keep important and usable
//: parts of the whiteboard." So this is a split, not a second dock: the
//: sections that only make sense on a board are marked in the markup, the
//: map's own sections are marked the other way, and the shared three (move,
//: connect, edit) carry no marker at all and are never touched here.
//: **The rail says which of the map's two connections its Connect tools
//: make** (MINDMAP_PLAN §13c). §13.3 measured the exact place the owner's
//: "there are two types of connections" is *felt*: the Connect section's two
//: buttons are the only things on screen with the word Connect on them, and
//: both make a **cross-link**. Nothing on the rail makes a branch, because a
//: branch is Tab, Enter, the ring or the node's own `+`. The words are the
//: cheapest possible fix and the one the plan asked for: on a map the tools
//: say cross-link and the section says what the other kind is and where it
//: comes from. On a board there is only one kind of link, so the board's own
//: words are left exactly as they were.
const WB_CONNECT_WORDS = {
  map: {
    section: ["Cross-link", "Join two branches without changing the tree. A branch itself is Tab, or the topic's own +"],
    "link-straight": ["Cross-link (C)", "Cross-link (C): drag from one topic to another. It is drawn in this map's own line style, dashed, and joins two branches without changing the tree"],
    "link-curved": ["Cross-link (C)", "Cross-link (C): drag from one topic to another"],
  },
  board: {
    section: ["Connect", "Join two things together"],
    "link-straight": ["Straight link (C)", "Straight link (C): drag from one card to another"],
    "link-curved": ["Curved link (Shift+C)", "Curved link (Shift+C): drag from one card to another"],
  },
};

//: **On a map, one connection tool that looks like the map's own lines**
//: (INBOX 392, the owner: "the connections in the bottom bar are different
//: from the ones the mind map nodes use"). A board offers a straight and a
//: curved link because a board has no line style of its own; a map does
//: (Straight, Curve or Elbow, `edge_style`), and offering two generic shapes
//: beside it said a cross-link was a different kind of drawing. So a map
//: shows one tool, drawn in the map's style and dashed (a cross-link's own
//: mark, §13c), and what it draws follows the same style.
//: **A cross-link on a map is drawn by the map, not by the board** (owner,
//: with a screenshot: "these links I drew using the cross-link tools are
//: different from the ones between the other mind map nodes ... I want them
//: to be the same"). Measured on that map: the branches were tapered ribbons
//: in their branch's colour leaving each topic's facing side, and the
//: cross-link was a 3px straight cyan line from the bottom anchor of one
//: topic, because a link is a board sketch and was drawn with the pen's
//: colour and the board's link geometry. So between two topics this returns
//: the branch drawing itself: `wbMapEdgePathD` and `wbMapRibbonD` between
//: the two topics' facing sides, in the map's line style, weight and taper,
//: coloured like the source topic's branch. A stand-in child carries only
//: the map's style, so the target's own tree edge (its bend, its slide) is
//: not borrowed. `null` off a map, for any end that is not a topic, and for
//: a link someone has bent by hand, which keeps the board's own bent curve.
//: Built once per render pass (the microtask reset), since a render asks
//: for every link and the index and colours are a walk of the whole map.
let wbMapCrossLinkMemo = null;
function wbMapCrossLinkLook(parsed) {
  if (!wbIsMap() || !parsed?.type?.startsWith("link-")) return null;
  const source = wbLinkItem(parsed.sourceKind || "node", parsed.sourceId);
  const target = wbLinkItem(parsed.targetKind || "node", parsed.targetId);
  if (!source || !target || !WB_MAP_KINDS.has(source.kind) || !WB_MAP_KINDS.has(target.kind)) return null;
  if (!wbMapCrossLinkMemo) {
    const index = wbMapIndex();
    wbMapCrossLinkMemo = { index, colors: wbMapNodeColors(index), layout: wbMapLayout() };
    queueMicrotask(() => { wbMapCrossLinkMemo = null; });
  }
  const { index, colors, layout } = wbMapCrossLinkMemo;
  //: A leaf has no colour of its own (null in the map): it wears its
  //: branch's, so the nearest coloured ancestor is the one its line has.
  //: A root has none at all, so a link from one takes the target's branch,
  //: and failing both, the accent an uncoloured map line already draws in.
  const branchColour = (from) => {
    for (let at = from, hops = 0; at && hops < 64; hops++) {
      const own = colors.get(at.id);
      if (own) return own;
      at = at.parent_id != null ? index.byId.get(at.parent_id) : null;
    }
    return "";
  };
  const colour = branchColour(source) || branchColour(target) || currentAccentHex();
  //: Bent by hand: the board's own bent curve, still in the branch's colour
  //: and weight, since a bend is the one shape the map's lines cannot hold.
  if (parsed.bend && (parsed.bend.x || parsed.bend.y)) {
    const ends = wbResolveLinkEndpoints(parsed);
    if (!ends) return null;
    const line = wbLinkPathD("link-curved", ends.source, ends.target, null, 3, parsed.bend);
    return { line, d: line, ribbon: false, colour, width: 3 };
  }
  const style = wbMapTheme().edge_style || "curve";
  const ghost = { ...target, data: { edge_style: style === "elbow" ? "elbow" : style } };
  const line = wbMapEdgePathD(source, ghost, layout);
  const ribbon = wbMapEdgeIsRibbon(ghost);
  return {
    line,
    d: ribbon ? wbMapRibbonD(source, ghost, layout) : line,
    ribbon,
    colour,
    width: 3 * wbMapEdgeWeight(ghost),
  };
}

//: Where a drawn line starts and ends, read off its own path: the first
//: `M x y` and the last pair of numbers, which is the end point in every
//: command the map's lines use (L, C, and the elbow's run of Ls). The link's
//: handles sit here, so on a map they are on the line that is drawn rather
//: than on the board's anchor the link was first dropped on.
function wbPathEnds(d) {
  const nums = String(d).match(/-?\d*\.?\d+(?:e-?\d+)?/gi)?.map(Number) || [];
  if (nums.length < 4) return null;
  return {
    source: { x: nums[0], y: nums[1] },
    target: { x: nums[nums.length - 2], y: nums[nums.length - 1] },
  };
}

function wbMapCrossLinkType() {
  const style = window.wbMapState?.theme?.edge_style || "curve";
  return style === "straight" ? "link-straight" : "link-curved";
}

const WB_MAP_LINK_GLYPH = {
  curve: "M4 20 C4 11 20 13 20 4",
  straight: "M4 20 L20 4",
  elbow: "M4 20 L12 20 L12 4 L20 4",
};

function wbSyncMapLinkGlyph(button, isMap) {
  const svg = button?.querySelector("svg");
  if (!svg) return;
  let glyph = svg.querySelector("path.wb-map-link-glyph");
  for (const child of svg.children) {
    if (child !== glyph) child.classList.toggle("hidden", isMap);
  }
  if (!isMap) {
    glyph?.remove();
    return;
  }
  if (!glyph) {
    glyph = document.createElementNS("http://www.w3.org/2000/svg", "path");
    glyph.setAttribute("class", "wb-map-link-glyph");
    glyph.setAttribute("stroke-dasharray", "3 3");
    svg.appendChild(glyph);
  }
  glyph.setAttribute("d", WB_MAP_LINK_GLYPH[window.wbMapState?.theme?.edge_style] || WB_MAP_LINK_GLYPH.curve);
}

function wbSyncConnectWords(isMap) {
  const words = WB_CONNECT_WORDS[isMap ? "map" : "board"];
  //: Found by its role in the rail, not by its label: the label is what this
  //: function rewrites, so a lookup by `aria-label="Connect"` found nothing
  //: once a map had renamed it, and a board opened after a map kept the map's
  //: words.
  const section = document.querySelector("#wb-tool-group [data-tool=\"link-straight\"]")?.closest(".wb-tool-section");
  if (section) {
    const label = section.querySelector(".wb-tool-section-label");
    if (label) {
      label.textContent = words.section[0];
      label.title = words.section[1];
    }
    //: The group's own accessible name as well as the word in it: the label
    //: is `1x1` on screen (the rail's sections are named for a screen reader,
    //: not drawn), so the `aria-label` is what a screen reader actually says
    //: here and leaving it as "Connect" would keep the old vocabulary in the
    //: one place it is read aloud.
    section.setAttribute("aria-label", words.section[0]);
  }
  for (const tool of ["link-straight", "link-curved"]) {
    const button = document.querySelector(`#wb-tool-group [data-tool="${tool}"]`);
    if (!button) continue;
    button.setAttribute("aria-label", words[tool][0]);
    button.title = words[tool][1];
  }
  const straight = document.querySelector('#wb-tool-group [data-tool="link-straight"]');
  const curved = document.querySelector('#wb-tool-group [data-tool="link-curved"]');
  if (curved) curved.hidden = isMap;
  wbSyncMapLinkGlyph(straight, isMap);
}

function wbSyncToolSurfaces(isMap) {
  for (const section of document.querySelectorAll("#wb-tool-group [data-wb-surface]")) {
    section.hidden = section.dataset.wbSurface === (isMap ? "board" : "map");
  }
  wbSyncConnectWords(isMap);
  // A tool stays selected across a board switch, so opening a map while the
  // pen was active would leave the pen drawing on a surface whose own button
  // is no longer on screen: a mode with no way out, which is the exact shape
  // of bug the hidden sections are meant to prevent.
  if (isMap && WB_BOARD_ONLY_TOOLS.has(window.currentTool)) wbSelectToolRef?.("select");
}

//: The map controls that act on the selection, kept honest about whether
//: there is one.
//:
//: Disabled rather than hidden: a control that vanishes teaches nothing, and
//: what these need to say is "pick a topic first", which the title says while
//: the button is still there to be read. "Add a top-level topic" is never
//: disabled, that is the one that has to work on an empty map.
function wbSyncMapToolState() {
  //: Only Focus reads the selection now. Add a child, add one beside, fold and
  //: the branch colour all left the dock with §12.5: the ring holds the first
  //: three and the strip holds the colour, so the dock keeps what acts on the
  //: *map*. "Add a top-level topic" is never disabled, that is the one that
  //: has to work on an empty map.
  const focus = document.getElementById("wb-map-focus-here");
  if (focus) focus.disabled = !wbSelectedMapNode();
}

//: --- the node edit strip (MINDMAP_PLAN.md §12.1 item 2) ---------------------
//:
//: Coggle's four are text, link, image and icon. Text and icon are here in
//: full; link is a web address on the topic, drawn as a marker that opens it;
//: **image is not built** (it needs the upload path a board image uses, and a
//: node whose body is a picture rather than a label), and
//: `agent-remaining/mindmap.md` carries the next step for it.
//:
//: Size and alignment reuse `font_size` and `align`, which a text box already
//: stores in the same units, rather than inventing a second vocabulary for
//: the same two ideas. Weight and slant are their own booleans rather than
//: `**markdown**` written into the label: §12.0 says styling is per node and
//: in `data`, and a label is already markdown-ish, so a bold *marker* and the
//: emphasis someone typed would be fighting over the same asterisks.

//: A guard, not a convenience. `enhanceSelect` mirrors the real `<select>`
//: into its own opener on the `change` event only, so a value written here
//: without dispatching one leaves the visible control reading the previous
//: node's value. Dispatching it lands in this file's own change handlers,
//: which would then save the value straight back onto the node: this flag is
//: what tells them the change came from the sync rather than from a person.
let wbMapStripSyncing = false;

function wbSyncMapStrip(node) {
  //: **The effective state, not the stored one** (§13e). The arrow button has
  //: always worked this way and says why below; a theme makes it true of the
  //: whole strip, because a control reading the stored field alone would show
  //: "M" over a topic the map draws at 19px.
  const data = wbMapThemedData(node);
  wbMapStripSyncing = true;
  try {
    for (const [id, on] of [
      ["wb-map-bold", data.bold], ["wb-map-italic", data.italic],
      ["wb-map-core", data.core],
    ]) {
      const button = document.getElementById(id);
      if (!button) continue;
      button.classList.toggle("active", Boolean(on));
      button.setAttribute("aria-pressed", on ? "true" : "false");
    }
    //: **The blank option says what it does on a themed map** (§13e). Every
    //: select here stores the app's own default as no value at all, so the
    //: blank row is named after that default: "Rounded", "Line", "M". On a
    //: map whose theme sets the field, choosing it means "follow the map" and
    //: the map draws something else, so a row still labelled "Rounded" is a
    //: control that visibly does nothing, which is the one thing this file's
    //: own comments keep warning about. The label is rewritten to say what it
    //: really does, and put back the moment the map stops theming the field.
    //:
    //: `enhanceSelect` rebuilds its shell from a MutationObserver on the
    //: select's subtree, so changing an option's text reaches the drawn menu
    //: without anything here having to know about the shell.
    const nameBlank = (id, field) => {
      const el = document.getElementById(id);
      const blank = el?.querySelector('option[value=""]');
      if (!blank) return;
      if (blank.dataset.appDefault === undefined) blank.dataset.appDefault = blank.textContent;
      const value = wbMapThemeDefault(field);
      if (value == null) {
        if (blank.textContent !== blank.dataset.appDefault) blank.textContent = blank.dataset.appDefault;
        return;
      }
      const named = [...el.options].find((o) => o.value === String(value));
      const said = `As the map draws (${(named ? named.textContent : String(value)).toLowerCase()})`;
      if (blank.textContent !== said) blank.textContent = said;
    };
    for (const [id, field] of [
      ["wb-map-text-size", "font_size"], ["wb-map-align", "align"],
      ["wb-map-shape", "shape"], ["wb-map-spine", "spine"],
      ["wb-map-edge-width", "edge_width"], ["wb-map-edge-shape", "edge_style"],
    ]) nameBlank(id, field);
    const setSelect = (id, value) => {
      const el = document.getElementById(id);
      if (!el || el.value === value) return;
      el.value = value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    //: **M is no stored size at all**, not a number that happens to equal the
    //: stylesheet's. `.wb-map-node` reads at `--text-md`; writing the same
    //: value as a px on the node would pin it there, so a later change to the
    //: type scale would move every map in the app except the nodes somebody
    //: had once set to "medium". The empty option is M for exactly that
    //: reason, and it is also what makes "back to normal" reachable.
    setSelect("wb-map-text-size", data.font_size ? String(data.font_size) : "");
    setSelect("wb-map-align", data.align || "");
    setSelect("wb-map-strip-icon", data.icon || "");
    setSelect("wb-map-shape", data.shape || "");
    setSelect("wb-map-spine", data.spine || "");
    //: The line into this topic (item 177). A trunk has none, so the group is
    //: put away rather than shown as three controls that write a field
    //: nothing draws: `wbMapEdgeHasArrow` and the rest all read the *child*
    //: of an edge, and a trunk is nobody's child.
    const parented = node.parent_id != null;
    for (const el of document.querySelectorAll("#wb-map-strip [data-wb-map-line]")) {
      //: The shell, where there is one: `enhanceSelect` leaves the real
      //: `<select>` in the DOM at 1px and draws its own opener *beside* it
      //: inside a `.select-shell`, so hiding the select alone would put away
      //: the invisible half and leave the visible one on a trunk that has no
      //: line to style.
      (el.closest(".select-shell") || el).classList.toggle("hidden", !parented);
    }
    if (parented) {
      setSelect("wb-map-edge-width", data.edge_width || "");
      //: The line's shape (§12.5, from the link ring). "Curved" is stored as
      //: no value at all, the same rule "M" and the solid spine follow: the
      //: default has to stay the default so a later change to how a map draws
      //: its lines reaches every map that never chose.
      setSelect("wb-map-edge-shape", data.edge_style || "");
      const dash = document.getElementById("wb-map-edge-dashed");
      if (dash) {
        const on = Boolean(data.edge_dashed);
        dash.classList.toggle("active", on);
        dash.setAttribute("aria-pressed", on ? "true" : "false");
        dash.title = on ? "Draw the line into this topic solid again" : "Dash the line into this topic";
      }
      const arrow = document.getElementById("wb-map-edge-arrow");
      if (arrow) {
        //: The *effective* state, not the stored one: an unset line has a head
        //: when it is a stroke and none when it is a ribbon, so a button
        //: reading the field alone would show "off" on a line that visibly
        //: ends in an arrow.
        const on = wbMapEdgeHasArrow(node);
        arrow.classList.toggle("active", on);
        arrow.setAttribute("aria-pressed", on ? "true" : "false");
        arrow.title = on
          ? "Take the arrowhead off the line into this topic"
          : "Put an arrowhead on the line into this topic";
      }
    }
    const colour = document.getElementById("wb-map-strip-color");
    if (colour) {
      //: **A node carries its colour on its own card, so a trunk can set one
      //: too** (MINDMAP_PLAN.md §12.0). A colour paints the line coming *into*
      //: a node, which a root has none of, and it also paints the card, which
      //: every node has: `wbPaintMapNode` writes `--wb-branch` on all of them
      //: and `.wb-map-node` draws it as the bar down the leading edge. What is
      //: true is that it does not *cascade* from a trunk: the roots' children
      //: start the palette over by design (`wbMapColors`), which is Coggle's
      //: rule. The title says which of the two this press will do. It reads
      //: the colour the node is *actually drawn in*, inherited or its own: a
      //: picker that opens on white over a blue branch is a picker that lies.
      const index = wbMapIndex();
      const isRoot = !(node.parent_id != null && index.byId.has(node.parent_id));
      colour.title = isRoot
        ? "Topic colour: a trunk colours its own card, each branch under it keeps its own"
        : "Branch colour: it carries down to everything under this topic";
      const effective = wbMapColors(index).get(node.id);
      if (effective && /^#[0-9a-f]{6}$/i.test(effective)) colour.value = effective;
    }
  } finally {
    wbMapStripSyncing = false;
  }
}

//: The size the text grip starts from when a node has never been sized, and
//: the bounds it may drag between (§12.1 item 6). Measured rather than
//: assumed: `.wb-map-node` reads at `--text-md`, which computes to 13.6px at
//: the default root size, so 14 is that rounded to a whole pixel. The strip's
//: own "M" stores nothing at all instead, see `wbSyncMapStrip`.
const WB_MAP_TEXT_DEFAULT = 14;
const WB_MAP_TEXT_MIN = 10;
const WB_MAP_TEXT_MAX = 44;

//: One write path for everything the strip and the radial set. Saves, repaints
//: the node it changed (not the board: a bold toggle is not worth re-binding
//: every card and sketch, the "glitchy and slow to update" report this file
//: already carries) and re-places the strip, whose width changes with what it
//: now says.
async function wbMapSetNodeStyle(node, patch, { undo = true } = {}) {
  if (!node) return;
  //: Every map-topic look goes through here (the strip, the rings, edge
  //: bends, reset to branch), so undo is recorded once here rather than at
  //: each of its dozen callers. The owner: "the undo and redo needs to work
  //: for absolutely everything".
  if (undo) wbPushUndo({ action: "move", kind: "object", id: node.id, before: WB_KIND_INFO.object.payload(node) });
  node.data = { ...node.data, ...patch };
  const el = document.querySelector(`.wb-object[data-id="${node.id}"]`);
  if (el) wbPaintMapNodeStyle(el, node);
  await wbSaveObject(node);
  wbUpdateSelectionBar();
}

//: **Where a topic points** (§12.1 item 2's "link", moved out of the strip by
//: §12.5). It is not a look, so it is not the strip's; it is one of the things
//: the node's own menu offers, beside "add from the library", which is the
//: other way a topic comes to stand for something else.
async function wbMapEditLink(node) {
  if (!node) return;
  const current = node.data?.link || "";
  const next = await promptDialog(
    "Where should this topic point? An http, https or mailto address.",
    current,
    { confirmLabel: current ? "Update the link" : "Add the link" }
  );
  //: **An empty answer changes nothing, it does not remove the link.**
  //: `promptDialog` resolves with `""` for Escape, for Cancel and for an
  //: empty field alike (`close("")` on all three paths), so "empty means
  //: remove" would make Escape destructive, which is the one thing Escape
  //: must never be. Removing a link is "Unlink" in the same menu, where a
  //: destructive action can say what it is.
  const trimmed = String(next ?? "").trim();
  if (!trimmed) return;
  if (!WB_MAP_LINK_SCHEMES.test(trimmed)) {
    toast("A topic's link has to be an http, https or mailto address.", true);
    return;
  }
  await wbMapSetNodeStyle(node, { link: trimmed });
}

//: **A picture in a topic** (MINDMAP_PLAN.md §12.1 item 2's fourth, the last
//: of Coggle's text/link/image/icon).
//:
//: **Through `/media/upload`, which is the one upload path this app has.** A
//: board image, a picture pasted onto a board and a note's own attachment all
//: already take it, and it is what runs the captioning, the text extraction
//: and what the orphan sweep in the Library counts: a second route for the
//: same bytes would be a second place for all three to be forgotten. The node
//: stores the url it hands back and nothing else, so a topic's picture is the
//: same upload the Library already lists and the same one `/media` serves.
//:
//: In the topic's own menu rather than as a fifth button on the strip, for the
//: reason §12.5 gives about the link beside it: the strip is how a topic
//: *looks*, and a picture is what it is. The plan says the same thing from the
//: other end ("a second node shape, not a fourth button on a strip").
//: Which topic the file chooser is open for. A module variable rather than a
//: closure over the node, because the input is the one in the markup
//: (`#wb-map-picture-input`) rather than one built per click: the file chooser
//: is modal, so only one of these is ever open, and an id is what survives a
//: render that replaced the node object in between.
let wbMapPictureFor = null;

async function wbMapEditPicture(node) {
  const input = document.getElementById("wb-map-picture-input");
  if (!node || !input) return;
  wbMapPictureFor = node.id;
  //: Cleared before opening, or choosing the same file twice in a row fires
  //: no `change` the second time and the menu looks broken.
  input.value = "";
  input.click();
}

//: The upload itself, run from that input's own `change`.
async function wbMapTakePicture(file) {
  const id = wbMapPictureFor;
  wbMapPictureFor = null;
  const node = id == null ? null : wbMapIndex().byId.get(id);
  if (!file || !node) return;
  if (!file.type || !file.type.startsWith("image/")) {
    toast("That file is not a picture.", true);
    return;
  }
  try {
    const formData = new FormData();
    formData.append("file", file);
    // The same request `wbPlaceUploadedImage` makes, header and all: the
    // token goes in `X-Auth-Token` because the body is a FormData and
    // `apiJson` leaves the content type to the browser for one.
    const uploaded = await apiJson("/media/upload", {
      method: "POST",
      headers: { "X-Auth-Token": authToken() },
      body: formData,
    });
    await wbMapSetNodeStyle(node, { image: uploaded.url });
    renderWhiteboardNow();
  } catch (err) {
    toast(err.message || "Couldn't add that picture.", true);
  }
}

//: Take the picture off a topic, leaving the upload itself alone: the file is
//: in the Library, and a topic is one of the places it can appear, not its
//: home. Deleting the bytes from here would be a delete nobody asked for, in a
//: menu whose other entries are all about this node.
async function wbMapRemovePicture(node) {
  if (!node || !node.data?.image) return;
  await wbMapSetNodeStyle(node, { image: null });
  renderWhiteboardNow();
  toast("Picture removed from the topic.");
}

//: --- the node radial (MINDMAP_PLAN.md §12.1 item 3) ------------------------
//:
//: Coggle's idiom, and the reason §12.1 exists: the controls appear on the
//: thing you picked. Opened by the same two gestures the board's own context
//: menu uses (`wbOpenContextMenuFor` hands a map node here), so right-click
//: and touch-and-hold both reach it without a second gesture to learn.
//:
//: Eight slots, in the markup's own order, clockwise from the top. The ring
//: is not a menu in the ARIA sense and does not claim to be one: a menu is a
//: list you walk with the arrows, this is a toolbar arranged in a circle, and
//: `role="toolbar"` is what a screen reader can do something useful with.
//: (It is also why this adds no hand-built `role="menu"`, which
//: `tests/test_ui_recipes.py` counts.)

//: The node the open ring belongs to. Read at click time by every slot, so a
//: ring left open across a render acts on the node it was opened for rather
//: than on whatever is selected now.
let wbMapRadialFor = null;

//: **Show the ring at a point, then slide it back inside the window.**
//: Both rings are placed from a point with nothing between them and the edge
//: of the screen: the node ring from the node's own centre, the link ring
//: from the pointer. A map grows outward, so its newest topics are exactly
//: the ones nearest an edge, and a ring around one of those lost two or
//: three of its eight slots off-screen: the control was least reachable
//: where it was most needed.
//:
//: **Why the whole ring moves, rather than the slots being rotated or
//: reflected into the room that is left.** A ring of eight slots at 45
//: degrees is its own reflection in both axes and its own rotation by any
//: multiple of 45, so neither of those changes which directions are covered:
//: whatever angle the ring is turned through, some slot still points at the
//: nearest edge, and at 22.5 degrees (the most any rotation can buy) a slot
//: aimed at the left edge still reaches 68 * cos 22.5 = 63px of the 82px it
//: needs. Turning the ring also moves every slot away from the position the
//: person learned it at, to buy 19px. Sliding the whole ring keeps all eight
//: in their own places and in their own order, and a shift is bounded by the
//: ring's own reach (82px), which is less than a topic is wide: the ring
//: still reads as belonging to the node it came from.
//:
//: Measured after the ring is shown, not before, which is the ordering
//: `placeEscapedMenu` in app.js paid for: a rect read inside a
//: `display: none` ancestor is all zeroes, and zeroes here would produce a
//: confident shift from nothing. Measured off the slots rather than off the
//: ring, for the same reason from the other direction: the ring's own box is
//: deliberately `width: 0; height: 0` so that it cannot cover the node it
//: surrounds, so its rect says nothing about where its slots are. The union
//: of the slots is the honest answer, and it stays honest if the radius, the
//: slot size or the number of slots ever changes.
function wbPlaceMapRadial(ring, host, x, y, clear) {
  const margin = 8;
  ring.style.left = `${Math.round(x)}px`;
  ring.style.top = `${Math.round(y)}px`;
  ring.style.removeProperty("--wb-radial-inner");
  ring.style.removeProperty("--wb-radial-outer");
  ring._radial = null;
  ring.classList.remove("hidden");
  const hostRect = host.getBoundingClientRect();
  if (!hostRect.width || !hostRect.height) return { dx: 0, dy: 0 };
  wbSizeMapRadial(ring, hostRect, clear);
  wbFitMapRadialBand(ring);
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const slot of ring.children) {
    const box = slot.getBoundingClientRect();
    if (!box.width && !box.height) continue;
    left = Math.min(left, box.left);
    top = Math.min(top, box.top);
    right = Math.max(right, box.right);
    bottom = Math.max(bottom, box.bottom);
  }
  if (!Number.isFinite(left)) return { dx: 0, dy: 0 };
  //: The window, cut down to the canvas, and then cut down again by the two
  //: panels that float *over* the canvas: on screen is not the same as
  //: reachable. Measured at 1440x900: the host starts at y=128 and the map's
  //: top bar covers 136 to 182 of it, so a trunk near the top of a map (the
  //: common case, that is where a map starts) would have had its upper slots
  //: placed under the bar, which takes the click.
  //:
  //: A panel counts against an edge only when it is a *band* across the
  //: canvas, more than half the host's width for a top or bottom bar and
  //: more than half its height for a side one, because both of these panels
  //: are draggable and one parked in the middle of the board is something to
  //: place a ring beside, not a wall to stay out of. The same rule then
  //: handles the tool panel's own "dock as a sidebar" state without knowing
  //: it exists.
  let loX = Math.max(margin, hostRect.left + margin);
  let hiX = Math.min(window.innerWidth - margin, hostRect.right - margin);
  let loY = Math.max(margin, hostRect.top + margin);
  let hiY = Math.min(window.innerHeight - margin, hostRect.bottom - margin);
  for (const id of ["wb-topbar", "wb-tools-panel"]) {
    const panel = document.getElementById(id);
    if (!panel || panel.hidden || panel.classList.contains("hidden")) continue;
    const bar = panel.getBoundingClientRect();
    if (!bar.width || !bar.height) continue;
    const midY = hostRect.top + hostRect.height / 2;
    const midX = hostRect.left + hostRect.width / 2;
    if (bar.width > hostRect.width / 2) {
      if (bar.bottom < midY) loY = Math.max(loY, bar.bottom + margin);
      else if (bar.top > midY) hiY = Math.min(hiY, bar.top - margin);
    }
    if (bar.height > hostRect.height / 2) {
      if (bar.right < midX) loX = Math.max(loX, bar.right + margin);
      else if (bar.left > midX) hiX = Math.min(hiX, bar.left - margin);
    }
  }
  //: Right edge first and left edge second, so that on a canvas narrower
  //: than the ring (which no real viewport is, 164px against 390, but a
  //: split pane could be) the ring is pinned to the edge a reader starts
  //: from rather than half off both sides.
  let dx = 0, dy = 0;
  if (right > hiX) dx = hiX - right;
  if (left + dx < loX) dx = loX - left;
  if (bottom > hiY) dy = hiY - bottom;
  if (top + dy < loY) dy = loY - top;
  if (dx) ring.style.left = `${Math.round(x + dx)}px`;
  if (dy) ring.style.top = `${Math.round(y + dy)}px`;
  return { dx, dy };
}

//: **The ring's hole holds the node, and the ring holds in the canvas.**
//:
//: The ring is a pie menu now (the owner, 2026-09-24: the buttons were "just
//: buttons sitting ontop of" the ring), so the question this answers changed
//: from "how far out do the tiles go" to "how big is the hole". The answer is
//: the node: half its on-screen diagonal plus a little room, so the whole
//: topic sits inside the hole with its corners clear. The band beyond it is a
//: fixed thickness (`--wb-radial-band`, an icon over one line of word), so
//: the outer edge follows.
//:
//: Three limits. A floor, so a one-word topic still gets sectors wide enough
//: for their words (at the floor six 60 degree sectors are 84px across their
//: middle); a ceiling, so a topic resized to 400px wide gets a ring round its
//: middle rather than a hoop across the board; and the canvas, whose shorter
//: side the whole ring must fit inside (at 390 the canvas is 364px wide,
//: which caps the hole at 118px, above the 108px a default topic asks for).
//: Past the ceiling or the canvas the ring overlaps the topic's ends, which is
//: the lesser harm than a ring that does not fit.
//:
//: Without `clear` (the line ring, opened at the pointer) the stylesheet's
//: own edges stand: there is no topic to hold.
function wbMapRadialPx(ring, name) {
  const raw = getComputedStyle(ring).getPropertyValue(name).trim();
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  if (raw.endsWith("rem")) return value * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
  return value;
}

function wbSizeMapRadial(ring, hostRect, clear) {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const band = wbMapRadialPx(ring, "--wb-radial-band") || 4.5 * rem;
  const floor = wbMapRadialPx(ring, "--wb-radial-inner") || 2.75 * rem;
  let inner = floor;
  if (clear && clear.w > 0 && clear.h > 0) {
    const holds = Math.hypot(clear.w / 2, clear.h / 2) + 6;
    inner = Math.min(Math.max(holds, 3.5 * rem), 10 * rem);
  }
  const fits = Math.min(hostRect.width, hostRect.height) / 2 - 8 - band;
  inner = Math.round(Math.max(Math.min(inner, fits), Math.min(floor, fits)));
  ring._radial = { inner, outer: inner + band };
  ring.style.setProperty("--wb-radial-inner", `${inner}px`);
  ring.style.setProperty("--wb-radial-outer", `${inner + band}px`);
}

//: One sector's outline in its own square (the ring's diameter, centre at
//: `outer, outer`): the outer arc clockwise from `a0` to `a1`, then the inner
//: arc back. `gap` is half the hairline between neighbours, taken off each
//: side as a *length* at each radius rather than as one angle, so the
//: divider is as wide at the rim as at the hole; `rim` comes off both radii
//: so the band's own colour edges the ring.
function wbMapRadialSectorPath(inner, outer, a0, a1, gap = 0, rim = 0) {
  const c = outer;
  const ro = outer - rim, ri = inner + rim;
  const go = gap / ro, gi = gap / ri;
  const pt = (r, a) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 - 2 * go > Math.PI ? 1 : 0;
  const largeIn = a1 - a0 - 2 * gi > Math.PI ? 1 : 0;
  return `M ${pt(ro, a0 + go)} A ${ro} ${ro} 0 ${large} 1 ${pt(ro, a1 - go)}`
    + ` L ${pt(ri, a1 - gi)} A ${ri} ${ri} 0 ${largeIn} 0 ${pt(ri, a0 + gi)} Z`;
}

//: **Cut the ring into its sectors** (the name is the one INBOX 410 gave it,
//: when the band was cut to its tiles; now the sectors are cut to the band).
//: Clockwise from the top, in the markup's own order, each sector centred on
//: its direction: six at 60 degrees round a topic, three at 120 on a line.
//: Each slot gets its wedge as a clip path and the middle of its wedge as the
//: point its face is drawn at, both in its own square, which is the ring's
//: square; `_sector` keeps the angles for the edge a focused sector wears and
//: for the menu More opens beside it.
function wbFitMapRadialBand(ring) {
  const { inner, outer } = ring._radial || {
    inner: wbMapRadialPx(ring, "--wb-radial-inner") || 44,
    outer: (wbMapRadialPx(ring, "--wb-radial-inner") || 44) + (wbMapRadialPx(ring, "--wb-radial-band") || 56),
  };
  ring._radial = { inner, outer };
  const slots = [...ring.querySelectorAll(".wb-map-radial-slot")];
  const n = slots.length;
  if (!n) return;
  const step = (2 * Math.PI) / n;
  //: The band's middle. The band is 4.5rem rather than the 3.5 an icon over a
  //: word needs, because on the four slanted sectors of six a word lies across
  //: the band, not along it: measured at 3.5 and 4rem, "Add beside" put a
  //: corner into the hole and "Cross-link" one past the rim (6.4px at worst).
  const mid = (inner + outer) / 2;
  slots.forEach((slot, i) => {
    const at = -Math.PI / 2 + i * step;
    const a0 = at - step / 2, a1 = at + step / 2;
    slot.style.clipPath = `path("${wbMapRadialSectorPath(inner, outer, a0, a1, 0.75, 1)}")`;
    slot.style.setProperty("--wb-sector-x", `${(outer + mid * Math.cos(at)).toFixed(1)}px`);
    slot.style.setProperty("--wb-sector-y", `${(outer + mid * Math.sin(at)).toFixed(1)}px`);
    slot._sector = { a0, a1, at, inner, outer };
  });
  wbMarkMapRadialSector(ring, null);
}

//: **The edge on the sector the keyboard is on.** An outline on a clipped
//: button is clipped with everything else outside its wedge, so the ring
//: draws the focused sector's edge itself: one SVG path over the sectors,
//: made the first time and rewritten per focus. Hover gets the fill alone,
//: which is what a pointer needs; the keyboard gets the fill and the edge.
function wbMarkMapRadialSector(ring, slot) {
  let svg = ring.querySelector(".wb-map-radial-edge");
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "wb-map-radial-edge");
    svg.setAttribute("aria-hidden", "true");
    svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    ring.insertBefore(svg, ring.querySelector(".wb-map-radial-caption"));
  }
  const s = slot?._sector;
  const path = svg.firstChild;
  if (!s) {
    path.removeAttribute("d");
    return;
  }
  const size = s.outer * 2;
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  path.setAttribute("d", wbMapRadialSectorPath(s.inner, s.outer, s.a0, s.a1, 0.75, 2));
  svg.classList.toggle("wb-map-radial-edge-danger", slot.classList.contains("wb-map-radial-danger"));
}

//: A sector's own box in the window, from its angles rather than from the
//: button's rect, which is the whole ring's square for every sector. Sampled
//: along both arcs and at both edges, which is exact enough for placing a
//: menu beside it and cannot be fooled by the clip.
function wbMapRadialSectorRect(slot) {
  const s = slot?._sector;
  const ring = slot?.closest(".wb-map-radial");
  if (!s || !ring) return null;
  const o = ring.getBoundingClientRect();
  if (!o.width && !o.height && !o.left && !o.top) return null;
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (let k = 0; k <= 12; k++) {
    const a = s.a0 + ((s.a1 - s.a0) * k) / 12;
    for (const r of [s.inner, s.outer]) {
      const x = o.left + r * Math.cos(a), y = o.top + r * Math.sin(a);
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  return { left, top, right, bottom, width: right - left, height: bottom - top, outward: Math.cos(s.at) < 0 ? "left" : "right" };
}

//: **Arrows walk the ring** (the brief: arrows move between sectors, Enter
//: activates, Escape closes). Right and Down go clockwise, Left and Up
//: back, Home and End to the first and last; a disabled sector is stepped
//: over. `role="toolbar"` already promises this: a toolbar is walked with
//: the arrows and left with Tab.
function wbMapRadialStep(ring, from, delta) {
  const slots = [...ring.querySelectorAll(".wb-map-radial-slot")];
  const live = slots.filter((s) => !s.disabled);
  if (!live.length) return null;
  if (delta === "first") return live[0];
  if (delta === "last") return live[live.length - 1];
  let i = slots.indexOf(from);
  for (let k = 0; k < slots.length; k++) {
    i = (i + delta + slots.length) % slots.length;
    if (!slots[i].disabled) return slots[i];
  }
  return null;
}

//: The sector nearest a direction, for the first arrow pressed with the ring
//: open and the focus still on the canvas: Up goes to the top sector, Right to
//: the one nearest three o'clock, and so on, which is what pointing with a key
//: at a pie means.
function wbMapRadialToward(ring, key) {
  const want = { ArrowUp: -Math.PI / 2, ArrowRight: 0, ArrowDown: Math.PI / 2, ArrowLeft: Math.PI }[key];
  if (want === undefined) return null;
  let best = null, bestGap = Infinity;
  for (const slot of ring.querySelectorAll(".wb-map-radial-slot")) {
    if (slot.disabled || !slot._sector) continue;
    const d = Math.abs(Math.atan2(Math.sin(slot._sector.at - want), Math.cos(slot._sector.at - want)));
    if (d < bestGap - 1e-6) { best = slot; bestGap = d; }
  }
  return best;
}

//: The node whose ring is open wears a class while it is open, because two of
//: its own hover controls (add a branch, add a topic beside) are two of the
//: ring's eight slots and sit inside the ring's circle. Two buttons for one
//: action, one of them under the ring, is the clutter the report was about.
function wbMarkMapRadialNode(id) {
  for (const el of document.querySelectorAll(".wb-object.wb-radial-open")) {
    el.classList.remove("wb-radial-open");
  }
  if (id == null) return;
  document.querySelector(`.wb-object[data-id="${id}"]`)?.classList.add("wb-radial-open");
}

function wbCloseMapRadial() {
  const ring = document.getElementById("wb-map-radial");
  if (!ring || ring.classList.contains("hidden")) return;
  //: A sector that held the focus is about to be hidden, and a hidden
  //: element hands the focus to `body`, where no board key reaches: the board
  //: takes it back, so the next Tab or Enter still acts on the topic.
  if (ring.contains(document.activeElement)) document.getElementById("whiteboard-container")?.focus({ preventScroll: true });
  ring.classList.add("hidden");
  wbMapRadialFor = null;
  wbSyncMapRadialAlt(false);
  wbMarkMapRadialNode(null);
  wbUpdateSelectionBar();
}

//: Alt held turns the two add slots into the two remove slots (Coggle). The
//: swap is drawn, not just honoured: a modifier that changes what a button
//: does without saying so is the "secret" this file's own space-pan comment
//: warns about.
function wbSyncMapRadialAlt(alt) {
  const pairs = [
    ["wb-radial-child", alt
      ? ["ph-trash", "Remove branch", "Remove this branch: this topic and everything under it"]
      : ["ph-arrow-elbow-down-right", "Add child", "Add a branch off this topic (Tab). Hold Alt to remove the branch instead"]],
    ["wb-radial-sibling", alt
      ? ["ph-minus-circle", "Remove topic", "Remove this topic only: its branches move up to its parent"]
      : ["ph-arrow-down", "Add beside", "Add a topic beside this one (Enter). Hold Alt to remove this topic and keep its branch"]],
  ];
  for (const [id, [icon, word, title]] of pairs) {
    const button = document.getElementById(id);
    if (!button) continue;
    button.classList.toggle("wb-map-radial-danger", alt);
    button.title = title;
    button.setAttribute("aria-label", title.split(".")[0]);
    //: The half of "how they work" that a label cannot carry: these two slots
    //: are two actions each, and the modifier that swaps them was only ever
    //: stated in a tooltip's second sentence. The ring's caption reads this.
    button.dataset.altHint = alt ? "Let go of Alt to add instead" : "Hold Alt to remove instead";
    //: The drawn word too, not only the icon and the tooltip (§12.5): a slot
    //: that says "Add child" while Alt is held and the icon is a bin is worse
    //: than one that says nothing.
    const name = button.querySelector(".wb-map-radial-name");
    if (name) name.textContent = word;
    const glyph = button.querySelector("i");
    if (glyph) glyph.className = `ph ${icon}`;
  }
}

function wbOpenMapRadial(node) {
  const ring = document.getElementById("wb-map-radial");
  const container = document.getElementById("whiteboard-container");
  const host = document.getElementById("library-view-whiteboard");
  if (!ring || !container || !host || !node) return false;
  const box = wbItemBBox("object", node);
  if (!box) return false;
  // The node's centre in the view's own coordinates, through the live zoom
  // transform: the same route `wbUpdateSelectionBar` takes, because a ring
  // placed from the pointer instead would sit off-centre on every node whose
  // edge you happened to right-click.
  const t = d3.zoomTransform(container);
  const rect = container.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  const cx = rect.left - hostRect.left + t.applyX((box.minX + box.maxX) / 2);
  const cy = rect.top - hostRect.top + t.applyY((box.minY + box.maxY) / 2);
  wbMapRadialFor = node.id;
  //: The node's box on screen, not on the board: the slots are a fixed size in
  //: px whatever the zoom, so what the ring has to clear is what the node
  //: measures at the zoom in force.
  const shift = wbPlaceMapRadial(ring, host, cx, cy, {
    w: (box.maxX - box.minX) * t.k,
    h: (box.maxY - box.minY) * t.k,
  });
  //: **The topic goes with its ring.** A ring slid in from an edge is a ring
  //: whose hole no longer holds its topic, and the hole is the point of a pie
  //: (measured on a map's first topic, under the top bar: slid 118px down,
  //: the topic was behind the Add child sector). So the board pans by the
  //: same amount, once, and the topic is in the middle of the hole wherever
  //: it was on screen. Not animated: the ring is already drawn at the end
  //: position, and a board easing towards it would be a topic sliding
  //: through its own ring.
  if (shift && (shift.dx || shift.dy)) {
    d3.select(container).call(wbZoom.translateBy, shift.dx / t.k, shift.dy / t.k);
  }
  wbSyncMapRadialAlt(false);
  const collapse = document.getElementById("wb-radial-collapse");
  if (collapse) {
    const folded = Boolean(node.data?.collapsed);
    const label = folded ? "Open this branch again (C)" : "Fold this branch away (C)";
    collapse.title = label;
    collapse.setAttribute("aria-label", label);
    const name = collapse.querySelector(".wb-map-radial-name");
    if (name) name.textContent = folded ? "Unfold" : "Fold";
    //: A leaf has nothing to fold. Disabled rather than gone: a ring whose
    //: slots move about with the node under them is a ring nobody can learn.
    collapse.disabled = (wbMapIndex().childrenOf.get(node.id) || []).length === 0;
    const glyph = collapse.querySelector("i");
    if (glyph) glyph.className = `ph ph-caret-circle-${folded ? "right" : "down"}`;
  }
  wbMarkMapRadialNode(node.id);
  wbUpdateSelectionBar();
  return true;
}

//: The node an open ring acts on, or null. Every slot goes through this so a
//: ring whose node has since been deleted closes instead of throwing.
function wbMapRadialNode() {
  if (wbMapRadialFor == null) return null;
  const node = (wbState.objects || []).find((o) => o.id === wbMapRadialFor);
  if (!node || !WB_MAP_KINDS.has(node.kind)) {
    wbCloseMapRadial();
    return null;
  }
  return node;
}

//: Copy a branch: this topic and everything under it, as a sibling of itself.
//:
//: Built from the node endpoint rather than from the board's copy/paste,
//: which works on a flat selection and would paste ten unrelated boxes where
//: a branch was. Parents before children (`wbMapSubtree` returns them in that
//: order), so every child's new parent already exists by the time it is
//: created: an old id maps to a new one exactly once.
async function wbMapCopyBranch(id) {
  const index = wbMapIndex();
  const source = index.byId.get(id);
  if (!source) return;
  const subtree = wbMapSubtree(index, id);
  if (subtree.length > WB_MAP_COPY_MAX) {
    toast(`That branch has ${subtree.length} topics: copying stops at ${WB_MAP_COPY_MAX}.`, true);
    return;
  }
  const mapped = new Map();
  for (const node of subtree) {
    const parentId = node.id === id
      ? (index.byId.has(node.parent_id) ? node.parent_id : null)
      : mapped.get(node.parent_id);
    // A child whose parent failed to copy has nowhere to go: stop rather than
    // scattering the rest of the branch at the top level.
    if (node.id !== id && parentId == null) break;
    const created = await wbMapCreateNode({
      parentId: parentId ?? null,
      kind: node.kind,
      text: wbMapLabel(node),
      refId: node.data?.ref_id ?? null,
    });
    if (!created) break;
    // The copy looks like the original: the styling lives in `data` and the
    // create endpoint only takes a label, so it is written straight after.
    const style = {};
    for (const key of [...WB_MAP_STYLE_KEYS, ...WB_MAP_CONTENT_KEYS]) {
      if (node.data?.[key] != null) style[key] = node.data[key];
    }
    if (Object.keys(style).length) {
      created.data = { ...created.data, ...style };
      await wbSaveObject(created);
    }
    mapped.set(node.id, created.id);
  }
  await wbMapTidy({ quiet: true });
  renderWhiteboardNow();
  const rootCopy = mapped.get(id);
  if (rootCopy) selectWbItem("object", rootCopy);
  toast(`Copied ${mapped.size} topic${mapped.size === 1 ? "" : "s"}.`);
}

//: A branch big enough that copying it is a mistake rather than an intention.
//: One POST per node (there is no bulk create), so a thousand-node branch
//: would be a thousand requests: the same shape `wbSaveBulkMove` already
//: pays for, and the reason a cap is kinder than a progress bar here.
const WB_MAP_COPY_MAX = 120;

//: Everything the strip and the radial can set on a node, in one list, so a
//: copy carries what the original wore and "reset to the branch" clears
//: exactly the same set. A key added to one and not the other is how a copy
//: quietly loses its colour.
//:
//: The line's own four (`edge_style`, `edge_dashed`, `edge_width`,
//: `edge_arrow`) belong here for the same reason its label always did: they
//: are written from the strip and the link ring onto the node, so a branch
//: copied without them comes out drawn differently from the one it was copied
//: from. The first two were missing until item 177 added the other two, which
//: is what made the gap worth closing rather than recording again: half a
//: line's look travelling with a copy is worse than none of it.
const WB_MAP_STYLE_KEYS = [
  "color", "bold", "italic", "font_size", "align", "icon", "link", "edge_label",
  "edge_label_dx", "edge_label_dy",
  "shape", "core", "spine", "edge_style", "edge_dashed", "edge_width", "edge_arrow",
  //: The waypoint on the line (§12.1 item 5's third) belongs with the other
  //: four for the same reason: it is written from the line itself onto the
  //: node, and a branch copied without it comes out drawn differently from the
  //: one it was copied from.
  "edge_bend", "edge_slide",
];

//: What a copy carries that "back to the branch" must **not** drop: a picture
//: in a topic (§12.1 item 2's fourth) is content, not a look. Reset's whole
//: promise is that it is the safe way out of a topic you have over-decorated,
//: and a reset that also threw away the picture somebody uploaded would make
//: it the one control on this map you cannot press to find out what it does.
//: Two lists rather than one flag, because the two questions are different
//: ones and a boolean beside each key would be read as neither.
const WB_MAP_CONTENT_KEYS = ["image"];

//: Remove this topic and keep its branch: the children move up to its parent
//: first, then the node goes. Through `/move`, which is the only endpoint
//: that runs the cycle check (`wbMapOutdent`'s own comment), and children
//: first so a failure leaves the branch attached to something rather than
//: orphaned under a node that no longer exists.
async function wbMapRemoveKeepingBranch(id) {
  const boardId = window.currentBoardId;
  const index = wbMapIndex();
  const node = index.byId.get(id);
  if (!boardId || !node) return;
  const children = index.childrenOf.get(id) || [];
  // The last-topic rule, at this door too: removing the only topic on the map
  // empties it, and §12.0 says a map is never empty.
  if (!children.length && wbMapDeleteEmptiesMap(id)) {
    wbMapRefuseLastTopic();
    return;
  }
  const parentId = index.byId.has(node.parent_id) ? node.parent_id : null;
  try {
    //: The whole branch in one request when there is more than one child: the
    //: half-moved branch a failure used to leave behind is the reason
    //: `move-many` exists. One child is still one `/move`, which says what it
    //: did in its own event rather than as a batch of one.
    if (children.length > 1) {
      const moved = await apiJson(`/whiteboard/boards/${boardId}/nodes/move-many`, {
        method: "PUT",
        body: JSON.stringify({
          moves: children.map((child) => ({ id: child.id, reparent: true, parent_id: parentId })),
        }),
      });
      for (const after of moved || []) Object.assign(index.byId.get(after.id) || {}, after);
    } else {
      for (const child of children) {
        const after = await apiJson(`/whiteboard/boards/${boardId}/nodes/${child.id}/move`, {
          method: "PUT",
          body: JSON.stringify({ parent_id: parentId }),
        });
        Object.assign(child, after);
      }
    }
  } catch (err) {
    toast(err.message || "Couldn't move that branch up.", true);
    return;
  }
  await wbMapDeleteSubtree(id);
  await wbMapTidyBranch(parentId);
}

//: Sever (§12.1 item 9): cut a topic free of its parent so it becomes a trunk
//: of its own, branch and all. `parent_id: null` is a move the endpoint
//: already supports; floating topics are allowed by §12.0 ("multiple roots
//: are allowed"), so this needs no new rule, only a way to ask for it.
async function wbMapSever(id) {
  const boardId = window.currentBoardId;
  const index = wbMapIndex();
  const node = index.byId.get(id);
  if (!boardId || !node) return;
  if (node.parent_id == null || !index.byId.has(node.parent_id)) {
    toast("This topic is already a trunk of its own.");
    return;
  }
  const oldParent = node.parent_id;
  try {
    const moved = await apiJson(`/whiteboard/boards/${boardId}/nodes/${id}/move`, {
      method: "PUT",
      body: JSON.stringify({ parent_id: null }),
    });
    Object.assign(node, moved);
  } catch (err) {
    toast(err.message || "Couldn't cut that topic free.", true);
    return;
  }
  // A severed topic keeps the colour it had as part of the branch it left,
  // which would be a lie about where it belongs: it is its own trunk now, so
  // it starts the palette again like every other trunk's children do.
  if (node.data?.color) await wbMapSetNodeStyle(node, { color: null });
  await wbMapTidyBranch(oldParent);
  renderWhiteboardNow();
  toastAction("Cut free as its own trunk.", "Put it back", async () => {
    try {
      const back = await apiJson(`/whiteboard/boards/${boardId}/nodes/${id}/move`, {
        method: "PUT",
        body: JSON.stringify({ parent_id: oldParent }),
      });
      Object.assign(node, back);
      await wbMapTidyBranch(oldParent);
      renderWhiteboardNow();
    } catch (err) {
      toast(err.message || "Couldn't put it back.", true);
    }
  });
}

//: What the line into a topic says. Stored on the child, which is the end of
//: a tree edge that has exactly one of them (see the schema's own comment),
//: and drawn by `wbRenderMapEdges`.
async function wbMapLabelEdge(id) {
  const index = wbMapIndex();
  const node = index.byId.get(id);
  if (!node) return;
  if (!index.byId.has(node.parent_id)) {
    toast("A trunk has no line into it to label.");
    return;
  }
  const current = node.data?.edge_label || "";
  const answer = await promptDialog(
    "What does the line into this topic say?",
    current,
    { confirmLabel: current ? "Change the label" : "Add the label" }
  );
  //: **An empty answer changes nothing.** `promptDialog` resolves `""` for
  //: Escape, Cancel and an empty field alike, so "empty removes it" would
  //: make Escape destructive. Removing is its own row in the node menu
  //: ("Take the label off the line"), the way Unlink is for a link.
  const text = String(answer ?? "").trim();
  if (!text) return;
  await wbMapSetNodeStyle(node, { edge_label: text.slice(0, 80) });
  renderWhiteboardNow();
}

//: "Back to the branch" (§12.0: "'Reset to branch' on any node"). Drops every
//: key the strip and the radial can set, in one list rather than one button
//: per property, which is what makes it usable as the way out of a node you
//: have over-decorated.
async function wbMapResetToBranch(id) {
  const node = (wbState.objects || []).find((o) => o.id === id);
  if (!node) return;
  const patch = {};
  for (const key of WB_MAP_STYLE_KEYS) patch[key] = null;
  await wbMapSetNodeStyle(node, patch);
  renderWhiteboardNow();
  //: What it goes back to depends on whether the map says anything (§13e):
  //: on a themed map a reset topic follows the map, and a toast that said
  //: "the branch's own look" over a topic that just took the map's would be
  //: describing the wrong thing.
  toast(Object.keys(wbMapTheme()).length
    ? "Back to following this map."
    : "Back to the branch's own look.");
}

//: --- the link radial (MINDMAP_PLAN.md §12.1 item 4) -------------------------
//:
//: The same ring, on the line rather than on the topic. Every slot writes to
//: the **child**, because a tree edge has no row of its own: it is
//: `parent_id`, and the child is the end of it with exactly one incoming line.
//:
//: **Coggle's plain left-click on a line opens the colour wheel alone, and
//: that is deliberately not copied.** A left-click on this canvas is how you
//: clear a selection, and a tree edge is a 2px line inside a 16px target: a
//: near-miss would open a colour picker you did not ask for, on a branch you
//: were only trying to click past. The ring is the same gesture as the node's
//: (right-click, or hold on a touch screen), which is one gesture to learn
//: rather than two, and the colour well is a slot inside it.
let wbMapLinkRadialFor = null;
//: **The same ring, on the map's other kind of connection** (MINDMAP_PLAN
//: §13c). A map has two: the branch, which is the child's own `parent_id` and
//: is therefore stored on the child, and the cross-link, which is a link
//: sketch naming both ends. §13.2 measured what that cost a person: a
//: right-click on a branch opened this ring, a right-click on a cross-link
//: opened the *board's* flat menu and its context bar, so the same gesture on
//: two lines that sit beside each other gave two different surfaces with two
//: different vocabularies. One ring, told which kind it is on, is the fix
//: §13's decision 2 asked for: "the data keeps two kinds of connection; the
//: controls stop having two."
let wbMapLinkRadialCross = null;

function wbCloseMapLinkRadial() {
  const ring = document.getElementById("wb-map-link-radial");
  if (!ring || ring.classList.contains("hidden")) return;
  if (ring.contains(document.activeElement)) document.getElementById("whiteboard-container")?.focus({ preventScroll: true });
  ring.classList.add("hidden");
  wbMapLinkRadialFor = null;
  wbMapLinkRadialCross = null;
}

//: A cross-link, read from a sketch row: its parsed data plus both topics,
//: or null for a sketch that is not one (an ordinary board connector, a link
//: to a card, a line whose ends are gone). One reader, because every slot
//: below and the renderer's own dashed class all have to agree about what
//: counts as a cross-link.
function wbMapCrossLinkInfo(sketchId) {
  if (!wbIsMap()) return null;
  const sketch = (wbState.sketches || []).find((x) => x.id === sketchId);
  if (!sketch) return null;
  let data = null;
  try {
    data = JSON.parse(sketch.data);
  } catch {
    return null;
  }
  if (!data || !String(data.type || "").startsWith("link-")) return null;
  const index = wbMapIndex();
  const source = index.byId.get(data.sourceId);
  const target = index.byId.get(data.targetId);
  if (!source || !target) return null;
  return { sketch, data, source, target, index };
}

//: **Which lines show their waypoint handle without being pointed at.**
//:
//: Two routes, and the second is not a luxury. Hover (the `<g>` wrapper, in
//: the stylesheet) is the one that always works, because it needs nothing
//: selected and so never has the map strip over it. This one is the other
//: half: the lines of the topic you have selected show their handles while it
//: is selected, which is the route a keyboard selection reaches and the one
//: that says the control exists at all. A cheap attribute toggle over elements
//: the render already built, so it can run on every selection change rather
//: than forcing a re-render.
function wbSyncMapEdgeHandles() {
  const selected = wbIsMap() && wbMultiSelection.size <= 1 ? wbSelectedMapNode() : null;
  const id = selected ? String(selected.id) : null;
  const mine = (el) => Boolean(id) && (el.dataset.parent === id || el.dataset.child === id);
  for (const handle of document.querySelectorAll(".wb-map-edges .wb-map-edge-handle")) {
    handle.classList.toggle("is-shown", mine(handle));
  }
}

//: Dragging one waypoint handle (§12.1 item 5's third).
//:
//: In client pixels over the zoom scale, the same conversion
//: `wbMapStartResizeDrag` makes and for the same reason: the pointer's own
//: delta is the only measurement that does not need the canvas transform
//: rebuilt per frame, and the waypoint it starts from is already in board
//: units. Per frame it redraws this one edge (`wbUpdateMapEdges`, which moves
//: the visible path, the hit twin and the handle together) rather than the
//: board; the write lands once, on the drop.
function wbWireMapEdgeHandle(handle, parentId, childId) {
  handle.addEventListener("pointerdown", (event) => {
    //: No `is-shown` check here, deliberately: the stylesheet is the one gate,
    //: and it has two ways of opening (hover on the line, or the topic at
    //: either end selected). A class test would have refused the hover route
    //: silently, which is the half that works when the strip is in the way.
    //: An unshown handle is `pointer-events: none` and so is never the target
    //: of this event in the first place.
    event.preventDefault();
    event.stopPropagation();
    const index = wbMapIndex();
    const parent = index.byId.get(parentId);
    const child = index.byId.get(childId);
    if (!parent || !child) return;
    const layout = wbMapLayout();
    const container = document.getElementById("whiteboard-container");
    const k = container ? d3.zoomTransform(container).k : 1;
    const start = wbMapEdgeWaypoint(wbMapEdgeAnchors(parent, child, layout), child);
    const edges = wbMapEdgesFor(childId).filter((edge) => edge.parent.id === parentId);
    const before = {
      edge_bend: child.data?.edge_bend ?? null,
      edge_slide: child.data?.edge_slide ?? null,
    };
    let next = null;
    //: Held open for the length of the drag. The pointer leaves the line the
    //: instant the bend starts, which ends the `:hover` that revealed the
    //: handle: pointer capture should carry the moves anyway, but a control
    //: that depends on capture outliving `pointer-events: none` is a control
    //: that depends on a detail of one engine.
    handle.classList.add("is-dragging");
    handle.setPointerCapture?.(event.pointerId);
    const move = (moveEvent) => {
      const x = start.x + (moveEvent.clientX - event.clientX) / k;
      const y = start.y + (moveEvent.clientY - event.clientY) / k;
      next = wbMapEdgeFractions(wbMapEdgeAnchors(parent, child, layout), x, y);
      child.data = { ...child.data, ...next };
      wbUpdateMapEdges(edges);
    };
    const done = async () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", done);
      handle.removeEventListener("pointercancel", done);
      handle.classList.remove("is-dragging");
      if (!next) return;
      //: Zero is stored as nothing at all, like every other default this map
      //: writes: a line dragged back to straight and a line nobody has
      //: touched are the same line, and neither should carry a field into an
      //: export.
      const patch = {
        edge_bend: next.edge_bend || null,
        edge_slide: next.edge_slide || null,
      };
      if (patch.edge_bend === before.edge_bend && patch.edge_slide === before.edge_slide) return;
      await wbMapSetNodeStyle(child, patch);
      renderWhiteboardNow();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", done);
    handle.addEventListener("pointercancel", done);
  });
  //: Back to the line it was, without going to a menu for it. The same
  //: gesture a text grip uses to reset a size elsewhere in this file, and the
  //: node's own menu says so in words for anyone who does not try it.
  handle.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const child = wbMapIndex().byId.get(childId);
    if (child) wbMapStraightenEdge(child);
  });
}

//: Drop a line's waypoint. Named rather than inlined because two surfaces ask
//: for it (the handle's own double-click and the topic's menu) and §12.5's
//: rule is one action in one place.
async function wbMapStraightenEdge(node) {
  if (!node) return;
  if (!node.data?.edge_bend && !node.data?.edge_slide) return;
  await wbMapSetNodeStyle(node, { edge_bend: null, edge_slide: null });
  renderWhiteboardNow();
}

//: The gestures on one edge, bound to the group that holds its stroke, its
//: target twin and its waypoint handle, so all three answer them. Bound at
//: creation rather than delegated: the edge group is replaced wholesale on
//: every render (`wbRenderMapEdges`'s own comment says why), so there is
//: exactly one binding per element per lifetime and nothing to clean up.
//:
//: The handle stops its own `pointerdown`, so a hold that starts on the
//: handle is a drag and not a ring; a hold anywhere else on the line is a
//: ring, which is what it has always been.
function wbWireMapEdgeGestures(hit, childId) {
  hit.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    wbOpenMapLinkRadial(childId, event.clientX, event.clientY);
  });
  //: Touch has no right-click, so a hold stands in: `wireLongPress` (app.js),
  //: which is the same 500ms and the same cancel-on-move this used to write
  //: for itself, plus the one thing the hand-rolled version could not do,
  //: swallowing the click the lift synthesises.
  wireLongPress(hit, (event, point) => wbOpenMapLinkRadial(childId, point.x, point.y));
  //: **Double-click a line to say what it means** (the conventions pass:
  //: Miro, tldraw and XMind all label a connector this way). The label
  //: itself already answered a double-click; a line with no label yet had
  //: only the ring's middle slot, and a double-click on it made a new trunk
  //: on top of it. The bend grip is part of this group and keeps its own
  //: double-click (straighten), which stops here first.
  hit.addEventListener("dblclick", (event) => {
    if (event.target.closest?.(".wb-map-edge-handle, .wb-map-edge-label")) return;
    event.preventDefault();
    event.stopPropagation();
    wbMapLabelEdge(childId);
  });
}

function wbOpenMapLinkRadial(childId, clientX, clientY) {
  const ring = document.getElementById("wb-map-link-radial");
  const host = document.getElementById("library-view-whiteboard");
  const index = wbMapIndex();
  const child = index.byId.get(childId);
  if (!ring || !host || !child) return;
  wbCloseContextMenu();
  wbCloseMapRadial();
  // At the pointer, not at the line's middle: a branch edge can be hundreds of
  // pixels long and a ring that jumped to its midpoint would open somewhere
  // you were not looking.
  const hostRect = host.getBoundingClientRect();
  wbMapLinkRadialFor = childId;
  wbMapLinkRadialCross = null;
  wbPlaceMapRadial(ring, host, clientX - hostRect.left, clientY - hostRect.top);
  wbSyncMapLinkRadial(child, index);
}

//: The same ring on a cross-link. Returns whether it took the gesture, so the
//: one door every right-click and hold goes through (`wbOpenContextMenuFor`)
//: can fall back to the board's flat menu for a link that is not one.
function wbOpenMapCrossLinkRadial(sketchId, clientX, clientY) {
  const info = wbMapCrossLinkInfo(sketchId);
  const ring = document.getElementById("wb-map-link-radial");
  const host = document.getElementById("library-view-whiteboard");
  if (!info || !ring || !host) return false;
  wbCloseContextMenu();
  wbCloseMapRadial();
  const hostRect = host.getBoundingClientRect();
  wbMapLinkRadialFor = null;
  wbMapLinkRadialCross = sketchId;
  wbPlaceMapRadial(ring, host, clientX - hostRect.left, clientY - hostRect.top);
  wbSyncMapLinkRadial(null, info.index);
  return true;
}

//: **The ring says which of the two lines it is on, in words** (§13c). The
//: three slots are the same three either way, and two of them mean something
//: different on each: Cut takes a branch off its parent and deletes a
//: cross-link outright, and the middle slot labels a branch and turns a
//: cross-link into one. Saying so on the slot, rather than relying on the
//: person having noticed which line they right-clicked, is the whole point of
//: this pass: §13.2 found that nothing on screen said which kind was which.
function wbSyncMapLinkRadial(child, index) {
  const reverse = document.getElementById("wb-link-reverse");
  const middle = document.getElementById("wb-link-label");
  const cut = document.getElementById("wb-link-cut");
  const ring = document.getElementById("wb-map-link-radial");
  const cross = wbMapLinkRadialCross != null;
  const setSlot = (el, word, title, icon) => {
    if (!el) return;
    el.querySelector(".wb-map-radial-name").textContent = word;
    el.title = title;
    el.setAttribute("aria-label", title);
    const glyph = el.querySelector("i");
    if (glyph) glyph.className = icon;
  };
  if (ring) {
    ring.setAttribute("aria-label", cross ? "What you can do with this cross-link" : "What you can do with this branch");
    const caption = ring.querySelector(".wb-map-radial-caption");
    if (caption) {
      caption.dataset.rest = cross
        ? "A cross-link: it joins two branches without changing the tree"
        : "A branch: the line the tree itself is made of";
      //: The drawn text as well as the attribute: `data-rest` is what the
      //: caption goes back to when the pointer leaves a slot, and the ring was
      //: already placed (and the caption already painted from the old value)
      //: by the time this runs.
      caption.textContent = caption.dataset.rest;
    }
  }
  if (cross) {
    setSlot(reverse, "Reverse", "Turn this cross-link around: it points the other way", "ph ph-swap");
    setSlot(middle, "Make branch", "Make this a branch instead: the topic at the far end moves under this one", "ph ph-tree-structure");
    setSlot(cut, "Cut", "Cut this cross-link: the two topics keep their own branches", "ph ph-scissors");
    if (reverse) reverse.disabled = false;
    return;
  }
  setSlot(reverse, "Reverse", "Turn the branch around: the topic below becomes the one above", "ph ph-swap");
  setSlot(middle, "Label", "Label this branch", "ph ph-tag");
  setSlot(cut, "Cut", "Cut this branch: the topic below becomes a trunk of its own", "ph ph-scissors");
  if (reverse && child) {
    // Turning a line around makes the parent a child of the child. If the
    // parent is a trunk that is a clean swap; it is never possible for a line
    // that is not there, which is the only case worth refusing.
    const parent = index.byId.get(child.parent_id);
    reverse.disabled = !parent;
  }
}

//: Turn a cross-link around. The row's two ends swap, which is the whole of
//: it: a cross-link is not stored on either topic, so nothing in the tree
//: moves and nothing has to be tidied. The anchors swap with them, or a line
//: turned around would leave from the edge its far end used to arrive at.
async function wbMapReverseCrossLink(sketchId) {
  const info = wbMapCrossLinkInfo(sketchId);
  if (!info) return;
  const data = {
    ...info.data,
    sourceId: info.data.targetId,
    targetId: info.data.sourceId,
    sourceKind: info.data.targetKind,
    targetKind: info.data.sourceKind,
    sourceAnchor: info.data.targetAnchor,
    targetAnchor: info.data.sourceAnchor,
  };
  const sketch = info.sketch;
  try {
    //: The whole row, not the one field: `PUT /sketches/{id}` takes a
    //: `WhiteboardSketchBase`, so a body of `{data}` alone is a 422 rather
    //: than a partial update.
    const saved = await apiJson(`/whiteboard/sketches/${sketchId}`, {
      method: "PUT",
      body: JSON.stringify({
        data: JSON.stringify(data), board_id: sketch.board_id,
        x: sketch.x, y: sketch.y, z: sketch.z, group_id: sketch.group_id ?? null,
      }),
    });
    Object.assign(info.sketch, saved);
  } catch (err) {
    toast(err.message || "Couldn't turn that cross-link around.", true);
    return;
  }
  renderWhiteboardNow();
  toast("Turned the cross-link around.");
}

//: **A cross-link promoted to a branch** (§13c). The one action that teaches
//: the difference between the map's two kinds of connection by undoing a
//: choice the gesture made for you: `wbMapJoinByLink` decides between the two
//: from whether the far end is already in the tree, which is invisible, so
//: this is the way back for the case it guessed wrong. The far end moves
//: under the near one, its own branch comes with it, and the cross-link row
//: goes: keeping it would draw a dashed line over the branch it just became.
async function wbMapCrossLinkToBranch(sketchId) {
  const info = wbMapCrossLinkInfo(sketchId);
  if (!info) return;
  const { source, target, index } = info;
  const descendants = new Set(wbMapSubtree(index, target.id).map((o) => o.id));
  if (descendants.has(source.id)) {
    toast(`"${wbMapLabel(source)}" is already under "${wbMapLabel(target)}": turn the cross-link around first.`, true);
    return;
  }
  if (!(await wbMapTransplant(target, source.id, false, { via: "link" }))) return;
  try {
    await apiJson(`/whiteboard/sketches/${sketchId}`, { method: "DELETE" });
    wbState.sketches = (wbState.sketches || []).filter((x) => x.id !== sketchId);
  } catch (err) {
    toast(err.message || "The branch was made, but the cross-link is still there.", true);
  }
  await wbRefreshMapState();
  renderWhiteboardNow();
}

//: Cut a cross-link: the row goes and neither topic is touched, which is the
//: difference between this and cutting a branch (that one re-parents).
async function wbMapCutCrossLink(sketchId) {
  const info = wbMapCrossLinkInfo(sketchId);
  if (!info) return;
  try {
    await apiJson(`/whiteboard/sketches/${sketchId}`, { method: "DELETE" });
  } catch (err) {
    toast(err.message || "Couldn't cut that cross-link.", true);
    return;
  }
  wbState.sketches = (wbState.sketches || []).filter((x) => x.id !== sketchId);
  await wbRefreshMapState();
  renderWhiteboardNow();
  toast("Cut the cross-link. Both topics kept their branches.");
}

//: Turn a line around: the topic below becomes the one above.
//:
//: Two moves, in this order, and the order is the whole of it. Moving the
//: parent under the child while the child is still under the parent is
//: exactly the ring `/move`'s cycle check refuses, so the child is lifted to
//: the parent's own parent first: after that neither is a descendant of the
//: other and the second move is an ordinary re-parent.
async function wbMapReverseEdge(childId) {
  const boardId = window.currentBoardId;
  const index = wbMapIndex();
  const child = index.byId.get(childId);
  const parent = child ? index.byId.get(child.parent_id) : null;
  if (!boardId || !child || !parent) return;
  const grandparent = index.byId.has(parent.parent_id) ? parent.parent_id : null;
  const move = (id, parentId) => apiJson(
    `/whiteboard/boards/${boardId}/nodes/${id}/move`,
    { method: "PUT", body: JSON.stringify({ parent_id: parentId }) }
  );
  try {
    Object.assign(child, await move(child.id, grandparent));
    Object.assign(parent, await move(parent.id, child.id));
  } catch (err) {
    toast(err.message || "Couldn't turn that line around.", true);
    return;
  }
  await wbMapTidy({ quiet: true });
  renderWhiteboardNow();
  toast("Turned the line around.");
}

function wbSyncMapChrome() {
  //: The map's line style can change here, and the cross-link tool draws it.
  if (wbIsMap()) wbSyncConnectWords(true);
  const isMap = wbIsMap();
  wbSyncToolSurfaces(isMap);
  wbSyncMapToolState();
  // A map that grows downward puts the branch spine on the node's top edge and
  // its chevron underneath: decided once here as a class on the view rather
  // than per node, since it is a property of the layout, not of any one node.
  document.getElementById("library-view-whiteboard")
    ?.classList.toggle("wb-map-down", isMap && wbMapLayout() === "tree-down");
  //: The switch says what it will do, not what the board is: a button whose
  //: label is the current state reads as a toggle that is already on, and this
  //: one changes the board rather than reporting it.
  const kind = document.getElementById("wb-board-kind-label");
  if (kind) kind.textContent = isMap ? "Turn into a whiteboard" : "Turn into a mind map";
  //: **The board menus a map has no use for** (MINDMAP_PLAN §12.5, INBOX 200:
  //: "what controls and tools are available and where"). The dock already
  //: hides thirteen board-only tools on a map (`wbSyncToolSurfaces`); the top
  //: bar was still offering the same things again as menus. Insert places a
  //: sticky, a text box, a shape or a bare note card, none of which a tree can
  //: hold (everything on a map is a node with a parent, which is what the map
  //: strip's own "Add from the library" makes). Arrange aligns, distributes
  //: and re-orders by hand, which is the layout's job on a map. Measured on a
  //: map of twelve topics before this: 60 controls reachable from the top bar,
  //: 21 of them board-only.
  //:
  //: Hidden, not disabled, for the reason the chip and the layout picker
  //: already are: a whole menu that can never apply here is not something to
  //: read past on every map.
  for (const id of ["wb-insert-menu", "wb-arrange-menu"]) {
    const menu = document.getElementById(id);
    const wrap = menu?.closest(".wb-board-menu-wrap");
    if (wrap) wrap.hidden = isMap;
    if (isMap) menu?.classList.add("hidden");
  }
  const chip = document.getElementById("wb-map-chip");
  const picker = document.getElementById("wb-map-layout");
  const tidy = document.getElementById("wb-map-tidy");
  if (chip) chip.hidden = !isMap;
  if (tidy) tidy.hidden = !isMap;
  if (picker) {
    picker.hidden = !isMap;
    picker.value = wbMapLayout();
  }
  //: Phase 5's own chrome. All of it is a *view* of the map, so it is synced
  //: from the same place the layout picker is rather than from wherever each
  //: happened to be changed: the failure this avoids is a control that reports
  //: a state the canvas disagrees with.
  const perspective = document.getElementById("wb-map-perspective");
  if (perspective) {
    perspective.value = wbMapPerspective();
    const row = perspective.closest(".wb-menu-row");
    if (row) row.hidden = !isMap;
  }
  const statsRow = document.getElementById("wb-map-stats-item");
  if (statsRow) statsRow.hidden = !isMap;
  const expandRow = document.getElementById("wb-map-expand-all");
  if (expandRow) expandRow.hidden = !isMap;
  const themeRow = document.getElementById("wb-map-theme-item");
  if (themeRow) themeRow.hidden = !isMap;
  //: The group itself as well as its rows: on a board it held nothing but
  //: its own heading, a group of zero rows drawn between two that have some.
  const mapSection = document.getElementById("wb-view-map-section");
  if (mapSection) mapSection.hidden = !isMap;
  if (!isMap && wbMapFocusState) wbMapFocusState = null;
  wbSyncMapViews();
}

//: Change the layout, then lay the map out in it. Changing a layout without
//: applying it would leave the picker saying "tree-down" over a map still
//: arranged sideways, which is a control that reports a state the screen
//: disagrees with: the shape of bug this app has been bitten by repeatedly.
async function wbMapSetLayout(layout) {
  const boardId = window.currentBoardId;
  if (!boardId || !wbIsMap()) return;
  try {
    await apiJson(`/whiteboard/boards/${boardId}`, {
      method: "PUT",
      body: JSON.stringify({ layout }),
    });
    window.wbMapState = { ...window.wbMapState, layout };
    wbSyncMapChrome();
    const moved = await wbMapTidy({ quiet: true });
    renderWhiteboardNow();
    toast(layout === "free"
      ? "Layout set to Free, nodes stay where you put them."
      : `Laid out ${moved} node${moved === 1 ? "" : "s"}.`);
  } catch (err) {
    toast(err.message || "Couldn't change the layout.", true);
  }
}

//: **Dragging a node pins it.** The other half of the tidy bargain above: a
//: position you chose by hand is a decision, and the next Tidy has to leave it
//: alone or the gesture is pointless. Called from the object drag's own end
//: handler, and only for a real move on a map, a click that happened to
//: register as a zero-length drag must not silently pin anything.
async function wbMapPinOnDrag(d) {
  if (!wbIsMap() || !WB_MAP_KINDS.has(d.kind) || d.data?.pinned) return;
  d.data = { ...d.data, pinned: true };
  await wbSaveObject(d);
  wbScheduleRender();
}
