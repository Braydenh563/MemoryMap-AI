// UX-18 (audit 2026-10-05): the notes dock (Filter notes, sort, Select) stays
// on screen under the sub-tab strip after a long scroll, on an opaque ground,
// and the strip is not covered.   BASE=... W=390 THEME=dark node ux1005-stickydock.js
const { boot } = require('./lib');

(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 }, ...(W < 600 ? { isMobile: true, hasTouch: true } : {}) });
  await page.evaluate(async () => { await switchTab('notes'); showNotesSection('browse'); });
  await page.waitForTimeout(2000);
  await page.mouse.move(Math.round(W / 2), 600);
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(300); }
  await page.waitForTimeout(800);
  const got = await page.evaluate(() => {
    const filter = document.getElementById('note-search');
    const dock = document.querySelector('[data-dock-name="notes"]');
    const strip = document.getElementById('notes-subtabs');
    const f = filter.getBoundingClientRect();
    const d = dock.getBoundingClientRect();
    const s = strip.getBoundingClientRect();
    const hit = document.elementFromPoint(f.left + 10, f.top + f.height / 2);
    return {
      filterTop: Math.round(f.top), dockTop: Math.round(d.top), dockBottom: Math.round(d.bottom),
      stripBottom: Math.round(s.bottom), scrolled: dock.dataset.scrolled || '',
      bg: getComputedStyle(dock).backgroundColor,
      filterOnTop: hit === filter || filter.contains(hit),
      firstCardTop: Math.round(document.querySelector('#entry-list > li[data-id]').getBoundingClientRect().top),
    };
  });
  console.log(JSON.stringify({ W, ...got }));
  const ok = got.filterTop >= got.stripBottom - 1 && got.filterTop < 400 && got.filterOnTop && got.scrolled === '1' && !/rgba\(0, 0, 0, 0\)|transparent/.test(got.bg) && got.firstCardTop < 0;
  console.log(ok ? 'ok' : 'FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
