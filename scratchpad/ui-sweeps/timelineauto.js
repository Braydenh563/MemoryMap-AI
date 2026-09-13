// What the Timeline's "auto" scale chooses, and why the old rule chose wrong.
//
// TIMELINE_PLAN section 7's thresholds were written when the feed held notes
// only. Phase 4 put documents, boards and reminders in it, and "auto" counted
// all four as one number, so a week of writing with a couple of hundred
// reminders due in it read as "hundreds of rows, use month buckets" and the
// whole week collapsed into one column. The rule is now days-with-something-in
// -them, which is the number of headers the feed will actually draw.
//
// It seeds its own notebook, so it needs an EMPTY data dir of its own:
//   bash scratchpad/ui-sweeps/serve.sh 8947 /tmp/mm-auto
//   BASE=http://127.0.0.1:8947 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     SCRATCH=/tmp/claude-0 timeout 110 node scratchpad/ui-sweeps/timelineauto.js
const { boot } = require('./lib.js');

let failures = 0;
const check = (label, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}  ${detail}`);
};

(async () => {
  const { browser, page } = await boot();
  page.on('pageerror', (e) => { failures += 1; console.log('PAGEERROR', e.message); });

  const SPREAD = !!process.env.SPREAD;
  const seeded = SPREAD ? 'skipped (SPREAD: the notebook is the fixture)' : await page.evaluate(async () => {
    const headers = { 'X-Auth-Token': localStorage.getItem('token') || '', 'Content-Type': 'application/json' };
    const post = (url, body) => fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    let notes = 0;
    let reminders = 0;
    // A week of writing: a handful of notes, all of them today (the endpoint
    // dates a note by when it was saved, and a sweep cannot backdate one
    // through the API).
    for (let i = 0; i < 8; i += 1) {
      const r = await post('/entries', { content: `Day note ${i}: what happened today.` });
      if (r.ok) notes += 1;
    }
    // And the reminders that used to drown it, due over the next week: the
    // feed places a reminder on the day it is due, and the API refuses a due
    // date in the past, which is why they are ahead rather than behind.
    for (let i = 0; i < 180; i += 1) {
      const due = new Date(Date.now() + ((i % 7) * 864e5) + 36e5).toISOString();
      const r = await post('/reminders', { text: `errand ${i}`, due_at: due });
      if (r.ok) reminders += 1;
    }
    return { notes, reminders };
  });
  console.log('seeded ' + JSON.stringify(seeded));

  await page.evaluate(() => localStorage.removeItem('timeline-kinds'));
  await page.click('[data-tab="timeline"]');
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const scale = document.getElementById('timeline-scale');
    scale.value = 'auto';
    scale.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(2000);

  const now = await page.evaluate(() => {
    const rows = Object.values(timelineDensity);
    // The rule this replaced, computed from the same numbers, so the before
    // and the after are one measurement rather than two runs of two builds.
    const oldTotal = rows.reduce((sum, n) => sum + n, 0);
    const oldRule = oldTotal < 60 ? 'day' : oldTotal < 400 ? 'week' : 'month';
    return {
      scale: document.getElementById('timeline-feed').dataset.scale,
      headers: document.querySelectorAll('#timeline-feed .timeline-bucket-head').length,
      activeDays: rows.filter((n) => n > 0).length,
      rowsInRange: oldTotal,
      oldRule,
      count: (document.getElementById('timeline-count') || {}).textContent,
    };
  });
  if (!SPREAD) {
  check('a week of writing stays in day buckets', now.scale === 'day',
    `scale ${now.scale} from ${now.activeDays} active day(s); the old rule said ${now.oldRule} from ${now.rowsInRange} rows`);
  check('the old rule really would have differed here', now.oldRule !== now.scale,
    `old ${now.oldRule}, new ${now.scale}`);
  check('the feed draws one header per day, not one for the week',
    now.headers > 1 && now.headers <= 10, `${now.headers} header(s)`);
  check('the count line does not call a reminder a note',
    / item/.test(now.count || ''), JSON.stringify(now.count));
  }

  // The other half of the rule, measured rather than asserted about: a
  // notebook spread over years has to keep bucketing by month, or the header
  // list is the notebook. It needs a notebook with years in it, so it runs
  // against the bulk-seeded dir instead of this one:
  //   BASE=http://127.0.0.1:8946 SPREAD=1 node scratchpad/ui-sweeps/timelineauto.js
  if (SPREAD) {
    for (const [days, want] of [['0', 'month'], ['365', 'week'], ['90', 'week']]) {
      await page.evaluate((d) => {
        const box = document.getElementById('timeline-days');
        box.value = d;
        box.dispatchEvent(new Event('change', { bubbles: true }));
      }, days);
      await page.waitForTimeout(2500);
      const got = await page.evaluate(() => ({
        scale: document.getElementById('timeline-feed').dataset.scale,
        activeDays: Object.values(timelineDensity).filter((n) => n > 0).length,
        headers: document.querySelectorAll('#timeline-feed .timeline-bucket-head').length,
      }));
      check(`${days === '0' ? 'the whole notebook' : days + ' days'} buckets by ${want}`,
        got.scale === want,
        `${got.scale} from ${got.activeDays} active day(s), ${got.headers} header(s)`);
    }
  }

  console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
