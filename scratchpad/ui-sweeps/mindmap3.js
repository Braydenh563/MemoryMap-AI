// Mindmap Phase 3 verification (MINDMAP_PLAN.md §5 items 11, 12, 13, 17).
//
// A sibling of mindmap.js rather than more of it: that script owns Phase 2
// (drawing, keys, tidy, collapse, the Library card) and is the regression net
// for it — 35 assertions that must keep passing untouched. This one owns
// Phase 3, which is the map's life *outside* the canvas: a reference node
// placed by hand, an OPML import, the chip and preview on the dashboard,
// timeline, chat and note bodies, and the map in the graph.
//
//   BASE=http://127.0.0.1:8797 SCRATCH=/tmp/mm-map3 \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mindmap3.js
//
// THEME=dark sweeps the other theme; VIEWPORT=390x844 the narrow one (§10.4
// named both as reasoned-but-never-observed).
const { boot } = require("./lib.js");

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

const VIEWPORT = (() => {
  const raw = process.env.VIEWPORT;
  if (!raw) return { width: 1440, height: 900 };
  const [w, h] = raw.split("x").map(Number);
  return { width: w || 1440, height: h || 900 };
})();

(async () => {
  const { browser, page, OUT } = await boot({ viewport: VIEWPORT });
  const narrow = VIEWPORT.width < 700;

  // A note to point a reference node at, made through the API the app itself
  // uses — the point of this sweep is the map UI, not the capture box.
  const noteTitle = `Reference target ${Date.now() % 100000}`;
  const noteId = await page.evaluate(
    (title) =>
      window
        .apiJson("/entries", {
          method: "POST",
          body: JSON.stringify({ content: `# ${title}\n\nSomething to point at.` }),
        })
        .then((e) => e.id),
    noteTitle
  );
  check("a note exists to point at", Boolean(noteId), `entry ${noteId}`);
  await page.evaluate(() => window.loadEntries && window.loadEntries());
  await page.waitForTimeout(1200);

  // --- onto Boards & maps ---------------------------------------------------
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(600);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(900);

  // ==========================================================================
  // Item 2 — import UI (§5 item 17)
  // ==========================================================================
  const OPML = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0"><head><title>Imported outline</title></head><body>
  <outline text="Roots"><outline text="Alpha"/><outline text="Beta"><outline text="Beta one"/></outline></outline>
  <outline text="Second root"/>
</body></opml>`;
  const importBtn = await page.$("#wb-boards-import");
  check("the boards landing offers an import action", Boolean(importBtn));
  if (importBtn) {
    await importBtn.click();
    await page.waitForTimeout(500);
    // The file input is the app's own hidden-input pattern, so the file is
    // handed to it directly rather than through a native chooser Playwright
    // cannot drive.
    await page.setInputFiles("#wb-import-map-file", {
      name: "outline.opml",
      mimeType: "text/x-opml",
      buffer: Buffer.from(OPML, "utf8"),
    });
    await page.waitForTimeout(3000);
  }
  const imported = await page.evaluate(() =>
    window.apiJson("/whiteboard/boards").then((rows) => {
      const map = rows.find((b) => b.title === "Imported outline");
      return map ? { id: map.id, type: map.type, objects: map.object_count, edges: (map.preview_edges || []).length } : null;
    })
  );
  // Five outlines in the file: Roots, Alpha, Beta, Beta one, Second root.
  check(
    "an OPML import produces a map with one node per outline",
    imported && imported.type === "map" && imported.objects === 5,
    JSON.stringify(imported)
  );
  check(
    "the imported map's preview carries its tree edges",
    imported && imported.edges >= 3,
    imported ? `${imported.edges} edges` : "no map"
  );

  // The other format, through the same control — the extension is the only
  // thing that picks it, so this is the branch that is not shared.
  await page.click("#wb-back-to-boards");
  await page.waitForTimeout(1600);
  await page.click("#wb-boards-import");
  await page.waitForTimeout(400);
  await page.setInputFiles("#wb-import-map-file", {
    name: "outline.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Markdown outline\n\n- One\n  - One a\n- Two\n", "utf8"),
  });
  await page.waitForTimeout(3000);
  const mdImport = await page.evaluate(() =>
    window.apiJson("/whiteboard/boards").then((rows) => {
      const map = rows.find((b) => b.title === "Markdown outline");
      return map ? { type: map.type, objects: map.object_count } : null;
    })
  );
  check(
    "a Markdown outline imports through the same control",
    mdImport && mdImport.type === "map" && mdImport.objects === 3,
    JSON.stringify(mdImport)
  );

  // ==========================================================================
  // Item 1 — a reference node placed by hand (§5 item 11)
  // ==========================================================================
  // An import opens the map it just made, so this is back on the canvas.
  const onCanvas = await page.evaluate(
    () => !document.getElementById("wb-canvas-view")?.classList.contains("hidden")
  );
  check("an import opens the map it just created", onCanvas);
  await page.click("#wb-back-to-boards");
  await page.waitForTimeout(1600);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", "Phase 3 map");
  await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.waitForTimeout(150);
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  const boardId = await page.evaluate(() => window.currentBoardId);
  check("a map is open to build on", Boolean(boardId), `board ${boardId}`);
  // A one-node map sits at the canvas origin, which is under the top bar —
  // so every pointer gesture below would be intercepted by it. Same fit call
  // mindmap.js makes before it measures layouts.
  await page.evaluate(() => window.wbZoomToFit && window.wbZoomToFit({ animate: false }));
  await page.waitForTimeout(800);

  // The root is selected on creation, so its hover controls are already live.
  const refButton = await page.$(".wb-map-node .wb-map-ref");
  check("a map node offers a 'from the library' control beside +", Boolean(refButton));
  // Both controls are in one row, so they cannot overlap — measured, because
  // two hand-placed buttons off one corner is how this file's own count badge
  // collided with the chevron twice.
  const controlGap = await page.evaluate(() => {
    const add = document.querySelector(".wb-map-node .wb-map-add");
    const ref = document.querySelector(".wb-map-node .wb-map-ref");
    if (!add || !ref) return null;
    const a = add.getBoundingClientRect();
    const b = ref.getBoundingClientRect();
    const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return { overlapX: Math.round(overlapX), overlapY: Math.round(overlapY), aw: Math.round(a.width), bw: Math.round(b.width) };
  });
  check(
    "the + and library buttons do not overlap",
    controlGap && !(controlGap.overlapX > 0 && controlGap.overlapY > 0),
    JSON.stringify(controlGap)
  );

  if (refButton) {
    // Hover the node first: the row is `opacity: 0; pointer-events: none`
    // until the node is hovered or selected, so a forced click at those
    // coordinates lands on whatever is *under* it — which is what a first run
    // of this sweep did, silently, with no error anywhere.
    await page.hover(".wb-map-node");
    await page.waitForTimeout(300);
    await refButton.click();
    await page.waitForTimeout(1200);
  }
  const pickerUp = await page.$(".confirm-overlay .entry-pick-list");
  check("the library picker opens", Boolean(pickerUp));
  const pickerTabs = await page.evaluate(() =>
    [...document.querySelectorAll(".confirm-overlay .seg [data-pick-kind]")].map((b) => b.dataset.pickKind)
  );
  check(
    "the picker offers all four reference kinds",
    pickerTabs.join(",") === "note,document,file,link",
    pickerTabs.join(",")
  );
  //: **The row geometry, reported against this dialog**: "the list rows
  //: overflow their width (long titles run past the row edges, icons drift
  //: off-centre, rows are centred text instead of left-aligned)". All three
  //: were one cause, the row is a `<button>`, so the generic button rule
  //: centred it, and `text-overflow` on a flex container does nothing to a
  //: flex item that will not shrink. Measured before the fix: 63px of title
  //: past the row's own edge.
  const pickRows = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".confirm-overlay .entry-pick-row")];
    if (!rows.length) return null;
    return rows.map((r) => {
      const rr = r.getBoundingClientRect();
      const label = r.querySelector(".ph-text");
      const icon = r.querySelector(".ph-lead");
      const lr = label && label.getBoundingClientRect();
      const ir = icon && icon.getBoundingClientRect();
      const s = getComputedStyle(r);
      return {
        justify: s.justifyContent,
        shadow: s.boxShadow,
        h: Math.round(rr.height),
        rowOverflow: r.scrollWidth - r.clientWidth,
        labelInside: lr ? Math.round(rr.right - lr.right) : null,
        labelLeft: lr ? Math.round(lr.left - rr.left) : null,
        iconLeft: ir ? Math.round(ir.left - rr.left) : null,
        ellipsis: label ? getComputedStyle(label).textOverflow : null,
      };
    });
  });
  check("(D) every picker row is left-aligned and none overflows its width",
    Boolean(pickRows) && pickRows.every((r) => r.justify === "flex-start" && r.rowOverflow === 0),
    JSON.stringify(pickRows && pickRows[0]));
  check("(D) the title ellipsises inside the row instead of running past it",
    Boolean(pickRows) && pickRows.every((r) => r.ellipsis === "ellipsis" && r.labelInside >= 0),
    JSON.stringify(pickRows && pickRows.map((r) => r.labelInside)));
  check("(D) the icon column is fixed, so every title starts at the same x",
    Boolean(pickRows) && new Set(pickRows.map((r) => r.labelLeft)).size === 1
      && new Set(pickRows.map((r) => r.iconLeft)).size === 1,
    JSON.stringify(pickRows && pickRows.map((r) => [r.iconLeft, r.labelLeft])));
  check("(D) row height is consistent and no row carries the button glow",
    Boolean(pickRows) && new Set(pickRows.map((r) => r.h)).size === 1
      && pickRows.every((r) => r.shadow === "none"),
    JSON.stringify(pickRows && [pickRows[0].h, pickRows[0].shadow]));
  const pickBox = await page.evaluate(() => {
    const card = document.querySelector(".confirm-overlay .entry-pick-card");
    const list = document.querySelector(".confirm-overlay .entry-pick-list");
    const cr = card.getBoundingClientRect();
    return {
      onModalRecipe: card.classList.contains("modal-card") && card.classList.contains("confirm-card"),
      fitsViewport: cr.top >= 0 && cr.bottom <= window.innerHeight,
      listScrolls: getComputedStyle(list).overflowY,
      listContains: getComputedStyle(list).overscrollBehavior,
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
    };
  });
  check("(D) the dialog is on the app's modal recipe and the scroll is in the list",
    pickBox.onModalRecipe && pickBox.fitsViewport && pickBox.listScrolls === "auto"
      && pickBox.listContains === "contain" && pickBox.bodyOverflow === 0,
    JSON.stringify(pickBox));

  await page.fill(".confirm-overlay input[type=search]", noteTitle.slice(0, 18));
  await page.waitForTimeout(700);
  const rowCount = await page.$$eval(".confirm-overlay .entry-pick-row", (r) => r.length);
  check("the picker narrows as you type", rowCount >= 1, `${rowCount} row(s)`);
  await page.click(".confirm-overlay .entry-pick-row");
  await page.waitForTimeout(3000);

  const refNode = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll(".wb-object.wb-map-node")];
    const ref = nodes.find((el) => el.querySelector(".wb-map-node-icon"));
    if (!ref) return null;
    return {
      text: ref.querySelector(".wb-map-text")?.textContent.trim() || "",
      icon: ref.querySelector(".wb-map-node-icon")?.className || "",
      count: nodes.length,
    };
  });
  check(
    "the reference node shows the note's own title",
    refNode && refNode.text === noteTitle,
    JSON.stringify(refNode)
  );
  check(
    "the reference node draws its kind icon",
    refNode && /ph-note\b/.test(refNode.icon),
    refNode ? refNode.icon : "no node"
  );
  const stored = await page.evaluate(
    (id) =>
      window.apiJson(`/whiteboard/boards/${id}/tree`).then((tree) => {
        const flat = [];
        const walk = (ns) => ns.forEach((n) => { flat.push(n); walk(n.children || []); });
        walk(tree.roots || []);
        const ref = flat.find((n) => n.kind !== "topic");
        return ref ? { kind: ref.kind, ref_id: ref.ref_id, text: ref.text } : null;
      }),
    boardId
  );
  check(
    "the node is stored as kind+ref_id, with the label resolved server-side",
    stored && stored.kind === "note" && stored.ref_id === noteId && stored.text === noteTitle,
    JSON.stringify(stored)
  );

  // The context menu is the discoverable half of the same gesture.
  const ctxItems = await page.evaluate(() => {
    const node = document.querySelector(".wb-object.wb-map-node");
    if (!node) return [];
    node.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 300, clientY: 300 }));
    return [...document.querySelectorAll(".wb-ctx-menu .menu-item")].map((b) => b.textContent.trim());
  });
  check(
    "a map node's context menu offers both ways to add a child",
    ctxItems.includes("Add a child topic") && ctxItems.includes("Add from the library…"),
    ctxItems.join(" | ")
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // A dark-theme / narrow-viewport reading of the node itself (§10.4).
  const nodePaint = await page.evaluate(() => {
    const node = document.querySelector(".wb-object.wb-map-node");
    if (!node) return null;
    const text = node.querySelector(".wb-map-text");
    const cs = getComputedStyle(node);
    const ts = getComputedStyle(text);
    const r = node.getBoundingClientRect();
    return {
      fill: cs.backgroundColor,
      colour: ts.color,
      branch: cs.getPropertyValue("--wb-branch").trim(),
      width: Math.round(r.width),
      clipped: text.scrollHeight - text.clientHeight,
    };
  });
  check(
    "a map node's text is not clipped by its box",
    nodePaint && nodePaint.clipped <= 0,
    nodePaint ? `scrollHeight-clientHeight = ${nodePaint.clipped}px, node ${nodePaint.width}px wide` : "no node"
  );
  console.log("NODEPAINT " + JSON.stringify(nodePaint));
  await page.screenshot({ path: `${OUT}/mindmap3-node-${process.env.THEME || "light"}-${VIEWPORT.width}.png` });

  // ==========================================================================
  // Item 3 — one mapChip() and one mapPreview(), used everywhere
  // ==========================================================================
  const shared = await page.evaluate(() => ({
    chip: typeof window.mapChip === "function",
    preview: typeof window.mapPreview === "function",
  }));
  check("mapChip() and mapPreview() are one shared pair", shared.chip && shared.preview, JSON.stringify(shared));

  const previewShape = await page.evaluate((id) =>
    window.apiJson("/whiteboard/boards").then((rows) => {
      const board = rows.find((b) => b.id === id);
      const svg = window.mapPreview(board, { size: "card" });
      if (!svg) return null;
      return {
        edges: svg.querySelectorAll(".board-minimap-edge").length,
        blocks: svg.querySelectorAll("rect").length,
        cls: svg.getAttribute("class"),
        inlineStyle: svg.querySelector("[style]") ? "yes" : "no",
      };
    }),
    boardId
  );
  check(
    "mapPreview draws the tree — edges under blocks, no inline style (CSP)",
    previewShape && previewShape.edges >= 1 && previewShape.blocks >= 2 && previewShape.inlineStyle === "no",
    JSON.stringify(previewShape)
  );

  // --- the Library card (the drawing this was factored out of) --------------
  await page.click("#wb-back-to-boards");
  await page.waitForTimeout(1800);
  const libraryCard = await page.evaluate(() => {
    const card = [...document.querySelectorAll(".library-board-card")].find(
      (c) => c.querySelector(".library-card-title")?.textContent === "Phase 3 map"
    );
    if (!card) return null;
    const svg = card.querySelector("svg.board-minimap");
    return svg
      ? { edges: svg.querySelectorAll(".board-minimap-edge").length, dots: svg.querySelectorAll("rect").length }
      : null;
  });
  check(
    "the Library card still draws the map through the shared preview",
    libraryCard && libraryCard.edges >= 1,
    JSON.stringify(libraryCard)
  );

  // --- the dashboard widget -------------------------------------------------
  await page.click('[data-tab="dashboard"]');
  await page.waitForTimeout(2500);
  const dash = await page.evaluate(() => {
    const card = document.querySelector('[data-widget="boards"]');
    if (!card) return { widget: false };
    const chips = [...card.querySelectorAll(".map-chip")];
    const svgs = [...card.querySelectorAll("svg.board-minimap")];
    return {
      widget: true,
      chips: chips.length,
      chipText: chips[0] ? chips[0].textContent.trim() : "",
      previews: svgs.length,
      edges: svgs.reduce((n, s) => n + s.querySelectorAll(".board-minimap-edge").length, 0),
    };
  });
  check(
    "the dashboard boards widget draws map chips with tree previews",
    dash.widget && dash.chips >= 1 && dash.edges >= 1,
    JSON.stringify(dash)
  );

  // --- the timeline ---------------------------------------------------------
  await page.click('[data-tab="timeline"]');
  await page.waitForTimeout(3000);
  const timeline = await page.evaluate(() => {
    const chips = [...document.querySelectorAll("#timeline-grid .timeline-dot .map-chip")];
    return {
      chips: chips.length,
      first: chips[0] ? chips[0].textContent.trim() : "",
      // A chip inside a <button> dot must not itself be a button: nested
      // interactive controls are invalid HTML that browsers silently reflow.
      nested: chips.filter((c) => c.tagName === "BUTTON").length,
      dots: document.querySelectorAll("#timeline-grid .timeline-dot").length,
    };
  });
  check(
    "a map on the timeline reads as a map chip, not as a note",
    timeline.chips >= 1 && timeline.nested === 0,
    JSON.stringify(timeline)
  );

  // --- a note body ----------------------------------------------------------
  const bodyNoteId = await page.evaluate(
    () =>
      window
        .apiJson("/entries", {
          method: "POST",
          body: JSON.stringify({ content: "Planning notes\n\nSee [[# Phase 3 map]] for the shape." }),
        })
        .then((e) => e.id)
  );
  await page.click('[data-tab="notes"]');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.loadEntries && window.loadEntries());
  await page.waitForTimeout(2500);
  const inNote = await page.evaluate((id) => {
    // The note list's cards are `<li data-id>` (entryItem, app.js) — scoped to
    // the card, never to `document`, because a fallback to the whole page
    // finds the dashboard's own chips and reports a pass for the wrong reason
    // (it did, on the first run of this sweep).
    const card = document.querySelector(`#entry-list li[data-id="${id}"]`);
    if (!card) return { card: false };
    const chip = card.querySelector(".map-chip");
    return chip
      ? { card: true, text: chip.textContent.trim(), tag: chip.tagName, wiki: card.querySelectorAll(".wiki-link").length }
      : { card: true, chip: false, html: card.querySelector(".entry-content")?.textContent.slice(0, 120) };
  }, bodyNoteId);
  check(
    "a [[map]] reference in a note body renders as a map chip",
    inNote && inNote.card && /Phase 3 map/.test(inNote.text || "") && inNote.tag === "BUTTON",
    JSON.stringify(inNote)
  );

  // --- the chat transcript --------------------------------------------------
  const chatChip = await page.evaluate(
    (id) => {
      const row = window.toolTouchedRow([
        { kind: "map", id, label: "Phase 3 map" },
      ]);
      if (!row) return null;
      const chip = row.querySelector(".tool-touched-chip");
      return chip ? { text: chip.textContent.trim(), icon: chip.querySelector("i")?.className || "" } : null;
    },
    boardId
  );
  check(
    "a map a tool touched renders as a chip in the transcript",
    chatChip && /Phase 3 map/.test(chatChip.text) && /tree-structure/.test(chatChip.icon),
    JSON.stringify(chatChip)
  );

  // ==========================================================================
  // Item 5 — the map in the graph (§5 item 13)
  // ==========================================================================
  const graphData = await page.evaluate(
    ({ board, note }) =>
      window.apiJson("/graph?include_maps=true").then((data) => {
        const mapNode = (data.nodes || []).find((n) => n.id === board);
        const edge = (data.edges || []).find(
          (e) => e.kind === "map" && e.source === board && e.target === note
        );
        return {
          node: mapNode ? { type: mapNode.type, preview: mapNode.preview } : null,
          edge: Boolean(edge),
          mapEdges: (data.edges || []).filter((e) => e.kind === "map").length,
        };
      }),
    { board: boardId, note: noteId }
  );
  check(
    "the map is a node in the graph, marked as a map",
    graphData.node && graphData.node.type === "map",
    JSON.stringify(graphData.node)
  );
  check(
    "its note-node is an edge from the map to that note",
    graphData.edge,
    `${graphData.mapEdges} map edge(s)`
  );
  const graphOff = await page.evaluate(() =>
    window.apiJson("/graph").then((d) => (d.edges || []).filter((e) => e.kind === "map").length)
  );
  check("map edges are opt-in, like documents and entities", graphOff === 0, `${graphOff} without the flag`);

  // ==========================================================================
  // Item 4 — attaching a map to a chat message (§5 item 11)
  // ==========================================================================
  await page.click('[data-tab="chat"]');
  await page.waitForTimeout(1200);
  await page.click("#attach-note");
  await page.waitForTimeout(600);
  const mapsTab = await page.$('#note-picker-sources [data-picker-source="maps"]');
  check("the composer's attach picker offers Maps", Boolean(mapsTab));
  if (mapsTab) {
    await mapsTab.click();
    await page.waitForTimeout(1200);
    const rows = await page.$$eval("#note-picker-list li", (li) => li.length);
    check("the Maps source lists the notebook's maps", rows >= 1, `${rows} row(s)`);
    await page.click("#note-picker-list li input[type=checkbox], #note-picker-list li button");
    await page.waitForTimeout(700);
  }
  await page.click("#note-picker-done").catch(() => {});
  await page.waitForTimeout(600);
  const staged = await page.evaluate(() => {
    const box = document.getElementById("chat-board-attachments");
    if (!box) return null;
    return {
      hidden: box.classList.contains("hidden"),
      chips: box.querySelectorAll(".attachment-chip").length,
      text: box.textContent.trim(),
    };
  });
  check(
    "an attached map shows as a removable chip on the composer",
    staged && !staged.hidden && staged.chips === 1,
    JSON.stringify(staged)
  );
  //: `attachedBoards` is a top-level `let`, which is *not* on `window` (only
  //: `var` is) — the first version of this check read `window.attachedBoards`,
  //: got `undefined`, and reported a failure about the composer rather than
  //: about itself. The staged state is read through the UI instead, which is
  //: what a person can see anyway: the picker's own count line, and whether
  //: the chip's ✕ takes it back off.
  const countLine = await page.evaluate(() => {
    const el = document.getElementById("note-picker-count");
    return el ? el.textContent.trim() : null;
  });
  check(
    "the picker's count line says a map is attached",
    /1 mind map/.test(countLine || ""),
    String(countLine)
  );
  await page.click("#chat-board-attachments .attachment-remove");
  await page.waitForTimeout(500);
  const afterRemove = await page.evaluate(() => {
    const box = document.getElementById("chat-board-attachments");
    return { chips: box.querySelectorAll(".attachment-chip").length, hidden: box.classList.contains("hidden") };
  });
  check(
    "removing the chip un-stages the map",
    afterRemove.chips === 0 && afterRemove.hidden,
    JSON.stringify(afterRemove)
  );

  await page.screenshot({ path: `${OUT}/mindmap3-chat-${process.env.THEME || "light"}-${VIEWPORT.width}.png` });

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} checks passed.`);
  console.log("shots in " + OUT);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((error) => {
  console.error("SWEEP CRASHED", error);
  process.exit(2);
});
