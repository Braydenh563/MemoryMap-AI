// What Atlas costs while the companion walks, per look: the feminine look's
// hip sash sways with the legs, and an animation on an element inside an
// svg repaints that svg on the main thread every frame, where the layer
// roots (body breathing, tail swish, lids, shimmer) move on the compositor.
// Measured the way companionperf.js measures: Performance metrics deltas,
// a devtools trace for the paints and layouts, over MS ms with
// `nmb-walking` held on #nm-buddy (the class the companion's own walk sets,
// avatars.js).
//
//   BASE=http://127.0.0.1:8820 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlaswalk.js
//   LOOKS=masculine,feminine MS=4000 TAG=before
//
// Prints one line per look: main-thread ms/s, paints/s, style recalcs/s,
// layouts/s, frames, and whether the walking class was still on at the end.
const fs = require('fs');
const os = require('os');
const { boot, OUT } = require('./lib.js');
const LOOKS = (process.env.LOOKS || 'masculine,feminine').split(',');
const MS = Number(process.env.MS || 4000);
const TAG = process.env.TAG || 'walk';

async function metrics(cdp) {
  const { metrics: m } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(m.map((x) => [x.name, x.value]));
}

(async () => {
  const out = {};
  for (const look of LOOKS) {
    const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    await page.evaluate((look) => {
      const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true }));
      const l = document.getElementById('atlas-look'); l.value = look; l.dispatchEvent(new Event('change', { bubbles: true }));
      localStorage.removeItem('nm-buddy-spots');
    }, look);
    await page.evaluate(() => revealTab('dashboard'));
    await page.waitForTimeout(5000);
    const have = await page.evaluate(() => ({
      look: document.querySelector('#nm-buddy .atl-layer-body')?.dataset.atlasLook,
      lower: !!document.querySelector('#nm-buddy .atl-layer-lower'),
      sash: !!document.querySelector('#nm-buddy .atl-lower'),
    }));
    await page.evaluate(() => {
      window.__frames = 0; window.__fstop = false;
      const tick = () => { window.__frames += 1; if (!window.__fstop) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      document.getElementById('nm-buddy').classList.add('nmb-walking');
    });
    const tracePath = `${os.tmpdir()}/atlaswalk-${process.pid}-${look}.json`;
    await browser.startTracing(page, { path: tracePath, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
    const a = await metrics(cdp);
    const t0 = Date.now();
    await page.waitForTimeout(MS);
    const secs = (Date.now() - t0) / 1000;
    const b = await metrics(cdp);
    await browser.stopTracing();
    const end = await page.evaluate(() => { window.__fstop = true; return { frames: window.__frames, walking: document.getElementById('nm-buddy').classList.contains('nmb-walking'), sashAnim: getComputedStyle(document.querySelector('#nm-buddy .atl-lower') || document.body).animationName, layerAnim: getComputedStyle(document.querySelector('#nm-buddy .atl-layer-lower') || document.body).animationName } });
    let paints = 0; let layouts = 0; let paintMs = 0;
    try {
      const trace = JSON.parse(fs.readFileSync(tracePath, 'utf8'));
      for (const e of trace.traceEvents || []) {
        if (e.name === 'Paint' && (e.ph === 'X' || e.ph === 'B')) { paints += 1; paintMs += (e.dur || 0) / 1000; }
        if (e.name === 'Layout' && (e.ph === 'X' || e.ph === 'B')) layouts += 1;
      }
      fs.unlinkSync(tracePath);
    } catch (e) { /* no trace */ }
    const d = (k) => b[k] - a[k];
    const r = {
      look, secs: +secs.toFixed(2), frames: end.frames, walking: end.walking, have, sashAnim: end.sashAnim, layerAnim: end.layerAnim,
      taskMsPerSec: +(d('TaskDuration') * 1000 / secs).toFixed(1),
      paintsPerSec: +(paints / secs).toFixed(1),
      paintMsPerSec: +(paintMs / secs).toFixed(2),
      stylesPerSec: +(d('RecalcStyleCount') / secs).toFixed(1),
      layoutsPerSec: +(layouts / secs).toFixed(1),
      styleMsPerSec: +(d('RecalcStyleDuration') * 1000 / secs).toFixed(2),
    };
    out[look] = r;
    console.log(`${look}: main thread ${r.taskMsPerSec} ms/s, paints ${r.paintsPerSec}/s (${r.paintMsPerSec} ms/s), style recalcs ${r.stylesPerSec}/s (${r.styleMsPerSec} ms/s), layouts ${r.layoutsPerSec}/s, ${r.frames} frames in ${r.secs}s; look ${have.look}, lower layer ${have.lower}, sash ${have.sash}, walking at end ${end.walking}, sash anim ${end.sashAnim}, layer anim ${end.layerAnim}`);
    await browser.close();
  }
  fs.writeFileSync(`${OUT}/atlas-${TAG}.json`, JSON.stringify(out, null, 1));
})();
