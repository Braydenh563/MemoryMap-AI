// Where the Timeline's first paint goes: the request, building the model, and
// painting the first page, per resolved scale. Median of 5, ms. Run against
// one seeded data dir (see timelinetune.js for the recipe).
const { boot } = require('./lib.js');

const W = +(process.env.W || 1440);
const H = +(process.env.H || 900);

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: H }, ...(W < 600 ? { isMobile: true, hasTouch: true } : {}) });
  await page.evaluate(() => switchTab('timeline'));
  await page.waitForSelector('#timeline-feed .timeline-row', { timeout: 20000 });
  await page.waitForTimeout(1500);
  const out = await page.evaluate(async () => {
    const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
    const url = `${timelineQuery()}&limit=${TIMELINE_PAGE}`;
    const req = [];
    const model = [];
    for (let i = 0; i < 5; i += 1) {
      let t = performance.now();
      const body = await apiJson(url);
      req.push(performance.now() - t);
      t = performance.now();
      timelineDensity = body.density || {};
      timelineRows = body.rows.map(timelineRow);
      timelineRows.sort((a, b) => b.when - a.when);
      timelineById = new Map(timelineRows.map((r) => [r.key, r]));
      model.push(performance.now() - t);
    }
    const paint = {};
    const sel = document.getElementById('timeline-scale');
    for (const sc of ['day', 'week', 'month', 'year']) {
      const ms = [];
      for (let i = 0; i < 5; i += 1) {
        sel.value = sc;
        const t = performance.now();
        paintTimeline();
        const sync = performance.now() - t;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        ms.push([sync, performance.now() - t]);
      }
      paint[sc] = { sync: +med(ms.map((m) => m[0])).toFixed(0), toFrame: +med(ms.map((m) => m[1])).toFixed(0) };
    }
    // The tab switch itself, from the press to the first row painted: the feed
    // is emptied first, so a row seen is a row this switch drew.
    const tab = [];
    for (let i = 0; i < 5; i += 1) {
      await switchTab('notes');
      await new Promise((r) => setTimeout(r, 400));
      sel.value = 'auto';
      const feed = document.getElementById('timeline-feed');
      feed.replaceChildren();
      const t = performance.now();
      const seen = new Promise((resolve) => {
        const mo = new MutationObserver(() => {
          if (feed.querySelector('.timeline-row')) { mo.disconnect(); resolve(); }
        });
        mo.observe(feed, { childList: true, subtree: true });
      });
      switchTab('timeline');
      await seen;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      tab.push(performance.now() - t);
      await new Promise((r) => setTimeout(r, 600));
    }
    return { tabToFirstRow: +med(tab).toFixed(0), rows: timelineRows.length, request: +med(req).toFixed(0), model: +med(model).toFixed(0), paint };
  });
  console.log(JSON.stringify({ w: W, ...out }));
  await browser.close();
})();
