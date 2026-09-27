const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 320, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  const r = await page.evaluate(() => {
    if (typeof openSettings === 'function') openSettings();
    else document.getElementById('settings-modal').classList.remove('hidden');
    return true;
  });
  await page.waitForTimeout(500);
  const rects = await page.evaluate(() => {
    const rectOf = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) };
    };
    return {
      close: rectOf('#settings-close'),
      navBack: rectOf('#settings-nav-back'),
      search: rectOf('#settings-search'),
    };
  });
  console.log(JSON.stringify({ r, rects, errors }, null, 1));
  await browser.close();
})().catch((e) => { console.error('SWEEP_ERROR', e.message); process.exit(1); });
