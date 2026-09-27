// A warm revisit of the Graph: open it, let it settle, leave for Notes, and
// come back, with the long tasks of the 3s after the return and the app
// functions (inclusive time) the sampling profiler saw in them. perfpass.js
// found 5 to 6 long tasks of up to 111ms after a *warm* switch, where the
// settled layout is meant to be reused.
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/graphrevisit.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({});
  try {
    const cdp = await page.context().newCDPSession(page);
    await page.evaluate(() => switchTab('graph'));
    await page.waitForTimeout(9000);
    await page.evaluate(() => switchTab('notes'));
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.__long = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: 'longtask' });
    });
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    await cdp.send('Profiler.start');
    const ms = await page.evaluate(async () => {
      const t0 = performance.now();
      await switchTab('graph');
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return Math.round(performance.now() - t0);
    });
    await page.waitForTimeout(3000);
    const { profile } = await cdp.send('Profiler.stop');
    const long = await page.evaluate(() => window.__long);
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const parent = new Map();
    for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
    const incl = new Map();
    let program = 0;
    profile.samples.forEach((id, i) => {
      const dt = (profile.timeDeltas[i] || 0) / 1000;
      if (byId.get(id).callFrame.functionName === '(program)') program += dt;
      const seen = new Set();
      for (let n = id; n != null; n = parent.get(n)) {
        const f = byId.get(n).callFrame;
        if (!f.url || /codemirror|p5\.min|d3\./.test(f.url)) continue;
        const k = `${f.functionName || '(anon)'}@${f.url.split('/').pop().split('?')[0]}:${f.lineNumber + 1}`;
        if (seen.has(k)) continue;
        seen.add(k);
        incl.set(k, (incl.get(k) || 0) + dt);
      }
    });
    console.log(`warm revisit: switch ${ms}ms; long tasks ${JSON.stringify(long)}; (program) ${Math.round(program)}ms`);
    for (const [k, v] of [...incl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`  ${Math.round(v)}ms incl  ${k}`);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
