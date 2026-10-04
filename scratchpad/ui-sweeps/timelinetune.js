// Per scale (day, week, month, year) and per range, what the Timeline's first
// screen looks like on a given notebook: the numbers the "auto" thresholds are
// chosen from (TIMELINE_PLAN, "auto" thresholds).
//
//   bash scratchpad/ui-sweeps/serve.sh 8829 /tmp/mm-tl-real
//   BASE=http://127.0.0.1:8829 W=1440 H=900 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     SCRATCH=/tmp/claude-0 node scratchpad/ui-sweeps/timelinetune.js > out.jsonl
//
// Seeds: scratchpad/ui-sweeps/seed-timeline-shapes.py (week, burst, long,
// steady) and a copy of a real notebook. One JSON line per cell:
//   rows / headers on the first screen, chrome = share of the feed's visible
//   height that is not a row (headers, gaps, an empty "today"), single = share
//   of visible buckets holding one row, gap = share of the range's buckets at
//   that scale with nothing in them, hscroll, minTitle = narrowest visible row
//   title, ms = repaint time for the scale change (median of 3), first = time
//   from the tab click to the first row on screen (once, at the default range).
const { boot } = require('./lib.js');

const W = +(process.env.W || 1440);
const H = +(process.env.H || 900);

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: H }, ...(W < 600 ? { isMobile: true, hasTouch: true } : {}) });
  page.on('pageerror', (e) => console.error('PAGEERROR', e.message));

  await page.evaluate(() => {
    localStorage.removeItem('timeline-kinds');
    localStorage.setItem('timeline-view', 'line');
  });
  const t0 = Date.now();
  await page.click('[data-tab="timeline"]');
  await page.waitForSelector('#timeline-feed .timeline-row', { timeout: 20000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const first = Date.now() - t0;
  await page.waitForTimeout(1500);
  const warm = [];
  for (let i = 0; i < 3; i += 1) {
    await page.click('[data-tab="notes"]');
    await page.waitForTimeout(600);
    const t1 = Date.now();
    await page.click('[data-tab="timeline"]');
    await page.waitForSelector('#timeline-feed .timeline-row', { timeout: 20000 });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    warm.push(Date.now() - t1);
    await page.waitForTimeout(1200);
  }
  warm.sort((a, b) => a - b);

  const setRange = async (days) => {
    await page.evaluate((d) => {
      const box = document.getElementById('timeline-days');
      box.value = d;
      box.dispatchEvent(new Event('change', { bubbles: true }));
    }, days);
    await page.waitForTimeout(2500);
  };

  for (const days of ['90', '365', '0']) {
    await setRange(days);
    for (const scale of ['day', 'week', 'month', 'year']) {
      const ms = [];
      for (let i = 0; i < 3; i += 1) {
        // Flip away and back so every sample is a real repaint of this scale.
        await page.evaluate(() => {
          const s = document.getElementById('timeline-scale');
          s.value = 'year';
          s.dispatchEvent(new Event('change', { bubbles: true }));
        });
        ms.push(await page.evaluate((sc) => new Promise((resolve) => {
          const s = document.getElementById('timeline-scale');
          const t = performance.now();
          s.value = sc;
          s.dispatchEvent(new Event('change', { bubbles: true }));
          requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - t)));
        }), scale));
      }
      ms.sort((a, b) => a - b);
      await page.evaluate(() => window.scrollTo(0, 0));
      const m = await page.evaluate((sc) => {
        const feed = document.getElementById('timeline-feed');
        feed.scrollTop = 0;
        const fr = feed.getBoundingClientRect();
        const top = Math.max(fr.top, 0);
        const bottom = Math.min(fr.bottom, innerHeight);
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          return r.bottom > top && r.top < bottom ? r : null;
        };
        const spans = [];
        let rows = 0;
        let minTitle = 1e9;
        for (const row of feed.querySelectorAll('.timeline-row')) {
          const r = visible(row);
          if (!r) continue;
          rows += 1;
          spans.push([Math.max(r.top, top), Math.min(r.bottom, bottom)]);
          const t = row.querySelector('.timeline-row-title');
          if (t) minTitle = Math.min(minTitle, t.getBoundingClientRect().width);
        }
        // Union of the rows' vertical extents, so two columns count once.
        spans.sort((a, b) => a[0] - b[0]);
        let rowPx = 0;
        let end = -1e9;
        for (const [a, b] of spans) {
          if (b > end) { rowPx += b - Math.max(a, end); end = b; }
        }
        let headers = 0;
        let single = 0;
        for (const sec of feed.querySelectorAll('.timeline-bucket')) {
          if (!visible(sec)) continue;
          headers += 1;
          if (sec.querySelectorAll('.timeline-row').length <= 1) single += 1;
        }
        // Buckets in the range at this scale vs buckets with something in them.
        const days = Object.entries(timelineDensity).filter(([, n]) => n > 0).map(([d]) => d);
        const sorted = [...days].sort();
        const keys = new Set(days.map((d) => timelineBucketKey(new Date(d + 'T12:00:00'), sc)));
        const all = new Set();
        if (sorted.length) {
          for (let d = new Date(sorted[0] + 'T12:00:00'); d <= new Date(sorted[sorted.length - 1] + 'T12:00:00'); d.setDate(d.getDate() + 1)) {
            all.add(timelineBucketKey(d, sc));
          }
        }
        const span = all.size;
        const doc = document.scrollingElement;
        // Densest bucket at this scale, from the density strip.
        const per = {};
        for (const [d, n] of Object.entries(timelineDensity)) {
          const k = timelineBucketKey(new Date(d + 'T12:00:00'), sc);
          per[k] = (per[k] || 0) + n;
        }
        return {
          resolved: feed.dataset.scale,
          rows,
          headers,
          chrome: +(1 - rowPx / Math.max(1, bottom - top)).toFixed(2),
          single: headers ? +(single / headers).toFixed(2) : 0,
          activeDays: days.length,
          itemsInRange: Object.values(timelineDensity).reduce((s, n) => s + n, 0),
          buckets: keys.size,
          gap: span ? +(1 - keys.size / span).toFixed(2) : 0,
          densest: Math.max(0, ...Object.values(per)),
          hscroll: doc.scrollWidth > doc.clientWidth || feed.scrollWidth > feed.clientWidth,
          minTitle: minTitle === 1e9 ? null : Math.round(minTitle),
          loaded: timelineRows.length,
        };
      }, scale);
      console.log(JSON.stringify({ w: W, days, scale, ms: +ms[1].toFixed(0), ...m }));
    }
  }
  console.log(JSON.stringify({ w: W, firstCold: first, firstWarm: warm[1] }));
  await browser.close();
})();
