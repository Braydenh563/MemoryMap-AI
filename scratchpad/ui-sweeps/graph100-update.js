// Per draw during an update: the largest move of a note that stays, in screen px.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab('graph'));
  for (let i = 0; i < 200; i++) { await page.waitForTimeout(250); if (await page.evaluate(() => gcTab.nodes.length && gcTab.settledSig)) break; }
  await page.waitForTimeout(800);
  for (const phase of ['hide', 'show']) {
    const out = await page.evaluate(async (phase) => {
      const s = gcTab;
      const log = [];
      let last = null;
      const orig = gcDraw;
      gcDraw = function (q) {
        orig(q);
        const t = q.transform;
        const at = new Map();
        for (const n of q.nodes) if (Number.isFinite(n.x)) at.set(n.id, [n.x * t.k + t.x, n.y * t.k + t.y]);
        if (last) {
          let max = 0, maxW = 0, who = null;
          for (const [id, p] of at) { const o = last.at.get(id); if (o) { const d = Math.hypot(p[0] - o[0], p[1] - o[1]); if (d > max) { max = d; } const w = last.w.get(id); const n = q.byId.get(id); if (w && n) { const dw = Math.hypot(n.x - w[0], n.y - w[1]) * t.k; if (dw > maxW) { maxW = dw; who = [id, w.map(Math.round), [Math.round(n.x), Math.round(n.y)], n._born !== undefined]; } } } }
          log.push([Math.round(performance.now() - last.time), +max.toFixed(1), q.leaving ? q.leaving.ghosts.length : 0, +maxW.toFixed(1), +(Math.abs(t.k - last.k) * 1000).toFixed(1), who]);
        }
        const w = new Map(); for (const n of q.nodes) if (Number.isFinite(n.x)) w.set(n.id, [n.x, n.y]);
        last = { at, w, k: t.k, time: performance.now() };
      };
      const counts = new Map();
      for (const n of s.nodes) counts.set(n.category, (counts.get(n.category) || 0) + 1);
      const cat = window.__cat || [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      window.__cat = cat;
      if (phase === 'hide') graphHiddenCategories.add(cat); else graphHiddenCategories.delete(cat);
      renderGraph();
      await new Promise((r) => setTimeout(r, 4000));
      gcDraw = orig;
      const big = log.filter((r) => r[1] > 40).length;
      return { phase, draws: log.length, maxMovePx: Math.max(0, ...log.map((r) => r[1])), drawsOver40px: big, worst: log.slice().sort((a, b) => b[1] - a[1]).slice(0, 4), ghostDraws: log.filter((r) => r[2]).length, alpha: s.alpha };
    }, phase);
    console.log(JSON.stringify(out));
    await page.waitForTimeout(1500);
  }
  await browser.close();
})();
