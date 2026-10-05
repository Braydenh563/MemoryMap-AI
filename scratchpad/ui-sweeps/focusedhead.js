// The focused dashboard head at 1440, 1024, 820, 599 and 390 (OPEN.md, the
// uitrio row: `flex: 1 1 20rem` was only measured at 1440 and 390). Prints
// each visible child of the head, how many bands the head wraps into, and
// whether the head or the page scrolls sideways. PASS when nothing does.
//   BASE=http://127.0.0.1:8851 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node focusedhead.js
const { boot } = require('./lib.js');

(async () => {
  let bad = 0;
  for (const width of [1440, 1024, 820, 599, 390]) {
    const { page, browser } = await boot({ viewport: { width, height: 900 } });
    await page.evaluate(() => { localStorage.setItem('dash-density', 'focused'); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.evaluate(() => switchTab('dashboard')).catch(() => {});
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      const tab = document.getElementById('tab-dashboard');
      const head = tab.querySelector('.dash-head');
      if (!head) return { err: 'no head' };
      const kids = [...head.querySelectorAll(':scope > *, .dash-hero > *')].filter((e) => e.getClientRects().length);
      const rects = kids.map((e) => {
        const b = e.getBoundingClientRect();
        return { c: e.className.toString().slice(0, 30), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
      });
      const bands = new Set(rects.filter((x) => x.h > 0).map((x) => Math.round(x.y / 10))).size;
      return {
        density: tab.dataset.density,
        headH: Math.round(head.getBoundingClientRect().height),
        bands,
        pageSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        headSideways: head.scrollWidth > head.clientWidth,
        rects,
      };
    });
    console.log(width, JSON.stringify({ ...r, rects: undefined }));
    for (const x of r.rects || []) console.log('   ', JSON.stringify(x));
    if (r.err || r.pageSideways || r.headSideways) bad += 1;
    await browser.close();
  }
  console.log(bad ? `FAIL ${bad}` : 'PASS');
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
