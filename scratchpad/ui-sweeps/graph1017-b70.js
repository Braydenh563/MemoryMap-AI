// B70 (INBOX 904): "Why does this node wanna be all the way down there??" On
// the notebook this server holds, once the force layout has settled, each
// note's distance to the nearest note of its own category against the median
// of those distances, and the worst three. (The synthetic before/after, on
// the real worker in node, is tests/test_graph_tether.py.)
const { boot } = require("./lib.js");
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(async () => {
    const cats = ["Work", "Health", "Ideas", "Study", "Travel", "Home"];
    const have = (await apiJson("/entries?limit=200")).length;
    for (let i = have; i < 46; i += 1) {
      const c = cats[i % cats.length];
      await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: `${c} probe note ${i} about ${c.toLowerCase()} plans and ${cats[(i * 7 + 3) % cats.length].toLowerCase()} ideas`, category: c }) });
    }
    localStorage.setItem("graph-layout", "force");
  });
  await page.evaluate(() => document.getElementById("tab-btn-graph")?.click());
  await page.waitForFunction(() => window.__graphDebug && window.__graphDebug.nodes > 0, null, { timeout: 60000 });
  for (let i = 0; i < 40; i++) {
    const t0 = await page.evaluate(() => window.__graphDebug.ticks);
    await page.waitForTimeout(1000);
    if ((await page.evaluate(() => window.__graphDebug.ticks)) === t0) break;
  }
  const res = await page.evaluate(() => {
    const nodes = graphNodesRef.filter((n) => !n.isGroup && Number.isFinite(n.x) && (!n.type || n.type === "note"));
    const rows = nodes.map((n) => {
      let best = Infinity;
      for (const m of nodes) if (m !== n && m.category === n.category) best = Math.min(best, Math.hypot(n.x - m.x, n.y - m.y));
      return { id: n.id, cat: n.category, d: best };
    }).filter((r) => Number.isFinite(r.d));
    const sorted = rows.map((r) => r.d).sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    rows.sort((a, b) => b.d - a.d);
    return { notes: nodes.length, cats: new Set(nodes.map((n) => n.category)).size, median: Math.round(med), ratio: Math.round((rows[0].d / med) * 10) / 10, worst: rows.slice(0, 3).map((r) => `${r.id} ${r.cat} ${Math.round(r.d)}`) };
  });
  console.log(JSON.stringify(res));
  await browser.close();
})();
