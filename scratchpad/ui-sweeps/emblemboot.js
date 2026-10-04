// The emblem drawn at boot with the avatar set to the app emblem (the owner's
// log, 2026-10-04: "ReferenceError: ACCENTS is not defined"). Counts page
// errors and unhandled rejections across a reload into Chat and Ask.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && /ACCENTS|Unhandled/.test(m.text())) errors.push(m.text()); });
  await page.evaluate(() => localStorage.setItem('assistant-avatar', 'emblem'));
  for (const tab of ['chat', 'notes', 'dashboard']) {
    await page.evaluate((t) => localStorage.setItem('activeTab', t), tab);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
  }
  console.log(errors.length ? `FAIL ${errors.length}: ${errors[0].slice(0, 160)}` : 'PASS 0 errors with the emblem avatar at boot');
  await browser.close();
})();
