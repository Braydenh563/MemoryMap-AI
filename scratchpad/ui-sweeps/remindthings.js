// WORLD_CLASS_PLAN row 15: Remind me on a Library document card, a board card
// and a Library note card; Link to another on the note card; and the
// Reminders row that opens the document or the board. Each reminder is made
// through the real dialog and then read back from /reminders.
//   BASE=http://127.0.0.1:8795 WIDTH=390 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node remindthings.js
const { boot } = require('./lib.js');

(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const { page, browser } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 }, ...(width < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const results = [];
  const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' ' + detail : ''}`); };
  const s = Date.now().toString(36).slice(-4);
  const made = await page.evaluate(async (s) => {
    const doc = await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: `Remind doc ${s}`, content: '# x\n\nbody' }) });
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `Remind board ${s}` }) });
    const note = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Remind note ${s} with enough words to be a note` }) });
    return { doc: doc.id, board: board.id, note: note.id || note.entry?.id };
  }, s);

  const openMenuOf = async (text) => {
    const card = await page.evaluateHandle((text) => [...document.querySelectorAll('.library-card, .board-card, .wb-board-card')].find((c) => c.textContent.includes(text) && c.getClientRects().length), text);
    const el = card.asElement();
    if (!el) return null;
    await el.scrollIntoViewIfNeeded();
    await el.hover();
    const btn = await el.$('.library-card-menu, button[aria-haspopup="menu"], .kebab-btn, summary');
    if (!btn) return null;
    await btn.click();
    await page.waitForTimeout(300);
    return await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].filter((e) => e.getClientRects().length).map((e) => e.textContent.trim()));
  };
  const pick = (label) => page.evaluate((label) => [...document.querySelectorAll('[role="menuitem"]')].find((e) => e.textContent.includes(label) && e.getClientRects().length).click(), label);
  const dialogOk = async () => {
    await page.waitForSelector('.prompt-card', { timeout: 4000 });
    const info = await page.evaluate(() => {
      const card = document.querySelector('.prompt-card');
      const r = card.getBoundingClientRect();
      return { title: card.querySelector('.confirm-title').textContent, seg: [...card.querySelectorAll('.confirm-seg button')].map((b) => b.textContent.trim()), inside: r.left >= 0 && r.right <= innerWidth, value: card.querySelector('input').value };
    });
    await page.evaluate(() => [...document.querySelectorAll('.prompt-card button')].find((b) => /Set reminder/.test(b.textContent)).click());
    await page.waitForTimeout(700);
    return info;
  };

  // Library: documents.
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(900);
  let rows = await openMenuOf(`Remind doc ${s}`);
  console.log('document rows:', JSON.stringify(rows));
  check('the document card has Remind me', !!rows && rows.some((t) => /Remind me/.test(t)));
  if (rows) {
    await pick('Remind me');
    const d = await dialogOk();
    check('the dialog names the thing and offers three times', /Remind me about this/.test(d.title) && d.seg.length === 3 && d.value.includes(`Remind doc ${s}`) && d.inside, JSON.stringify(d));
  }
  const afterDoc = await page.evaluate(async (id) => apiJson(`/reminders?document_id=${id}`), made.doc);
  check('a reminder about the document exists', afterDoc.length === 1 && afterDoc[0].document_title === `Remind doc ${s}`, JSON.stringify(afterDoc.map((r) => [r.document_id, r.document_title])));

  // Boards.
  await page.evaluate(() => { switchTab('library'); document.querySelector('#library-subtabs button[data-target="library-view-whiteboard"]')?.click(); });
  await page.waitForTimeout(1200);
  rows = await openMenuOf(`Remind board ${s}`);
  console.log('board rows:', JSON.stringify(rows));
  check('the board card has Remind me', !!rows && rows.some((t) => /Remind me/.test(t)));
  if (rows) {
    await pick('Remind me');
    await dialogOk();
  }
  const afterBoard = await page.evaluate(async (id) => apiJson(`/reminders?entry_id=${id}`), made.board);
  check('a reminder about the board exists and says it is a board', afterBoard.length === 1 && afterBoard[0].entry_is_board === true);

  // Library notes.
  await page.evaluate(() => switchTab('library'));
  const views = await page.evaluate(() => [...new Set([...document.querySelectorAll('#library-subtabs button')].map((b) => b.dataset.target))]);
  for (const target of views) {
    await page.evaluate((t) => document.querySelector(`#library-subtabs button[data-target="${t}"]`)?.click(), target);
    await page.waitForTimeout(700);
    const found = await page.evaluate((s) => [...document.querySelectorAll('.library-card')].some((c) => c.textContent.includes(`Remind note ${s}`) && c.getClientRects().length), s);
    if (found) { console.log('note card is in', target); break; }
  }
  rows = await openMenuOf(`Remind note ${s}`);
  console.log('note rows:', JSON.stringify(rows));
  check('the note card has Remind me and Link to another', !!rows && rows.some((t) => /Remind me/.test(t)) && rows.some((t) => /Link to another/.test(t)));
  if (rows) {
    await pick('Remind me');
    await dialogOk();
    const afterNote = await page.evaluate(async (id) => apiJson(`/reminders?entry_id=${id}`), made.note);
    check('a reminder about the note exists', afterNote.length === 1);
    rows = await openMenuOf(`Remind note ${s}`);
    if (rows) {
      await pick('Link to another');
      await page.waitForTimeout(800);
      const state = await page.evaluate(() => ({ tab: !document.getElementById('tab-notes')?.classList.contains('hidden'), source: typeof linkSource !== 'undefined' ? linkSource : null }));
      check('Link to another goes to Notes with this note as the first end', state.tab && state.source === made.note, JSON.stringify(state));
    }
  }

  // Reminders tab.
  await page.evaluate(() => switchTab('reminders'));
  await page.waitForTimeout(1000);
  const tab = await page.evaluate((s) => {
    const rows = [...document.querySelectorAll('#reminder-list li, .reminders-list li, li[data-id]')].filter((li) => li.textContent.includes(`Remind doc ${s}`) || li.textContent.includes(`Remind board ${s}`));
    return rows.map((li) => ({ chip: [...li.querySelectorAll('.entry-links .chip, .entry-links button')].map((c) => c.textContent.trim()), overflow: li.scrollWidth > li.clientWidth + 1 }));
  }, s);
  console.log('reminder rows:', JSON.stringify(tab));
  check('the document reminder shows its document as a chip, nothing overflowing', tab.some((r) => r.chip.some((c) => c.includes(`Remind doc ${s}`))) && tab.every((r) => !r.overflow));
  // Row 34: the ten-minute snooze in the row's menu.
  const snoozeId = await page.evaluate(async (s) => (await apiJson('/reminders', { method: 'POST', body: JSON.stringify({ text: `Snooze probe ${s}`, due_at: new Date(Date.now() + 2 * 86400000).toISOString() }) })).id, s);
  await page.evaluate(() => { switchTab('reminders'); loadReminders(); });
  await page.waitForTimeout(1200);
  const opened = await page.evaluate((s) => {
    const li = [...document.querySelectorAll('li[data-id]')].find((l) => l.textContent.includes(`Snooze probe ${s}`));
    const btn = li && li.querySelector('.entry-actions button[aria-haspopup="menu"], .entry-actions summary, .entry-actions .kebab-btn');
    if (btn) btn.click();
    return !!btn;
  }, s);
  await page.waitForTimeout(300);
  const snoozeRow = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].filter((e) => e.getClientRects().length).map((e) => e.textContent.trim()));
  check('the reminder menu has Snooze 10 minutes', opened && snoozeRow.some((t) => /Snooze 10 minutes/.test(t)), JSON.stringify(snoozeRow));
  if (opened) {
    await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].find((e) => /Snooze 10 minutes/.test(e.textContent) && e.getClientRects().length).click());
    await page.waitForTimeout(1500);
    console.log('toasts:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent.trim()))));
    const due = await page.evaluate(async (id) => (await apiJson('/reminders?limit=200&_=' + Date.now())).find((r) => r.id === id).due_at, snoozeId);
    const minutes = (new Date(due.endsWith('Z') || /[+-]\d\d:\d\d$/.test(due) ? due : due + 'Z').getTime() - Date.now()) / 60000;
    check('it moved the reminder to about ten minutes from now', minutes > 8.5 && minutes < 11.5, minutes.toFixed(1) + ' min');
  }
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  const failed = results.filter((ok) => !ok).length;
  console.log(failed ? `FAIL ${failed}` : `PASS ${results.length} of ${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
