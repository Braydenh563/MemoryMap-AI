// Why a shape can trail a note during a pan when every JS number says they are
// in the same place: compositing. `getBoundingClientRect` reads layout, and
// layout is always in agreement; what the eye sees is the compositor, and a
// layer that is promoted moves without a paint while one that is not has to be
// repainted on the main thread first. Only the layer tree can tell them apart,
// so this reads it through CDP rather than guessing from the stylesheet.
//
//   BASE=http://127.0.0.1:8791 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/panlayers.js
const { boot } = require("./lib.js");

(async () => {
  const { browser, page } = await boot({});
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
    const board = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `layers ${Date.now()}`, type: "board" }) });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    await fetchWhiteboardState(board.id);
    await apiJson("/whiteboard/objects", { method: "POST", body: JSON.stringify({ board_id: board.id, kind: "text", x: 120, y: 120, width: 180, height: 90, data: { content: "note" } }) });
    await apiJson("/whiteboard/sketches", {
      method: "POST",
      body: JSON.stringify({ board_id: board.id, x: 0, y: 0, z: 1, data: JSON.stringify({ type: "rect", x: 300, y: 200, w: 200, h: 140, color: "#7dd3c8", size: 3 }) }),
    });
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 400));
  });

  // Where the canvas view actually sits in the DOM: the middle-button guard in
  // whiteboard.js tests `closest("#library-view-whiteboard")`, which is only
  // true if the canvas is inside it.
  const ancestry = await page.evaluate(() => {
    const c = document.getElementById("whiteboard-container");
    const chain = [];
    for (let el = c; el && el !== document.body; el = el.parentElement) chain.push(el.id || el.className || el.tagName);
    return {
      chain,
      insideLibraryView: Boolean(c.closest("#library-view-whiteboard")),
      canvasViewParent: document.getElementById("wb-canvas-view")?.parentElement?.id || "(none)",
    };
  });
  console.log("canvas ancestry:", JSON.stringify(ancestry, null, 1));

  const client = await page.context().newCDPSession(page);
  await client.send("DOM.enable");
  await client.send("LayerTree.enable");
  const layers = await new Promise((resolve) => {
    client.on("LayerTree.layerTreeDidChange", (e) => resolve(e.layers || []));
    setTimeout(() => resolve([]), 5000);
  });
  const { root } = await client.send("DOM.getDocument", { depth: -1, pierce: false });
  const nameOf = async (backendNodeId) => {
    if (!backendNodeId) return null;
    try {
      const { nodeIds } = await client.send("DOM.pushNodesByBackendIdsToFrontend", { backendNodeIds: [backendNodeId] });
      const { node } = await client.send("DOM.describeNode", { nodeId: nodeIds[0] });
      const id = (node.attributes || []).reduce((acc, v, i, a) => (a[i] === "id" ? a[i + 1] : acc), "");
      const cls = (node.attributes || []).reduce((acc, v, i, a) => (a[i] === "class" ? a[i + 1] : acc), "");
      return `${node.localName}${id ? "#" + id : ""}${cls ? "." + cls.split(" ")[0] : ""}`;
    } catch (e) {
      return `backend:${backendNodeId}`;
    }
  };
  void root;
  console.log(`composited layers: ${layers.length}`);
  const named = [];
  for (const l of layers) {
    const n = await nameOf(l.backendNodeId);
    if (n) named.push(`${n} ${Math.round(l.width)}x${Math.round(l.height)}`);
  }
  for (const n of named) console.log("  layer:", n);
  const want = ["wb-html-layer", "wb-zoom-group", "wb-overlay-zoom-group", "wb-svg-layer"];
  for (const w of want) {
    console.log(`  ${w}: ${named.some((n) => n.includes(w)) ? "COMPOSITED" : "not composited"}`);
  }
  await browser.close();
})();
