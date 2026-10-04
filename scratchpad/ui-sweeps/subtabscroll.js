// The sticky sub-tab strip stays readable over scrolled content (INBOX 529).
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  for (const [tab, id] of [['notes', 'notes-subtabs'], ['library', 'library-subtabs']]) {
    await page.evaluate((t) => switchTab(t), tab); await page.waitForTimeout(1200);
    const out = await page.evaluate(async (id) => {
      const strip = document.getElementById(id);
      let el = strip.parentElement; while (el && !(el.scrollHeight > el.clientHeight + 50 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
      const sc = el || document.scrollingElement; sc.scrollTop = 900; sc.dispatchEvent(new Event('scroll'));
      await new Promise((r) => setTimeout(r, 400));
      const s = getComputedStyle(strip), r = strip.getBoundingClientRect();
      const under = document.elementsFromPoint(r.left + 200, r.top + r.height / 2).slice(0, 4).map((e) => e.id || e.className.toString().slice(0, 30));
      return { scroller: sc.id || sc.className.toString().slice(0, 30), top: Math.round(sc.scrollTop), scrolled: strip.dataset.scrolled, bg: s.backgroundColor, blur: s.backdropFilter, stuckTop: Math.round(r.top), under };
    }, id);
    console.log(tab, JSON.stringify(out));
  }
  await browser.close();
})();
