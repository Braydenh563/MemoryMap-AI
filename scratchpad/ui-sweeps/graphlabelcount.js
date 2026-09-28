// How many graph labels the fitted 24-note map draws (owner: "a bit much").
const {boot} = require('./lib');
(async () => {
  const {browser, page} = await boot();
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(9000);
  const out = await page.evaluate(() => {
    const box = document.getElementById('graph-box').getBoundingClientRect();
    const t = d3.zoomTransform(graphCanvas || document.getElementById('graph-canvas'));
    const ys = graphNodesRef.map(n => box.top + t.applyY(n.y));
    return {nodes: graphNodesRef.length, k: +t.k.toFixed(2), topGap: Math.round(Math.min(...ys) - box.top), bottomGap: Math.round(box.bottom - Math.max(...ys))};
  });
  console.log(JSON.stringify(out));
  await page.screenshot({path: '/tmp/claude-0/graphlabels.png'});
  await browser.close();
})();
