// INBOX 817: while a topic's text is edited the format bar stays on the
// selection through a pan and a zoom (gap 4 to 16px, intersection 0), and the
// topic's + / link buttons, fold toggle and resize grip are away.
const { boot, openBoardsTab } = require("./lib.js");
(async () => {
  let fails = 0;
  for (const [W, H] of [[1440, 900], [390, 844]]) {
    const { browser, page } = await boot({ viewport: { width: W, height: H } });
    await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
    await openBoardsTab(page);
    const id = await page.evaluate(async () => {
      const board = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# Z\n- Trunk\n  - Alpha beta gamma\n    - Leaf\n  - B", name: "Z " + Date.now() }) });
      await openWhiteboardBoard(board.id); await new Promise((r) => setTimeout(r, 1500));
      const n = wbMapIndex().nodes.find((x) => (x.data?.content || "").startsWith("Alpha"));
      selectWbItem("object", n.id); await new Promise((r) => setTimeout(r, 400));
      return n.id;
    });
    await page.dblclick(`.wb-object[data-id="${id}"] .wb-map-text`);
    await page.waitForTimeout(500);
    await page.keyboard.press("Control+A");
    await page.waitForTimeout(500);
    const measure = (tag) => page.evaluate(({ id, tag }) => {
      const bar = document.getElementById("selection-bar");
      const sel = getSelection();
      const s = sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
      const b = bar && !bar.classList.contains("hidden") ? bar.getBoundingClientRect() : null;
      const el = document.querySelector(`.wb-object[data-id="${id}"]`);
      const vis = (q) => { const e = el.querySelector(q); return !!e && getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden" && e.getBoundingClientRect().width > 0; };
      const inter = b && s ? Math.max(0, Math.min(b.right, s.right) - Math.max(b.left, s.left)) * Math.max(0, Math.min(b.bottom, s.bottom) - Math.max(b.top, s.top)) : null;
      const gap = b && s ? (b.bottom <= s.top ? s.top - b.bottom : b.top - s.bottom) : null;
      return { tag, bar: b && [b.left, b.top, b.right, b.bottom].map(Math.round), sel: s && [s.left, s.top, s.right, s.bottom].map(Math.round), inter, gap: gap === null ? null : Math.round(gap), actions: vis(".wb-map-actions"), fold: vis(".wb-map-collapse"), grip: vis(".wb-map-resize-grip") };
    }, { id, tag });
    const log = async (tag) => { const r = await measure(tag); console.log(W, JSON.stringify(r)); return r; };
    const first = await log("open");
    const bad = (r) => !r.bar || r.inter !== 0 || r.gap < 4 || r.gap > 16;
    if (bad(first) || first.actions || first.fold || first.grip) fails++;
    // pan 200px and zoom to 150% through the board's own zoom behaviour
    await page.evaluate(() => { const c = document.getElementById("whiteboard-container"); const t = d3.zoomTransform(c); d3.select(c).call(wbZoom.transform, d3.zoomIdentity.translate(t.x + 200, t.y + 120).scale(t.k)); });
    await page.waitForTimeout(400);
    const panned = await log("pan200");
    await page.evaluate(() => { const c = document.getElementById("whiteboard-container"); const t = d3.zoomTransform(c); const r = c.getBoundingClientRect(); d3.select(c).call(wbZoom.scaleTo, 1.5, [r.width / 2, r.height / 2]); });
    await page.waitForTimeout(400);
    const zoomed = await log("zoom150");
    if (bad(panned) || bad(zoomed)) fails++;
    await browser.close();
  }
  console.log(fails ? `FAIL: ${fails}` : "PASS");
  process.exit(fails ? 1 : 0);
})();
