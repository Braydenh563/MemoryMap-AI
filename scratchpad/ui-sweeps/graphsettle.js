// What opening the Graph costs after the first frame: main-thread ms in each
// second for 14s after `switchTab("graph")` on a first visit, from CDP
// Performance.getMetrics, plus a devtools.timeline trace of the whole window
// broken down by event (TRACE=1). The perf pass found Graph at 540 ms/s
// "idle" 2.5 to 7.5s after arriving, with script only 50 of it: the layout
// still settling and every tick repainting the whole canvas.
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/graphsettle.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({});
  try {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const get = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    if (process.env.TRACE) await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
    await page.evaluate(() => { window.__draws = 0; switchTab('graph'); });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      if (typeof gcDraw !== 'function') return;
      const real = gcDraw;
      window.gcDraw = function (...args) { window.__draws += 1; return real.apply(this, args); };
    });
    const per = [];
    let prev = await get();
    let prevDraws = 0;
    for (let s = 0; s < 14; s++) {
      await page.waitForTimeout(1000);
      const now = await get();
      const draws = await page.evaluate(() => window.__draws);
      per.push(`${s + 1}s:${Math.round((now.TaskDuration - prev.TaskDuration) * 1000)}ms/${draws - prevDraws}d`);
      prev = now;
      prevDraws = draws;
    }
    console.log('graph first visit, ms of main thread and draws per second:', per.join(' '));
    const alpha = await page.evaluate(() => ({ nodes: gcTab.nodes.length, running: Boolean(gcTab.worker), frames: gcTab.timing && gcTab.timing.frames, settledAt: gcTab.timing && Math.round(gcTab.timing.lastFrame - gcTab.timing.dataAt) }));
    console.log('state', JSON.stringify(alpha));
    if (process.env.TRACE) {
      const ev = JSON.parse((await browser.stopTracing()).toString()).traceEvents;
      const main = new Map();
      for (const e of ev) if (e.name === 'FunctionCall') main.set(`${e.pid}:${e.tid}`, (main.get(`${e.pid}:${e.tid}`) || 0) + 1);
      const key = [...main.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const by = {};
      for (const e of ev) {
        if (e.ph !== 'X' || !e.dur || `${e.pid}:${e.tid}` !== key || e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask') continue;
        by[e.name] = (by[e.name] || 0) + e.dur / 1000;
      }
      console.log('top:', Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k} ${Math.round(v)}`).join(', '));
    }
  } finally {
    await browser.close();
  }
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
