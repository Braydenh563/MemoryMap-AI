// Brief 76 (DOCUMENTS 24 row 1): each act on a document, done for real, then
// Ctrl+Z with focus outside any text field (the status bar's door), then
// Ctrl+Shift+Z. Reads the server after each and prints "undo N/M, redo N/M".
//   BASE=http://127.0.0.1:8834 [VW=1440] node docacts76.js
const { boot } = require('./lib.js');
(async () => {
  const VW = Number(process.env.VW || 1440);
  const { browser, page } = await boot({ viewport: { width: VW, height: VW < 600 ? 844 : 900 } });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const key = async (chord) => {
    await ev(() => { document.activeElement?.blur?.(); });
    await page.keyboard.press(chord); await page.waitForTimeout(900);
  };
  const st = Date.now();
  const fx = await ev(async (st) => {
    const doc = await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Acts ' + st, content: 'One teh line.\n', file_type: 'md' }) });
    await apiJson(`/documents/${doc.id}`, { method: 'PUT', body: JSON.stringify({ content: 'Version two text.\n' }) });
    const bm = await apiJson('/bookmarks', { method: 'POST', body: JSON.stringify({ url: 'https://example.com/' + st, title: 'Probe link' }) });
    const note = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'Probe note ' + st }) });
    await apiJson(`/documents/${doc.id}/notes`, { method: 'POST', body: JSON.stringify({ entry_id: note.id }) });
    const other = await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Acts shelf ' + st, content: 'x', file_type: 'md' }) });
    return { doc: doc.id, bm: bm.id, note: note.id, other: other.id };
  }, st);
  await ev(() => switchTab('documents')); await page.waitForTimeout(800);
  await ev((id) => loadDocuments(id), fx.doc); await page.waitForTimeout(1800);
  const get = (p) => ev((p) => apiJson(p), p);
  const doc = () => get(`/documents/${fx.doc}`);
  const listed = async (id) => (await get('/documents')).some((d) => d.id === id);
  const rows = [];
  const act = async (name, run, read) => {
    const before = JSON.stringify(await read());
    try { await run(); } catch (e) { rows.push({ name, error: String(e).slice(0, 120) }); return; }
    await page.waitForTimeout(900);
    const after = JSON.stringify(await read());
    await key('Control+z');
    const undone = JSON.stringify(await read());
    await key('Control+Shift+z');
    const redone = JSON.stringify(await read());
    rows.push({ name, changed: before !== after, undo: undone === before, redo: redone === after });
  };
  await act('rename', () => ev((id) => renameDocumentWithUndo(docs.find((d) => d.id === id), 'Renamed acts'), fx.doc), async () => (await doc()).title);
  await act('version restore', async () => {
    const revs = await get(`/documents/${fx.doc}/revisions`);
    await ev((e) => restoreDocVersionWithUndo(e), revs[revs.length - 1]);
  }, async () => (await doc()).content);
  await act('apply a finding', () => ev(() => {
    const t = docText(); const w = t.match(/[A-Za-z]+/); const i = w.index;
    docProseFix({ start: i, end: i + w[0].length, text: w[0], replacement: 'Probe', rule: 'probe' });
  }), async () => ev(() => docText()));
  await act('dictionary add', () => ev((st) => docDictionaryAdd('zzprobe' + st), st), async () => ((await get('/preferences')).writing_dictionary || []).includes('zzprobe' + st));
  await act('bookmark attach', () => ev((b) => docBookmarkWithUndo(b, true), fx.bm), async () => (await get(`/documents/${fx.doc}/bookmarks`)).map((b) => b.id));
  await act('bookmark remove', () => ev((b) => docBookmarkWithUndo(b, false), fx.bm), async () => (await get(`/documents/${fx.doc}/bookmarks`)).map((b) => b.id));
  await act('note unlink', () => ev((n) => unlinkDocNoteWithUndo({ id: n }), fx.note), async () => (await doc()).notes.map((n) => n.id));
  let made = null;
  await act('create', async () => { await ev(() => createDocument()); made = await ev(() => currentDoc.id); }, async () => (made ? listed(made) : false));
  await act('delete', () => ev((id) => deleteDocumentWithUndo(docs.find((d) => d.id === id)), fx.doc), () => listed(fx.doc));
  await act('archive', () => ev((id) => archiveDocumentWithUndo(docs.find((d) => d.id === id)), fx.other), () => listed(fx.other));
  const ok = (k) => rows.filter((r) => r.changed && r[k]).length;
  console.log(JSON.stringify(rows));
  console.log(`acts ${rows.length}: changed ${rows.filter((r) => r.changed).length}, undo ${ok('undo')}/${rows.length}, redo ${ok('redo')}/${rows.length}`);
  await browser.close();
})();
