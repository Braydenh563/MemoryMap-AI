// The owner, 2026-10-10: "I went onto the radial view and it put me on a random
// corner". Opens the Graph, waits WAIT ms (5000 lands in the force cooling
// window where the race was), switches through SEQ by the picker and prints
// the layout box centre against the view centre (off, px) and the scale.
//   BASE=... SEQ=radial,tree WAIT=5000 node scratchpad/ui-sweeps/graphviewswitch.js
const { boot } = require('./lib.js');
const measure = () => {
  const s = gcTab, t = s.transform, W = s.dims.w, H = s.dims.h;
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const n of s.nodes) { const x = n.x * t.k + t.x, y = n.y * t.k + t.y; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  return { layout: s.layoutKind, k: +t.k.toFixed(3), off: [Math.round((minX + maxX) / 2 - W / 2), Math.round((minY + maxY) / 2 - H / 2)], W, H, op: s.canvas.style.opacity };
};
(async () => {
  const vp = (process.env.VP || '1440x900').split('x').map(Number);
  const { browser, page } = await boot({ viewport: { width: vp[0], height: vp[1] } });
  await page.evaluate((l) => { localStorage.setItem('graph-layout', l); }, process.env.START || 'force');
  await page.click('[data-tab="graph"]');
  await page.waitForTimeout(+(process.env.WAIT || 800));
  console.log('start', JSON.stringify(await page.evaluate(measure)));
  for (const lay of (process.env.SEQ || 'radial,tree').split(',')) {
    if (!(await page.isVisible('#graph-layout'))) await page.click('#graph-options-toggle');
    await page.waitForTimeout(200);
    await page.selectOption('#graph-layout', lay);
    for (const ms of [700, 3000]) { await page.waitForTimeout(ms); console.log(lay, ms, JSON.stringify(await page.evaluate(measure))); }
  }
  await page.screenshot({ path: process.env.SCRATCH + '/shots/viewswitch3.png' });
  await browser.close();
})();
