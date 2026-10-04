// The big style recalcs of one Atlas float in order: each UpdateLayoutTree of
// 100+ elements with its duration, and the attribute mutations under
// #nm-buddy (marked with performance.mark) that came just before it, so the
// attribute behind each is named. Env: BASE, LOOK (masculine).
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate((look) => {
    localStorage.setItem('atlas-look', look); localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true }));
  }, process.env.LOOK || 'masculine');
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    clearTimeout(nmb.timer);
    window.nameMarkBuddySchedule = () => {}; window.nameMarkBuddyTick = () => {};
    window.nameMarkBuddyQueuePlace = () => {}; window.nameMarkBuddyCheck = () => {};
    const buddy = document.getElementById('nm-buddy');
    nameMarkBuddyRide(null, 400, 420);
    nameMarkBuddyMoveTo(buddy, { kind: 'card', pose: 'stand', legs: '', x: 400, y: 420 }, true);
    window.__mo = new MutationObserver((list) => { for (const m of list) performance.mark(`mut ${m.target.id || m.target.className.toString().split(' ')[0] || m.target.tagName} ${m.attributeName}=${m.target.getAttribute(m.attributeName)?.slice(0, 30)}`); });
    window.__mo.observe(buddy, { attributes: true, subtree: true, attributeFilter: ['class', 'data-pose', 'data-lean', 'data-atlas-variant', 'data-perch', 'data-legs', 'data-side', 'data-route', 'data-travel', 'data-gait', 'style'] });
  });
  await page.waitForTimeout(1500);
  const cdp = await page.context().newCDPSession(page);
  const events = [];
  cdp.on('Tracing.dataCollected', (d) => events.push(...d.value));
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline', 'blink.user_timing'] } });
  await page.evaluate(() => { nameMarkBuddyMoveTo(document.getElementById('nm-buddy'), { kind: 'card', pose: 'stand', legs: '', x: 560, y: 380 }); });
  await page.waitForTimeout(2800);
  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end'); await done;
  const rel = events.filter((e) => (e.name === 'UpdateLayoutTree' && e.ph === 'X') || (e.cat || '').includes('blink.user_timing')).sort((a, b) => a.ts - b.ts);
  const t0 = rel[0]?.ts || 0;
  for (const e of rel) {
    if (e.name === 'UpdateLayoutTree') {
      if ((e.args?.elementCount ?? 0) >= 100 || e.dur > 6000) console.log(`${((e.ts - t0) / 1000).toFixed(0).padStart(5)}ms  RECALC ${e.args?.elementCount} el  ${(e.dur / 1000).toFixed(1)}ms`);
    } else if (e.name.startsWith('mut ')) console.log(`${((e.ts - t0) / 1000).toFixed(0).padStart(5)}ms    ${e.name}`);
  }
  await browser.close();
})();
