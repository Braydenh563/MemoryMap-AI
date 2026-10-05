// whiteboard-interchange.js: a board in and out as text (2026-10-05, the
// features audit's W5; WHITEBOARD_PLAN Phase E).
//
// The features audit: a board went out only as pictures (PNG, SVG, PDF), and
// nothing came in but pictures and pasted text, where draw.io reads and
// writes Mermaid and keeps its diagram inside the SVG it exports. Three
// pieces, each local and each a pure function the tests run in node:
//
// - **Mermaid out** (`wbBoardToMermaid`): the board's shapes, text boxes and
//   cards that a connector joins, as a `flowchart` with the connector labels.
// - **Mermaid in** (`wbMermaidParse`, `wbMermaidLayout`): the `graph` and
//   `flowchart` subset people write (rectangles, rounded, diamonds, circles;
//   `-->`, `---`, `-.->`, `==>`, labels as `|yes|` or `-- yes -->`; chains
//   and `;`), laid out in rows by depth, placed as shapes and elbow
//   connectors, one undo step.
// - **An outline of a free board** (`wbBoardOutline`): its frames in
//   presentation order, what lies in each in reading order, then the rest;
//   Markdown a document or another app reads.
// - **A re-editable SVG**: the board's rows ride in the exported SVG's
//   `<metadata>` (`wbBoardSvgMetadata`), and importing that SVG puts them
//   back as new rows, connectors rejoined (`wbImportBoardRows`).
//
// Loaded in the Library bundle after whiteboard-format.js (`LAZY_MODULES`).

const WB_MERMAID_SHAPES = {
  rect: ["[", "]"],
  diamond: ["{", "}"],
  circle: ["((", "))"],
};

//: Words safe inside a Mermaid node or edge label: quotes, brackets and the
//: bar would end it early.
function wbMermaidText(text) {
  return String(text || "").replace(/["[\](){}|<>#;]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || " ";
}

//: The board as a Mermaid flowchart: every connector whose two ends are a
//: shape, a text box or a card, and the things it joins. Pure: reads `state`.
//: `frameOf(kind, item)` (the board passes one) names the frame an item lies
//: in, `{id, title}` or null: those items are written inside a `subgraph`
//: of the frame's title, so frames go out and come back as frames.
function wbBoardToMermaid(state, cardTitle = (node) => `Note ${node.entry_id}`, frameOf = null) {
  const ids = new Map();
  const loose = [];
  const framed = new Map();
  const edges = [];
  const declare = (kind, item) => {
    const key = `${kind}:${item.id}`;
    if (ids.has(key)) return ids.get(key);
    const id = `n${ids.size + 1}`;
    ids.set(key, id);
    let words = "";
    let shape = "rect";
    if (kind === "node") words = cardTitle(item);
    else if (kind === "object") words = item.data?.content || "";
    else {
      let data = {};
      try {
        data = JSON.parse(item.data) || {};
      } catch {
        data = {};
      }
      words = data.label || "";
      shape = data.shape === "diamond" ? "diamond" : data.shape === "circle" ? "circle" : "rect";
    }
    const [open, close] = WB_MERMAID_SHAPES[shape];
    const frame = frameOf ? frameOf(kind, item) : null;
    let bucket = loose;
    if (frame) {
      if (!framed.has(frame.id)) framed.set(frame.id, { title: frame.title, lines: [] });
      bucket = framed.get(frame.id).lines;
    }
    bucket.push(`${id}${open}"${wbMermaidText(words)}"${close}`);
    return id;
  };
  const find = (kind, id) => (state[{ node: "nodes", object: "objects", sketch: "sketches" }[kind]] || []).find((i) => i.id === id);
  for (const sketch of state.sketches || []) {
    let data = null;
    try {
      data = JSON.parse(sketch.data);
    } catch {
      continue;
    }
    if (!String(data?.type || "").startsWith("link-") || data.sourceId == null || data.targetId == null) continue;
    const sKind = data.sourceKind || "node", tKind = data.targetKind || "node";
    const s = find(sKind, data.sourceId), t = find(tKind, data.targetId);
    if (!s || !t) continue;
    const a = declare(sKind, s), b = declare(tKind, t);
    const arrow = (data.endCap && data.endCap !== "none") || data.endStyle === "end" || data.endStyle === "both" ? "-->" : "---";
    const label = data.label ? `|${wbMermaidText(data.label)}|` : "";
    edges.push(`  ${a} ${arrow}${label} ${b}`);
  }
  const lines = ["flowchart TD"];
  let f = 0;
  for (const { title, lines: inside } of framed.values()) {
    f += 1;
    lines.push(`  subgraph f${f} ["${wbMermaidText(title)}"]`, ...inside.map((l) => `    ${l}`), "  end");
  }
  lines.push(...loose.map((l) => `  ${l}`), ...edges);
  return lines.join("\n") + "\n";
}

//: The `graph`/`flowchart` subset, to `{ dir, nodes: [{id, text, shape,
//: group}], edges: [{from, to, label, arrow}], subgraphs: [{id, title,
//: parent}] }`. A `subgraph` (nested or not, `subgraph id [Title]`,
//: `subgraph id`, or `subgraph Some title`) up to its `end` holds every node
//: first named inside it, and comes in as a frame (wb-phase2 step 2; it was
//: skipped). An edge may name a subgraph: it joins the frame. Unknown lines
//: (style, classDef, click, direction) are skipped and counted, never fatal.
function wbMermaidParse(source) {
  const out = { dir: "TD", nodes: [], edges: [], subgraphs: [], skipped: 0 };
  const byId = new Map();
  const open = [];
  const node = (id, text = null, shape = null) => {
    let n = byId.get(id);
    if (!n) {
      n = { id, text: id, shape: "rect", group: null };
      byId.set(id, n);
      out.nodes.push(n);
    }
    if (n.group == null && open.length) n.group = open[open.length - 1];
    if (text != null) n.text = text;
    if (shape) n.shape = shape;
    return n;
  };
  //: One node reference: an id with an optional shape and text.
  const NODE = /^\s*([A-Za-z0-9_]\w*)\s*(\(\(([^)]*)\)\)|\(\[([^\]]*)\]\)|\[\[([^\]]*)\]\]|\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}|>([^\]]*)\])?/;
  const unquote = (t) => String(t ?? "").trim().replace(/^"(.*)"$/, "$1").trim();
  const takeNode = (text) => {
    const m = NODE.exec(text);
    if (!m) return null;
    let shape = null, words = null;
    if (m[3] != null) [shape, words] = ["circle", m[3]];
    else if (m[4] != null) [shape, words] = ["rect", m[4]];
    else if (m[5] != null) [shape, words] = ["rect", m[5]];
    else if (m[6] != null) [shape, words] = ["rect", m[6]];
    else if (m[7] != null) [shape, words] = ["rect", m[7]];
    else if (m[8] != null) [shape, words] = ["diamond", m[8]];
    else if (m[9] != null) [shape, words] = ["rect", m[9]];
    node(m[1], words == null ? null : unquote(words), shape);
    return { id: m[1], rest: text.slice(m[0].length) };
  };
  //: An edge between two references: the arrow, then an optional label in
  //: bars, or a label written inside the arrow (`-- yes -->`).
  const EDGE = /^\s*(?:(--|==|-\.)\s*([^-=.>|][^>]*?)\s*(-->|==>|\.->|---|-\.-)|(-->|---|==>|-\.->|-\.-|===|--o|--x))\s*(?:\|([^|]*)\|)?/;
  for (const raw of String(source || "").split(/\n|;/)) {
    const line = raw.replace(/%%.*$/, "").trim();
    if (!line) continue;
    const head = /^(graph|flowchart)\s*(TD|TB|BT|LR|RL)?\s*$/i.exec(line);
    if (head) {
      out.dir = (head[2] || "TD").toUpperCase().replace("TB", "TD");
      continue;
    }
    const sub = /^subgraph\s+(.+)$/.exec(line);
    if (sub) {
      const rest = sub[1].trim();
      const named = /^([A-Za-z0-9_][\w-]*)\s*\[\s*(.*?)\s*\]$/.exec(rest);
      const id = named ? named[1] : rest;
      const title = named ? unquote(named[2]) || id : unquote(rest);
      if (!out.subgraphs.some((g) => g.id === id)) out.subgraphs.push({ id, title, parent: open.length ? open[open.length - 1] : null });
      open.push(id);
      continue;
    }
    if (/^end$/.test(line) && open.length) {
      open.pop();
      continue;
    }
    if (/^(style|classDef|class|click|linkStyle|subgraph|end|direction)\b/.test(line)) {
      out.skipped += 1;
      continue;
    }
    let first = takeNode(line);
    if (!first) {
      out.skipped += 1;
      continue;
    }
    let rest = first.rest;
    while (rest.trim()) {
      const e = EDGE.exec(rest);
      if (!e) {
        out.skipped += 1;
        break;
      }
      const arrowText = e[3] || e[4] || "";
      const label = unquote(e[5] ?? e[2] ?? "");
      const next = takeNode(rest.slice(e[0].length));
      if (!next) {
        out.skipped += 1;
        break;
      }
      out.edges.push({ from: first.id, to: next.id, label, arrow: />|o$|x$/.test(arrowText), dashed: /\./.test(arrowText) });
      first = next;
      rest = next.rest;
    }
  }
  //: A subgraph named in an edge is the frame, not a node of its own.
  const groups = new Set(out.subgraphs.map((g) => g.id));
  out.nodes = out.nodes.filter((n) => !groups.has(n.id));
  return out;
}

//: Rows by depth from the nodes nothing points at (a cycle's entry is its
//: first node), in the order met; then each node's centre in board units,
//: top-down or left-right as the source said, the whole centred on 0. A
//: subgraph is laid out the same way inside itself and then takes its place
//: in its parent's rows as one block (its edges to the outside count as the
//: block's), so a frame never covers a node that is not in it. The returned
//: Map carries `frames`: `{id, title, depth, x, y, w, h}`, outermost first.
function wbMermaidLayout(graph, { w = 160, h = 70, gapX = 220, gapY = 140, pad = 30, head = 34 } = {}) {
  const across = graph.dir === "LR" || graph.dir === "RL";
  const flip = graph.dir === "BT" || graph.dir === "RL";
  const subs = graph.subgraphs || [];
  const sub = new Map(subs.map((g) => [g.id, g]));
  const groupOf = new Map();
  for (const n of graph.nodes) groupOf.set(n.id, sub.has(n.group) ? n.group : null);
  for (const g of subs) groupOf.set(g.id, sub.has(g.parent) && g.parent !== g.id ? g.parent : null);
  const order = new Map(graph.nodes.map((n, i) => [n.id, i]));
  const first = (id, seen = new Set()) => {
    if (order.has(id)) return order.get(id);
    if (seen.has(id)) return Infinity;
    seen.add(id);
    let best = Infinity;
    for (const [k, g] of groupOf) if (g === id) best = Math.min(best, first(k, seen));
    order.set(id, best);
    return best;
  };
  //: The unit at level `g` that holds `id`: itself, or its ancestor there.
  const unitAt = (id, g) => {
    let cur = id;
    for (let guard = 0; cur != null && guard < 64; guard += 1) {
      if (groupOf.get(cur) === g && groupOf.has(cur)) return cur;
      cur = groupOf.get(cur);
    }
    return null;
  };
  const sepAlong = across ? gapX - w : gapY - h;
  const sepCross = across ? gapY - h : gapX - w;
  const block = (g, depth) => {
    const units = [...groupOf.keys()].filter((id) => groupOf.get(id) === g).sort((a, b) => first(a) - first(b));
    const size = new Map(), inner = new Map();
    for (const u of units) {
      if (sub.has(u)) {
        const b = block(u, depth + 1);
        inner.set(u, b);
        size.set(u, { w: Math.max(b.w, w) + pad * 2, h: Math.max(b.h, 0) + pad * 2 + head });
      } else {
        size.set(u, { w, h });
      }
    }
    const incoming = new Map(units.map((u) => [u, 0]));
    const out = new Map(units.map((u) => [u, []]));
    for (const e of graph.edges) {
      const a = unitAt(e.from, g), b = unitAt(e.to, g);
      if (a == null || b == null || a === b || !incoming.has(a) || !incoming.has(b)) continue;
      incoming.set(b, incoming.get(b) + 1);
      out.get(a).push(b);
    }
    const level = new Map();
    const queue = units.filter((u) => !incoming.get(u));
    if (!queue.length && units.length) queue.push(units[0]);
    for (const u of queue) level.set(u, 0);
    while (queue.length) {
      const u = queue.shift();
      for (const next of out.get(u) || []) {
        if (level.has(next)) continue;
        level.set(next, level.get(u) + 1);
        queue.push(next);
      }
    }
    for (const u of units) if (!level.has(u)) level.set(u, 0);
    const rows = new Map();
    for (const u of units) {
      if (!rows.has(level.get(u))) rows.set(level.get(u), []);
      rows.get(level.get(u)).push(u);
    }
    const rowList = [...rows.keys()].sort((a, b) => a - b).map((k) => rows.get(k));
    if (flip) rowList.reverse();
    const along = (u) => (across ? size.get(u).w : size.get(u).h);
    const cross = (u) => (across ? size.get(u).h : size.get(u).w);
    const extent = (row) => row.reduce((t, u) => t + cross(u), 0) + sepCross * (row.length - 1);
    const crossMax = Math.max(0, ...rowList.map(extent));
    const centres = new Map();
    let a = 0;
    for (const row of rowList) {
      const thick = Math.max(...row.map(along));
      let c = (crossMax - extent(row)) / 2;
      for (const u of row) {
        const ca = a + thick / 2, cc = c + cross(u) / 2;
        centres.set(u, across ? { x: ca, y: cc } : { x: cc, y: ca });
        c += cross(u) + sepCross;
      }
      a += thick + sepAlong;
    }
    const total = Math.max(0, a - sepAlong);
    const res = { w: across ? total : crossMax, h: across ? crossMax : total, at: new Map(), frames: [] };
    for (const u of units) {
      const c = centres.get(u);
      if (!sub.has(u)) {
        res.at.set(u, c);
        continue;
      }
      const sz = size.get(u), b = inner.get(u);
      const fx = c.x - sz.w / 2, fy = c.y - sz.h / 2;
      res.frames.push({ id: u, title: sub.get(u).title, depth, x: fx, y: fy, w: sz.w, h: sz.h });
      const ox = fx + pad + (sz.w - pad * 2 - b.w) / 2, oy = fy + pad + head;
      for (const [id, p] of b.at) res.at.set(id, { x: p.x + ox, y: p.y + oy });
      for (const f of b.frames) res.frames.push({ ...f, x: f.x + ox, y: f.y + oy });
    }
    return res;
  };
  const top = block(null, 0);
  const at = new Map();
  for (const n of graph.nodes) {
    const p = top.at.get(n.id) || { x: 0, y: 0 };
    at.set(n.id, { x: p.x - top.w / 2, y: p.y - top.h / 2 });
  }
  at.frames = top.frames.map((f) => ({ ...f, x: f.x - top.w / 2, y: f.y - top.h / 2 })).sort((p, q) => p.depth - q.depth);
  return at;
}

//: A free board as Markdown: each frame (in presentation order) as a
//: heading over what lies in it in reading order, then what lies in none.
function wbBoardOutline(state, { frames, title = "Board", cardTitle = (node) => `Note ${node.entry_id}` } = {}) {
  const items = [];
  for (const node of state.nodes || []) items.push({ x: node.x || 0, y: node.y || 0, words: cardTitle(node) });
  for (const obj of state.objects || []) {
    if (obj.kind === "text" && obj.data?.content) items.push({ x: obj.x || 0, y: obj.y || 0, words: obj.data.content });
  }
  for (const sketch of state.sketches || []) {
    let data = null;
    try {
      data = JSON.parse(sketch.data);
    } catch {
      continue;
    }
    if (!data?.label || typeof data.d !== "string") continue;
    const nums = (data.d.match(/-?\d*\.?\d+/g) || []).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
    items.push({ x: Math.min(...xs), y: Math.min(...ys), words: data.label });
  }
  const inside = (item, f) => item.x >= f.x && item.x <= f.x + (f.width || 0) && item.y >= f.y && item.y <= f.y + (f.height || 0);
  const reading = (a, b) => a.y - b.y || a.x - b.x;
  const lines = [`# ${title}`, ""];
  const used = new Set();
  for (const f of frames || []) {
    lines.push(`## ${String(f.data?.content || "").trim() || "Frame"}`, "");
    const mine = items.filter((it) => !used.has(it) && inside(it, f)).sort(reading);
    for (const it of mine) {
      used.add(it);
      lines.push(`- ${String(it.words).replace(/\s*\n\s*/g, " ").trim()}`);
    }
    if (!mine.length) lines.push("(empty)");
    lines.push("");
  }
  const rest = items.filter((it) => !used.has(it)).sort(reading);
  if (rest.length) {
    if (frames?.length) lines.push("## Elsewhere on the board", "");
    for (const it of rest) lines.push(`- ${String(it.words).replace(/\s*\n\s*/g, " ").trim()}`);
    lines.push("");
  }
  return lines.join("\n");
}

//: The rows an exported SVG carries so it can come back in as a board.
function wbBoardSvgMetadata(rows) {
  const body = JSON.stringify({ app: "memorymap-board", v: 1, rows });
  return `<metadata id="memorymap-board">${body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</metadata>`;
}

//: The rows inside an SVG that carries them, or null.
function wbBoardRowsFromSvg(text) {
  //: Read with a pattern, not a DOMParser: parsing the picture in this
  //: document applies its `style` attributes against the app's CSP, which
  //: refuses each one with a console error (measured: six on one import).
  try {
    const m = /<metadata id="memorymap-board">([\s\S]*?)<\/metadata>/.exec(String(text || ""));
    const body = m ? m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : null;
    const parsed = body ? JSON.parse(body) : null;
    return parsed?.app === "memorymap-board" && Array.isArray(parsed.rows) ? parsed.rows : null;
  } catch {
    return null;
  }
}

//: The rows of what an export covers, links included, with their old ids so
//: an import can rejoin them.
function wbExportRows(scope) {
  const onlyKeys = scope === "selection" ? wbSelectedKeys() : null;
  const rows = [];
  for (const kind of ["object", "sketch"]) {
    for (const item of wbState[WB_LIST_BY_KIND[kind]] || []) {
      if (wbItemHidden(kind, item)) continue;
      if (kind === "object" && WB_MAP_KINDS.has(item.kind)) continue;
      let link = null;
      if (kind === "sketch") {
        try {
          link = String(JSON.parse(item.data)?.type || "").startsWith("link-") ? JSON.parse(item.data) : null;
        } catch {
          link = null;
        }
      }
      if (onlyKeys && !link && !onlyKeys.has(wbMultiKey(kind, item.id))) continue;
      rows.push({ kind, id: item.id, link: Boolean(link), payload: WB_KIND_INFO[kind].payload(item) });
    }
  }
  if (onlyKeys) {
    const kept = new Set(rows.filter((r) => !r.link).map((r) => `${r.kind}:${r.id}`));
    return rows.filter((r) => {
      if (!r.link) return true;
      const d = JSON.parse(r.payload.data);
      return kept.has(`${d.sourceKind || "node"}:${d.sourceId}`) && kept.has(`${d.targetKind || "node"}:${d.targetId}`);
    });
  }
  return rows;
}

//: Makes `rows` (from an SVG's metadata) on this board, centred at `at`,
//: connectors rejoined to the new ids; one undo step. Cards are left out: a
//: card is a note, and a file cannot carry the note.
async function wbImportBoardRows(rows, at = wbViewCentre()) {
  const shapes = rows.filter((r) => !r.link && (r.kind === "object" || r.kind === "sketch"));
  if (!shapes.length) {
    toast("That file has no shapes or text to bring in.");
    return 0;
  }
  const boxes = shapes.map((r) => (r.kind === "sketch" ? wbPathBBox(wbSketchParsedData({ data: r.payload.data })?.d || "") : { minX: r.payload.x, minY: r.payload.y, maxX: r.payload.x + (r.payload.width || 0), maxY: r.payload.y + (r.payload.height || 0) })).filter(Boolean);
  const minX = Math.min(...boxes.map((b) => b.minX)), minY = Math.min(...boxes.map((b) => b.minY));
  const maxX = Math.max(...boxes.map((b) => b.maxX)), maxY = Math.max(...boxes.map((b) => b.maxY));
  const dx = at[0] - (minX + maxX) / 2, dy = at[1] - (minY + maxY) / 2;
  const remap = new Map();
  let made = 0;
  await wbRecordGesture(async () => {
    for (const row of shapes) {
      const [created] = await wbCreateCopies([{ kind: row.kind, payload: { ...row.payload, group_id: null } }], dx, dy);
      if (!created) continue;
      remap.set(`${row.kind}:${row.id}`, created.id);
      made += 1;
    }
    for (const row of rows.filter((r) => r.link)) {
      const data = JSON.parse(row.payload.data);
      const s = remap.get(`${data.sourceKind || "node"}:${data.sourceId}`), t = remap.get(`${data.targetKind || "node"}:${data.targetId}`);
      if (s == null || t == null) continue;
      data.sourceId = s;
      data.targetId = t;
      if (Array.isArray(data.points)) data.points = data.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      const link = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify(data), x: 0, y: 0, z: 1, board_id: window.currentBoardId ?? null }) });
      wbState.sketches.push(link);
    }
  });
  renderWhiteboardNow();
  wbAnnounce(`Brought in ${made} item${made === 1 ? "" : "s"} from the file.`);
  return made;
}

//: A Mermaid flowchart onto this board: shapes and elbow connectors laid out
//: by depth, centred in the view, one undo step.
async function wbImportMermaid(source, at = wbViewCentre()) {
  const graph = wbMermaidParse(source);
  if (!graph.nodes.length) {
    toast("No flowchart found. Start with a line like: flowchart TD", true);
    return 0;
  }
  const place = wbMermaidLayout(graph);
  const ink = window.currentStrokeColor && /^#[0-9a-f]{6}$/i.test(window.currentStrokeColor) ? window.currentStrokeColor : "#335599";
  const ids = new Map();
  const frameIds = new Map();
  const w = 160, h = 70;
  await wbRecordGesture(async () => {
    //: Innermost first: `wbFrameZ` puts each new frame under everything,
    //: so the outer frame, made last, is under the inner one.
    for (const f of [...(place.frames || [])].reverse()) {
      const made = await wbCreateObject("frame", { content: f.title || "Frame" }, Math.round(at[0] + f.x), Math.round(at[1] + f.y), Math.round(f.w), Math.round(f.h), wbFrameZ());
      if (made) frameIds.set(f.id, made.id);
    }
    for (const n of graph.nodes) {
      const c = place.get(n.id);
      const x = at[0] + c.x - w / 2, y = at[1] + c.y - h / 2;
      const d = n.shape === "diamond"
        ? `M ${x + w / 2} ${y} L ${x + w} ${y + h / 2} L ${x + w / 2} ${y + h} L ${x} ${y + h / 2} Z`
        : n.shape === "circle"
          ? `M ${x} ${y + h / 2} A ${w / 2} ${h / 2} 0 1 0 ${x + w} ${y + h / 2} A ${w / 2} ${h / 2} 0 1 0 ${x} ${y + h / 2} Z`
          : `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
      const made = await apiJson("/whiteboard/sketches", {
        method: "POST",
        body: JSON.stringify({ data: JSON.stringify({ d, shape: n.shape === "diamond" ? "diamond" : n.shape === "circle" ? "circle" : "rect", color: ink, width: 2, label: n.text }), x: 0, y: 0, z: 2, board_id: window.currentBoardId ?? null }),
      });
      wbState.sketches.push(made);
      ids.set(n.id, made.id);
    }
    for (const e of graph.edges) {
      //: An end that names a subgraph joins its frame.
      const s = ids.get(e.from) ?? frameIds.get(e.from), t = ids.get(e.to) ?? frameIds.get(e.to);
      if (s == null || t == null || (s === t && ids.has(e.from) === ids.has(e.to))) continue;
      const sKind = ids.has(e.from) ? "sketch" : "object", tKind = ids.has(e.to) ? "sketch" : "object";
      const data = { type: "link-straight", route: "elbow", sourceId: s, sourceKind: sKind, targetId: t, targetKind: tKind, color: ink, width: 2 };
      if (e.arrow) data.endCap = "arrow";
      if (e.dashed) data.dash = "dashed";
      if (e.label) data.label = e.label;
      const link = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify(data), x: 0, y: 0, z: 1, board_id: window.currentBoardId ?? null }) });
      wbState.sketches.push(link);
    }
  });
  renderWhiteboardNow();
  const frames = frameIds.size ? ` in ${frameIds.size} frame${frameIds.size === 1 ? "" : "s"}` : "";
  const said = `Brought in ${graph.nodes.length} shapes${frames} and ${graph.edges.length} connectors${graph.skipped ? `; ${graph.skipped} line${graph.skipped === 1 ? "" : "s"} left out` : ""}.`;
  wbAnnounce(said);
  toast(said);
  return graph.nodes.length;
}

function wbCardTitleForExport(node) {
  const entry = (typeof allEntries !== "undefined" ? allEntries : []).find((e) => e.id === node.entry_id);
  return entry ? notePreviewText(entry.content || "").split("\n")[0].slice(0, 80) : `Note ${node.entry_id}`;
}

//: The innermost frame an item lies wholly inside, for the Mermaid export's
//: subgraphs (the same "wholly inside" a frame's drag uses).
function wbMermaidFrameOf(kind, item) {
  const box = wbItemBBox(kind, item);
  if (!box) return null;
  let best = null;
  for (const f of wbState.objects || []) {
    if (f.kind !== "frame" || wbItemHidden("object", f)) continue;
    if (box.minX < f.x || box.minY < f.y || box.maxX > f.x + f.width || box.maxY > f.y + f.height) continue;
    if (!best || f.width * f.height < best.width * best.height) best = f;
  }
  return best ? { id: best.id, title: wbFrameTitle(best) } : null;
}

async function wbExportMermaid() {
  const text = wbBoardToMermaid(wbState, wbCardTitleForExport, wbMermaidFrameOf);
  if (text.trim() === "flowchart TD") {
    toast("Nothing on this board is joined by a connector, so there is no flowchart to write.");
    return;
  }
  await saveFile(wbExportFileName("whole", "mmd"), new Blob([text], { type: "text/plain" }));
  toast("Board exported as a Mermaid flowchart.");
}

async function wbExportOutline() {
  const text = wbBoardOutline(wbState, { frames: wbFramesInOrder(), title: wbBoardTitleForExport(), cardTitle: wbCardTitleForExport });
  await saveFile(wbExportFileName("whole", "md"), new Blob([text], { type: "text/markdown" }));
  toast("Board exported as an outline.");
}

//: The Import dialog: paste a Mermaid flowchart, or choose a .mmd file or a
//: board SVG this app exported.
function wbOpenImportDialog() {
  const dialog = document.getElementById("wb-import-dialog");
  if (!dialog) return;
  const field = document.getElementById("wb-import-text");
  if (field) field.value = "";
  dialog.showModal();
  field?.focus();
}

async function wbImportText(text) {
  const rows = /<svg[\s>]/i.test(text) ? wbBoardRowsFromSvg(text) : null;
  if (/<svg[\s>]/i.test(text) && !rows) {
    toast("That SVG was not exported from a board here, so it has no board inside it. Insert it as a picture instead.", true);
    return 0;
  }
  return rows ? wbImportBoardRows(rows) : wbImportMermaid(text);
}

onDomReady(() => {
  const dialog = document.getElementById("wb-import-dialog");
  if (!dialog) return;
  const file = document.getElementById("wb-import-file");
  document.getElementById("wb-import-choose")?.addEventListener("click", () => file?.click());
  file?.addEventListener("change", async () => {
    const chosen = file.files?.[0];
    file.value = "";
    if (!chosen) return;
    const text = await chosen.text();
    dialog.close();
    await wbImportText(text);
  });
  document.getElementById("wb-import-go")?.addEventListener("click", async () => {
    const text = document.getElementById("wb-import-text")?.value || "";
    if (!text.trim()) {
      toast("Paste a Mermaid flowchart first, or choose a file.");
      return;
    }
    dialog.close();
    await wbImportText(text);
  });
});
