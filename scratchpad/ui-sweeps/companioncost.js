// Companion main-thread cost: idle 2.6s, and a float (Atlas) or walk (as you)
// between two places, from CDP Performance.getMetrics deltas (style recalc
// ms and count, layouts, task ms). Env: BASE, KIND (atlas|me), REPS (3), ROUTE
// (float, glide, leap, ... forced for every move; the default is the real pick).
const { boot } = require('./lib.js');
const KIND = process.env.KIND || 'atlas';
const REPS = Number(process.env.REPS || 3);
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metric = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await page.evaluate((k) => {
    localStorage.setItem('atlas-look', 'masculine'); localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy'); b.value = k; b.dispatchEvent(new Event('change', { bubbles: true }));
  }, KIND);
  await page.waitForTimeout(3000);
  await page.evaluate((r) => {
    clearTimeout(nmb.timer);
    window.nameMarkBuddySchedule = () => {}; window.nameMarkBuddyTick = () => {};
    window.nameMarkBuddyQueuePlace = () => {}; window.nameMarkBuddyCheck = () => {};
    if (r) window.nameMarkBuddyRoute = () => r;
  }, process.env.ROUTE || "");
  const win = async (act) => {
    const a = await metric(); await act(); const b = await metric();
    const d = (k) => b[k] - a[k];
    return { recalcMs: +(d('RecalcStyleDuration') * 1000).toFixed(1), recalcs: d('RecalcStyleCount'), layouts: d('LayoutCount'), layoutMs: +(d('LayoutDuration') * 1000).toFixed(1), taskMs: +(d('TaskDuration') * 1000).toFixed(0) };
  };
  const out = { idle: [], move: [] };
  for (let i = 0; i < REPS; i += 1) {
    out.idle.push(await win(() => page.waitForTimeout(2600)));
    const from = i % 2 ? [560, 380] : [400, 420]; const to = i % 2 ? [400, 420] : [560, 380];
    await page.evaluate(([f]) => { const b = document.getElementById('nm-buddy'); nameMarkBuddyRide(null, f[0], f[1]); nameMarkBuddyMoveTo(b, { kind: 'card', pose: 'stand', legs: '', x: f[0], y: f[1] }, true); }, [from]);
    await page.waitForTimeout(700);
    out.move.push(await win(() => page.evaluate(async ([t]) => {
      const b = document.getElementById('nm-buddy');
      nameMarkBuddyMoveTo(b, { kind: 'card', pose: 'stand', legs: '', x: t[0], y: t[1] });
      await new Promise((r) => setTimeout(r, 2600));
    }, [to])));
  }
  const avg = (xs, k) => +(xs.reduce((s, x) => s + x[k], 0) / xs.length).toFixed(1);
  const sum = (xs) => ({ recalcMs: avg(xs, 'recalcMs'), recalcs: avg(xs, 'recalcs'), layouts: avg(xs, 'layouts'), layoutMs: avg(xs, 'layoutMs'), taskMs: avg(xs, 'taskMs') });
  console.log(KIND, 'idle', JSON.stringify(sum(out.idle)), 'move', JSON.stringify(sum(out.move)));
  console.log(JSON.stringify(out));
  await browser.close();
})();
