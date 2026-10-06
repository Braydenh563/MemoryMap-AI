// relchip709.js: a note's suggested links are one chip each (INBOX 709).
//
//   BASE=http://127.0.0.1:8828 SCRATCH=<scratch> node scratchpad/ui-sweeps/relchip709.js
//
// Opens the first note's Similar notes row (the card menu's toggleRelated)
// and measures each suggestion: one `.chip` holding the text and the +, the +
// inside the chip's box at its end, the chip's name "Link to <title>", no
// separate button beside it; then presses one and checks a link was made.
const { boot } = require('./lib');

(async () => {
  const { browser, page, OUT } = await boot({ viewport: { width: Number(process.env.WIDTH || 1440), height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1500);
  const id = await page.evaluate(async () => {
    const entry = allEntries.find((e) => !e.is_draft && !e.is_private && !(e.links || []).length && /Exam timetable/.test(e.content)) || allEntries.find((e) => !(e.links || []).length);
    await toggleRelated(entry);
    return entry.id;
  });
  await page.waitForTimeout(1500);
  const rows = await page.evaluate((entryId) => {
    const card = document.querySelector(`#entry-list li[data-id="${entryId}"]`);
    return [...card.querySelectorAll('.entry-related-row')].map((row) => {
      const chipEl = row.querySelector('.chip');
      const plus = chipEl?.querySelector('.entry-related-add');
      const c = chipEl.getBoundingClientRect();
      const p = plus?.getBoundingClientRect();
      return {
        children: row.children.length,
        name: chipEl.getAttribute('aria-label'),
        role: chipEl.getAttribute('role'),
        buttons: row.querySelectorAll('button').length,
        plusInside: !!p && p.left >= c.left && p.right <= c.right + 0.5 && p.top >= c.top && p.bottom <= c.bottom + 0.5,
        plusAtEnd: !!p && c.right - p.right < 16,
      };
    });
  }, id);
  console.log(JSON.stringify(rows.slice(0, 4)));
  const ok = rows.length > 0 && rows.every((r) => r.children === 1 && r.buttons === 0 && r.role === 'button' && /^Link to /.test(r.name) && r.plusInside && r.plusAtEnd);
  console.log(JSON.stringify({ name: 'one chip per suggestion, + inside at the end', ok, rows: rows.length }));
  const card = await page.$(`#entry-list li[data-id="${id}"]`);
  await card.scrollIntoViewIfNeeded();
  await card.screenshot({ path: `${OUT}/relchip709.png` });
  const before = await page.evaluate((entryId) => apiJson(`/entries/${entryId}`).then((e) => e.links.length), id);
  await page.evaluate((entryId) => document.querySelector(`#entry-list li[data-id="${entryId}"] .entry-related-row .chip`).click(), id);
  await page.waitForTimeout(1500);
  const after = await page.evaluate((entryId) => apiJson(`/entries/${entryId}`).then((e) => e.links.length), id);
  console.log(JSON.stringify({ name: 'pressing the chip links', ok: after === before + 1, before, after }));
  console.log(JSON.stringify({ name: 'no console errors', ok: errors.length === 0, errors }));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(2); });
