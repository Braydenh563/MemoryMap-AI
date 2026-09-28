// Boot time with a warm cache, for the app.js split (appjs-split.md, step 0
// and step 24): one browser context, one cold load, then RUNS reloads that
// revalidate from the cache the first load filled. For each load:
//
//   dcl     DOMContentLoaded end: every classic script parsed and run
//   ready   the frame the boot splash comes down, once initAuth has its
//           answer: the first moment the lock field or the tabs respond
//   js      script requests made, and their bytes over the wire
//
// Prints the cold load and the median of the warm ones.
//
//   BASE=http://127.0.0.1:8793 RUNS=9 node scratchpad/ui-sweeps/bootbench.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8793';
const RUNS = Number(process.env.RUNS || 9);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('onboardingDone', '1'); localStorage.setItem('tourDone', '1'); } catch {}
    const t0 = performance.now();
    //: Ready is the frame the boot splash is taken down: `hideBootSplash`
    //: (app.js) runs once `initAuth` has its answer, after every script has
    //: run, which is the first moment the lock field or the tabs respond.
    const tick = () => {
      const splash = document.getElementById('boot-splash');
      if (document.readyState !== 'loading' && (!splash || splash.classList.contains('hidden'))) {
        window.__ready = performance.now();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.__t0 = t0;
  });
  const page = await ctx.newPage();
  const measure = async () => {
    await page.waitForFunction(() => window.__ready !== undefined, null, { timeout: 30000 });
    return page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const js = performance.getEntriesByType('resource').filter((r) => /\.js(\?|$)/.test(r.name));
      return {
        dcl: Math.round(nav.domContentLoadedEventEnd),
        ready: Math.round(window.__ready),
        js: js.length,
        jsKB: Math.round(js.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
      };
    });
  };
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const cold = await measure();
  const warm = [];
  for (let i = 0; i < RUNS; i++) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    warm.push(await measure());
  }
  const med = (k) => { const v = warm.map((w) => w[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  console.log(JSON.stringify({ cold, warmMedian: { dcl: med('dcl'), ready: med('ready'), js: med('js'), jsKB: med('jsKB') }, warm: warm.map((w) => w.ready) }));
  await browser.close();
})();
