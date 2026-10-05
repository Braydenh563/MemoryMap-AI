// GRAPH_PLAN, after KG9: the query table's rollup row, and KG4's note-field
// picker. Seeds three trips with a cost and a date, types `type:trip<s>` into
// the notes filter, opens Table: the footer must say Sum 200.5 for cost and
// offer Earliest/Latest for the date; the choice is kept. Then a note type
// with a note field: the properties sheet's magnifier opens the picker and
// fills the box with the chosen note.
//
//   BASE=http://127.0.0.1:8853 WIDTH=1440 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/kg1005-rollups.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const s = Date.now().toString(36).slice(-5);
  await page.evaluate(async (s) => {
    const make = (content) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) });
    await make(`---\ntype: Trip${s}\ncost: 120\nwhen: 2026-03-02\n---\n# Lisbon ${s}`);
    await make(`---\ntype: Trip${s}\ncost: 80.5\nwhen: 2025-11-20\n---\n# Porto ${s}`);
    await make(`---\ntype: Trip${s}\ncost: soon\n---\n# Faro ${s}`);
    await loadEntries();
  }, s);
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1000);
  await page.fill('#note-search', `type:trip${s}`);
  await page.waitForTimeout(1500);
  await page.evaluate(() => [...document.querySelectorAll('.note-query-bar button')].find((b) => b.textContent.includes('Table'))?.click());
  await page.waitForTimeout(1500);
  const read = () => page.evaluate(() => {
    const card = document.querySelector('[data-sheet="query-table"] .sheet-card');
    if (!card) return null;
    const cells = [...card.querySelectorAll('tfoot td')].map((td) => ({
      key: td.dataset.key,
      kind: td.querySelector('select')?.value || '',
      kinds: [...(td.querySelector('select')?.options || [])].map((o) => o.value),
      value: td.querySelector('.query-rollup-value')?.textContent || '',
    }));
    const foot = card.querySelector('tfoot tr')?.getBoundingClientRect();
    const r = card.getBoundingClientRect();
    return {
      head: [...card.querySelectorAll('thead th')].map((th) => th.textContent),
      cells,
      footInCard: foot ? foot.bottom <= r.bottom + 1 && foot.top >= r.top : false,
      h: Math.round(r.height), vh: innerHeight,
      sideways: document.documentElement.scrollWidth > innerWidth,
    };
  });
  const t = await read();
  console.log(JSON.stringify(t));
  const cost = t && t.cells.find((c) => c.key === 'cost');
  const when = t && t.cells.find((c) => c.key === 'when');
  check('the footer sums cost over the three trips', cost && cost.kind === 'sum' && cost.value === '200.5', cost && `${cost.kind} ${cost.value}`);
  check('cost offers count, sum, min, max', cost && cost.kinds.join(',') === 'count,sum,min,max', cost && cost.kinds.join(','));
  check('the date offers count, earliest, latest; latest first', when && when.kind === 'latest' && when.value === '2026-03-02' && when.kinds.join(',') === 'count,earliest,latest', when && `${when.kind} ${when.value} ${when.kinds}`);
  check('the footer is inside the sheet, no sideways scroll', t && t.footInCard && !t.sideways && t.h <= t.vh);
  // Change cost to Max through the select; the value follows and is kept.
  await page.evaluate(() => {
    const sel = document.querySelector('[data-sheet="query-table"] tfoot td[data-key="cost"] select');
    sel.value = 'max';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const t2 = await read();
  const cost2 = t2.cells.find((c) => c.key === 'cost');
  check('choosing Max shows 120', cost2.value === '120', cost2.value);
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/kg1005-rollups-${WIDTH}-${process.env.THEME || 'light'}.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.evaluate(() => { const el = document.querySelector('#note-search'); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(800);

  // KG4: a note field's picker.
  const target = await page.evaluate(async (s) => {
    await apiJson('/note-types', { method: 'POST', body: JSON.stringify({ name: `Visit${s}`, fields: [{ name: 'place', kind: 'note' }] }) });
    const host = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `---\ntype: Visit${s}\n---\n# A visit ${s}` }) });
    await loadEntries();
    await ensureModule('inbox');
    const entry = allEntries.find((e) => e.id === host.id);
    openNotePropertiesSheet(entry);
    return host.id;
  }, s);
  await page.waitForTimeout(1200);
  const pick = await page.evaluate(() => {
    const b = document.querySelector('[data-sheet="note-properties"] .prop-note-pick');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const row = b.closest('.prop-row').getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), inRow: r.right <= row.right + 1, label: b.getAttribute('aria-label') };
  });
  check('a note field has the picker button, square, in its row', pick && pick.w === pick.h && pick.inRow, JSON.stringify(pick));
  await page.click('[data-sheet="note-properties"] .prop-note-pick');
  await page.waitForTimeout(800);
  await page.keyboard.type(`Lisbon ${s}`);
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  const filled = await page.evaluate(() => document.querySelector('[data-sheet="note-properties"] .prop-row input.prop-value')?.value || '');
  check('choosing a note fills the field', filled === `Lisbon ${s}`, filled);
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/kg1005-picker-${WIDTH}-${process.env.THEME || 'light'}.png` });
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
})();
