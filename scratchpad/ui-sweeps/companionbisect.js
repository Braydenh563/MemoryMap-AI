// Which running animation costs the style recalcs: pause every animation in the
// companion, then let each animation name run alone for 1.5s and read CDP
// RecalcStyleCount/Duration. Env: BASE, KIND (atlas).
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metric = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await page.evaluate(() => {
    localStorage.setItem('atlas-look', 'masculine'); localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(4000);
  await page.evaluate(() => { clearTimeout(nmb.timer); window.nameMarkBuddySchedule = () => {}; window.nameMarkBuddyTick = () => {}; });
  const names = await page.evaluate(() => [...new Set(document.getElementById('nm-buddy').getAnimations({ subtree: true }).map((a) => a.animationName))]);
  const run = async (label, only) => {
    await page.evaluate((only) => {
      for (const a of document.getElementById('nm-buddy').getAnimations({ subtree: true })) {
        if (!only || only.includes(a.animationName)) a.play(); else a.pause();
      }
    }, only);
    await page.waitForTimeout(300);
    const a = await metric(); await page.waitForTimeout(1500); const b = await metric();
    console.log(label.padEnd(20), 'recalcs', b.RecalcStyleCount - a.RecalcStyleCount, 'ms', ((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000).toFixed(1), 'layouts', b.LayoutCount - a.LayoutCount);
  };
  await run('(all paused)', []);
  for (const n of names) await run(n, [n]);
  await run('(all running)', null);
  await browser.close();
})();
