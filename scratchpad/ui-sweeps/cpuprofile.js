// Self time by function over a window, from the V8 sampling profiler.
//
//   ACTION=graph   the first visit to Graph, 5s from the switch
//   ACTION=idle    TAB's idle, 5s after a 2.5s settle
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     ACTION=graph node scratchpad/ui-sweeps/cpuprofile.js
const { boot } = require('./lib.js');

const ACTION = process.env.ACTION || 'graph';
const TAB = process.env.TAB || 'notes';
const MS = Number(process.env.MS || 5000);

(async () => {
  const { browser, page } = await boot({});
  try {
    const cdp = await page.context().newCDPSession(page);
    if (process.env.COMPANION) {
      await page.evaluate((k) => { const b = document.getElementById('avatar-buddy'); b.value = k; b.dispatchEvent(new Event('change', { bubbles: true })); }, process.env.COMPANION);
      await page.waitForTimeout(800);
    }
    if (ACTION === 'idle') {
      await page.evaluate((t) => switchTab(t), TAB);
      await page.waitForTimeout(2500);
    }
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
    await cdp.send('Profiler.start');
    if (ACTION === 'graph') await page.evaluate(() => switchTab('graph'));
    await page.waitForTimeout(MS);
    const { profile } = await cdp.send('Profiler.stop');
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const self = new Map();
    const dt = profile.timeDeltas;
    profile.samples.forEach((id, i) => {
      const n = byId.get(id);
      const f = n.callFrame;
      const k = `${f.functionName || '(anon)'}@${(f.url || '').split('/').pop().split('?')[0]}:${f.lineNumber + 1}`;
      self.set(k, (self.get(k) || 0) + (dt[i] || 0) / 1000);
    });
    const total = [...self.values()].reduce((a, b) => a + b, 0);
    console.log(`${ACTION} ${TAB}: ${Math.round(total)}ms sampled`);
    for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)) console.log(`  ${Math.round(v)}ms  ${k}`);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
