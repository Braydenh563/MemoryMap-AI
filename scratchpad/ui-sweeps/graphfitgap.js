// The fitted graph's empty band at the bottom (owner, 0.3.31): where the
// fitted nodes end against the box, and what chrome sits over the box.
const {boot} = require('./lib');
(async () => {
  const {browser, page} = await boot();
  await page.evaluate(async () => {
    const cats = ['Uni', 'Gym', 'Food', 'Ideas'];
    for (let i = 0; i < 24; i++) {
      await apiJson('/entries', {method: 'POST', body: JSON.stringify({content: `Note number ${i} about ${cats[i % 4]} things`, category: cats[i % 4]})});
    }
  });
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(6000);
  await page.evaluate(() => $("graph-fit")?.click());
  await page.waitForTimeout(1500);
  const out = await page.evaluate(() => {
    const box = document.getElementById('graph-box').getBoundingClientRect();
    const t = d3.zoomTransform(graphCanvas || document.getElementById('graph-canvas'));
    const ys = graphNodesRef.map(n => box.top + t.applyY(n.y));
    const covers = [...document.querySelectorAll('#graph-box > *, .graph-page *')]
      .filter(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        return r.height > 0 && r.bottom > box.bottom - 200 && r.top < box.bottom && cs.position === 'absolute' && cs.visibility !== 'hidden' && cs.display !== 'none'; })
      .slice(0, 12).map(el => ({id: el.id, cls: el.className?.toString().slice(0, 40), top: Math.round(el.getBoundingClientRect().top), h: Math.round(el.getBoundingClientRect().height)}));
    return {box: {top: Math.round(box.top), bottom: Math.round(box.bottom), h: Math.round(box.height)}, dimsH: graphDims.h, minY: Math.round(Math.min(...ys)), maxY: Math.round(Math.max(...ys)), covers};
  });
  console.log(JSON.stringify(out, null, 1));
  await page.screenshot({path: process.env.OUT || '/tmp/claude-0/graphfit.png'});
  await browser.close();
})();
