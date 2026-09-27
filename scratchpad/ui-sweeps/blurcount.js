// Which elements draw a backdrop blur on a surface, and which of them sit
// inside a scroller (each of those is re-blurred on every scrolled frame).
//
//   BASE=http://127.0.0.1:8793 SURFACE=appearance LS='{"glass":"on"}' node scratchpad/ui-sweeps/blurcount.js
const { boot } = require('./lib.js');
const SURFACE = process.env.SURFACE || 'appearance';
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  if (process.env.LS) {
    await page.evaluate((ls) => { for (const [k, v] of Object.entries(JSON.parse(ls))) localStorage.setItem(k, v); }, process.env.LS);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    if (await page.isVisible('#lock-password').catch(() => false)) {
      await page.fill('#lock-password', 'testpassword123');
      await page.click('#lock-submit');
    }
    await page.waitForTimeout(3000);
  }
  if (['dashboard', 'notes', 'library'].includes(SURFACE)) await page.evaluate((s) => switchTab(s), SURFACE);
  else await page.evaluate((s) => openSettingsModal(s), SURFACE);
  await page.waitForTimeout(2000);
  const r = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      if (!el.checkVisibility()) continue;
      const s = getComputedStyle(el);
      const bf = s.backdropFilter;
      if (bf && bf !== 'none') {
        let scroller = null;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const o = getComputedStyle(p).overflowY;
          if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 1) { scroller = p.id || p.className.toString().slice(0, 30); break; }
        }
        const b = el.getBoundingClientRect();
        out.push({ el: (el.id ? '#' + el.id : '') + '.' + el.className.toString().split(' ').slice(0, 3).join('.'), bf, scroller, area: Math.round(b.width * b.height / 1000) + 'k' });
      }
    }
    return { glass: document.documentElement.dataset.glass, count: out.length, inScroller: out.filter((o) => o.scroller).length, out };
  });
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
