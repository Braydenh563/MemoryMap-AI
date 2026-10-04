// Style recalc over a whole quiet cycle: one float (Atlas moved between two
// places) followed by idle, REPS times, SECS seconds each (default 30), from
// CDP metrics. The float is the cost the pose/lean/tilt properties had; the
// idle is what an explicit-inherit link on an animated root can add; the sum
// per cycle is the honest number. Env: BASE, REPS (3), SECS (30), LOOK.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metric = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await page.evaluate((look) => {
    localStorage.setItem('atlas-look', look); localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true }));
  }, process.env.LOOK || 'masculine');
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    clearTimeout(nmb.timer);
    window.nameMarkBuddySchedule = () => {}; window.nameMarkBuddyTick = () => {};
    window.nameMarkBuddyQueuePlace = () => {}; window.nameMarkBuddyCheck = () => {};
  });
  const secs = Number(process.env.SECS || 30);
  const rows = [];
  for (let i = 0; i < Number(process.env.REPS || 3); i += 1) {
    const from = i % 2 ? [560, 380] : [400, 420]; const to = i % 2 ? [400, 420] : [560, 380];
    await page.evaluate(([f]) => { const b = document.getElementById('nm-buddy'); nameMarkBuddyRide(null, f[0], f[1]); nameMarkBuddyMoveTo(b, { kind: 'card', pose: 'stand', legs: '', x: f[0], y: f[1] }, true); }, [from]);
    await page.waitForTimeout(1500);
    const a = await metric();
    await page.evaluate(([t]) => { nameMarkBuddyMoveTo(document.getElementById('nm-buddy'), { kind: 'card', pose: 'stand', legs: '', x: t[0], y: t[1] }); }, [to]);
    await page.waitForTimeout(3000);
    const m = await metric();
    await page.waitForTimeout((secs - 3) * 1000);
    const b = await metric();
    rows.push({ floatMs: +((m.RecalcStyleDuration - a.RecalcStyleDuration) * 1000).toFixed(1), idleMsPerS: +(((b.RecalcStyleDuration - m.RecalcStyleDuration) * 1000) / (secs - 3)).toFixed(2), cycleMs: +((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000).toFixed(1) });
  }
  const mean = (k) => +(rows.reduce((s, r) => s + r[k], 0) / rows.length).toFixed(1);
  console.log(`float ${mean('floatMs')}ms  idle ${mean('idleMsPerS')}ms/s  cycle(${secs}s) ${mean('cycleMs')}ms`, JSON.stringify(rows));
  await browser.close();
})();
