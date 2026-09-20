// INBOX 261: `GET /resurface/near/{entry_id}` shipped with the rest of
// resurfacing and nothing in the frontend ever called it. This drives the
// three panels a note card can open ("Similar notes", "Referenced by",
// "Forgotten notes like this") through the menu a person uses, and checks the
// two things that matter: each one draws, and only one is ever on screen.
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(4000);

  // A notebook big enough for resurfacing to rank at all: `MIN_NOTEBOOK` in
  // resurface.py refuses below its floor, and an empty answer there would be
  // a fact about the notebook rather than about this panel.
  const seeded = await page.evaluate(async () => {
    const have = (await apiJson('/entries?limit=1')).total ?? 0;
    for (let i = have; i < 40; i++) {
      await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Panel probe ${i}: a note about retries, backoff and the ingest pipeline.`, category: 'General' }) });
    }
    return (await apiJson('/entries?limit=1')).total ?? 0;
  });
  await page.evaluate(() => { switchTab('notes'); showNotesSection('browse'); });
  await page.waitForTimeout(2500);
  // A fresh data dir needs the list refetched after seeding, and the cards
  // take a beat to paint; without the wait the first card is simply not there.
  await page.evaluate(async () => { if (typeof loadEntries === 'function') await loadEntries(); renderEntries(); });
  await page.waitForSelector('#entry-list li[data-id]', { timeout: 20000 });
  await page.waitForTimeout(1200);

  const out = await page.evaluate(async () => {
    const card = document.querySelector('#entry-list li[data-id]');
    const id = Number(card.dataset.id);
    const entry = allEntries.find((e) => e.id === id) || { id };
    const rows = () => {
      const live = document.querySelector(`#entry-list li[data-id="${id}"]`);
      return [...live.querySelectorAll('.entry-links')].map((r) => r.textContent.trim().slice(0, 60));
    };
    const wait = () => new Promise((r) => setTimeout(r, 1400));
    const seen = {};
    for (const [name, fn] of [['related', toggleRelated], ['references', toggleReferences], ['faded', toggleFaded]]) {
      await fn(entry);
      await wait();
      seen[name] = { rows: rows(), count: rows().length };
    }
    // Re-clicking the last one must close it, which is the toggle the shared
    // state exists to keep honest.
    await toggleFaded(entry);
    await wait();
    seen.afterReclick = { rows: rows(), count: rows().length };
    return { id, seen };
  });

  console.log('notes seeded:', seeded);
  console.log(JSON.stringify(out, null, 1));
  const bad = Object.entries(out.seen).filter(([k, v]) => (k === 'afterReclick' ? v.count !== 0 : v.count !== 1));
  console.log(`\n${bad.length ? 'FAIL' : 'PASS'}: ${bad.length} panel(s) wrong`);
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
