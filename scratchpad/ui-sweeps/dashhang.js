// INBOX 513: a stats request that never answers ends in Retry, and Retry draws.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => {
    window.__realFetch = window.fetch;
    window.fetch = (u, o) => String(u).includes('/insights/stats')
      ? new Promise((_, rej) => o?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))))
      : window.__realFetch(u, o);
    switchTab('dashboard'); renderDashboard();
  });
  await page.waitForTimeout(17000);
  const stuck = await page.evaluate(() => ['stats', 'streak'].map((w) => document.querySelector(`[data-widget="${w}"] .dash-body`).textContent.trim()));
  await page.evaluate(() => { window.fetch = window.__realFetch; });
  await page.evaluate(() => document.querySelector('[data-widget="stats"] .dash-body button').click());
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => document.querySelector('[data-widget="stats"] .dash-body').textContent.trim().slice(0, 40));
  console.log(JSON.stringify({ stuck, after }));
  await browser.close();
})();
