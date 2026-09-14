// INBOX 189 ("I think the test note the popup agent is referring to is the
// mind map I just made called test") and INBOX 190's second half ("what does
// 'the open note' mean?? what does opening a note even entail??").
//
//   BASE=http://127.0.0.1:8795 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/agentsubject.js
//
// Five states of one label, and, for each, what the run would actually send:
// `agentScopeForRun()` is read directly rather than inferred from the label,
// because naming a map correctly on screen and then sending it as `note_ids`
// is exactly the half of 189 that would otherwise look fixed.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };

  const state = () =>
    page.evaluate(() => {
      syncAgentOpenNoteToggle();
      const box = document.getElementById('command-palette-use-note');
      box.checked = !box.disabled;
      return {
        text: document.getElementById('command-palette-use-note-text').textContent,
        title: document.getElementById('command-palette-use-note-label').title,
        disabled: box.disabled,
        scope: agentScopeForRun(),
        subject: agentOpenSubject(),
      };
    });

  await page.evaluate(() => toggleAgentPalette());
  await page.waitForSelector('#command-palette-overlay:not(.hidden)');

  // --- nothing open ---------------------------------------------------------
  const none = await page.evaluate(() => {
    editingId = null;
    lastOpenedEntryId = null;
    window.currentBoardId = null;
    if (typeof currentDoc !== 'undefined') currentDoc = null;
    syncAgentOpenNoteToggle();
    const box = document.getElementById('command-palette-use-note');
    return {
      text: document.getElementById('command-palette-use-note-text').textContent,
      title: document.getElementById('command-palette-use-note-label').title,
      disabled: box.disabled,
      checked: box.checked,
      scope: agentScopeForRun(),
    };
  });
  console.log(`  none: ${JSON.stringify(none)}`);
  check('nothing open says so and disables the box',
    none.disabled && !none.checked && none.text === 'Nothing open to use (open a note, document, board or map first)',
    `"${none.text}", disabled ${none.disabled}`);
  check('nothing open sends no scope', Object.keys(none.scope).length === 0, JSON.stringify(none.scope));

  // --- a note ---------------------------------------------------------------
  await page.evaluate(async () => {
    const h = { 'X-Auth-Token': localStorage.getItem('token') || '', 'Content-Type': 'application/json' };
    const made = await (await fetch('/entries', {
      method: 'POST', headers: h, body: JSON.stringify({ content: '# Bean netting\n\nPigeons.' }),
    })).json();
    await loadEntries();
    lastOpenedEntryId = made.id;
    window.__noteId = made.id;
  });
  const note = await state();
  console.log(`  note: ${JSON.stringify(note)}`);
  check('a note is named a note', /^Use this note: /.test(note.text), `"${note.text}"`);
  check('a note is sent as note_ids', Array.isArray(note.scope.noteIds) && note.scope.noteIds.length === 1,
    JSON.stringify(note.scope));

  // --- a mind map -----------------------------------------------------------
  await page.evaluate(async () => {
    const h = { 'X-Auth-Token': localStorage.getItem('token') || '', 'Content-Type': 'application/json' };
    const board = await (await fetch('/whiteboard/boards', {
      method: 'POST', headers: h, body: JSON.stringify({ name: 'test', type: 'map' }),
    })).json();
    window.__mapId = board.id;
    // The index the resolver reads, refilled rather than faked. Its own 8s
    // freshness window would otherwise hide a board made a second ago, which
    // is a fact about this sweep rather than about the app: a board the owner
    // made is in the index long before they open the palette.
    mapBoardIndexAt = 0;
    await loadMapBoardIndex();
    lastOpenedEntryId = board.id;
  });
  const map = await state();
  console.log(`  map: ${JSON.stringify(map)}`);
  check('a map opened as an entry is named a mind map', map.text === 'Use this mind map: test', `"${map.text}"`);
  check('a map is sent as board_ids', Array.isArray(map.scope.boardIds) && map.scope.boardIds.length === 1,
    JSON.stringify(map.scope));

  // --- a board --------------------------------------------------------------
  await page.evaluate(async () => {
    const h = { 'X-Auth-Token': localStorage.getItem('token') || '', 'Content-Type': 'application/json' };
    const board = await (await fetch('/whiteboard/boards', {
      method: 'POST', headers: h, body: JSON.stringify({ name: 'Plans', type: 'board' }),
    })).json();
    window.__boardId = board.id;
    mapBoardIndexAt = 0;
    await loadMapBoardIndex();
    lastOpenedEntryId = board.id;
  });
  const board = await state();
  console.log(`  board: ${JSON.stringify(board)}`);
  check('a board is named a board', board.text === 'Use this board: Plans', `"${board.text}"`);
  check('a board is sent as board_ids', Array.isArray(board.scope.boardIds), JSON.stringify(board.scope));

  // --- a document -----------------------------------------------------------
  const doc = await page.evaluate(() => {
    switchTab('documents');
    currentDoc = { id: 99, title: 'Lease agreement' };
    syncAgentOpenNoteToggle();
    const box = document.getElementById('command-palette-use-note');
    box.checked = true;
    return {
      text: document.getElementById('command-palette-use-note-text').textContent,
      scope: agentScopeForRun(),
    };
  });
  console.log(`  document: ${JSON.stringify(doc)}`);
  check('a document is named a document', doc.text === 'Use this document: Lease agreement', `"${doc.text}"`);
  check('a document is sent as document_ids', Array.isArray(doc.scope.documentIds), JSON.stringify(doc.scope));

  console.log(fails.length ? `FAILURES: ${fails.join(', ')}` : 'ALL OK');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
