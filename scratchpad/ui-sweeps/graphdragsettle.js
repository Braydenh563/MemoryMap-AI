// The owner, 2026-10-11: "moving nodes keeps them stuck there, they should
// only be stuck in place if I double click on them ... if the user moves
// them, they should settle into place in that general position". Drags one
// note 160px with the mouse, lets go, waits for the layout to rest, and
// prints how far (screen px) it ended from the drop and whether it is pinned
// (fx set). Then double-clicks it: pinned; double-click again: free.
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => switchTab("graph"));
  await page.waitForTimeout(7000);
  const at = (id) => page.evaluate((id) => {
    const n = gcTab.nodes.find((d) => d.id === id); const c = gcTab.canvas.getBoundingClientRect(); const t = gcTab.transform;
    return { x: c.left + t.applyX(n.x), y: c.top + t.applyY(n.y), pinned: n.fx != null };
  }, id);
  const id = await page.evaluate(() => { const c = gcTab.canvas.getBoundingClientRect(); const t = gcTab.transform;
    const inside = gcTab.nodes.filter((d) => !d.isGroup && d.fx == null).map((d) => [d, Math.hypot(t.applyX(d.x) - c.width / 2, t.applyY(d.y) - c.height / 2)]).sort((a, b) => a[1] - b[1]);
    return inside[0][0].id; });
  const a = await at(id);
  const drop = { x: a.x + 160, y: a.y - 60 };
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(a.x + (160 * i) / 12, a.y - (60 * i) / 12); await page.waitForTimeout(30); }
  await page.mouse.up();
  const justAfter = await at(id);
  await page.waitForTimeout(6000);
  const rest = await at(id);
  await page.mouse.dblclick(rest.x, rest.y); await page.waitForTimeout(500);
  const dbl = await at(id);
  await page.mouse.dblclick(dbl.x, dbl.y); await page.waitForTimeout(500);
  const dbl2 = await at(id);
  const d = (p) => Math.round(Math.hypot(p.x - drop.x, p.y - drop.y));
  console.log(JSON.stringify({ id, releasedAt: d(justAfter), restFromDrop: d(rest), pinnedAfterDrag: rest.pinned, pinnedAfterDblclick: dbl.pinned, pinnedAfterSecond: dbl2.pinned, ok: d(rest) < 60 && !rest.pinned && dbl.pinned && !dbl2.pinned }));
  await browser.close();
})();
