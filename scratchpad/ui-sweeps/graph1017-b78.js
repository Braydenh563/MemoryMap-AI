// B78 (INBOX 904): `PUT /graph/pin/document:2` returned HTTP 422. Documents
// switched on in the graph; double-click a document node (the pin gesture) and
// record every /graph/pin response status, then reload and see the pin kept.
const { boot } = require("./lib.js");
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  const seen = [];
  page.on("response", (r) => { if (r.url().includes("/graph/pin")) seen.push(`${r.request().method()} ${new URL(r.url()).pathname} ${r.status()}`); });
  await page.evaluate(async () => {
    const have = (await apiJson("/documents")).length;
    for (let i = have; i < 2; i += 1) await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: `Pin doc ${i}`, content: "x" }) });
    for (let i = 0; i < 4; i += 1) await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: `Pin probe note ${i} on pins` }) });
    localStorage.setItem("graph-layout", "force");
  });
  await page.evaluate(() => document.getElementById("tab-btn-graph")?.click());
  await page.waitForFunction(() => window.__graphDebug && window.__graphDebug.nodes > 0, null, { timeout: 60000 });
  await page.evaluate(() => { const c = document.getElementById("graph-documents"); if (c && !c.checked) { c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); } });
  for (let i = 0; i < 30; i++) {
    const t0 = await page.evaluate(() => window.__graphDebug.ticks);
    await page.waitForTimeout(1000);
    if ((await page.evaluate(() => window.__graphDebug.ticks)) === t0) break;
  }
  const where = () => page.evaluate(() => {
    const t = window.__graphDebug.transform;
    const rect = document.getElementById("graph-canvas").getBoundingClientRect();
    const n = graphNodesRef.find((m) => m.type === "document" && Number.isFinite(m.x));
    return n ? { id: n.id, x: rect.left + t.x + n.x * t.k, y: rect.top + t.y + n.y * t.k, pin: n.graph_pin_x ?? null, fx: n.fx ?? null } : null;
  });
  const p = await where();
  console.log("document node", JSON.stringify(p));
  await page.mouse.dblclick(p.x, p.y);
  await page.waitForTimeout(1200);
  console.log("after double-click", JSON.stringify(await where()));
  console.log("pin requests", JSON.stringify(seen));
  await browser.close();
})();
