// Atlas in the large view (avatars.js `openNameMarkViewer`): which layer
// roots animate there (the skirt's drift, the nebula's, the breath), and
// what it costs: paints and layouts a second from a trace over 4s, per look.
//
//   BASE=... LOOKS=masculine,feminine node atlasviewer.js
//
// Exits 1 when a look's nebula (and, for the feminine, its skirt) does not
// animate in the large view, or when the view lays out every frame.
const fs = require('fs');
const os = require('os');
const { boot, OUT } = require('./lib.js');

(async () => {
  let bad = false;
  for (const look of (process.env.LOOKS || 'masculine,feminine').split(',')) {
    const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
    await page.evaluate((look) => { localStorage.setItem('atlas-look', look); document.documentElement.dataset.avatarMotion = 'always'; }, look);
    await page.evaluate(() => openNameMarkViewer('Atlas'));
    await page.waitForTimeout(1500);
    const anims = await page.evaluate(() => {
      const out = {};
      for (const svg of document.querySelectorAll('.nm-viewer svg.atl-layer')) {
        const a = getComputedStyle(svg).animationName;
        if (a && a !== 'none') out[svg.dataset.atlasLayer] = a;
      }
      return out;
    });
    const tp = `${os.tmpdir()}/viewer-${process.pid}.json`;
    await browser.startTracing(page, { path: tp, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
    const t0 = Date.now();
    await page.waitForTimeout(4000);
    const secs = (Date.now() - t0) / 1000;
    await browser.stopTracing();
    let paints = 0; let layouts = 0;
    for (const e of JSON.parse(fs.readFileSync(tp, 'utf8')).traceEvents) {
      if (e.name === 'Paint' && e.ph === 'X') paints += 1;
      if (e.name === 'Layout' && e.ph === 'X') layouts += 1;
    }
    fs.unlinkSync(tp);
    await page.screenshot({ path: `${OUT}/atlas-viewer-${look}.png`, clip: { x: 520, y: 180, width: 400, height: 520 } });
    const r = { look, anims, paintsPerSec: +(paints / secs).toFixed(2), layoutsPerSec: +(layouts / secs).toFixed(2) };
    console.log(JSON.stringify(r));
    if (!anims.neb || (look === 'feminine' && !anims.lower) || r.layoutsPerSec > 2) bad = true;
    await browser.close();
  }
  console.log(bad ? 'FAIL' : 'PASS');
  process.exitCode = bad ? 1 : 0;
})();
