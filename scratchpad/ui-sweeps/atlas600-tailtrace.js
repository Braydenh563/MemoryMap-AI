// INBOX 600: what moves the tail in the frames round a poke and its mood's
// end, in Atlas's large view: every box on the tail's chain, per frame.
//   BASE=... LOOK=feminine node atlas600-tailtrace.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 800 } });
  await page.evaluate((look) => { localStorage.setItem('atlas-look', look); document.documentElement.dataset.avatarMotion = 'always'; }, process.env.LOOK || 'masculine');
  await page.evaluate(() => openNameMarkViewer('Atlas'));
  await page.waitForTimeout(1500);
  const rows = await page.evaluate(async () => {
    const fig = document.querySelector('.nm-viewer .nm-viewer-figure');
    const els = { box: '.atl-figure-box', lw: '.atl-lw-tail', pose: '.atl-lw-pose-tail', layer: 'svg.atl-layer-tail', tip: '.atl-lw-tip' };
    const out = [];
    const t0 = performance.now();
    let poked = false;
    let last = null;
    while (performance.now() - t0 < 7000) {
      await new Promise((r) => requestAnimationFrame(r));
      const t = Math.round(performance.now() - t0);
      if (!poked && t > 300) { fig.querySelector('.name-mark').dispatchEvent(new MouseEvent('click', { bubbles: true })); poked = true; }
      const r = fig.querySelector('.atl-layer-tail .atl-tail-core').getBoundingClientRect();
      const c = [r.left + r.width / 2, r.top + r.height / 2];
      const row = { t, mood: fig.querySelector('.atl-figure-box').dataset.atlasMood, d: last ? +Math.hypot(c[0] - last[0], c[1] - last[1]).toFixed(2) : 0 };
      for (const [k, s] of Object.entries(els)) {
        const el = fig.querySelector(s);
        if (!el) continue;
        const cs = getComputedStyle(el);
        row[k] = [cs.transform === 'none' ? '' : cs.transform.replace(/matrix\(|\)/g, '').split(',').map((v) => (+v).toFixed(2)).join(','), cs.rotate === 'none' ? '' : cs.rotate, el.getAnimations().map((a) => a.animationName || a.id).join('+')].join(' ');
      }
      last = c;
      out.push(row);
    }
    return out;
  });
  // The frames whose step is over 2px, with the frame before.
  rows.forEach((row, i) => { if (row.d > 2) console.log(JSON.stringify(rows[i - 1]), '\n', JSON.stringify(row)); });
  await browser.close();
})();
