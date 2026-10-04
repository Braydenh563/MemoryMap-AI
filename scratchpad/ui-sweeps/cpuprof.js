// CPU profile of one action in the running app, self time by function
// (INBOX 472). ACTION is a JS expression run in the page; the profile covers
// it plus SETTLE ms after.
//
//   BASE=... ACTION="switchTab('library')" node scratchpad/ui-sweeps/cpuprof.js
const { boot } = require('./lib.js');
const ACTION = process.env.ACTION || "switchTab('library')";
const SETTLE = Number(process.env.SETTLE || 1500);
(async () => {
  const { browser, page } = await boot();
  if (process.env.BEFORE) { await page.evaluate(process.env.BEFORE); await page.waitForTimeout(1500); }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  const t0 = Date.now();
  await page.evaluate(ACTION);
  await page.waitForTimeout(SETTLE);
  const { profile } = await cdp.send('Profiler.stop');
  const dt = profile.timeDeltas; const self = new Map();
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, i) => { self.set(id, (self.get(id) || 0) + (dt[i] || 0)); });
  const agg = new Map();
  for (const [id, us] of self) {
    const n = byId.get(id); const f = n.callFrame;
    if (['(idle)', '(program)', '(garbage collector)'].includes(f.functionName) && !process.env.ALL) { if (f.functionName !== '(garbage collector)') continue; }
    const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop().split('?')[0]}:${f.lineNumber + 1}`;
    agg.set(key, (agg.get(key) || 0) + us);
  }
  const top = [...agg].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.TOP || 18));
  const total = [...agg.values()].reduce((a, b) => a + b, 0);
  console.log(`busy ${(total / 1000).toFixed(0)} ms over ${Date.now() - t0} ms`);
  for (const [k, us] of top) console.log(`${(us / 1000).toFixed(1).padStart(7)}  ${k}`);
  await browser.close();
})();
