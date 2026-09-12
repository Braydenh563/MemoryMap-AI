// Does a tick from the force worker land after the tree has been laid out?
// Switch to the tree while the simulation is still hot and read the geometry
// back: a clean tree has every node of one depth at one x, a scattered one
// does not.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const waits = Number(process.env.WAITS || 0);
  for (const wait of [0, 60, 120, 250, 500, 1000, 2000]) {
    // Back to force, hot, then switch after `wait` ms.
    await page.evaluate(() => switchTab('notes'));
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const i = document.querySelector('input[name="graph-layout"][value="force"]');
      i.checked = true; i.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.evaluate(() => switchTab('graph'));
    await page.waitForTimeout(wait);
    const alphaAt = await page.evaluate(() => window.__graphDebug.alpha);
    await page.evaluate(() => {
      const i = document.querySelector('input[name="graph-layout"][value="tree"]');
      i.checked = true; i.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(450);
    const m = await page.evaluate(() => {
      const d = window.__graphDebug;
      const by = new Map();
      for (const n of d.nodeGeometry) {
        if (n.depth == null) continue;
        if (!by.has(n.depth)) by.set(n.depth, []);
        by.get(n.depth).push(n.x);
      }
      const bands = [...by.entries()].sort((a, b) => a[0] - b[0]).map(([dd, v]) => ({
        d: dd, n: v.length, spread: +(Math.max(...v) - Math.min(...v)).toFixed(1),
      }));
      return { layout: d.layout, nodes: d.nodes, alpha: d.alpha, bands };
    });
    const dirty = m.bands.some((b) => b.spread > 0.5);
    console.log(`switch after ${wait}ms (alpha ${alphaAt.toFixed(3)}): layout=${m.layout} nodes=${m.nodes} bands=${JSON.stringify(m.bands)} ${dirty ? 'SCATTERED' : 'clean'}`);
  }
  void waits;
  await browser.close();
})();
