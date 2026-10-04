// The graph's bottom corner on a phone: the zoom stack, the legend and the
// floating New note, and whether any two of them overlap (INBOX 479).
//   BASE=... W=390 node graphcorner.js
const { boot } = require('./lib.js');
const W = Number(process.env.W || 390);
(async () => {
  const phone = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: phone ? 844 : 900 }, hasTouch: phone || undefined, isMobile: phone || undefined });
  await page.click('[data-tab="graph"]').catch(() => {});
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const box = (sel) => { const e = document.querySelector(sel); if (!e || !e.checkVisibility()) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom) }; };
    const parts = { zoom: box('#graph-zoom'), legend: box('.graph-legend:not(.hidden), #graph-legend'), fab: box('.dock-fab'), minimap: box('#graph-minimap, .graph-minimap') };
    const names = Object.keys(parts).filter((k) => parts[k]);
    const overlaps = [];
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      const a = parts[names[i]], b = parts[names[j]];
      const w = Math.min(a.r, b.r) - Math.max(a.x, b.x), h = Math.min(a.b, b.b) - Math.max(a.y, b.y);
      if (w > 0 && h > 0) overlaps.push(`${names[i]}/${names[j]} ${w}x${h}`);
    }
    return { parts, overlaps };
  });
  console.log(W, JSON.stringify(r));
  await browser.close();
})();
