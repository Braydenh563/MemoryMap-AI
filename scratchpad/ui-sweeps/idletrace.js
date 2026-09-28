// What a tab does while nobody touches it: a 4s devtools.timeline trace
// after a 2.5s settle, main-thread events by count and time, and which
// elements are restyled by an animation (the invalidation tracking names
// them). TABS, COMPANION (atlas, off).
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     TABS=timeline,reminders node scratchpad/ui-sweeps/idletrace.js
const { boot } = require('./lib.js');

const TABS = (process.env.TABS || 'timeline').split(',');

(async () => {
  const { browser, page } = await boot({});
  try {
    if (process.env.COMPANION) {
      await page.evaluate((k) => { const b = document.getElementById('avatar-buddy'); b.value = k; b.dispatchEvent(new Event('change', { bubbles: true })); }, process.env.COMPANION);
      await page.waitForTimeout(800);
    }
    for (const tab of TABS) {
      await page.evaluate((t) => switchTab(t), tab);
      await page.waitForTimeout(2500);
      await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.invalidationTracking'] });
      await page.waitForTimeout(4000);
      const ev = JSON.parse((await browser.stopTracing()).toString()).traceEvents;
      const main = new Map();
      for (const e of ev) if (e.name === 'UpdateLayoutTree' || e.name === 'Paint' || e.name === 'FunctionCall') main.set(`${e.pid}:${e.tid}`, (main.get(`${e.pid}:${e.tid}`) || 0) + 1);
      const key = [...main.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const count = {};
      const time = {};
      const inval = {};
      for (const e of ev) {
        if (/Invalidat/.test(e.name)) {
          const d = (e.args && e.args.data) || {};
          const k = `${(d.nodeName || '').slice(0, 70)} ${d.reason || ''}`;
          inval[k] = (inval[k] || 0) + 1;
        }
        if (`${e.pid}:${e.tid}` !== key || e.ph !== 'X' || !e.dur) continue;
        if (/^(RunTask|ThreadControllerImpl::RunTask)$/.test(e.name)) continue;
        count[e.name] = (count[e.name] || 0) + 1;
        time[e.name] = (time[e.name] || 0) + e.dur / 1000;
      }
      const top = Object.keys(time).sort((a, b) => time[b] - time[a]).slice(0, 8).map((k) => `${k} ${count[k]}x ${Math.round(time[k])}ms`);
      console.log(`${tab}: ${top.join(', ')}`);
      for (const [k, v] of Object.entries(inval).sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`    ${v}x ${k}`);
    }
  } finally {
    await browser.close();
  }
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
