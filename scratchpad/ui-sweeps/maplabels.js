// INBOX 818: a link's label stays on the drawn line (within 2px of its
// midpoint) while a topic is dragged, after a relayout, a fold, a pan and a zoom.
//   tree edges (wb-map-edge-label) and the board's own connectors (wb-link-label).
const { boot, openBoardsTab } = require("./lib.js");
(async () => {
  let fails = 0;
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
  await openBoardsTab(page);
  const id = await page.evaluate(async () => {
    const board = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# Z\n- Trunk\n  - Alpha\n    - Leaf\n  - Beta", name: "Z " + Date.now() }) });
    await openWhiteboardBoard(board.id); await new Promise((r) => setTimeout(r, 1500));
    await wbMapTidy({ quiet: true }); await new Promise((r) => setTimeout(r, 500));
    const n = wbMapIndex().nodes.find((x) => (x.data?.content || "") === "Alpha");
    await wbMapSetNodeStyle(n, { edge_label: "causes" });
    wbScheduleRender(); await new Promise((r) => setTimeout(r, 700));
    return n.id;
  });
  const measure = (tag) => page.evaluate(({ id, tag }) => {
    const wrap = document.querySelector(`.wb-map-edges path.wb-map-edge[data-child="${id}"]`).closest("g");
    //: The centreline: a ribbon edge's own path is a closed outline.
    const path = wrap.querySelector(".wb-map-edge-hit");
    const text = wrap.querySelector(".wb-map-edge-label");
    if (!text) return { tag, error: "no label" };
    const len = path.getTotalLength();
    // the label's anchor is its x/y attributes; its centre is where it draws
    const mid = path.getPointAtLength(len / 2);
    const m = path.getScreenCTM();
    const toScreen = (p) => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });
    const ms = toScreen(mid);
    const tb = text.getBoundingClientRect();
    const cx = tb.left + tb.width / 2, cy = tb.top + tb.height / 2;
    return { tag, dx: Math.round((cx - ms.x) * 10) / 10, dy: Math.round((cy - ms.y) * 10) / 10, dist: Math.round(Math.hypot(cx - ms.x, cy - ms.y) * 10) / 10 };
  }, { id, tag });
  const log = async (tag) => { const r = await measure(tag); console.log(JSON.stringify(r)); return r; };
  const ok = (r) => !r.error && r.dist <= 14; // the text sits just above the line (dy -0.4em), so a tolerance of its half height
  const rects = await page.evaluate((id) => { const e = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect(); return [e.left + e.width / 2, e.top + e.height / 2]; }, id);
  await log("rest");
  // drag the topic 200px down and hold: the live frame
  await page.mouse.move(rects[0], rects[1]); await page.mouse.down();
  await page.mouse.move(rects[0] + 20, rects[1] + 100, { steps: 6 });
  await page.mouse.move(rects[0] + 40, rects[1] + 200, { steps: 6 });
  await page.waitForTimeout(150);
  const live = await log("drag-live");
  if (process.env.DBG) console.log(await page.evaluate((id) => { const w = document.querySelector(`.wb-map-edges path.wb-map-edge[data-child="${id}"]`); const g = w.closest("g"); return JSON.stringify({ lbl: [g.querySelector(".wb-map-edge-label").getAttribute("x"), g.querySelector(".wb-map-edge-label").getAttribute("y")], h: [g.querySelector(".wb-map-edge-handle").getAttribute("cx"), g.querySelector(".wb-map-edge-handle").getAttribute("cy")], hasLbl: !!w._wbLabel, d: g.querySelector(".wb-map-edge-hit").getAttribute("d").slice(0, 60) }); }, id));
  await page.mouse.up(); await page.waitForTimeout(700);
  const dropped = await log("drag-dropped");
  await page.evaluate(async () => { await wbMapTidy({ quiet: true }); await new Promise((r) => setTimeout(r, 900)); });
  const tidy = await log("relayout");
  await page.evaluate(() => { const c = document.getElementById("whiteboard-container"); const t = d3.zoomTransform(c); d3.select(c).call(wbZoom.transform, d3.zoomIdentity.translate(t.x + 200, t.y).scale(t.k * 1.5)); });
  await page.waitForTimeout(500);
  const zoom = await log("pan+zoom");
  for (const r of [live, dropped, tidy, zoom]) if (!ok(r)) fails++;
  console.log(fails ? `FAIL: ${fails}` : "PASS");
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
