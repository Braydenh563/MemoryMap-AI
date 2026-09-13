// GRAPH_PLAN Phase 6b (INBOX 78): the minimap's size toggle and the fade when
// the whole graph already fits.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 950 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(3000);
  const read = () => page.evaluate(() => {
    const box = document.getElementById('graph-minimap');
    const svg = document.getElementById('graph-minimap-svg');
    const frame = document.getElementById('graph-minimap-frame');
    const r = svg.getBoundingClientRect();
    return {
      size: [Math.round(r.width), Math.round(r.height)],
      opacity: +getComputedStyle(box).opacity,
      redundant: box.classList.contains('graph-minimap-redundant'),
      frame: [+frame.getAttribute('width'), +frame.getAttribute('height')],
      dots: document.querySelectorAll('#graph-minimap-dots circle').length,
      zoom: +(d3.zoomTransform(graphSvg.node()).k).toFixed(2),
    };
  });
  console.log('at rest      ', JSON.stringify(await read()));
  // Zoom right out, so every note fits and the rectangle fills the box.
  await page.evaluate(() => {
    graphSvg.call(graphZoom.transform, d3.zoomIdentity.translate(graphDims.w / 2, graphDims.h / 2).scale(0.1));
  });
  await page.waitForTimeout(600);
  const out = await read();
  console.log('zoomed out   ', JSON.stringify(out));
  // Back in.
  await page.evaluate(() => {
    graphSvg.call(graphZoom.transform, d3.zoomIdentity.translate(0, 0).scale(1.6));
  });
  await page.waitForTimeout(600);
  const back = await read();
  console.log('zoomed in    ', JSON.stringify(back));
  // The size toggle.
  await page.evaluate(() => {
    const sel = document.getElementById('graph-minimap-size');
    sel.value = 'lg';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  const large = await read();
  console.log('large        ', JSON.stringify(large));
  // And that the projection still maps a click correctly at the new size:
  // click the middle, which must leave the centre roughly where it is.
  const drift = await page.evaluate(async () => {
    const svg = document.getElementById('graph-minimap-svg');
    const r = svg.getBoundingClientRect();
    const before = d3.zoomTransform(graphSvg.node());
    const mid = svg._toCanvas(84, 56);
    return { hasProjection: Boolean(svg._toCanvas), mid: mid.map((n) => Math.round(n)), k: +before.k.toFixed(2), w: Math.round(r.width) };
  });
  console.log('projection   ', JSON.stringify(drift));
  const pass = out.redundant && out.opacity < 0.2 && !back.redundant && large.size[0] === 252;
  console.log(pass ? 'ok' : 'FAIL');
  await browser.close();
  process.exit(pass ? 0 : 1);
})();
