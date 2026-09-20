// INBOX 246's third gap: the "what points at this note" chip on the card.
// Places one note on a board, on a map through the map's own reference node,
// and in a document by wiki link, then reads the chip the card renders and
// checks the Connections dialog it opens tells the map from the board.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(2500);

  const ids = await page.evaluate(async () => {
    const post = (path, body) => apiJson(path, { method: 'POST', body: JSON.stringify(body) });
    const note = await post('/entries', { content: 'The roof quote for the chip probe', category: 'General' });
    await post('/entries', { content: 'Chased the roofer, see [[The roof quote for the chip probe]]', category: 'General' });
    const board = await post('/whiteboard/boards', { name: 'House jobs', type: 'board' });
    const map = await post('/whiteboard/boards', { name: 'The house', type: 'map' });
    await post('/whiteboard/nodes', { entry_id: note.id, board_id: board.id, x: 10, y: 20 });
    await post(`/whiteboard/boards/${map.id}/nodes`, { kind: 'note', parent_id: null, text: '', ref_id: note.id });
    await post('/documents', { title: 'House plan', content: 'Waiting on [[The roof quote for the chip probe]].' });
    return { note: note.id, board: board.id, map: map.id };
  });
  await page.evaluate(() => switchTab('notes'));
  await page.evaluate(() => loadEntries());
  await page.waitForTimeout(2500);

  const chip = await page.evaluate((id) => {
    const li = document.querySelector(`#entry-list li[data-id="${id}"]`);
    const el = li && li.querySelector('.chip.refs');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const meta = li.querySelector(':scope > .entry-meta');
    const others = [...meta.querySelectorAll('.chip')].filter((c) => c !== el).map((c) => c.getBoundingClientRect().height);
    return { text: el.textContent.trim(), h: r.height, w: r.width, role: el.getAttribute('role'), border: cs.borderTopWidth, chipHeights: others.slice(0, 3) };
  }, ids.note);
  console.log('chip', JSON.stringify(chip));

  await page.click(`#entry-list li[data-id="${ids.note}"] .chip.refs`);
  await page.waitForTimeout(1200);
  const dialog = await page.evaluate(() => {
    const overlay = document.getElementById('connections-overlay');
    const shown = overlay && !overlay.classList.contains('hidden');
    const rows = [...document.querySelectorAll('#connections-list button')].map((b) => b.textContent.trim());
    const icons = [...document.querySelectorAll('#connections-list button svg, #connections-list button i')].map((i) => i.getAttribute('data-icon') || i.className || '').slice(0, 8);
    return { shown, rows, icons };
  });
  console.log('dialog', JSON.stringify(dialog));

  const findings = [];
  if (!chip) findings.push('no refs chip on the card');
  else {
    if (!/In 1 document/.test(chip.text)) findings.push('document count missing: ' + chip.text);
    if (!/on 1 board/.test(chip.text)) findings.push('board count missing: ' + chip.text);
    if (!/on 1 map/.test(chip.text)) findings.push('map count missing: ' + chip.text);
    if (!/linked by 1 note/.test(chip.text)) findings.push('note count missing: ' + chip.text);
    if (chip.role !== 'button') findings.push('chip is not a button');
    if (chip.chipHeights.some((h) => Math.abs(h - chip.h) > 2)) findings.push('chip height differs from its neighbours: ' + JSON.stringify(chip));
  }
  if (!dialog.shown) findings.push('Connections did not open from the chip');
  if (!dialog.rows.some((r) => /The house/.test(r)) || !dialog.rows.some((r) => /House jobs/.test(r))) findings.push('dialog misses the board or the map: ' + JSON.stringify(dialog.rows));
  if (errors.length) findings.push('page errors: ' + errors.join(' | '));
  console.log(findings.length ? 'FAIL: ' + findings.join('\n  ') : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})();
