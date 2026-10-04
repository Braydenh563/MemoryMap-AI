// The arrow sparks' frame cost on a big map, and how they look.
//   BASE=http://127.0.0.1:8817 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/graphspark.js (THEME=dark)
// Seed with `scratchpad/graph-fixture.js 400 1200`. Median of 60 direct
// gcDraw calls on the settled map, arrows off then on, at the fit and at 2x,
// and with a note pointed at (the drifting spark). Shots in $SCRATCH/shots.
const { boot, OUT } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: Number(process.env.DPR || 1) });
  await page.click('[data-tab="graph"]');
  await page.waitForTimeout(9000);
  const time = () => page.evaluate(() => {
    const t = [];
    for (let i = 0; i < 60; i++) {
      const a = performance.now();
      gcDraw(gcTab);
      t.push(performance.now() - a);
    }
    t.sort((x, y) => x - y);
    return +t[30].toFixed(2);
  });
  const arrows = (on) => page.evaluate((on) => {
    const box = document.getElementById('graph-arrows');
    box.checked = on;
    box.dispatchEvent(new Event('change'));
  }, on);
  const zoom = (k) => page.evaluate((k) => { const t = gcTab.transform; gcTab.transform = d3.zoomIdentity.translate(t.x, t.y).scale(k); }, k);
  const out = { nodes: await page.evaluate(() => gcTab.nodes.length), edges: await page.evaluate(() => gcTab.edges.length) };
  const fitK = await page.evaluate(() => gcTab.transform.k);
  for (const [name, k] of [['fit', fitK], ['2x', 2]]) {
    await zoom(k);
    await arrows(false);
    out[`${name} off`] = await time();
    await arrows(true);
    out[`${name} on`] = await time();
  }
  await zoom(fitK);
  await page.evaluate(() => { const hub = [...gcTab.nodes].sort((a, b) => (gcTab.adj.get(b.id)?.size || 0) - (gcTab.adj.get(a.id)?.size || 0))[0]; gcTab.hoveredId = hub.id; });
  out['fit on, hovered hub'] = await time();
  await page.evaluate(() => { gcTab.hoveredId = null; });
  console.log(JSON.stringify(out));
  // A close look: 3x round the best-connected note.
  await page.evaluate(() => {
    const hub = [...gcTab.nodes].sort((a, b) => (gcTab.adj.get(b.id)?.size || 0) - (gcTab.adj.get(a.id)?.size || 0))[0];
    const k = 1.6;
    gcTab.transform = d3.zoomIdentity.translate(gcTab.dims.w / 2 - hub.x * k, gcTab.dims.h / 2 - hub.y * k).scale(k);
    gcRequestDraw();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/graphspark-${process.env.THEME || 'light'}.png`, clip: { x: 420, y: 250, width: 600, height: 400 } });
  await browser.close();
})();
