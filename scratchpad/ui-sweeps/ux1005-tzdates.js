// UX-02 (audit 2026-10-05): a day a note mentions sits under that day in every
// timezone, with no made-up midnight, and a time said with it is kept.
//   BASE=http://127.0.0.1:8843 TZ_ID=America/New_York node ux1005-tzdates.js
// Prints one JSON line per zone; exit 1 on a wrong day or a 12:00 AM.
const { boot, BASE } = require('./lib');

(async () => {
  let bad = 0;
  for (const timezoneId of (process.env.TZ_ID || 'America/New_York,UTC,Australia/Sydney').split(',')) {
    const { browser, page } = await boot({ timezoneId });
    const made = await page.evaluate(async () => {
      const want = ['Dentist appointment on Friday at 3pm', 'Pick up the parcel on Thursday'];
      const have = await apiJson('/timeline?scale=day&limit=300');
      for (const text of want) {
        if (!have.rows.some((r) => (r.preview || '').startsWith(text))) {
          await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: text }) });
        }
      }
      const rows = (await apiJson('/timeline?scale=day&limit=300')).rows;
      return want.map((text) => rows.find((r) => (r.preview || '').startsWith(text)));
    });
    await page.click('#tab-btn-timeline');
    await page.waitForTimeout(2500);
    const seen = await page.evaluate((rows) => rows.map((row) => {
      const li = document.querySelector(`.timeline-row[data-key="${row.key}"]`);
      const section = li && li.closest('.timeline-bucket');
      const d = new Date(`${row.date}T12:00:00`);
      return {
        phrase: row.phrase,
        date: row.date,
        bucket: section ? section.dataset.bucket : null,
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        time: li ? li.querySelector('.timeline-row-when').textContent : null,
      };
    }), made);
    for (const s of seen) {
      const wrong = s.bucket !== s.date || /12:00\s*AM/.test(s.time || '')
        || (/3pm/.test(s.phrase) && !/3:00/.test(s.time || ''));
      if (wrong) bad++;
      console.log(JSON.stringify({ timezoneId, ...s, ok: !wrong }));
    }
    await browser.close();
  }
  console.log(bad ? `FAIL ${bad}` : 'ok');
  process.exit(bad ? 1 : 0);
})();
