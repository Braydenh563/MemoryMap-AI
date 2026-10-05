// fe1005: the Graph tab on a big notebook (audit 2026-10-05, FE-04): does the
// layout end, how busy is the main thread while it runs and once it has, and
// how many nodes take the batched dot instead of a sprite.
//   BASE=http://127.0.0.1:8842 node fe1005-graph.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, ctx, page } = await boot();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Performance.enable");
  const busy = async (ms) => {
    const metric = async () => {
      const { metrics } = await cdp.send("Performance.getMetrics");
      return metrics.find((m) => m.name === "TaskDuration").value;
    };
    const a = await metric();
    const f0 = await page.evaluate(() => window.__graphDebug.frames);
    await page.waitForTimeout(ms);
    const b = await metric();
    const f1 = await page.evaluate(() => window.__graphDebug.frames);
    return { busyPct: Math.round(((b - a) * 1000 * 100) / ms), framesPerSec: Math.round(((f1 - f0) * 10000) / ms) / 10 };
  };
  const t0 = Date.now();
  await page.click('[data-tab="graph"]');
  await page.waitForFunction(() => window.__graphDebug && window.__graphDebug.nodes > 0, null, { timeout: 60000 });
  const during = await busy(5000);
  let ended = null;
  for (let i = 0; i < 60; i++) {
    const d = await page.evaluate(() => {
      const g = window.__graphDebug;
      return { alpha: g.alpha, ticks: g.ticks, tickMs: Math.round(g.tickMs), nodes: g.nodes, lod: g.lodNodes, k: g.transform.k };
    });
    const f0 = await page.evaluate(() => window.__graphDebug.ticks);
    await page.waitForTimeout(1000);
    const f1 = await page.evaluate(() => window.__graphDebug.ticks);
    if (f1 === f0) {
      ended = { afterMs: Date.now() - t0, ...d };
      break;
    }
  }
  const idle = await busy(10000);
  console.log(JSON.stringify({ during, ended, idle }));
  await browser.close();
})();
