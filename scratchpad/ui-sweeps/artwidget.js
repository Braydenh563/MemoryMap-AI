// INBOX 513: the dashboard's Notebook constellation draws (canvas, legend).
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(Number(process.env.WAIT || 4000));
  const out = await page.evaluate(() => {
    const h = document.querySelector('.art-holder');
    if (!h) return { holder: false, widgets: [...document.querySelectorAll('[data-widget]')].map((w) => w.dataset.widget).join(',') };
    const c = h.querySelector('canvas');
    return { holder: true, text: h.textContent.trim().slice(0, 80), canvas: c && [c.width, c.height, getComputedStyle(c).display],
      holderH: Math.round(h.getBoundingClientRect().height), legend: document.querySelectorAll('.art-legend-item').length, p5: typeof p5 };
  });
  console.log(JSON.stringify({ ...out, errs }));
  await browser.close();
})();
