// Style recalcs and layouts during one Atlas float, from a devtools.timeline
// trace: how many of each, the elements each recalc touched (UpdateLayoutTree
// elementCount), and the dirty objects of each layout. Env: BASE, KIND.
const fs = require('fs');
const os = require('os');
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(([k, look]) => {
    localStorage.setItem('atlas-look', look); localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy'); b.value = k; b.dispatchEvent(new Event('change', { bubbles: true }));
  }, [process.env.KIND || 'atlas', process.env.LOOK || 'masculine']);
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    clearTimeout(nmb.timer);
    window.nameMarkBuddySchedule = () => {}; window.nameMarkBuddyTick = () => {};
    window.nameMarkBuddyQueuePlace = () => {}; window.nameMarkBuddyCheck = () => {};
    const b = document.getElementById('nm-buddy'); nameMarkBuddyRide(null, 400, 420); nameMarkBuddyMoveTo(b, { kind: 'card', pose: 'stand', legs: '', x: 400, y: 420 }, true);
  });
  await page.waitForTimeout(800);
  const p = `${os.tmpdir()}/mtrace-${process.pid}.json`;
  await browser.startTracing(page, { path: p, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
  await page.evaluate(async () => {
    nameMarkBuddyMoveTo(document.getElementById('nm-buddy'), { kind: 'card', pose: 'stand', legs: '', x: 560, y: 380 });
    await new Promise((r) => setTimeout(r, 2600));
  });
  await browser.stopTracing();
  const ev = JSON.parse(fs.readFileSync(p, 'utf8')).traceEvents;
  fs.unlinkSync(p);
  const ul = ev.filter((e) => e.name === 'UpdateLayoutTree' && (e.ph === 'X' || e.ph === 'B'));
  const total = ul.reduce((s, e) => s + (e.dur || 0), 0) / 1000;
  const hist = {};
  for (const e of ul) { const c = e.args?.elementCount ?? e.args?.beginData?.elementCount ?? -1; const k = c < 0 ? '?' : c < 5 ? '<5' : c < 50 ? '<50' : c < 200 ? '<200' : '200+'; hist[k] = (hist[k] || 0) + 1; }
  console.log('UpdateLayoutTree', ul.length, 'total ms', total.toFixed(1), 'by elementCount', JSON.stringify(hist));
  const big = ul.filter((e) => (e.args?.elementCount ?? 0) >= 50).slice(0, 5).map((e) => JSON.stringify({ dur: e.dur, ts: e.ts, stack: (e.args?.beginData?.stackTrace || []).slice(0, 6).map((f) => `${f.functionName}:${f.lineNumber}`) }).slice(0, 400));
  console.log(big.join('\n'));
  const lay = ev.filter((e) => e.name === 'Layout' && e.ph === 'X');
  const lh = {};
  for (const e of lay) { const a = e.args?.beginData || {}; const k = `dirty ${a.dirtyObjects}/${a.totalObjects}`; lh[k] = (lh[k] || 0) + 1; }
  console.log('Layout', lay.length, 'total ms', (lay.reduce((s, e) => s + (e.dur || 0), 0) / 1000).toFixed(1), JSON.stringify(lh));
  const names = {};
  for (const e of ev) if (e.ph === 'X' && e.dur) names[e.name] = (names[e.name] || 0) + e.dur / 1000;
  console.log(Object.entries(names).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k} ${v.toFixed(1)}ms`).join('  '));
  await browser.close();
})();
