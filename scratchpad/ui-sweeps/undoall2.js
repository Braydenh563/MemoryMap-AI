// undoall2.js: INBOX 898, live, the acts undoall.js does not drive (chat edit tail swap, graph pin,
// lightbox reading delete, Forget everything, map branch cuts, board library, recordings, wiki rename
// toast, a file dropped into a note, a space made). ONLY=<regex> runs the acts whose name matches.
// Was undoall.js: INBOX 898, live. For each act: do it, check the server state,
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
const pushResult = results.push.bind(results);
results.push = (r) => { console.log(`${r.ok ? 'PASS' : 'FAIL'}  [${r.kind}] ${r.name}  ${r.note}`); return pushResult(r); };

function sql(statement) {
  return execFileSync('python3', ['-c', `import sqlite3,sys;c=sqlite3.connect(sys.argv[1]);c.execute(sys.argv[2]);c.commit()`, `${DATA}/memorymap.db`, statement]);
}

(async () => {
  const { browser, ctx, page } = await boot({ args: ['--disable-dev-shm-usage'] });
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
    if (process.env.ONLY && !new RegExp(process.env.ONLY, 'i').test(name)) return;
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

  const want = (names) => !process.env.ONLY || new RegExp(process.env.ONLY, 'i').test(names.replace(/\\/g, ''));
  const tag = `ua${Date.now() % 100000}`;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.evaluate(() => switchTab('notes'));
  await settle(1500);
  // ---- undo3: the acts not yet checked live ----
  await page.evaluate(() => switchTab('notes'));
  await settle(800);

  if (want('Forget\\ everything\\ learned')) {
  // 22. Forget everything learned (the confirm dialog's own button).
  const fh = await call('/entries', { method: 'POST', body: { content: `Forget holder ${tag} the cache is warm.` } });
  sql(`INSERT INTO derived_facts (entry_id, kind, text, span_start, span_end, model, confidence, computed_at, edited_by_user) VALUES (${fh.id}, 'claim', 'Cache warm ${tag}', 0, 10, 'local', 0.9, datetime('now'), 0)`);
  await check('Forget everything learned', 'handler', {
    act: async () => {
      const pending = page.evaluate(() => learnedForget());
      await answer();
      await pending;
    },
    state: async () => (await call('/learned?kind=claim&limit=200')).items.filter((f) => f.text.includes(tag)).length,
  });

  }
  if (want('wiki\\ rename\\ via\\ the\\ toast\\ button')) {
  // 23. [[name]] rewrite offered after a rename: press the toast's own button.
  const wt = await call('/entries', { method: 'POST', body: { content: `# Wold ${tag}\n\nbody` } });
  const wl = await call('/entries', { method: 'POST', body: { content: `# Wlink ${tag}\n\nsee [[Wold ${tag}]]` } });
  await call(`/entries/${wt.id}`, { method: 'PUT', body: { content: `# Wnew ${tag}\n\nbody` } });
  await check('wiki rename via the toast button', 'ui', {
    act: async () => {
      await page.evaluate(({ id, old, nw }) => offerWikiRename(id, { wiki_rename: { old, new: nw, notes: 1 } }), { id: wt.id, old: `Wold ${tag}`, nw: `Wnew ${tag}` });
      await page.locator('.toast button', { hasText: 'Rename to' }).first().click();
    },
    state: async () => (await call(`/entries/${wl.id}`)).content,
  });

  }
  if (want('file\\ dropped\\ into\\ a\\ note\\ box')) {
  // 24. A file dropped into a note box (the real drop listener; Quick note's box
  // takes the upload path, the one that records a step).
  await page.evaluate(() => { document.getElementById('quick-note-text').value = 'before the drop '; });
  await check('file dropped into a note box', 'ui', {
    act: async () => {
      await page.evaluate(async (b64) => {
        const box = document.getElementById('quick-note-text');
        const dt = new DataTransfer();
        dt.items.add(new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'dropped.png', { type: 'image/png' }));
        box.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      }, png.toString('base64'));
    },
    state: async () => page.evaluate(() => document.getElementById('quick-note-text').value.replace(/\(\/[^)]*\)/, '(url)')),
  });

  }
  if (want('space\\ created\\ \\(no\\ reload\\)')) {
  // 25. A space made in the New space dialog: no reload, one Undo step.
  const spaceCount = async () => (await call('/spaces')).filter((x) => x.name === `Made ${tag}`).length;
  await check('space created (no reload)', 'ui', {
    act: async () => {
      await page.evaluate(() => { window.__noReload = true; openSpaceCreate(); });
      await page.fill('#space-create-name', `Made ${tag}`);
      await page.click('#space-create-submit');
    },
    state: spaceCount,
  });
  console.log('page kept (no reload):', await page.evaluate(() => window.__noReload === true));

  }
  if (want('lightbox\\ reading\\ deleted')) {
  // 26. The lightbox's trash beside a reading (the real button, the real confirm).
  const up2 = await page.evaluate(async ({ tag, b64, token }) => {
    const form = new FormData();
    form.append('file', new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], `read-${tag}.png`, { type: 'image/png' }));
    form.append('direct', 'true');
    const r = await fetch('/media/upload', { method: 'POST', body: form, headers: { 'X-Auth-Token': token, 'X-Workspace-ID': activeSpaceId() } });
    return r.json();
  }, { tag, b64: png.toString('base64'), token });
  const seeded = await call(`/media/${up2.id}/ocr`, { method: 'POST', body: { text: `Reading text ${tag}` } });
  console.log('reading seeded:', JSON.stringify(seeded).slice(0, 160));
  await page.evaluate(() => switchTab('library'));
  await settle(800);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-media"][data-media-kind="images"]')?.click());
  await settle(1500);
  await page.evaluate(() => renderLibraryImagesGallery());
  await settle(1500);
  await check('lightbox reading deleted', 'ui', {
    act: async () => {
      await page.locator(`#library-images-grid figure:has-text("read-${tag}") img`).first().click();
      const trash = page.locator('.lightbox-reading-delete:not(.hidden)').first();
      await trash.waitFor({ timeout: 6000 });
      await trash.click();
      await answer();
    },
    state: async () => { const m = ((await call('/media?limit=200')).find?.((x) => (x.original_name || '').includes(`read-${tag}`)) || {}); return (m.ocr_text || '') + '|' + (m.vision_ocr_text || ''); },
  });
  await page.keyboard.press('Escape');

  }
  if (want('recording\\ renamed\\ \\(menu\\)|recording\\ deleted\\ \\(menu\\)|recording\\ trimmed')) {
  // 27. Recordings: rename and delete from the row's menu, and a trim.
  const wavBuf = (() => {
    const n = 16000, b = Buffer.alloc(44 + n * 2);
    b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
    b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28);
    b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
    for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / 8) * 8000), 44 + i * 2);
    return b;
  })();
  const rec = await call('/recordings', { method: 'POST', body: { title: `Rec ${tag}`, mime: 'audio/wav' } });
  await page.evaluate(async ({ id, b64, token }) => {
    const form = new FormData();
    form.append('file', new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'a.wav', { type: 'audio/wav' }));
    form.append('duration_ms', '1000');
    await fetch(`/recordings/${id}/chunk`, { method: 'POST', body: form, headers: { 'X-Auth-Token': token, 'X-Workspace-ID': activeSpaceId() } });
    await fetch(`/recordings/${id}/finish`, { method: 'POST', headers: { 'X-Auth-Token': token, 'X-Workspace-ID': activeSpaceId(), 'Content-Type': 'application/json' }, body: JSON.stringify({ duration_ms: 1000, peaks: [1, 2, 3], markers: [] }) });
  }, { id: rec.id, b64: wavBuf.toString('base64'), token });
  await page.evaluate(() => switchTab('library'));
  await settle(800);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-recordings"]')?.click());
  await settle(1500);
  await page.evaluate(() => renderRecordings());
  await settle(1000);
  const recs = async () => ((await call('/recordings?limit=500')).recordings || []).filter((r) => (r.title || '').includes(`Rec ${tag}`) && !(r.title || '').includes('trimmed')).map((r) => r.title).sort();
  const row = () => page.locator(`#recordings-list li:has-text("Rec ${tag}")`).first();
  await check('recording renamed (menu)', 'ui', {
    act: async () => {
      await row().locator('.kebab-opener').first().click();
      await page.getByRole('menuitem', { name: /Rename/ }).first().click();
      await answer(`Rec ${tag} renamed`);
    },
    state: recs,
  });
  await check('recording deleted (menu)', 'ui', {
    act: async () => {
      await page.evaluate(() => renderRecordings());
      await settle(800);
      await row().locator('.kebab-opener').first().click();
      await page.getByRole('menuitem', { name: /Delete/ }).first().click();
    },
    state: recs,
  });
  const trimmedCount = async () => ((await call('/recordings?limit=500')).recordings || []).filter((r) => (r.title || '').includes(`Rec ${tag}`) && (r.title || '').includes('trimmed')).length;
  await call(`/recordings/${rec.id}/restore`, { method: 'POST' });
  await check('recording trimmed', 'handler', {
    act: async () => {
      const r = (await call('/recordings?limit=500')).recordings.find((x) => (x.title || '').startsWith(`Rec ${tag}`) && !(x.title || '').includes('trimmed'));
      await page.evaluate((rr) => trimRecording(rr, 0, 500), r);
    },
    state: trimmedCount,
    wait: 2200,
  });

  }
  if (want('chat\\ edit\\-and\\-resend\\ \\(tail\\ swap\\)|chat\\ edit\\-and\\-resend\\ \\(whole\\ chat\\ swapped\\)')) {
  // 28. Chat: edit a question and resend. The cut and the new tail are the
  // routes the Save & resend button calls (sendChatMessage needs a model, so
  // the new answer is written as a turn); the step is the real chatEditUndo.
  const turnQs = async (id) => ((await call(`/conversations/${id}`)).messages || []).filter((m) => m.role === 'user').map((m) => m.content);
  const chatP = await call('/conversations', { method: 'POST', body: { question: `Q1 ${tag}`, answer: 'A1' } });
  await call(`/conversations/${chatP.id}/turns`, { method: 'POST', body: { question: `Q2 ${tag}`, answer: 'A2' } });
  await call(`/conversations/${chatP.id}/turns`, { method: 'POST', body: { question: `Q3 ${tag}`, answer: 'A3' } });
  await check('chat edit-and-resend (tail swap)', 'handler', {
    act: async () => {
      await page.evaluate(async ({ id, tag }) => {
        const cut = await apiJson(`/conversations/${id}/truncate`, { method: 'POST', body: JSON.stringify({ from_turn: 1 }) });
        await apiJson(`/conversations/${id}/turns`, { method: 'POST', body: JSON.stringify({ question: `Q2 edited ${tag}`, answer: 'A2b' }) });
        await lazyScript('/js/chat-undo.js');
        chatEditUndo(id, 1, cut, id);
      }, { id: chatP.id, tag });
    },
    state: () => turnQs(chatP.id),
  });
  const chatW = await call('/conversations', { method: 'POST', body: { question: `W1 ${tag}`, answer: 'WA1' } });
  let chatWNew = null;
  const wholeQs = async () => ({ old: (await call(`/conversations/${chatW.id}`)).messages ? await turnQs(chatW.id) : 'gone', fresh: chatWNew ? await turnQs(chatWNew) : null });
  await check('chat edit-and-resend (whole chat swapped)', 'handler', {
    act: async () => {
      chatWNew = await page.evaluate(async ({ id, tag }) => {
        const cut = await apiJson(`/conversations/${id}/truncate`, { method: 'POST', body: JSON.stringify({ from_turn: 0 }) });
        const fresh = await apiJson('/conversations', { method: 'POST', body: JSON.stringify({ question: `W1 edited ${tag}`, answer: 'WA1b' }) });
        await lazyScript('/js/chat-undo.js');
        chatEditUndo(id, 0, cut, fresh.id);
        return fresh.id;
      }, { id: chatW.id, tag });
    },
    //: Titles of every chat in this sweep's W group (the new chat may reuse the old row's id).
    state: async () => ((await call('/conversations')).conversations || (await call('/conversations')) || []).map?.((c) => c.title).filter((t) => t.startsWith('W1') && t.includes(tag)).sort(),
  });

  }
  if (want('graph\\ note\\ pinned\\ in\\ place')) {
  // 29. Graph: a note pinned in place (the node menu's Pin, gcTogglePin).
  await page.evaluate(() => switchTab('graph'));
  await page.waitForFunction(() => typeof gcTab !== 'undefined' && gcTab?.byId?.size > 0, null, { timeout: 25000 }).catch(() => {});
  await settle(1500);
  const pinTarget = await page.evaluate(() => [...gcTab.byId.values()].find((n) => !n.isGroup)?.id ?? null);
  console.log('graph pin target:', pinTarget);
  if (pinTarget != null) {
    await check('graph note pinned in place', 'handler', {
      act: async () => { await page.evaluate((id) => gcTogglePin(gcTab.byId.get(id)), pinTarget); },
      state: async () => { const n = ((await call('/graph')).nodes || []).find((x) => x.id === pinTarget); return n ? n.graph_pin_x != null : 'no node'; },
    });
  }

  }
  if (want('map:\\ Sever\\ \\(cut\\ a\\ branch\\ free\\)|map:\\ Remove\\ keeping\\ the\\ branch|map:\\ turn\\ a\\ line\\ around|map:\\ reverse\\ a\\ cross\\-link|map:\\ cross\\-link\\ to\\ a\\ branch')) {
  // 30. Map branch cuts and cross-link steps: the map's own history on the
  // board tab (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y), server rows compared each time.
  await page.evaluate(() => switchTab('library'));
  await settle(800);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click());
  await page.waitForFunction(() => typeof initWhiteboard === 'function' && typeof openWhiteboardBoard === 'function', null, { timeout: 20000 }).catch(() => {});
  const newMap = async (label) => {
    const m = await call('/whiteboard/boards/import', { method: 'POST', body: { format: 'markdown', content: '# M\n- Root\n  - Alpha\n    - Beta\n  - Gamma', name: `${label} ${tag}` } });
    await page.evaluate((id) => openWhiteboardBoard(id), m.id);
    await settle(3000);
    return m;
  };
  const mapShape = (m) => async () => {
    const st = await call(`/whiteboard/?board_id=${m.id}`);
    const names = new Map((st.objects || []).map((o) => { let t = ''; try { const d = typeof o.data === 'string' ? JSON.parse(o.data) : (o.data || {}); t = d.content || d.text || ''; } catch {} return [o.id, String(t).replace(/<[^>]*>/g, '').trim()]; }));
    const rows = (st.objects || []).map((o) => `${names.get(o.id)}<${names.get(o.parent_id) ?? '-'}`).sort();
    const links = (st.sketches || []).map((k) => { let d = {}; try { d = typeof k.data === 'string' ? JSON.parse(k.data) : (k.data || {}); } catch {} return `${names.get(d.sourceId)}->${names.get(d.targetId)}`; }).sort();
    return { rows, links };
  };
  const idOf = (label) => page.evaluate((l) => wbMapIndex().nodes.find((n) => String(wbMapLabel(n)).replace(/<[^>]*>/g, '').trim() === l)?.id, label);
  const m1 = await newMap('Sever map');
  console.log('map shape sample:', JSON.stringify(await mapShape(m1)()));
  await check('map: Sever (cut a branch free)', 'handler', {
    act: async () => { const a = await idOf('Alpha'); await page.evaluate((x) => wbMapSever(x), a); },
    state: mapShape(m1), wait: 1800,
  });
  const m2 = await newMap('Remove map');
  await check('map: Remove keeping the branch', 'handler', {
    act: async () => { const a = await idOf('Alpha'); await page.evaluate((x) => wbMapRemoveKeepingBranch(x), a); },
    state: mapShape(m2), redoKey: 'Control+y', wait: 1800,
  });
  const m3 = await newMap('Reverse map');
  await check('map: turn a line around', 'handler', {
    act: async () => { const a = await idOf('Alpha'); await page.evaluate((x) => wbMapReverseEdge(x), a); },
    state: mapShape(m3), wait: 1800,
  });
  const m4 = await newMap('Cross map');
  const crossIds = async () => ({ g: await idOf('Gamma'), b: await idOf('Beta') });
  const cr = await crossIds();
  const sk = await call('/whiteboard/sketches', { method: 'POST', body: { board_id: m4.id, x: 0, y: 0, z: 0, data: JSON.stringify({ type: 'link-straight', sourceKind: 'object', sourceId: cr.g, targetKind: 'object', targetId: cr.b }) } });
  await page.evaluate(() => fetchWhiteboardState());
  await settle(1200);
  await check('map: reverse a cross-link', 'handler', {
    act: async () => { await page.evaluate((x) => wbMapReverseCrossLink(x), sk.id); },
    state: mapShape(m4), wait: 1800,
  });
  await check('map: cross-link to a branch', 'handler', {
    act: async () => { await page.evaluate((x) => wbMapCrossLinkToBranch(x), sk.id); },
    state: mapShape(m4), redoKey: 'Control+y', wait: 2200,
  });

  }
  if (want('board\\ library\\ imported\\ \\(file\\ input\\)|board\\ library\\ deleted\\ \\(panel\\ menu\\)')) {
  // 31. Board library: a library file imported (the real file input), then
  // that library deleted from the panel's menu item (its own run).
  await page.evaluate(() => switchTab('library'));
  await settle(600);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click());
  await page.waitForFunction(() => typeof wbLoadLibrary === 'function', null, { timeout: 20000 }).catch(() => {});
  const openBoard = await call('/whiteboard/boards', { method: 'POST', body: { name: `Lib board ${tag}`, type: 'board' } });
  await page.evaluate((id) => openWhiteboardBoard(id), openBoard.id);
  await settle(3000);
  await page.evaluate(() => wbLoadLibrary({ force: true }));
  const seedLib = await call('/board-library/libraries', { method: 'POST', body: { name: `Lib seed ${tag}` } });
  const exported = await page.evaluate(async (id) => (await api(`/board-library/export?library_id=${id}`)).text(), seedLib.id);
  await call(`/board-library/libraries/${seedLib.id}`, { method: 'DELETE' });
  const libNames = async () => ((await call('/board-library')).libraries || []).filter((l) => l.name.includes(`seed ${tag}`)).length;
  await check('board library imported (file input)', 'ui', {
    act: async () => { await page.setInputFiles('#wb-lib-import', { name: 'lib.memorymap-library.json', mimeType: 'application/json', buffer: Buffer.from(exported) }); },
    state: libNames, wait: 2000,
  });
  await check('board library deleted (panel menu)', 'handler', {
    act: async () => {
      await page.evaluate(async (t) => {
        await wbLoadLibrary({ force: true });
        const item = wbLibPanelMenu().find((i) => i.group === 'delete' && i.label.includes(`seed ${t}`));
        await item.run();
      }, tag);
    },
    state: libNames, wait: 2000,
  });

  }
  console.log('\nRESULTS');
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  [${r.kind}] ${r.name}  ${r.note}`);
  console.log(`\n${results.filter((r) => r.ok).length} of ${results.length} passed`);
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
