// INBOX 162: an untagged note is flagged on its card, the flag opens the
// tags field, the Loose ends widget offers the filtered list, and the bell
// carries a weekly nudge. Each as a number.
//
//   BASE=http://127.0.0.1:8931 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node untagged.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  const bad = [];

  // Six untagged notes and one tagged, so the nudge threshold (5) is crossed.
  await page.evaluate(async () => {
    // Idempotent: a previous run's notes go first.
    await loadEntries();
    for (const e of allEntries.filter((x) => /^(untagged note|a tagged note)/.test(x.content))) await api(`/entries/${e.id}`, { method: 'DELETE' });
    for (let i = 0; i < 6; i++) await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `untagged note ${i} about nothing in particular`, tags: [], category: 'General', user_filed: true }) });
    await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'a tagged note', tags: ['kept'], category: 'General', user_filed: true }) });
    localStorage.removeItem('notifications');
    await loadEntries();
  });
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(800);

  const cards = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('#entry-list .chip.untagged')];
    const c = chips[0];
    const cs = c && getComputedStyle(c);
    return {
      count: chips.length,
      role: c && c.getAttribute('role'),
      h: c && Math.round(c.getBoundingClientRect().height),
      border: cs && cs.borderTopStyle,
      both: [...document.querySelectorAll('#entry-list > li')].filter((li) => li.querySelector('.chip.tag:not(.chip-interactive)') && li.querySelector('.chip.untagged')).length,
    };
  });
  console.log(`162 cards       ${cards.count} "No tags yet" chips, role ${cards.role}, ${cards.h}px, ${cards.border} border, cards with both a tag and the flag ${cards.both}`);
  if (cards.count !== 6 || cards.role !== 'button' || cards.border !== 'dashed' || cards.both !== 0) bad.push('untagged chip wrong');

  await page.click('#entry-list .chip.untagged');
  await page.waitForTimeout(400);
  const edit = await page.evaluate(() => ({
    form: Boolean(document.getElementById('entry-edit-content')),
    focused: document.activeElement && document.activeElement.classList.contains('note-edit-tags'),
  }));
  console.log(`162 chip click  edit form ${edit.form}, tags field focused ${edit.focused}`);
  if (!edit.form || !edit.focused) bad.push('chip did not open the tags field');

  const nudge = await page.evaluate(() => {
    const items = JSON.parse(localStorage.getItem('notifications') || '[]');
    const n = items.find((i) => i.kind === 'assist');
    return n ? { title: n.title, filter: n.action && n.action.filter, key: n.id } : null;
  });
  console.log(`162 nudge       ${nudge ? `"${nudge.title}" filter ${nudge.filter} key ${nudge.key}` : 'none'}`);
  if (!nudge || nudge.filter !== 'is:untagged' || !/^6 notes/.test(nudge.title)) bad.push('nudge missing');

  await page.evaluate(() => { editingId = null; openNotifications(); });
  await page.waitForTimeout(400);
  const rows = await page.$$('#notif-list .notif-actionable');
  let rowHit = false;
  for (const r of rows) { const t = await r.textContent(); if (/no tags/.test(t)) { await r.click(); rowHit = true; break; } }
  await page.waitForTimeout(500);
  const filtered = await page.evaluate(() => ({ tab: document.querySelector('.tab-btn.active, [role=tab][aria-selected=true]')?.textContent.trim().slice(0, 12), q: document.getElementById('note-search').value, shown: document.querySelectorAll('#entry-list > li').length }));
  console.log(`162 notif row   clicked ${rowHit}, search "${filtered.q}", ${filtered.shown} cards shown`);
  if (!rowHit || filtered.q !== 'is:untagged' || filtered.shown !== 6) bad.push('notification did not filter');

  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(1200);
  const widget = await page.evaluate(() => {
    const row = document.querySelector('.dash-loose-actions');
    if (!row) return null;
    const b = [...row.querySelectorAll('button')];
    const rects = b.map((x) => x.getBoundingClientRect());
    const overlap = rects.length === 2 && rects[0].right > rects[1].left && rects[1].right > rects[0].left && rects[0].bottom > rects[1].top && rects[1].bottom > rects[0].top;
    const host = row.closest('.dash-widget, .card, section') || row.parentElement;
    const within = rects.every((r) => r.right <= host.getBoundingClientRect().right + 1);
    return { buttons: b.map((x) => x.textContent.trim()), overlap, within, rowW: Math.round(row.getBoundingClientRect().width), overflow: row.scrollWidth > row.clientWidth };
  });
  console.log(`162 loose ends  ${widget ? `${JSON.stringify(widget.buttons)}, overlap ${widget.overlap}, within widget ${widget.within}, row ${widget.rowW}px, overflow ${widget.overflow}` : 'widget not rendered'}`);
  if (!widget || widget.buttons.length !== 2 || widget.overflow || widget.overlap || !widget.within) bad.push('loose ends actions wrong');
  if (widget) {
    await page.click('.dash-loose-actions button:nth-child(2)');
    await page.waitForTimeout(500);
    const q = await page.evaluate(() => document.getElementById('note-search').value);
    console.log(`162 widget btn  search "${q}"`);
    if (q !== 'is:untagged') bad.push('widget button did not filter');
  }

  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
