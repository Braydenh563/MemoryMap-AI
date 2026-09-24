// Third pass: keyboard reach and what a row can actually do. How many tab
// stops does each view cost, is anything in the table view focusable at all,
// and what does clicking a note give you.
//
// Updated 2026-09-24 (regression sweep after fix/gemini-fixes-5): the
// grid/line views, the hidden `#timeline-view` native select and the
// `#timeline-grid`/`.timeline-dot`/`#timeline-popup` click-to-popup flow this
// sweep used to drive are all gone as of commit 112fb90 ("The windowed-stream
// test sets the streams inside the body..."), which is where
// TIMELINE_PLAN Phase 2 decision 6 actually landed in this history (the
// commit message is unrelated; it is a squash point). The dock now has a
// two-way `#timeline-view-seg` (`feed`/`table`, `data-timeline-view` on each
// button), state lives in `localStorage['timeline-view']`
// (`timelineViewMode()`), and clicking a `.timeline-row` no longer opens a
// popup: it expands an inline `.timeline-row-detail` and sets
// `aria-expanded="true"` on the row itself (`toggleTimelineRow` in
// timeline.js). This was a stale sweep, not an app regression: the failure
// was `document.getElementById('timeline-view')` returning null.
const { boot } = require('./lib.js');
(async () => {
  const { browser, ctx, page } = await boot();
  await page.evaluate(() => { document.querySelector('[data-tab="timeline"]').click(); });
  await page.waitForTimeout(1200);
  for (const view of ['feed', 'table']) {
    await page.evaluate((v) => { document.getElementById(`timeline-view-${v}`).click(); }, view);
    await page.waitForTimeout(1600);
    const r = await page.evaluate(() => {
      const focusables = Array.from(document.querySelectorAll('#tab-timeline button, #tab-timeline a[href], #tab-timeline input, #tab-timeline select, #tab-timeline summary, #tab-timeline [tabindex]:not([tabindex="-1"])'))
        .filter(e => e.offsetParent !== null || e.getClientRects().length);
      return { focusStops: focusables.length, dockStops: document.querySelectorAll('.dock[data-dock-name="timeline"] button, .dock[data-dock-name="timeline"] input, .dock[data-dock-name="timeline"] select, .dock[data-dock-name="timeline"] summary').length };
    });
    console.log(view, JSON.stringify(r));
  }
  // What opens when a note is clicked: an inline expand, not a popup.
  await page.evaluate(() => { document.getElementById('timeline-view-feed').click(); });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { document.querySelector('#timeline-feed .timeline-row')?.click(); });
  await page.waitForTimeout(700);
  const detail = await page.evaluate(() => {
    const row = document.querySelector('#timeline-feed .timeline-row[aria-expanded="true"]');
    if (!row) return { expanded: false };
    const d = row.querySelector('.timeline-row-detail');
    const b = d ? d.getBoundingClientRect() : null;
    return {
      expanded: true,
      w: b ? Math.round(b.width) : null, h: b ? Math.round(b.height) : null,
      buttons: d ? Array.from(d.querySelectorAll('button')).map(x => x.textContent.trim() || x.getAttribute('aria-label')) : [],
    };
  });
  console.log('detail', JSON.stringify(detail));
  await ctx.close(); await browser.close();
})();
