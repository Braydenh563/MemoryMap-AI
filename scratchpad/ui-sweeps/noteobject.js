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

  const findingsDoc = [];
  await page.evaluate((id) => { window.__noteobjBoard = id; }, ids.board);
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
  await page.waitForTimeout(900);
  // **Type where the person types.** Focusing the capture box mounts the
  // engine over it (`NOTE_SURFACES` in documents.js), so the textarea is the
  // form's value carrier and no longer the editing surface: typing into it
  // directly diverges from CodeMirror's own document and throws "Selection
  // points outside of document" on the next update. Measured: that error
  // appeared on a fresh notebook and nowhere a user could reach it.
  const composer = (await page.$('.note-surface .cm-content')) ? '.note-surface .cm-content' : '#entry-content';
  // A delay per character on purpose: typed at full speed the menu's own
  // refresh loses a keystroke and the menu shows the unfiltered shortlist,
  // which is a sweep measuring its own typing rather than the app.
  await page.type(composer, '/board', { delay: 60 });
  await page.waitForTimeout(900);
  const menu = await page.evaluate(() => {
    const el = document.getElementById('editor-menu');
    if (!el || el.classList.contains('hidden')) return null;
    return [...el.querySelectorAll('.editor-menu-item')].map((i) => i.textContent.trim()).slice(0, 8);
  });
  console.log('menu', JSON.stringify(menu));

  // The command all the way through: choose a board in the picker it opens
  // and read what landed in the note. A menu row that inserts nothing is the
  // shape this repo keeps meeting.
  let inserted = null;
  if (menu && menu.some((m) => /board|map/i.test(m))) {
    await page.click('#editor-menu .editor-menu-item');
    await page.waitForTimeout(1500);
    const rows = await page.$$('.entry-pick-list .entry-pick-row');
    if (rows.length) {
      await rows[0].click();
      await page.waitForTimeout(800);
      inserted = await page.evaluate(() => document.getElementById('entry-content').value);
    } else {
      inserted = '(the picker offered nothing)';
    }
    console.log('inserted', JSON.stringify(inserted));
  }

  // The other doorway: "add to a note" from the board itself, all the way
  // through to the note's own text.
  await page.evaluate((id) => openWhiteboardBoard(id), ids.board);
  await page.waitForTimeout(2500);
  await page.click('button[aria-controls="wb-board-menu"]').catch(() => {});
  await page.waitForTimeout(600);
  const boardSide = await page.evaluate(() => {
    const el = document.getElementById('wb-add-to-note');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { text: el.textContent.trim(), h: Math.round(r.height), w: Math.round(r.width) };
  });
  console.log('boardSide', JSON.stringify(boardSide));

  let addedToNote = null;
  if (boardSide && boardSide.h > 0) {
    await page.click('#wb-add-to-note');
    await page.waitForTimeout(1000);
    await page.fill('.entry-pick-card input', 'Kitchen plan');
    await page.waitForTimeout(600);
    const rows = await page.$$('.entry-pick-list .entry-pick-row');
    if (rows.length) {
      await rows[0].click();
      await page.waitForTimeout(1500);
      addedToNote = await page.evaluate((id) => apiJson(`/entries/${id}`).then((e) => e.content), ids.note);
    }
    console.log('addedToNote', JSON.stringify((addedToNote || '').slice(-60)));
  }

  // The same object in a document, because `mdEmbedElement` is shared by the
  // note renderer and `renderMarkdown`, and "shared" is a claim until it is
  // measured on both.
  const inDocument = await page.evaluate(async (tag) => {
    const doc = await apiJson('/documents', {
      method: 'POST',
      body: JSON.stringify({ title: `House plan ${tag}`, content: `The plan\n\n![[board:${window.__noteobjBoard}|House jobs ${tag}]]\n` }),
    });
    return doc.id;
  }, tag).catch(() => null);
  if (inDocument) {
    await page.evaluate((id) => { switchTab('documents'); setTimeout(() => openDocument(id), 150); }, inDocument);
    await page.waitForTimeout(3000);
    // The rendered view, which is the one `renderMarkdown` draws; Live is the
    // engine's own decorations and has no transclusion of any kind.
    await page.evaluate(() => setDocView('rendered'));
    await page.waitForTimeout(1500);
    const drawn = await page.evaluate(() => {
      const el = document.querySelector('#doc-preview .board-embed');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { h: Math.round(r.height), svg: !!el.querySelector('svg'), gone: el.classList.contains('board-embed-gone') };
    });
    console.log('inDocument', JSON.stringify(drawn));
    if (!drawn) findingsDoc.push('the board object did not render in a document');
    else if (drawn.gone || !drawn.svg) findingsDoc.push('the board object in a document: ' + JSON.stringify(drawn));
  }

  const findings = [...findingsDoc];
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
  if (inserted !== null && !/!\[\[(board|map):\d+\|/.test(inserted)) findings.push('the "/" command inserted: ' + inserted);
  if (!boardSide) findings.push('no "add to a note" action on the board itself (#wb-add-to-note)');
  else if (!boardSide.h) findings.push('the board\'s "add to a note" row did not open with its menu');
  else if (!addedToNote) findings.push('the board\'s "add to a note" reached no note');
  else if (!new RegExp(`!\\[\\[board:${ids.board}\\|`).test(addedToNote)) findings.push('the note did not gain the board object: ' + addedToNote.slice(-80));
  if (errors.length) findings.push('page errors: ' + errors.join(' | '));

  console.log(findings.length ? 'FAIL: ' + findings.join('\n  ') : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})();
