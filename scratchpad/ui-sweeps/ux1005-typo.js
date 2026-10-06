// UX-04 (audit 2026-10-05): the Finder never says "nothing is indexed" on a
// notebook with notes, and a one-letter typo finds the note in the Finder and
// the Notes filter alike.   BASE=http://127.0.0.1:8843 node ux1005-typo.js
const { boot } = require('./lib');

(async () => {
  const { browser, page } = await boot({});
  await page.evaluate(async () => {
    const have = await apiJson('/search?q=dentist&limit=5');
    if (!(have.hits || []).length) {
      await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'Dentist check-up for the kids' }) });
    }
  });
  const out = {};
  await page.keyboard.press('Control+p');
  await page.waitForTimeout(600);
  for (const [name, q] of [['typo', 'dentst'], ['none', 'xylophonequartz']]) {
    await page.fill('#finder-input', q);
    await page.waitForTimeout(1200);
    out[name] = await page.evaluate(() => ({
      summary: document.getElementById('finder-summary')?.textContent || '',
      rows: document.querySelectorAll('#finder-results [data-kind], #finder-results .finder-row').length,
      empty: document.querySelector('#finder-results .empty-state')?.textContent || '',
    }));
  }
  await page.keyboard.press('Escape');
  await page.click('#tab-btn-notes');
  await page.waitForTimeout(800);
  const browse = await page.$('[data-section="browse"]');
  if (browse) await browse.click().catch(() => {});
  await page.waitForTimeout(500);
  await page.fill('#note-search', 'dentst');
  await page.waitForTimeout(2500);
  out.notes = await page.evaluate(() => ({
    heading: document.getElementById('entries-heading-label')?.textContent,
    cards: document.querySelectorAll('#entry-list > li').length,
    noMatchHidden: document.getElementById('no-match-message')?.classList.contains('hidden'),
  }));
  console.log(JSON.stringify(out, null, 1));
  const bad = /indexed yet/.test(out.none.empty) || !/dentist/.test(out.typo.summary)
    || !/dentist/.test(out.notes.heading || '') || !out.notes.cards;
  console.log(bad ? 'FAIL' : 'ok');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
