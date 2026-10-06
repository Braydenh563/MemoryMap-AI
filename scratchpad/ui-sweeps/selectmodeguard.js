// INBOX 492: purgeLockedContent (app.js) emptied #timeline-scroll, which holds
// the static #timeline-feed and #timeline-table. After a lock the next press of
// the Notes select button reached paintTimeline with those gone. This locks the
// notebook the way the app does, then presses the button twice, and lists every
// id that existed before the purge and not after it. Zero errors, zero lost ids
// is the pass.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.waitForTimeout(500);
  const lost = await page.evaluate(() => {
    const before = new Set([...document.querySelectorAll('[id]')].map((e) => e.id));
    purgeLockedContent();
    return [...before].filter((id) => !document.getElementById(id));
  });
  console.log('ids lost by the purge:', JSON.stringify(lost));
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => document.getElementById('select-btn').click());
    await page.waitForTimeout(400);
  }
  console.log('errors', errors.length, errors.join(' | '));
  await browser.close();
  process.exit(errors.length || lost.length ? 1 : 0);
})();
