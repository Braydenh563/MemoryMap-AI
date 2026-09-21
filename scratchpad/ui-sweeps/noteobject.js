// INBOX 309: a whiteboard or a mind map as an object inside a note, and a
// note's own reminders on the note.
//
// The owner, verbatim: "there is also no way to attach a whiteboard or
// mindmap to a note as like an object in the notes. or to link reminders to
// notes". Two halves of one idea, so one sweep: the embed renders as a live
// preview card and opens the board, a board that is gone leaves a tombstone
// rather than vanishing, the "/" menu can insert one, and a note that caused
// reminders says so on the card.
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(2500);

  // Unique names per run: this sweep runs against whatever notebook the gate
  // has (its own earlier runs included), and two boards called "House jobs"
  // would make the title fallback in `boardEmbedTarget` ambiguous, which is
  // the sweep lying about the code rather than the code being wrong.
  const tag = String(Date.now()).slice(-6);
  const ids = await page.evaluate(async (tag) => {
    const post = (path, body) => apiJson(path, { method: 'POST', body: JSON.stringify(body) });
    const board = await post('/whiteboard/boards', { name: `House jobs ${tag}`, type: 'board' });
    const map = await post('/whiteboard/boards', { name: `The house ${tag}`, type: 'map' });
    // Something on each, so the preview has a real layout to draw rather
    // than the empty state: a miniature of nothing proves nothing. Cards on
    // a board and a reference node on a map, the two shapes `refchips.js`
    // already proves the API takes.
    const roof = await post('/entries', { content: `Roof quote ${tag}`, category: 'General' });
    const gutters = await post('/entries', { content: `Gutters ${tag}`, category: 'General' });
    await post('/whiteboard/nodes', { entry_id: roof.id, board_id: board.id, x: 20, y: 30 });
    await post('/whiteboard/nodes', { entry_id: gutters.id, board_id: board.id, x: 260, y: 180 });
    await post(`/whiteboard/boards/${map.id}/nodes`, { kind: 'note', parent_id: null, text: '', ref_id: roof.id });
    const note = await post('/entries', {
      content: `Kitchen plan\n\n![[board:${board.id}|House jobs ${tag}]]\n\n![[map:${map.id}|The house ${tag}]]\n\n![[board:987654|Old plan ${tag}]]`,
      category: 'General',
    });
    const due = new Date(Date.now() + 86400000).toISOString().slice(0, 19);
    await post('/reminders', { text: 'Ring the roofer', due_at: due, entry_id: note.id });
    await post('/reminders', { text: 'Measure the hall', due_at: due, entry_id: note.id });
    return { board: board.id, map: map.id, note: note.id };
  }, tag);

  await page.evaluate(() => switchTab('notes'));
  await page.evaluate(() => loadEntries());
  await page.waitForTimeout(3000);

  const card = await page.evaluate((id) => {
    const li = document.querySelector(`#entry-list li[data-id="${id}"]`);
    if (!li) return null;
    const objects = [...li.querySelectorAll('.board-embed')].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        text: el.textContent.trim().slice(0, 80),
        h: Math.round(r.height),
        w: Math.round(r.width),
        svg: !!el.querySelector('svg'),
        gone: el.classList.contains('board-embed-gone'),
        ref: el.dataset.boardRef || '',
      };
    });
    return {
      objects,
      body: li.querySelector('.entry-content')?.textContent.slice(0, 200) || '',
      reminderChip: (() => {
        const chip = li.querySelector('.chip.reminders');
        if (!chip) return null;
        const r = chip.getBoundingClientRect();
        return { text: chip.textContent.trim(), h: Math.round(r.height) };
      })(),
    };
  }, ids.note);
  console.log('card', JSON.stringify(card));

  // Pressing the board object opens that board.
  let opened = null;
  if (card && card.objects.length) {
    await page.click(`#entry-list li[data-id="${ids.note}"] .board-embed:not(.board-embed-gone)`);
    await page.waitForTimeout(1800);
    opened = await page.evaluate(() => window.currentBoardId ?? null);
    console.log('opened', opened, 'wanted', ids.board);
    await page.evaluate(() => switchTab('notes'));
    await page.waitForTimeout(1200);
  }

  // The note's reminders, where the card says they are.
  let reminders = null;
  if (card && card.reminderChip) {
    await page.click(`#entry-list li[data-id="${ids.note}"] .chip.reminders`);
    await page.waitForTimeout(1200);
    reminders = await page.evaluate((id) => {
      const li = document.querySelector(`#entry-list li[data-id="${id}"]`);
      const rows = [...li.querySelectorAll('.entry-links .chip')].map((c) => c.textContent.trim());
      return rows;
    }, ids.note);
    console.log('reminders', JSON.stringify(reminders));
  }

  // The "/" menu's own doorway. The capture box lives on the Notes tab's
  // Capture sub-tab, which is `display: none` from the list, so a sweep that
  // types into it from the list types into nothing.
  await page.click('#notes-subtabs button[data-section="capture"]');
  await page.waitForTimeout(700);
  await page.click('#entry-content');
  await page.type('#entry-content', '/board');
  await page.waitForTimeout(900);
  const menu = await page.evaluate(() => {
    const el = document.getElementById('editor-menu');
    if (!el || el.classList.contains('hidden')) return null;
    return [...el.querySelectorAll('.editor-menu-item')].map((i) => i.textContent.trim()).slice(0, 8);
  });
  console.log('menu', JSON.stringify(menu));

  const findings = [];
  if (!card) findings.push('the note did not render');
  else {
    const live = card.objects.filter((o) => !o.gone);
    const gone = card.objects.filter((o) => o.gone);
    if (live.length !== 2) findings.push(`wanted 2 live board objects, got ${live.length}: ${JSON.stringify(card.objects)}`);
    for (const o of live) {
      if (!o.svg) findings.push('a board object drew no preview: ' + JSON.stringify(o));
      if (o.h < 60) findings.push('a board object is ' + o.h + 'px tall, too short to be a preview card');
    }
    if (!live.some((o) => /House jobs/.test(o.text))) findings.push('the board object does not name its board');
    if (!live.some((o) => /The house/.test(o.text))) findings.push('the map object does not name its map');
    if (gone.length !== 1) findings.push('a deleted board left no tombstone: ' + JSON.stringify(card.objects));
    else if (!/Old plan/.test(gone[0].text)) findings.push('the tombstone does not say what was there: ' + gone[0].text);
    if (/Nothing called/.test(card.body)) findings.push('an embedded board rendered as "Nothing called ... yet"');
    if (!card.reminderChip) findings.push('the note does not show its reminders');
    else if (!/2 reminders/.test(card.reminderChip.text)) findings.push('reminder chip text: ' + card.reminderChip.text);
  }
  if (card && card.objects.length && opened !== ids.board) findings.push(`pressing the board object opened ${opened}, wanted ${ids.board}`);
  if (reminders && !reminders.some((r) => /Ring the roofer/.test(r))) findings.push('the reminders panel does not list the reminder: ' + JSON.stringify(reminders));
  if (!menu) findings.push('the "/" menu did not open on /board');
  else if (!menu.some((m) => /board|map/i.test(m))) findings.push('no board or map command in the "/" menu: ' + JSON.stringify(menu));
  if (errors.length) findings.push('page errors: ' + errors.join(' | '));

  console.log(findings.length ? 'FAIL: ' + findings.join('\n  ') : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})();
