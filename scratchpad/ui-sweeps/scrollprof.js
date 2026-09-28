// Where the time goes while the Settings pane scrolls (INBOX 426 u, "slow
// and laggy"): a devtools.timeline trace over the same wheel as
// scrolljump.js, summed by event name (script, style, layout, paint,
// raster, composite), plus the top self-time JS functions from a CPU
// profile.
//
//   BASE=http://127.0.0.1:8793 THEME=dark SURFACE=appearance node scratchpad/ui-sweeps/scrollprof.js
const { boot } = require('./lib.js');
const SURFACE = process.env.SURFACE || 'appearance';

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  if (['dashboard', 'notes', 'library'].includes(SURFACE)) await page.evaluate((s) => switchTab(s), SURFACE);
  else await page.evaluate((s) => openSettingsModal(s), SURFACE);
  await page.waitForTimeout(2000);
  const box = await page.evaluate((s) => {
    const el = document.getElementById(`settings-${s}`) || document.getElementById(`tab-${s}`);
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: Math.min(r.top + 200, innerHeight / 2) };
  }, SURFACE);
  await page.mouse.move(box.x, box.y);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.start');
  const events = [];
  cdp.on('Tracing.dataCollected', (d) => events.push(...d.value));
  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
  const t0 = Date.now();
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(100); }
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(100); }
  const wall = Date.now() - t0;
  await cdp.send('Tracing.end');
  await done;
  const { profile } = await cdp.send('Profiler.stop');
  const sum = {};
  for (const e of events) {
    if (e.ph !== 'X' || !e.dur) continue;
    sum[e.name] = (sum[e.name] || 0) + e.dur / 1000;
  }
  const top = Object.entries(sum).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k} ${Math.round(v)}ms`);
  const self = {};
  const dt = profile.timeDeltas || [];
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, i) => {
    const n = byId.get(id);
    const f = n.callFrame;
    const key = `${f.functionName || '(anon)'} ${(f.url || '').split('/').pop().split('?')[0]}:${f.lineNumber + 1}`;
    self[key] = (self[key] || 0) + (dt[i] || 0) / 1000;
  });
  const js = Object.entries(self).filter(([k]) => !/^\((idle|program|garbage collector)\)/.test(k))
    .sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k} ${Math.round(v)}ms`);
  const frames = events.filter((e) => e.name === 'DrawFrame' || e.name === 'BeginFrame').length;
  console.log(JSON.stringify({ surface: SURFACE, wall, frames, dom: await page.evaluate(() => document.querySelectorAll('*').length), top, js }, null, 1));
  await browser.close();
})();
