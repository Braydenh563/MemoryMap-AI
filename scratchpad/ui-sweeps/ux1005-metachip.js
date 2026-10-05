// UX-13 (audit 2026-10-05): on a phone the category chip must read whole
// ("Uncategorised", not "Un…") on every card.  BASE=... W=390 node ux1005-metachip.js
const { boot } = require('./lib');

(async () => {
  const W = Number(process.env.W || 390);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 }, ...(W < 600 ? { isMobile: true, hasTouch: true } : {}) });
  // The audit's shape: Uncategorised notes, edited after they were written,
  // with a tag, so the line holds the category, "edited", a tag and the time.
  await page.evaluate(async () => {
    for (let i = 0; i < 3; i++) {
      const made = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Meta chip note ${i} #errands` }) });
      await apiJson(`/entries/${made.id}`, { method: 'PUT', body: JSON.stringify({ content: `Meta chip note ${i}, edited #errands` }) });
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.evaluate(async () => { await switchTab('notes'); showNotesSection('browse'); });
  await page.waitForTimeout(2500);
  const rows = await page.evaluate(() => [...document.querySelectorAll('#entry-list > li[data-id]')].slice(0, 12).map((li) => {
    const meta = li.querySelector('.entry-meta.note-meta');
    const chip = meta?.querySelector('.chip.category');
    const text = chip?.querySelector('.ph-text') || chip;
    return {
      id: li.dataset.id,
      chip: chip ? chip.textContent.trim() : null,
      cut: text ? text.scrollWidth > text.clientWidth + 1 : null,
      metaLines: meta ? Math.round(meta.getBoundingClientRect().height) : null,
      kids: meta ? [...meta.children].filter((c) => c.offsetParent).map((c) => `${(c.className || '').split(' ').slice(0, 2).join('.')}:${Math.round(c.getBoundingClientRect().width)}:${c.textContent.trim().slice(0, 24)}`) : [], metaW: meta ? Math.round(meta.clientWidth) : 0,
      metaOverflow: meta ? meta.scrollWidth > meta.clientWidth + 1 : null,
    };
  }));
  for (const r of rows) console.log(JSON.stringify(r));
  const cut = rows.filter((r) => r.cut).length;
  console.log(`cut ${cut} of ${rows.length}`);
  console.log(cut ? 'FAIL' : 'ok');
  await browser.close();
  process.exit(cut ? 1 : 0);
})();
