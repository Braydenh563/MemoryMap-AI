// Serve docs/ first: python3 -m http.server 8793 --bind 127.0.0.1 --directory docs
// Landing page sweep: console errors, failed or external requests, horizontal
// overflow, broken images, at five widths in light and dark.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8793/index.html';
(async () => {
  const browser = await chromium.launch();
  const out = {};
  for (const scheme of ['light', 'dark']) {
    for (const w of [320, 390, 768, 1440, 1920]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme });
      const page = await ctx.newPage();
      const errors = [], failed = [], external = [];
      page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
      page.on('pageerror', e => errors.push(String(e)));
      page.on('requestfailed', r => failed.push(r.url()));
      page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
      page.on('request', r => { const u = r.url(); if (!u.startsWith('http://127.0.0.1:8793/') && !u.startsWith('data:') && !u.startsWith('file:')) external.push(u); });
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => { for (const i of document.images) i.loading = 'eager'; window.scrollTo(0, document.body.scrollHeight); });
      await page.waitForTimeout(1500);
      const m = await page.evaluate(() => {
        const de = document.documentElement;
        const wide = [...document.querySelectorAll('body *')].filter(e => {
          const r = e.getBoundingClientRect();
          if (e.closest('dialog') || e.classList.contains('skip')) return false;
          return r.width > 0 && (r.right > de.clientWidth + 0.5 || r.left < -0.5);
        }).slice(0, 5).map(e => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right));
        const broken = [...document.images].filter(i => i.getAttribute('src') && (!i.complete || i.naturalWidth === 0)).map(i => i.getAttribute('src'));
        return { sw: de.scrollWidth, cw: de.clientWidth, wide, broken, imgs: document.images.length };
      });
      out[scheme + w] = { ...m, errors, failed, external };
      await ctx.close();
    }
  }
  console.log(JSON.stringify(out));
  await browser.close();
})();
