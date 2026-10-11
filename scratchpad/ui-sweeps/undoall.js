// undoall.js: INBOX 898, live. For each act: do it, check the server state,
// press Ctrl+Z and check it went back, press Ctrl+Shift+Z (or Ctrl+Y) and
// check it came back, then once more each way. Run against a server on a fresh
// data dir whose password is testpassword123:
//
//   BASE=http://127.0.0.1:8797 DATA=/home/user/.mmscratch/undo-data node scratchpad/ui-sweeps/undoall.js
//
// "ui" acts press the real controls; "handler" acts call the function the
// control calls (named in the label), with the dialog it opens answered by key.
const { boot, BASE } = require('./lib.js');
const { execFileSync } = require('child_process');
const DATA = process.env.DATA || '/home/user/.mmscratch/undo-data';
const results = [];

function sql(statement) {
  return execFileSync('python3', ['-c', `import sqlite3,sys;c=sqlite3.connect(sys.argv[1]);c.execute(sys.argv[2]);c.commit()`, `${DATA}/memorymap.db`, statement]);
}

(async () => {
  const { browser, ctx, page } = await boot();
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const call = (path, opts = {}) => page.evaluate(async ({ path, opts, token }) => {
    const headers = { 'Content-Type': 'application/json', 'X-Auth-Token': token, 'X-Workspace-ID': (typeof activeSpaceId === 'function' ? activeSpaceId() : 'default') };
    if (opts.form) delete headers['Content-Type'];
    const r = await fetch(path, { method: opts.method || 'GET', headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
    const text = await r.text();
    try { return JSON.parse(text); } catch { return { status: r.status, text: text.slice(0, 200) }; }
  }, { path, opts, token });
  const settle = (ms = 1600) => page.waitForTimeout(ms);
  const blur = () => page.evaluate(() => { document.activeElement?.blur?.(); document.body.focus(); });
  const answer = async (text) => {
    await page.waitForSelector('.confirm-overlay', { timeout: 5000 });
    if (text !== undefined) await page.fill('.confirm-overlay input[type=text]', text);
    await page.locator('.confirm-overlay .confirm-actions button').last().click();
    await page.waitForSelector('.confirm-overlay', { state: 'detached', timeout: 5000 }).catch(() => {});
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  //: kind: 'ui' | 'handler'. act runs once; state() reads the server.
  async function check(name, kind, { act, state, redoKey = 'Control+Shift+z', wait = 1600 }) {
    const row = { name, kind, ok: false, note: '' };
    try {
      const before = await state();
      await act();
      await settle(wait);
      const done = await state();
      if (same(before, done)) { row.note = `act changed nothing (${JSON.stringify(done)})`; results.push(row); return; }
      await blur();
      await page.keyboard.press('Control+z');
      await settle(wait);
      const undone = await state();
      if (!same(undone, before)) { row.note = `undo: ${JSON.stringify(undone)} != before ${JSON.stringify(before)}`; results.push(row); return; }
      await blur();
      await page.keyboard.press(redoKey);
      await settle(wait);
      const redone = await state();
      if (!same(redone, done)) { row.note = `redo: ${JSON.stringify(redone)} != done ${JSON.stringify(done)}`; results.push(row); return; }
      await blur();
      await page.keyboard.press('Control+z');
      await settle(wait);
      const again = await state();
      if (!same(again, before)) { row.note = `second undo: ${JSON.stringify(again)}`; results.push(row); return; }
      await blur();
      await page.keyboard.press(redoKey === 'Control+y' ? 'Control+Shift+z' : 'Control+y');
      await settle(wait);
      const last = await state();
      if (!same(last, done)) { row.note = `second redo (${redoKey === 'Control+y' ? 'Ctrl+Shift+Z' : 'Ctrl+Y'}): ${JSON.stringify(last)}`; results.push(row); return; }
      row.ok = true;
      row.note = `${JSON.stringify(before)} -> ${JSON.stringify(done)}`;
    } catch (error) {
      row.note = `threw: ${error.message.split('\n')[0]}`;
    }
    results.push(row);
  }

  const tag = `ua${Date.now() % 100000}`;
  await page.evaluate(() => switchTab('notes'));
  await settle(1500);

  // 1. A note typed into Capture and saved.
  await check('note saved from Capture', 'ui', {
    act: async () => {
      await page.evaluate(() => { switchTab('notes'); showNotesSection('capture'); });
      await page.fill('#entry-content', `Capture ${tag} one`);
      await page.click('#save-btn');
    },
    state: async () => (await call('/entries?limit=200')).filter?.((e) => e.content.includes(`Capture ${tag}`)).length ?? -1,
  });

  // 2. A note deleted (to the bin) from its card, then undone from the bar.
  const made = await call('/entries', { method: 'POST', body: { content: `Delete me ${tag}` } });
  await page.evaluate(() => loadEntries());
  await settle(1500);
  await check('note deleted to the bin', 'handler', {
    act: async () => { await page.evaluate((id) => binNoteWithUndo({ id }), made.id); },
    state: async () => { const r = await call(`/entries/${made.id}`); return Boolean(r.detail) || Boolean(r.deleted_at); },
  });

  // 3. Two notes linked (the link menu's route), Ctrl+Z removes that very link.
  const a = await call('/entries', { method: 'POST', body: { content: `Link A ${tag}` } });
  const b = await call('/entries', { method: 'POST', body: { content: `Link B ${tag}` } });
  await check('two notes linked', 'handler', {
    act: async () => {
      await page.evaluate(async ({ a, b }) => {
        const body = { target_id: b.id };
        const out = await apiJson(`/entries/${a.id}/links`, { method: 'POST', body: JSON.stringify(body) });
        await pushLinkCreateUndo(a.id, b.id, out, body, 'Linked two notes');
      }, { a, b });
    },
    state: async () => ((await call(`/entries/${a.id}`)).links || []).length,
  });

  // 4. A bookmark added from the Library form.
  await page.evaluate(() => switchTab('library'));
  await settle(1500);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-links"]')?.click());
  await settle(1000);
  await check('bookmark added', 'ui', {
    act: async () => {
      await page.click('#bookmark-add');
      await page.fill('#bookmark-url-input', `https://example.test/${tag}`);
      await page.fill('#bookmark-title-input', `Mark ${tag}`);
      await page.press('#bookmark-title-input', 'Enter');
    },
    state: async () => ((await call('/bookmarks')).filter?.((x) => (x.title || '').includes(tag)).length ?? -2),
  });

  // 5. Library: a picture uploaded with the Upload button.
  await page.evaluate(() => { switchTab('library'); });
  await page.waitForFunction(() => typeof renderLibraryImagesGallery === 'function', null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-media"][data-media-kind="images"]')?.click());
  await settle(1500);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const mediaCount = async () => ((await call('/media?limit=200')).filter?.((m) => (m.original_name || '').includes(tag)).length ?? -3);
  await check('Library upload', 'ui', {
    act: async () => { await page.setInputFiles('#library-images-upload-input', { name: `pic-${tag}.png`, mimeType: 'image/png', buffer: png }); },
    state: mediaCount,
  });

  // 6. Library: that picture deleted from its tile (bytes come back on Undo).
  const up = await page.evaluate(async ({ tag, b64, token }) => {
    const form = new FormData();
    form.append('file', new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], `del-${tag}.png`, { type: 'image/png' }));
    form.append('direct', 'true');
    const r = await fetch('/media/upload', { method: 'POST', body: form, headers: { 'X-Auth-Token': token, 'X-Workspace-ID': activeSpaceId() } });
    return r.json();
  }, { tag, b64: png.toString('base64'), token });
  await page.evaluate(() => renderLibraryImagesGallery());
  await settle(1500);
  await check('Library picture deleted (file comes back)', 'ui', {
    act: async () => {
      await page.locator(`#library-images-grid figure:has-text("del-${tag}") .kebab-opener`).first().click();
      await page.getByRole('menuitem', { name: /Delete/ }).first().click();
      await answer();
    },
    state: async () => {
      const listed = ((await call('/media?limit=200')).filter?.((m) => (m.original_name || '').includes(`del-${tag}`)).length ?? -4);
      const bytes = await page.evaluate(async (url) => (await fetch(url, { headers: {} })).status, up.url);
      return { listed, bytes: listed ? bytes : 'n/a' };
    },
  });

  // 7. A note restored from the bin (Library action), Undo bins it again.
  const binned = await call('/entries', { method: 'POST', body: { content: `Binned ${tag}` } });
  await call(`/entries/${binned.id}`, { method: 'DELETE' });
  await check('note restored from the bin', 'handler', {
    act: async () => {
      await page.evaluate(async (id) => {
        await apiJson(`/entries/${id}/restore`, { method: 'POST' });
        pushBinPairUndo('Restored a note', `/entries/${id}`, `/entries/${id}/restore`, true, () => refreshEntries([id]));
      }, binned.id);
    },
    state: async () => { const r = await call(`/entries/${binned.id}`); return Boolean(r.detail) || Boolean(r.deleted_at); },
  });

  // 8. Settings: a memory switched off from Settings, Memory.
  const pref = await call('/memory', { method: 'POST', body: { content: `Prefer tea ${tag}` } });
  await page.evaluate(() => openSettingsModal?.('memory') ?? openSettingsModal());
  await settle(2500);
  await check('memory turned off in Settings', 'ui', {
    act: async () => { await page.click(`.memory-row:has-text("Prefer tea ${tag}") button:has-text("Turn off")`); },
    state: async () => ((await call('/memory')).preferences.find((p) => p.id === pref.id) || {}).active,
  });
  await page.evaluate(() => closeSettingsModal?.());
  await page.keyboard.press('Escape');
  await settle(800);

  // 9. Ask history: one past question deleted (server undo bin).
  sql(`INSERT INTO ask_turns (question, answer, raw_result_ids, search_mode, when_phrase, match_info, connected_ids, grounding, pinned, workspace_id, created_at) VALUES ('Where is ${tag}?', 'Here ${tag}', '[]', '', '', '{}', '[]', '[]', 0, 'default', datetime('now'))`);
  await check('Ask history question deleted', 'handler', {
    act: async () => {
      const turns = (await call('/ask-history')).turns;
      const row = turns.find((t) => t.question.includes(tag));
      const pending = page.evaluate((id) => deleteAskHistoryTurn(id), row.id);
      await answer();
      await pending;
    },
    state: async () => (await call('/ask-history')).turns.filter((t) => t.question.includes(tag)).length,
  });

  // 10. Learned: one derived fact deleted (tombstone) in Settings, Learned.
  const holder = await call('/entries', { method: 'POST', body: { content: `The batch size stays at 32 ${tag}.` } });
  sql(`INSERT INTO derived_facts (entry_id, kind, text, span_start, span_end, model, confidence, computed_at, edited_by_user) VALUES (${holder.id}, 'claim', 'Batch size is 32 ${tag}', 0, 10, 'local', 0.9, datetime('now'), 0)`);
  await check('learned fact deleted', 'handler', {
    act: async () => {
      const fact = (await call('/learned?kind=claim&limit=50')).items.find((f) => f.text.includes(tag));
      const pending = page.evaluate((f) => learnedDelete(f), fact);
      await answer();
      await pending;
    },
    state: async () => (await call('/learned?kind=claim&limit=50')).items.filter((f) => f.text.includes(tag)).length,
  });

  // 11. A tension dismissed ("Not a contradiction"), reopened by Undo.
  await check('tension dismissed', 'handler', {
    act: async () => {
      await page.evaluate(async ({ a, b }) => {
        await apiJson('/entries/tensions/dismiss', { method: 'POST', body: JSON.stringify({ earlier_id: a.id, later_id: b.id }) });
        pushTensionLinkUndo(a.id, b.id, 'dismiss');
      }, { a, b });
    },
    state: async () => ((await call('/learned/corrections')).filter?.((c) => c.kind === 'dismiss_tension').length ?? -1),
  });

  // 12. A note's file deleted from its card (row and bytes come back).
  const holder2 = await call('/entries', { method: 'POST', body: { content: `Has a file ${tag}` } });
  await page.evaluate(async ({ id, b64, token }) => {
    const form = new FormData();
    form.append('file', new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'note-file.png', { type: 'image/png' }));
    await fetch(`/entries/${id}/files`, { method: 'POST', body: form, headers: { 'X-Auth-Token': token, 'X-Workspace-ID': activeSpaceId() } });
  }, { id: holder2.id, b64: png.toString('base64'), token });
  await check('note file deleted', 'handler', {
    act: async () => {
      const att = (await call(`/entries/${holder2.id}`)).attachments[0];
      const pending = page.evaluate((a) => attachmentAction('remove', { attachment: a, name: a.filename, url: `/files/${a.id}`, onChange: () => refreshEntries([a.entry_id]) }), att);
      await answer();
      await pending;
    },
    state: async () => (await call(`/entries/${holder2.id}`)).attachments.length,
  });

  // 13. Wiki rename: [[Old]] rewritten in another note, then undone.
  const target = await call('/entries', { method: 'POST', body: { content: `# Old ${tag}\n\nbody` } });
  const linker = await call('/entries', { method: 'POST', body: { content: `# Linker ${tag}\n\nsee [[Old ${tag}]]` } });
  await call(`/entries/${target.id}`, { method: 'PUT', body: { content: `# New ${tag}\n\nbody` } });
  await check('[[name]] rewritten in other notes', 'handler', {
    act: async () => {
      await page.evaluate(async ({ id, old }) => {
        const done = await apiJson(`/entries/${id}/wiki-rename`, { method: 'POST', body: JSON.stringify({ old }) });
        pushWikiRenameUndo(id, old, done);
      }, { id: target.id, old: `Old ${tag}` });
    },
    state: async () => (await call(`/entries/${linker.id}`)).content,
  });

  // 14. Manage categories: a merge suggestion dismissed with "Not these".
  const cats = [`Recipes${tag}`, `Recipe${tag}`];
  for (const [name, text] of [[cats[0], 'one'], [cats[0], 'two'], [cats[1], 'three']]) await call('/entries', { method: 'POST', body: { content: `${text} ${tag}`, category: name } });
  const pairShown = async () => ((await call('/tidy-proposals')).merges || []).filter((m) => [m.keep.name, m.merge.name].sort().join() === [...cats].sort().join()).length;
  await page.evaluate(() => openManageCategories());
  await settle(2500);
  await check('merge suggestion dismissed (Not these)', 'ui', {
    act: async () => { await page.locator(`:has(> .manage-suggest-names:has-text("${cats[0]}")) > button:has-text("Not these")`).first().click(); },
    state: pairShown,
  });
  await page.keyboard.press('Escape');
  await settle(600);

  // 15. A stand-alone capture window: the note lands on this window's stack.
  const popup = await ctx.newPage();
  await popup.addInitScript((t) => { try { localStorage.setItem('token', t); } catch {} }, token);
  await popup.goto(`${BASE}/capture.html`, { waitUntil: 'domcontentloaded' });
  await popup.waitForTimeout(800);
  await check('stand-alone capture window note', 'ui', {
    act: async () => { await popup.fill('#capture-text', `Popup ${tag}`); await popup.keyboard.press('Enter'); },
    state: async () => (await call('/entries?limit=200')).filter?.((e) => e.content.includes(`Popup ${tag}`)).length ?? -1,
    wait: 2200,
  });
  await popup.close().catch(() => {});

  // 16. Board library: a new library made from the board's side panel.
  const board = await call('/whiteboard/boards', { method: 'POST', body: { name: `Board ${tag}`, type: 'board' } });
  await page.evaluate(() => switchTab('library'));
  await settle(800);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click());
  await page.waitForFunction(() => typeof initWhiteboard === 'function' && typeof wbLibNewLibrary === 'function', null, { timeout: 20000 }).catch(() => {});
  await page.evaluate((id) => openWhiteboardBoard(id), board.id);
  await settle(3000);
  const libs = async () => ((await call('/board-library')).libraries || []).filter((l) => l.name.includes(tag)).length;
  await check('board library made', 'handler', {
    act: async () => {
      const pending = page.evaluate(() => wbLibNewLibrary());
      await page.waitForSelector('.confirm-overlay input[type=text]', { timeout: 5000 });
      await answer(`Lib ${tag}`);
      await pending;
    },
    state: libs,
  });

  // 17. Map: the theme changed (one request), board history Ctrl+Z.
  const map = await call('/whiteboard/boards', { method: 'POST', body: { name: `Map ${tag}`, type: 'map' } });
  await page.evaluate((id) => openWhiteboardBoard(id), map.id);
  await settle(3500);
  await check('map theme changed', 'handler', {
    act: async () => { await page.evaluate(() => wbMapSetTheme({ edge_arrow: 'on' })); },
    state: async () => ((await call(`/whiteboard/boards/${map.id}/tree`)).theme || {}).edge_arrow ?? null,
  });

  // 18. Map: layout changed to a tree and tidied, one step.
  await check('map layout changed', 'handler', {
    act: async () => { await page.evaluate(() => wbMapSetLayout('tree-down')); },
    state: async () => (await call(`/whiteboard/boards/${map.id}/tree`)).layout,
    wait: 2200,
  });

  // 19. Board renamed (the board's own history).
  await check('board renamed', 'handler', {
    act: async () => {
      const pending = page.evaluate(() => renameCurrentBoard());
      await page.waitForSelector('#wb-name-field', { timeout: 5000 });
      await page.fill('#wb-name-field', `Renamed ${tag}`);
      await page.keyboard.press('Enter');
      await pending.catch(() => {});
    },
    state: async () => (await call(`/whiteboard/boards/${map.id}/tree`)).title,
    redoKey: 'Control+y',
  });

  // 20. Mermaid text brought onto a plain board: one recorded step.
  await page.evaluate((id) => openWhiteboardBoard(id), board.id);
  await settle(3000);
  const sketches = async () => ((await call(`/whiteboard/sketches?board_id=${board.id}`)) || []).length;
  await check('Mermaid diagram imported onto a board', 'handler', {
    act: async () => { await page.evaluate(() => wbImportMermaid('flowchart TD\n  A[Start] --> B[End]')); },
    state: sketches,
    wait: 2500,
  });

  // 21. A space renamed in its dialog (the dialog's own Save button).
  const space = await call('/spaces', { method: 'POST', body: { name: `Space ${tag}`, icon: 'folder' } });
  await page.evaluate(() => switchTab('notes'));
  await settle(800);
  await check('space renamed', 'ui', {
    act: async () => {
      await page.evaluate((s) => openSpaceEdit(s.id, s.name, s.icon), space);
      await page.fill('#space-edit-name', `Renamed space ${tag}`);
      await page.click('#space-edit-submit');
    },
    state: async () => ((await call('/spaces')).find?.((x) => x.id === space.id) || {}).name,
  });

  console.log('\nRESULTS');
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  [${r.kind}] ${r.name}  ${r.note}`);
  console.log(`\n${results.filter((r) => r.ok).length} of ${results.length} passed`);
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
