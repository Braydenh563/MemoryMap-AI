// Idle (no move) style recalc of the Atlas companion: N windows of 2s from CDP
// metrics, mean and min. Env: BASE, N (8), LOOK (masculine).
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
  await page.waitForTimeout(3500);
  await page.evaluate(() => { clearTimeout(nmb.timer); window.nameMarkBuddySchedule = () => {}; window.nameMarkBuddyTick = () => {}; window.nameMarkBuddyQueuePlace = () => {}; window.nameMarkBuddyCheck = () => {}; });
  const xs = []; const cs = [];
  for (let i = 0; i < Number(process.env.N || 8); i += 1) {
    const a = await metric(); await page.waitForTimeout(2000); const b = await metric();
    xs.push((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000); cs.push(b.RecalcStyleCount - a.RecalcStyleCount);
  }
  const mean = (v) => +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(1);
  console.log('idle recalc ms mean', mean(xs), 'min', +Math.min(...xs).toFixed(1), 'recalcs mean', mean(cs));
  await browser.close();
})();
