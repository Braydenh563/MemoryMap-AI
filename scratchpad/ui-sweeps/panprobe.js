// A probe, not a gate: does moving the pan transform from the inner `<g>` onto
// the `<svg>` root (with `overflow: visible`, so nothing is clipped at the
// viewport any more) get the shapes onto a compositor layer, and does it cost
// anything? Three things have to hold at once, and each is a number here:
// the svg root is composited, a shape panned in from far outside the original
// viewport still paints, and it still hit-tests.
const { boot } = require("./lib.js");

(async () => {
  const { browser, page } = await boot({});
  // Enable the layer tree before anything moves: `layerTreeDidChange` only
  // fires on a change, so a session opened at the end of the run hears nothing.
  const client = await page.context().newCDPSession(page);
  await client.send("DOM.enable");
  await client.send("LayerTree.enable");
  let lastLayers = [];
  client.on("LayerTree.layerTreeDidChange", (e) => { lastLayers = e.layers || []; });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
    const board = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `probe ${Date.now()}`, type: "board" }) });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    await fetchWhiteboardState(board.id);
    await apiJson("/whiteboard/objects", { method: "POST", body: JSON.stringify({ board_id: board.id, kind: "text", x: 100, y: 100, width: 180, height: 90, data: { content: "note" } }) });
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 300));
  });
  // A shape well to the right of the svg viewport: 2200px out, so it is
  // clipped at rest and only a pan brings it in.
  const drawn = await page.evaluate(() => {
    const g = document.getElementById("wb-shapes-group") || document.getElementById("wb-zoom-group");
    const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    el.setAttribute("x", "2200"); el.setAttribute("y", "200");
    el.setAttribute("width", "300"); el.setAttribute("height", "200");
    el.setAttribute("fill", "#ff00ff"); el.setAttribute("id", "probe-rect");
    g.appendChild(el);
    return Boolean(document.getElementById("probe-rect"));
  });
  console.log("probe rect added:", drawn);

  const applyToRoot = async () => page.evaluate(() => {
    const svg = document.getElementById("wb-svg-layer");
    const ov = document.getElementById("wb-overlay-layer");
    for (const s of [svg, ov]) { s.style.overflow = "visible"; s.style.transformOrigin = "0 0"; s.style.willChange = "transform"; }
    window.__wbProbeRoot = true;
    const css = getComputedStyle(document.getElementById("wb-zoom-group")).transform;
    const m = new DOMMatrixReadOnly(css === "none" ? "" : css);
    document.getElementById("wb-zoom-group").style.transform = "none";
    document.getElementById("wb-overlay-zoom-group").style.transform = "none";
    svg.style.transform = `translate(${m.e}px, ${m.f}px) scale(${m.a})`;
    ov.style.transform = svg.style.transform;
  });

  const pan = async (dx) => page.evaluate((d) => {
    const svg = document.getElementById("wb-svg-layer");
    const ov = document.getElementById("wb-overlay-layer");
    const html = document.getElementById("wb-html-layer");
    const css = `translate(${d}px, 0px) scale(1)`;
    svg.style.transform = css; ov.style.transform = css; html.style.transform = css;
  }, dx);

  await applyToRoot();
  await pan(-2000);
  await page.waitForTimeout(500);
  const seen = await page.evaluate(() => {
    const r = document.getElementById("probe-rect").getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(cx, cy);
    return { rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width) }, cx, cy, hit: hit ? (hit.id || hit.tagName) : "none" };
  });
  console.log("after panning it in:", JSON.stringify(seen));
  const shot = (process.env.SCRATCH || ".") + "/shots/panprobe.png";
  await page.screenshot({ path: shot });
  console.log("screenshot", shot, "sample at", seen.cx, seen.cy);

  await page.waitForTimeout(600);
  const layers = lastLayers;
  const names = [];
  for (const l of layers) {
    try {
      const { nodeIds } = await client.send("DOM.pushNodesByBackendIdsToFrontend", { backendNodeIds: [l.backendNodeId] });
      const { node } = await client.send("DOM.describeNode", { nodeId: nodeIds[0] });
      const attrs = node.attributes || [];
      const id = attrs[attrs.indexOf("id") + 1] || "";
      names.push(`${node.localName}#${id}`);
    } catch (e) { /* a layer with no node is the scrolling contents layer */ }
  }
  console.log("layers:", names.join(", "));
  console.log("wb-svg-layer composited:", names.includes("svg#wb-svg-layer"));
  await browser.close();
})();
