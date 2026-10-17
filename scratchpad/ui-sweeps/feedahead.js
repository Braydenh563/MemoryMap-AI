// The feed's days ahead (INBOX 904 B72: "scroll above today's date to see future dates").
//   BASE=http://127.0.0.1:8873 [THEME=dark] node feedahead.js
// Run after calendar.js has seeded the data dir. At 1358 and 390 measures:
//   the buckets above today (keys, rows, an Add on each empty one);
//   where today's head sits after a fresh read (px from the scroller's top)
//   and how far the scroller can go up from there;
//   an empty day ahead's Add opens the calendar's sheet on that day;
//   an opened row still shows its detail (timeline-detail.js, lazy);
//   a Ctrl+wheel gesture after a pause throws nothing (timelineZoom was a const);
//   no horizontal scroll.
const { boot } = require('./lib');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1358, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.waitForTimeout(3000);
  const out = { theme: process.env.THEME || 'light' };
  for (const width of [1358, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => { localStorage.setItem('timeline-view', 'feed'); localStorage.setItem('timeline-scale', 'day'); });
    await page.evaluate(() => { switchTab('timeline'); syncTimelineViewSeg(); });
    await page.waitForTimeout(1500);
    //: One read at a time: two overlapping reads land the scroll before the second paint.
    await page.evaluate(() => renderTimeline());
    await page.waitForTimeout(2500);
    out[width] = await page.evaluate(() => {
      const box = document.getElementById('timeline-scroll');
      const today = timelineBucketKey(new Date(), 'day');
      const sections = [...document.querySelectorAll('#timeline-feed .timeline-bucket')];
      const at = sections.findIndex((s) => s.dataset.bucket === today);
      const ahead = sections.slice(0, Math.max(0, at)).map((s) => [s.dataset.bucket, s.querySelectorAll('.timeline-row').length, !!s.querySelector('.timeline-today-action'), Math.round(s.getBoundingClientRect().height)]);
      const head = sections[at]?.getBoundingClientRect();
      const doc = document.documentElement;
      return {
        today, todayIndex: at, ahead,
        todayFromTop: head ? Math.round(head.top - box.getBoundingClientRect().top) : null,
        scrollTop: Math.round(box.scrollTop), canScrollUp: box.scrollTop > 0,
        orderNewestFirst: sections.every((s, i) => i === 0 || sections[i - 1].dataset.bucket >= s.dataset.bucket),
        unique: new Set(sections.map((s) => s.dataset.bucket)).size === sections.length,
        hscroll: doc.scrollWidth - doc.clientWidth,
      };
    });
  }
  // An empty day ahead's Add.
  await page.setViewportSize({ width: 1358, height: 900 });
  await page.evaluate(() => renderTimeline());
  await page.waitForTimeout(2000);
  const key = await page.evaluate(() => [...document.querySelectorAll('#timeline-feed .timeline-bucket[data-empty="1"]')].map((s) => s.dataset.bucket).find((k) => k > timelineBucketKey(new Date(), 'day')));
  if (key) {
    await page.evaluate((k) => document.querySelector(`.timeline-bucket[data-bucket="${k}"] .timeline-today-action`).scrollIntoView(), key);
    await page.click(`.timeline-bucket[data-bucket="${key}"] .timeline-today-action`);
    await page.waitForTimeout(1200);
    out.add = await page.evaluate(() => ({ open: !!document.querySelector('[data-sheet="calendar-add"]'), date: document.getElementById('timeline-cal-add-date')?.value }));
    out.add.key = key;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  // A row's detail, through the lazy file.
  await page.evaluate(() => { const r = document.querySelector('#timeline-feed .timeline-row'); r.scrollIntoView(); });
  await page.click('#timeline-feed .timeline-row');
  await page.waitForTimeout(1200);
  out.detail = await page.evaluate(() => { const d = document.querySelector('.timeline-row-detail'); return d ? { children: d.children.length, actions: d.querySelectorAll('.timeline-row-actions button').length } : null; });
  // Ctrl+wheel twice with a pause between.
  const sb = await page.locator('#timeline-scroll').boundingBox();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + 200);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(500);
  await page.mouse.wheel(0, -120);
  await page.keyboard.up('Control');
  await page.waitForTimeout(500);
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
