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
function wbBoardToMermaid(state, cardTitle = (node) => `Note ${node.entry_id}`) {
  const ids = new Map();
  const lines = ["flowchart TD"];
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
    lines.push(`  ${id}${open}"${wbMermaidText(words)}"${close}`);
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
    lines.push(`  ${a} ${arrow}${label} ${b}`);
  }
  return lines.join("\n") + "\n";
}

//: The `graph`/`flowchart` subset, to `{ dir, nodes: [{id, text, shape}],
//: edges: [{from, to, label, arrow}] }`. Unknown lines (style, classDef,
//: click, subgraph and end) are skipped and counted, never fatal.
function wbMermaidParse(source) {
  const out = { dir: "TD", nodes: [], edges: [], skipped: 0 };
  const byId = new Map();
  const node = (id, text = null, shape = null) => {
    let n = byId.get(id);
    if (!n) {
      n = { id, text: id, shape: "rect" };
      byId.set(id, n);
      out.nodes.push(n);
    }
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
  return out;
}

//: Rows by depth from the nodes nothing points at (a cycle's entry is its
//: first node), columns in the order met; then each node's centre in board
//: units, top-down or left-right as the source said.
function wbMermaidLayout(graph, { gapX = 220, gapY = 140 } = {}) {
  const incoming = new Map(graph.nodes.map((n) => [n.id, 0]));
  const out = new Map(graph.nodes.map((n) => [n.id, []]));
  for (const e of graph.edges) {
    if (e.from === e.to) continue;
    incoming.set(e.to, (incoming.get(e.to) || 0) + 1);
    out.get(e.from)?.push(e.to);
  }
  const depth = new Map();
  const queue = graph.nodes.filter((n) => !incoming.get(n.id)).map((n) => n.id);
  if (!queue.length && graph.nodes.length) queue.push(graph.nodes[0].id);
  for (const id of queue) depth.set(id, 0);
  while (queue.length) {
    const id = queue.shift();
    for (const next of out.get(id) || []) {
      if (depth.has(next)) continue;
      depth.set(next, depth.get(id) + 1);
      queue.push(next);
    }
  }
  for (const n of graph.nodes) if (!depth.has(n.id)) depth.set(n.id, 0);
  const rows = new Map();
  for (const n of graph.nodes) {
    const d = depth.get(n.id);
    if (!rows.has(d)) rows.set(d, []);
    rows.get(d).push(n.id);
  }
  const at = new Map();
  const across = graph.dir === "LR" || graph.dir === "RL";
  const flip = graph.dir === "BT" || graph.dir === "RL";
  for (const [d, ids] of rows) {
    ids.forEach((id, i) => {
      const along = (flip ? -1 : 1) * d * (across ? gapX : gapY);
      const side = (i - (ids.length - 1) / 2) * (across ? gapY : gapX);
      at.set(id, across ? { x: along, y: side } : { x: side, y: along });
    });
  }
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
  const w = 160, h = 70;
  await wbRecordGesture(async () => {
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
      const s = ids.get(e.from), t = ids.get(e.to);
      if (s == null || t == null || s === t) continue;
      const data = { type: "link-straight", route: "elbow", sourceId: s, sourceKind: "sketch", targetId: t, targetKind: "sketch", color: ink, width: 2 };
      if (e.arrow) data.endCap = "arrow";
      if (e.dashed) data.dash = "dashed";
      if (e.label) data.label = e.label;
      const link = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify(data), x: 0, y: 0, z: 1, board_id: window.currentBoardId ?? null }) });
      wbState.sketches.push(link);
    }
  });
  renderWhiteboardNow();
  const said = `Brought in ${graph.nodes.length} shapes and ${graph.edges.length} connectors${graph.skipped ? `; ${graph.skipped} line${graph.skipped === 1 ? "" : "s"} left out` : ""}.`;
  wbAnnounce(said);
  toast(said);
  return graph.nodes.length;
}

function wbCardTitleForExport(node) {
  const entry = (typeof allEntries !== "undefined" ? allEntries : []).find((e) => e.id === node.entry_id);
  return entry ? notePreviewText(entry.content || "").split("\n")[0].slice(0, 80) : `Note ${node.entry_id}`;
}

async function wbExportMermaid() {
  const text = wbBoardToMermaid(wbState, wbCardTitleForExport);
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
