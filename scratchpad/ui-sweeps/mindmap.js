// Mindmap frontend verification (MINDMAP_PLAN.md §5 Phase 2 + §5 item 10).
//
// Drives a real Chromium against the running app: creates a map through the
// board dialog, builds five nodes with Tab/Enter and no mouse, tidies,
// collapses a branch, and asserts what the DOM and the API actually say —
// rather than looking at a screenshot and calling it good, which CLAUDE.md
// records costing six rounds on one popup.
//
//   BASE=http://127.0.0.1:8793 SCRATCH=/tmp/mm-shots \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mindmap.js
const { boot } = require("./lib.js");

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

(async () => {
  const { browser, page, OUT } = await boot();

  // --- get onto the Boards & maps sub-tab -----------------------------------
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(600);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(800);

  // --- create a map through the real dialog (item 2) -------------------------
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  const seg = await page.$(".confirm-overlay .seg");
  check("the New board dialog carries a type segmented control", Boolean(seg));
  await page.fill(".confirm-overlay input[type=text]", "Verification map");
  // Choose "Mind map".
  await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.waitForTimeout(150);
  const segActive = await page.$eval(
    '.confirm-overlay .seg button[data-value="map"]',
    (b) => b.classList.contains("active")
  );
  check("choosing Mind map marks that segment active", segActive);
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);

  const boardId = await page.evaluate(() => window.currentBoardId);
  check("a board id is open after creating the map", Boolean(boardId), `board ${boardId}`);

  //: **A map is not a note.** Reported: "I made a mindmap naming it test and I
  //: think it came up as a new note??" — it did, on every surface built on
  //: `GET /entries`, which had no board filter at all. Asserted at the
  //: endpoint *and* in the rendered list, because the two failed together and
  //: either one alone would let the other come back.
  const notNote = await page.evaluate(async (id) => {
    const rows = await window.apiJson("/entries?limit=500");
    const boards = await window.apiJson("/entries?boards=only&limit=500");
    return {
      inNotes: rows.some((e) => e.id === id),
      anyBoardInNotes: rows.some((e) => e.is_board),
      inBoardsOnly: boards.some((e) => e.id === id),
    };
  }, boardId);
  check("(C) the new map is not in the notes list, and neither is any board",
    !notNote.inNotes && !notNote.anyBoardInNotes, JSON.stringify(notNote));
  check("(C) ?boards=only still hands the map back, for the pickers that need it",
    notNote.inBoardsOnly, JSON.stringify(notNote));

  const chipVisible = await page.evaluate(() => {
    const c = document.getElementById("wb-map-chip");
    return Boolean(c && !c.hidden && c.getBoundingClientRect().width > 0);
  });
  check("the Map chip shows in the board top bar", chipVisible);
  const layoutValue = await page.evaluate(() => {
    const s = document.getElementById("wb-map-layout");
    return s && !s.hidden ? s.value : null;
  });
  check("the layout picker shows and reads tree-right", layoutValue === "tree-right", String(layoutValue));

  // --- the root topic is DRAWN (item 1, the blocker) ------------------------
  const rootDrawn = await page.evaluate(() =>
    document.querySelectorAll(".wb-object.wb-map-node").length
  );
  check("the root topic renders as a map node", rootDrawn === 1, `${rootDrawn} node(s)`);
  const rootText = await page.evaluate(() => {
    const el = document.querySelector(".wb-map-node .wb-map-text");
    return el ? el.textContent.trim() : null;
  });
  check("the root node shows its text", rootText === "Verification map", String(rootText));

  // --- five nodes with Tab/Enter and no mouse (item 3) ----------------------
  // The root is already selected by createNewBoard, so the keyboard is live.
  // Tab, Enter, Tab builds a root + 4 = five topics without a click.
  await page.evaluate(() => document.getElementById("whiteboard-container")?.focus());
  const press = async (key) => {
    await page.keyboard.press(key);
    await page.waitForTimeout(1100);
    // A new node opens in edit mode; blur it so the next key is a gesture and
    // not text (which is exactly what the editor's own stopPropagation does).
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.waitForTimeout(250);
  };
  await press("Tab");    // child of root
  await press("Enter");  // sibling of that child
  await press("Tab");    // child of the sibling
  await press("Enter");  // sibling of that child

  // Through the app's own `apiJson`, not a bare fetch: the notebook is behind
  // the lock, and a hand-rolled header gets the token's storage key wrong
  // (it is "token") and 401s while the UI beside it works perfectly.
  const tree = await page.evaluate(
    (id) => window.apiJson(`/whiteboard/boards/${id}/tree`),
    boardId
  );
  const countTopics = (nodes) =>
    (nodes || []).reduce((n, x) => n + (x.kind === "topic" ? 1 : 0) + countTopics(x.children), 0);
  const topics = countTopics(tree.roots);
  check("(a) five topic nodes are in GET /tree", topics === 5, `${topics} topics`);

  const depth = (nodes, d = 1) =>
    (nodes || []).reduce((m, x) => Math.max(m, depth(x.children, d + 1), d), 0);
  check("the keyboard built a real tree, not a flat list", depth(tree.roots) >= 3,
    `depth ${depth(tree.roots)}`);

  // --- Tidy, then no two node boxes overlap (item 4) ------------------------
  await page.click("#wb-map-tidy");
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.wbZoomToFit && window.wbZoomToFit({ animate: false }));
  await page.waitForTimeout(600);

  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll(".wb-object.wb-map-node")].map((el) => {
      const r = el.getBoundingClientRect();
      return { id: el.dataset.id, x: r.x, y: r.y, w: r.width, h: r.height };
    })
  );
  let overlaps = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i], b = boxes[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 1 && oy > 1) overlaps.push(`${a.id}×${b.id} (${Math.round(ox)}×${Math.round(oy)}px)`);
    }
  }
  check("(b) no two node boxes overlap after Tidy", overlaps.length === 0,
    `${boxes.length} nodes, ${overlaps.length} overlaps ${overlaps.join(", ")}`);

  // Is any label cut off? `scrollHeight` vs `clientHeight`, the one number
  // that settles it (CLAUDE.md) — measured on **`.wb-map-text`**, not on the
  // node. Measuring the node was the first thing tried here and it reported
  // every node clipped: a node is `overflow: visible` and carries two
  // deliberately overhanging children (the `+` affordance below it and the
  // count badge above), so its own `scrollHeight` is larger than its box by
  // design and says nothing at all about the text. The label element is
  // where a clip would actually happen.
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll(".wb-object.wb-map-node")]
      .map((el) => ({ el, t: el.querySelector(".wb-map-text") }))
      .filter(({ t }) => t && t.scrollHeight > t.clientHeight + 1)
      .map(({ el, t }) => `${el.dataset.id}: ${t.scrollHeight}>${t.clientHeight}`)
  );
  check("no map node clips its own label", clipped.length === 0, clipped.join(", "));

  // A node grows with its text rather than slicing it: give one a long label
  // and its box must get taller than the one-line minimum.
  const grew = await page.evaluate(async () => {
    const index = window.wbMapIndex();
    const leaf = index.nodes.find((n) => !(index.childrenOf.get(n.id) || []).length);
    if (!leaf) return null;
    const before = document.querySelector(`.wb-object[data-id="${leaf.id}"]`)?.offsetHeight;
    leaf.data = { ...leaf.data, content: "A deliberately long topic label that has to wrap onto several lines inside its own node box" };
    window.renderWhiteboardNow();
    const after = document.querySelector(`.wb-object[data-id="${leaf.id}"]`)?.offsetHeight;
    const text = document.querySelector(`.wb-object[data-id="${leaf.id}"] .wb-map-text`);
    return { before, after, textClipped: text ? text.scrollHeight > text.clientHeight + 1 : null };
  });
  check("a long label grows its node instead of being clipped",
    grew && grew.after > grew.before && grew.textClipped === false,
    grew ? `${grew.before}px → ${grew.after}px, label clipped: ${grew.textClipped}` : "no leaf");

  // Inline markdown really becomes elements, not literal asterisks.
  const inline = await page.evaluate(() => {
    const index = window.wbMapIndex();
    const leaf = index.nodes.find((n) => !(index.childrenOf.get(n.id) || []).length);
    if (!leaf) return null;
    leaf.data = { ...leaf.data, content: "**bold** and *italic* and `code`" };
    window.renderWhiteboardNow();
    const el = document.querySelector(`.wb-object[data-id="${leaf.id}"] .wb-map-text`);
    return el
      ? { strong: el.querySelectorAll("strong").length, em: el.querySelectorAll("em").length,
          code: el.querySelectorAll("code").length, text: el.textContent }
      : null;
  });
  check("a topic renders inline bold / italic / code",
    inline && inline.strong === 1 && inline.em === 1 && inline.code === 1,
    inline ? `strong=${inline.strong} em=${inline.em} code=${inline.code} "${inline.text}"` : "none");
  // Put the map back the way the rest of the run expects it.
  await page.evaluate(() => {
    const index = window.wbMapIndex();
    const leaf = index.nodes.find((n) => !(index.childrenOf.get(n.id) || []).length);
    if (leaf) { leaf.data = { ...leaf.data, content: "Branch" }; window.renderWhiteboardNow(); }
  });

  const edgeCount = await page.evaluate(() =>
    document.querySelectorAll(".wb-map-edges .wb-map-edge").length
  );
  check("parent→child edges are drawn", edgeCount === 4, `${edgeCount} edges`);

  await page.screenshot({ path: OUT + "/mindmap-tidy.png" });

  // --- collapse a branch (item 5) -------------------------------------------
  // Fold the root's first child, which has a subtree under it.
  // `wbState` is a module-level `let`, so it is not a property of `window`;
  // `wbMapIndex` is a top-level function declaration, so it is. Reading the
  // tree through the app's own index is also the more honest check — it is
  // what the renderer itself uses.
  const target = await page.evaluate(() => {
    const index = window.wbMapIndex();
    const withKids = index.nodes.find(
      (o) => o.parent_id != null && (index.childrenOf.get(o.id) || []).length > 0
    );
    return withKids ? withKids.id : null;
  });
  check("a branch with children exists to collapse", Boolean(target), `node ${target}`);
  const before = await page.evaluate(() => document.querySelectorAll(".wb-map-node").length);
  await page.click(`.wb-object[data-id="${target}"] .wb-map-collapse`);
  await page.waitForTimeout(1400);
  const after = await page.evaluate(() => document.querySelectorAll(".wb-map-node").length);
  const hiddenIds = await page.evaluate((t) => {
    const index = window.wbMapIndex();
    return (index.childrenOf.get(t) || [])
      .map((o) => o.id)
      .filter((id) => document.querySelector(`.wb-object[data-id="${id}"]`) !== null);
  }, target);
  check("(c) the collapsed branch is not in the DOM", hiddenIds.length === 0 && after < before,
    `${before} → ${after} nodes, ${hiddenIds.length} children still present`);
  const badge = await page.evaluate((t) => {
    const el = document.querySelector(`.wb-object[data-id="${t}"] .wb-map-count`);
    return el && !el.hidden ? el.textContent : null;
  }, target);
  check("(c) its count badge shows the buried total", Boolean(badge) && Number(badge) > 0,
    `badge "${badge}"`);

  // The badge must not land on the control you press to undo the fold.
  const badgeClash = await page.evaluate((t) => {
    const node = document.querySelector(`.wb-object[data-id="${t}"]`);
    const b = node.querySelector(".wb-map-count").getBoundingClientRect();
    const c = node.querySelector(".wb-map-collapse").getBoundingClientRect();
    const ox = Math.min(b.right, c.right) - Math.max(b.left, c.left);
    const oy = Math.min(b.bottom, c.bottom) - Math.max(b.top, c.top);
    return { ox: Math.round(ox), oy: Math.round(oy) };
  }, target);
  check("the count badge does not cover the collapse chevron",
    badgeClash.ox <= 0 || badgeClash.oy <= 0,
    `overlap ${badgeClash.ox}×${badgeClash.oy}px`);

  await page.screenshot({ path: OUT + "/mindmap-collapsed.png" });

  // --- export (item 7) ------------------------------------------------------
  // Expand again first, so the export is asked about the whole map.
  await page.click(`.wb-object[data-id="${target}"] .wb-map-collapse`);
  await page.waitForTimeout(1200);
  // Export lives behind the top bar's "Board" menu, not loose in the bar.
  await page.click('[aria-controls="wb-board-menu"]');
  await page.waitForTimeout(500);
  await page.click("#wb-export");
  await page.waitForTimeout(500);
  const menu = await page.evaluate(() =>
    [...document.querySelectorAll("#wb-export-menu button")].map((b) => b.textContent.trim())
  );
  check("the export menu offers Markdown and OPML on a map",
    menu.includes("Markdown (.md)") && menu.includes("OPML (.opml)"),
    menu.join(" | "));
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.getElementById("wb-export-menu")?.remove());
  await page.waitForTimeout(300);

  // The server's own outline, through the endpoint the menu entry calls.
  const outline = await page.evaluate(async (id) => {
    const res = await window.api(`/whiteboard/boards/${id}/export?format=markdown`);
    return res.text();
  }, boardId);
  check("the Markdown outline comes back with the map's nodes in it",
    outline.includes("Verification map") && outline.split("\n").filter((l) => l.trim().startsWith("-")).length >= 4,
    `${outline.split("\n").length} lines`);

  // PNG/SVG: the canvas export has to actually draw the new node kinds. It
  // did not before this session — every map exported as an empty rectangle.
  const svg = await page.evaluate(() => window.wbBuildExportSvg("whole").svg);
  check("the SVG export draws the map's nodes and edges",
    svg.includes("Verification map") && (svg.match(/<path/g) || []).length >= 4,
    `${(svg.match(/<rect/g) || []).length} rects, ${(svg.match(/<path/g) || []).length} paths`);

  // --- the rest of the keyboard set (item 3) --------------------------------
  const shape = () => page.evaluate(() => {
    const index = window.wbMapIndex();
    return Object.fromEntries(index.nodes.map((n) => [n.id, n.parent_id]));
  });
  // Arrow navigation: from the root, Right goes to its first child, Down to
  // that child's next sibling, Left back to the parent.
  await page.evaluate(() => {
    const index = window.wbMapIndex();
    window.selectWbItem("object", index.roots[0].id);
  });
  await page.waitForTimeout(400);
  // From the DOM, not from `wbSelectedItem` — that is a module-level `let`, so
  // it is not a property of `window` and reads as `undefined` from here. The
  // selection class is the same fact and is the one the user can see.
  const selectedId = () => page.evaluate(() => {
    const el = document.querySelector(".wb-object.wb-map-node.wb-selected");
    return el ? Number(el.dataset.id) : null;
  });
  const rootId = await selectedId();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  const child = await selectedId();
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(700);
  const sibling = await selectedId();
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(700);
  const backUp = await selectedId();
  check("arrows walk the tree (right = child, down = sibling, left = parent)",
    child !== rootId && sibling !== child && backUp === rootId,
    `root ${rootId} → child ${child} → sibling ${sibling} → parent ${backUp}`);

  // Shift+Tab outdents: the node's parent becomes its grandparent.
  const deep = await page.evaluate(() => {
    const index = window.wbMapIndex();
    const node = index.nodes.find((n) => {
      const p = index.byId.get(n.parent_id);
      return p && p.parent_id != null;
    });
    if (node) window.selectWbItem("object", node.id);
    return node ? { id: node.id, parent: node.parent_id, grandparent: index.byId.get(node.parent_id).parent_id } : null;
  });
  check("a node two levels deep exists to outdent", Boolean(deep), JSON.stringify(deep));
  await page.waitForTimeout(400);
  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");
  await page.waitForTimeout(1600);
  const afterOutdent = (await shape())[deep.id];
  check("Shift+Tab re-parents to the grandparent",
    Number(afterOutdent) === deep.grandparent,
    `parent ${deep.parent} → ${afterOutdent} (grandparent was ${deep.grandparent})`);

  // Delete takes the subtree, and the toast's Undo puts it back with its
  // shape intact — not as a heap of roots.
  const beforeDelete = await shape();
  const doomed = await page.evaluate(() => {
    const index = window.wbMapIndex();
    const node = index.nodes.find((n) => n.parent_id != null && (index.childrenOf.get(n.id) || []).length);
    if (node) window.selectWbItem("object", node.id);
    return node ? { id: node.id, size: 1 + (index.childrenOf.get(node.id) || []).length } : null;
  });
  check("a branch exists to delete", Boolean(doomed), JSON.stringify(doomed));
  await page.waitForTimeout(400);
  await page.keyboard.press("Delete");
  await page.waitForTimeout(1800);
  const afterDelete = await shape();
  check("Delete removes the whole subtree",
    Object.keys(afterDelete).length === Object.keys(beforeDelete).length - doomed.size,
    `${Object.keys(beforeDelete).length} → ${Object.keys(afterDelete).length} nodes`);
  const undoBtn = await page.$(".toast button, .toast-action");
  check("the delete offers an Undo on its toast", Boolean(undoBtn));
  if (undoBtn) {
    await undoBtn.click();
    await page.waitForTimeout(3000);
  }
  const afterUndo = await shape();
  // Ids change on a re-create (they are new rows), so the shape is compared by
  // the *count* of nodes and by the parent-child edge count — which is what
  // "the tree came back with the shape it had" actually means.
  const edgesOf = (m) => Object.values(m).filter((p) => p !== null && p !== undefined).length;
  check("Undo restores the subtree with its parent links",
    Object.keys(afterUndo).length === Object.keys(beforeDelete).length
      && edgesOf(afterUndo) === edgesOf(beforeDelete),
    `${Object.keys(afterUndo).length} nodes / ${edgesOf(afterUndo)} edges vs ${Object.keys(beforeDelete).length} / ${edgesOf(beforeDelete)}`);

  // --- the other layouts (item 4) -------------------------------------------
  for (const layout of ["tree-down", "radial"]) {
    await page.selectOption("#wb-map-layout", layout);
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.wbZoomToFit && window.wbZoomToFit({ animate: false }));
    await page.waitForTimeout(700);
    const laid = await page.evaluate(() =>
      [...document.querySelectorAll(".wb-object.wb-map-node")].map((el) => {
        const r = el.getBoundingClientRect();
        return { id: el.dataset.id, x: r.x, y: r.y, w: r.width, h: r.height };
      })
    );
    let clashes = 0;
    for (let i = 0; i < laid.length; i += 1) {
      for (let j = i + 1; j < laid.length; j += 1) {
        const a = laid[i], b = laid[j];
        if (Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1
          && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1) clashes += 1;
      }
    }
    check(`${layout}: no two node boxes overlap`, clashes === 0,
      `${laid.length} nodes, ${clashes} overlaps`);
    await page.screenshot({ path: `${OUT}/mindmap-${layout}.png` });
  }
  // Back to the layout the rest of the run expects.
  await page.selectOption("#wb-map-layout", "tree-right");
  await page.waitForTimeout(2500);

  // --- the Library card draws the map as a tree (item 6) --------------------
  await page.click("#wb-back-to-boards");
  await page.waitForTimeout(1800);
  const chips = await page.evaluate(() =>
    [...document.querySelectorAll("#library-boards-filter .library-chip")].map((b) => b.textContent.trim())
  );
  check("the Maps / Boards / All chip row exists", chips.length === 3, chips.join(" | "));

  const preview = await page.evaluate((title) => {
    const cards = [...document.querySelectorAll(".library-board-card")];
    const card = cards.find((c) => c.querySelector(".library-card-title")?.textContent === title);
    if (!card) return null;
    return {
      edges: card.querySelectorAll(".board-minimap-edge").length,
      dots: card.querySelectorAll(".board-minimap-card, .board-minimap-object").length,
    };
  }, "Verification map");
  check("(d) the Library card draws >= 4 preview edges",
    preview && preview.edges >= 4,
    preview ? `${preview.edges} edges, ${preview.dots} dots` : "card not found");

  // Filtering to Maps keeps it and drops ordinary boards.
  await page.click('#library-boards-filter [data-board-filter="map"]');
  await page.waitForTimeout(1200);
  const filtered = await page.evaluate(() =>
    [...document.querySelectorAll(".library-board-card .library-card-title")].map((t) => t.textContent)
  );
  check("the Maps chip filters the gallery to maps only",
    filtered.includes("Verification map") && !filtered.includes("Default board"),
    filtered.join(" | "));

  await page.screenshot({ path: OUT + "/mindmap-library.png" });

  // --- an ordinary whiteboard is untouched ----------------------------------
  // Everything above runs on every board, gated on `wbIsMap()`. This is the
  // other half of that claim: open a plain board, put a text box on it, and
  // check the map chrome stays away and the text box still behaves.
  await page.click('#library-boards-filter [data-board-filter="all"]');
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".library-board-card")];
    const plain = cards.find((c) => /Default board/.test(c.textContent));
    if (plain) plain.click();
  });
  await page.waitForTimeout(2500);
  const plainBoard = await page.evaluate(async () => {
    const chip = document.getElementById("wb-map-chip");
    const picker = document.getElementById("wb-map-layout");
    const tidy = document.getElementById("wb-map-tidy");
    const before = document.querySelectorAll(".wb-object").length;
    await window.wbCreateTextBox(300, 300);
    await new Promise((r) => setTimeout(r, 900));
    const box = document.querySelector(".wb-object-text");
    return {
      chipHidden: chip.hidden, pickerHidden: picker.hidden, tidyHidden: tidy.hidden,
      isMap: window.wbIsMap(),
      edges: document.querySelectorAll(".wb-map-edges").length,
      mapNodes: document.querySelectorAll(".wb-map-node").length,
      added: document.querySelectorAll(".wb-object").length - before,
      textBoxHasGrip: Boolean(box && box.querySelector(".wb-object-grip")),
      textBoxHasHandles: box ? box.querySelectorAll(".wb-resize-handle").length : 0,
      textBoxHeight: box ? box.style.height : null,
    };
  });
  check("an ordinary board shows no map chrome",
    plainBoard.chipHidden && plainBoard.pickerHidden && plainBoard.tidyHidden
      && !plainBoard.isMap && plainBoard.edges === 0 && plainBoard.mapNodes === 0,
    JSON.stringify(plainBoard));
  check("a text box on an ordinary board still gets its grip and 8 handles",
    plainBoard.added === 1 && plainBoard.textBoxHasGrip && plainBoard.textBoxHasHandles === 8
      && /px$/.test(plainBoard.textBoxHeight || ""),
    `added ${plainBoard.added}, grip ${plainBoard.textBoxHasGrip}, handles ${plainBoard.textBoxHasHandles}, height ${plainBoard.textBoxHeight}`);
  await page.screenshot({ path: OUT + "/mindmap-plain-board.png" });

  // --- the owner's reports A and B, on a real map ---------------------------
  //
  // A: "there's a permanent selection box on my mindmap". Reproduced first
  // (a marquee released outside the container left a 552x440 `.wb-marquee`
  // that survived Escape, an empty-canvas click and a board reopen), so
  // these four checks are the four leaks, not a guess at one.
  await page.evaluate(async () => {
    const rows = await window.apiJson("/whiteboard/boards");
    const map = rows.find((r) => r.type === "map");
    window.openWhiteboardBoard(map.id);
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.wbZoomToFit({ animate: false }));
  await page.waitForTimeout(900);
  const canvas = await page.evaluate(() => {
    const r = document.getElementById("whiteboard-container").getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const emptyAt = { x: canvas.x + canvas.w * 0.62, y: canvas.y + canvas.h * 0.74 };
  const strayCount = () => page.evaluate(() => document.querySelectorAll(".wb-marquee, .wb-lasso").length);

  await page.mouse.move(emptyAt.x, emptyAt.y);
  await page.mouse.down();
  await page.mouse.move(emptyAt.x - 240, emptyAt.y - 250, { steps: 8 });
  const drawing = await page.evaluate(() =>
    [...document.querySelectorAll(".wb-marquee")].map((e) => `${e.getAttribute("width")}x${e.getAttribute("height")}`).join(",")
  );
  check("(A) the marquee still draws while the drag is running", /^\d+(\.\d+)?x\d+(\.\d+)?$/.test(drawing), drawing);
  await page.mouse.move(6, 6, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const afterOutside = await strayCount();
  check("(A) a marquee released outside the board leaves nothing behind", afterOutside === 0, `${afterOutside} stray`);

  // A second pointerdown mid-drag used to orphan the first rectangle: one
  // variable held it, and the second gesture overwrote the reference.
  await page.mouse.move(emptyAt.x, emptyAt.y);
  await page.mouse.down();
  await page.mouse.move(emptyAt.x - 200, emptyAt.y - 180, { steps: 6 });
  await page.evaluate((p) => {
    document.getElementById("whiteboard-container").dispatchEvent(
      new PointerEvent("pointerdown", { clientX: p.x - 300, clientY: p.y - 40, bubbles: true, pointerId: 7 })
    );
  }, emptyAt);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const afterSecond = await strayCount();
  check("(A) a second pointerdown mid-drag orphans no rectangle", afterSecond === 0, `${afterSecond} stray`);

  // And the sweep of last resort: whatever put one there, Escape and a click
  // on empty canvas both clear it, and a board reopen does not carry it over.
  await page.evaluate(() => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("class", "wb-marquee");
    rect.setAttribute("x", 40); rect.setAttribute("y", 40);
    rect.setAttribute("width", 330); rect.setAttribute("height", 375);
    document.getElementById("wb-zoom-group").appendChild(rect);
  });
  const planted = await strayCount();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const afterEscape = await strayCount();
  check("(A) Escape clears a stray selection rectangle", planted === 1 && afterEscape === 0,
    `planted ${planted}, after Escape ${afterEscape}`);
  await page.evaluate(() => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("class", "wb-marquee");
    rect.setAttribute("width", 330); rect.setAttribute("height", 375);
    document.getElementById("wb-zoom-group").appendChild(rect);
  });
  await page.mouse.click(emptyAt.x, emptyAt.y);
  await page.waitForTimeout(400);
  const afterClick = await strayCount();
  check("(A) a click on empty canvas clears a stray selection rectangle", afterClick === 0, `${afterClick} stray`);

  // B: "I cant highlight text in mindmap text boxes". Reproduced first — the
  // drag selected the empty string and moved the node 165px, because
  // `objDrag`'s filter excluded `.wb-text-content` and a map node's editor
  // is `.wb-map-text`.
  await page.evaluate(() => window.wbZoomToFit({ animate: false }));
  await page.waitForTimeout(800);
  const textSel = ".wb-object.wb-map-node .wb-map-text";
  await page.dblclick(textSel);
  await page.waitForTimeout(600);
  await page.keyboard.type("Alpha beta gamma");
  await page.waitForTimeout(500);
  const tr = await page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, textSel);
  const transformBefore = await page.evaluate((s) => document.querySelector(s).closest(".wb-object").style.transform, textSel);
  await page.mouse.click(tr.x + 3, tr.y + tr.h / 2);
  await page.waitForTimeout(200);
  await page.mouse.move(tr.x + 3, tr.y + tr.h / 2);
  await page.mouse.down();
  await page.mouse.move(tr.x + tr.w - 8, tr.y + tr.h / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  const dragSelection = await page.evaluate(() => String(window.getSelection()));
  const transformAfter = await page.evaluate((s) => document.querySelector(s).closest(".wb-object").style.transform, textSel);
  check("(B) a click-drag inside a node's editor selects its text",
    dragSelection.trim().length > 3, JSON.stringify(dragSelection));
  check("(B) that drag does not move the node",
    transformBefore === transformAfter, `${transformBefore} → ${transformAfter}`);
  const wordSel = await page.evaluate(async (t) => {
    const el = document.querySelector(t);
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, textSel);
  await page.mouse.dblclick(wordSel.x + 20, wordSel.y + wordSel.h / 2);
  await page.waitForTimeout(300);
  const word = await page.evaluate(() => String(window.getSelection()));
  check("(B) double-click selects a word inside the editor", word.trim().length > 0, JSON.stringify(word));
  await page.keyboard.press("End");
  await page.keyboard.down("Shift");
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
  await page.keyboard.up("Shift");
  await page.waitForTimeout(250);
  const shifted = await page.evaluate(() => String(window.getSelection()));
  check("(B) Shift+arrows extend the selection instead of walking the tree",
    shifted.length > 0 && shifted.length <= 4, JSON.stringify(shifted));
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + "/mindmap-select-and-edit.png" });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) console.log("FAILED: " + failed.map((f) => f.label).join(" ; "));
  console.log("shots in " + OUT);
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})();
