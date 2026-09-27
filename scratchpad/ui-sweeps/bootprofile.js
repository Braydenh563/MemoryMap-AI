// What the app does between the unlock and sitting still: the long tasks in
// the 8s after the password is accepted, main-thread ms per second over that
// window, and the app functions (inclusive) the sampling profiler saw. For
// "work done on boot that could wait until idle".
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/bootprofile.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE || 'http://127.0.0.1:8781';

(async () => {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((tab) => {
      try {
        localStorage.setItem('theme', 'light');
        localStorage.setItem('onboardingDone', '1');
        localStorage.setItem('tourDone', '1');
        localStorage.setItem('nm-buddy-hint', 'done');
        localStorage.setItem('activeTab', tab);
      } catch (e) {}
      window.__long = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true });
    }, process.env.TAB || 'notes');
    // OVERRIDE_JS="phone-shell.js=/path" serves a base commit's file, as lib.js does.
    if (process.env.OVERRIDE_JS) {
      const [name, file] = process.env.OVERRIDE_JS.split('=');
      const body = require('fs').readFileSync(file, 'utf8');
      await ctx.route(`**/${name}*`, (route) => route.fulfill({ body, contentType: 'application/javascript' }));
    }
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable');
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
    await page.fill('#lock-password', 'testpassword123');
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
    await cdp.send('Profiler.start');
    const at = await page.evaluate(() => performance.now());
    const get = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    let prev = await get();
    await page.click('#lock-submit');
    const per = [];
    for (let s = 0; s < 8; s++) {
      await page.waitForTimeout(1000);
      const now = await get();
      per.push(Math.round((now.TaskDuration - prev.TaskDuration) * 1000));
      prev = now;
    }
    const { profile } = await cdp.send('Profiler.stop');
    const long = (await page.evaluate(() => window.__long)).filter((x) => x.t >= at);
    const canvases = await page.evaluate(() => document.querySelectorAll('canvas.p5Canvas').length);
    console.log(`after unlock, ms of main thread per second: ${per.join(' ')}; p5 canvases on the page: ${canvases}`);
    console.log(`long tasks: ${long.length}, ${long.map((x) => `${x.d}ms@${Math.round((x.t - at) / 100) / 10}s`).join(' ')}`);
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const parent = new Map();
    for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
    const incl = new Map();
    const self = new Map();
    profile.samples.forEach((id, i) => {
      const dt = (profile.timeDeltas[i] || 0) / 1000;
      const sf = byId.get(id).callFrame;
      const sk = `${sf.functionName || '(anon)'}@${(sf.url || '').split('/').pop().split('?')[0]}:${sf.lineNumber + 1}`;
      self.set(sk, (self.get(sk) || 0) + dt);
      const seen = new Set();
      for (let n = id; n != null; n = parent.get(n)) {
        const f = byId.get(n).callFrame;
        if (!f.url || /codemirror|p5\.min|d3\./.test(f.url) || !f.functionName) continue;
        const k = `${f.functionName}@${f.url.split('/').pop().split('?')[0]}:${f.lineNumber + 1}`;
        if (seen.has(k)) continue;
        seen.add(k);
        incl.set(k, (incl.get(k) || 0) + dt);
      }
    });
    for (const [k, v] of [...self.entries()].filter(([k]) => !k.startsWith('(idle)')).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ${Math.round(v)}ms self  ${k}`);
    for (const [k, v] of [...incl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log(`  ${Math.round(v)}ms incl  ${k}`);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
