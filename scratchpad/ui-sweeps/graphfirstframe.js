// INBOX 738: the first visible frame's scale against the fitted scale.
//   BASE=... START=force|tree|radial|arc node scratchpad/ui-sweeps/graphfirstframe.js
// Prints the settled k, the first visible frame [ms, k, opacity] and how many
// visible frames were more than 10% off the settled k (want 0).
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate((l) => { localStorage.setItem('graph-layout', l); }, process.env.START || 'force');
  await page.evaluate(() => {
    window.__frames = [];
    const t0 = performance.now();
    const loop = () => {
      const c = document.getElementById('graph-canvas');
      if (c && typeof gcTab !== 'undefined' && gcTab.transform && gcTab.nodes.length) {
        const op = +getComputedStyle(c).opacity;
        window.__frames.push([Math.round(performance.now() - t0), +gcTab.transform.k.toFixed(3), +op.toFixed(2)]);
      }
      if (performance.now() - t0 < 9000) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  await page.click('[data-tab="graph"]');
  await page.waitForTimeout(9500);
  const f = await page.evaluate(() => window.__frames);
  const finalK = f[f.length - 1][1];
  const visible = f.filter((x) => x[2] > 0.05);
  const first = visible[0];
  const worst = visible.reduce((a, b) => (Math.abs(b[1] / finalK - 1) > Math.abs(a[1] / finalK - 1) ? b : a), first);
  console.log(JSON.stringify({ finalK, firstVisible: first, worstVisible: worst, visibleOffBy10pct: visible.filter((x) => Math.abs(x[1] / finalK - 1) > 0.1).length, frames: f.length }));
  await browser.close();
})();
