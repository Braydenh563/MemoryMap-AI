const { boot } = require('./lib.js');
(async () => {
  const errs = [];
  const { browser, page } = await boot();
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.fill('#lock-password', 'testpassword123').catch(() => {});
  await page.click('#lock-submit').catch(() => {});
  await page.waitForTimeout(4000);
  const r = await page.evaluate(() => ({ rd: typeof renderDashboard, toasts: [...document.querySelectorAll('#toast-box *')].map((t) => t.textContent).join('|').slice(0, 200) }));
  console.log(JSON.stringify({ errs, ...r }));
  await browser.close();
})();
