// nbf1005: WORLD_CLASS_PLAN section 8 rows 10, 15 and 30, driven.
//   BASE=http://127.0.0.1:8851 THEME=light W=1440 node scratchpad/ui-sweeps/nbf1005-rows.js
// Prints one line per check, "ok" or "FAIL", and the console errors seen.
const { boot } = require('./lib');

(async () => {
  const W = Number(process.env.W || 1440);
  const phone = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: phone ? 844 : 900 }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const results = [];
  const check = (name, ok, detail = '') => results.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`);

  const seeded = await page.evaluate(async () => {
    const post = (path, body) => apiJson(path, { method: 'POST', body: JSON.stringify(body) });
    const soon = new Date(Date.now() + 3 * 3600e3).toISOString();
    const note = await post('/entries', { content: '# Sweep note\n\nOne two three four five six seven eight nine ten.', category: 'Travel' });
    const doc = await post('/documents', { title: 'Sweep document', content: '# Sweep document\n\nbody' });
    const board = await post('/whiteboard/boards', { name: 'Sweep board' });
    const rem = await post('/reminders', { text: 'About the document', due_at: soon, document_id: doc.id });
    const binDoc = await post('/documents', { title: 'Binned document', content: 'x' });
    await apiJson(`/documents/${binDoc.id}`, { method: 'DELETE' });
    const binRem = await post('/reminders', { text: 'Binned reminder', due_at: soon });
    await apiJson(`/reminders/${binRem.id}`, { method: 'DELETE' });
    await post('/entries', { content: 'Ada Lovelace', note_type: 'Person' });
    await loadEntries();
    return { note: note.id, doc: doc.id, board: board.id, rem: rem.id };
  });

  // Row 30: the edit form's word count sits on the meta row, inside the card.
  await page.evaluate(async (id) => { await switchTab('notes'); editingId = id; renderEntries(); }, seeded.note);
  await page.waitForTimeout(1200);
  const count = await page.evaluate(() => {
    const el = document.querySelector('.note-edit-counts');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const meta = el.closest('.note-edit-meta').getBoundingClientRect();
    const actions = document.querySelector('.note-edit-meta .note-edit-actions').getBoundingClientRect();
    return { text: el.textContent, inside: r.left >= meta.left - 0.5 && r.right <= meta.right + 0.5, overlap: r.right > actions.left + 0.5 && r.top < actions.bottom && r.bottom > actions.top, h: r.height };
  });
  check('note edit form counts words', count && /^1[23] words · under a min$/.test(count.text), JSON.stringify(count));
  check('the count sits inside its row, clear of Save', count && count.inside && !count.overlap);
  await page.evaluate(() => { editingId = null; renderEntries(); });

  // Row 30: the selection bar's ⋯ has the two new rows.
  await page.evaluate(() => enterSelectMode());
  await page.waitForTimeout(300);
  await page.click('#batch-more-host button');
  await page.waitForTimeout(300);
  const more = await page.evaluate(() => [...document.querySelectorAll('.action-menu:not(.hidden) [role="menuitem"], .action-menu:not(.hidden) button')].map((b) => b.textContent.trim()));
  check('selection menu offers Move to space and Export', more.some((t) => t.startsWith('Move to space')) && more.some((t) => t.startsWith('Export as Markdown')), more.join(' | '));
  await page.keyboard.press('Escape');
  await page.evaluate(() => exitSelectMode());

  // Row 15: Remind me's dialog, its segment within the card.
  await page.evaluate((id) => { remindAbout({ title: 'Sweep document', documentId: id }); }, seeded.doc);
  await page.waitForTimeout(500);
  const dialog = await page.evaluate(() => {
    const card = document.querySelector('.prompt-card');
    if (!card) return null;
    const c = card.getBoundingClientRect();
    const seg = card.querySelector('.confirm-seg');
    const buttons = [...seg.querySelectorAll('button')].map((b) => b.getBoundingClientRect());
    return { title: card.querySelector('h3').textContent, fits: buttons.every((b) => b.left >= c.left && b.right <= c.right + 0.5), width: Math.round(c.width), vw: innerWidth, rows: new Set(buttons.map((b) => Math.round(b.top))).size };
  });
  check('Remind me dialog fits', dialog && dialog.fits && dialog.width <= dialog.vw, JSON.stringify(dialog));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Row 15: the reminder row names its document.
  await page.evaluate(async () => { await switchTab('reminders'); await loadReminders(); });
  await page.waitForTimeout(800);
  const remRow = await page.evaluate((id) => {
    const li = document.querySelector(`#reminder-groups li[data-id="${id}"]`);
    const chip = li && li.querySelector('.entry-links .chip');
    return chip ? chip.textContent.trim() : null;
  }, seeded.rem);
  check('reminder row names its document', remRow && remRow.includes('Sweep document'), remRow);

  // Row 30: the bin lists the document and the reminder.
  await page.evaluate(async () => { await switchTab('library'); await loadLibrary(); libraryKind = 'archived'; renderLibraryFilters(); renderLibrary(); });
  await page.waitForTimeout(1500);
  const bin = await page.evaluate(() => (libraryItems || []).filter((i) => i.kind === 'archived').map((i) => `${i.subtype}:${i.title}`));
  check('bin lists the binned document and reminder', bin.includes('document:Binned document') && bin.includes('reminder:Binned reminder'), bin.join(', '));
  const cards = await page.evaluate(() => [...document.querySelectorAll('#library-grid .library-card')].map((c) => c.textContent.slice(0, 40)));
  check('bin cards drawn', cards.some((t) => t.includes('Binned document')), String(cards.length));

  // Row 10: the graph's Note type rule.
  await page.evaluate(async () => { await switchTab('graph'); });
  await page.waitForTimeout(2500);
  const typed = await page.evaluate(async () => {
    const select = document.getElementById('graph-colour');
    if (!select) return null;
    select.value = 'type';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 2500));
    return [...document.querySelectorAll('#graph-legend .legend-item')].map((l) => l.textContent.trim());
  });
  check('graph legend by note type', typed && typed.some((t) => t.includes('Person')), JSON.stringify(typed));

  const nan = errors.filter((e) => /NaN/.test(e));
  check('no console errors', errors.length === 0, errors.slice(0, 5).join(' || '));
  check('no NaN attributes', nan.length === 0);
  console.log(`nbf1005-rows ${W} ${process.env.THEME || 'light'}`);
  console.log(results.join('\n'));
  await browser.close();
})();
