// The owner, 2026-10-11: "opening and closing the graph settings button
// dropdown and the menu button move the graph a bit". Waits for the map to
// settle, records the camera (gcTab.transform) and every node's x, y, opens
// and closes the gear panel and the dock's ⋯ menu, and prints how far the
// camera and the furthest node moved after each (0 is the target).
const { boot } = require("./lib.js");
(async () => {
  const W = Number(process.env.W || 1440), H = Number(process.env.H || 900);
  const { browser, page } = await boot({ viewport: { width: W, height: H } });
  await page.evaluate(() => switchTab("graph"));
  const snap = () => page.evaluate(() => ({ t: gcTab.transform ? [gcTab.transform.x, gcTab.transform.y, gcTab.transform.k] : null, n: (gcTab.nodes || []).map((d) => [d.id, d.x, d.y]) }));
  const diff = (a, b) => {
    const cam = a.t && b.t ? Math.max(Math.abs(a.t[0] - b.t[0]), Math.abs(a.t[1] - b.t[1]), Math.abs(a.t[2] - b.t[2]) * 100) : null;
    const m = new Map(b.n.map((r) => [r[0], r]));
    let node = 0;
    for (const r of a.n) { const o = m.get(r[0]); if (o) node = Math.max(node, Math.hypot(r[1] - o[1], r[2] - o[2])); }
    return { cam: cam == null ? null : +cam.toFixed(2), node: +node.toFixed(2) };
  };
  // Settled, not a fixed wait: under load the map loads and fits late, and a
  // drifting simulation reads as a menu moving it.
  let last = await snap(), still = 0;
  for (let i = 0; i < 90 && still < 3; i++) {
    await page.waitForTimeout(1000);
    const now = await snap();
    const d = now.n.length ? diff(last, now) : { cam: 1, node: 1 };
    still = now.n.length && d.cam < 0.05 && d.node < 0.05 ? still + 1 : 0;
    last = now;
  }
  const out = { nodes: (await snap()).n.length, settled: still >= 3 };
  for (const [name, sel] of [["gear", "#graph-options-toggle"], ["more", "#graph-more-menu > summary"]]) {
    const before = await snap();
    await page.click(sel); await page.waitForTimeout(900);
    const open = await snap();
    await page.click(sel); await page.waitForTimeout(900);
    const after = await snap();
    out[name] = { open: diff(before, open), closed: diff(before, after) };
  }
  console.log(JSON.stringify(out));
  await browser.close();
})();
