// Brief 76 (DOCUMENTS 24 row 9): replace in every document, with a regular
// expression, as one undo step. Makes fifty documents, replaces through the
// dialog, presses Ctrl+Z once, and reads all fifty back from the server.
//   BASE=http://127.0.0.1:8834 node docreplace76.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const ev = (fn, a) => page.evaluate(fn, a);
  const st = Date.now();
  const ids = await ev(async (st) => {
    const out = [];
    for (let n = 0; n < 50; n++) out.push((await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: `Rep ${st} ${n}`, content: `The colour${st} of ${n} and the color${st}.`, file_type: 'md' }) })).id);
    return out;
  }, st);
  const read = () => ev(async (ids) => Promise.all(ids.map(async (id) => (await apiJson(`/documents/${id}`)).content)), ids);
  const before = await read();
  await ev(() => switchTab('documents')); await page.waitForTimeout(700);
  await ev((id) => loadDocuments(id), ids[0]); await page.waitForTimeout(1500);
  await ev(() => openDocReplace()); await page.waitForTimeout(400);
  await page.check('#doc-replace-regex');
  await page.fill('#doc-replace-find', `colou?r${st}`);
  await page.fill('#doc-replace-with', 'hue');
  await page.waitForTimeout(6000);
  const summary = await ev(() => document.getElementById('doc-replace-summary').textContent);
  const stack0 = await ev(() => undoStack.length);
  const t0 = Date.now();
  await page.click('#doc-replace-run'); await page.waitForTimeout(2500);
  const replaceMs = Date.now() - t0;
  const after = await read();
  const changed = after.filter((c, i) => c !== before[i] && c.includes('hue') && !c.includes('colo')).length;
  const steps = (await ev(() => undoStack.length)) - stack0;
  await ev(() => document.activeElement?.blur?.());
  await page.keyboard.press('Control+z'); await page.waitForTimeout(3000);
  const undone = await read();
  const back = undone.filter((c, i) => c === before[i]).length;
  await page.keyboard.press('Control+Shift+z'); await page.waitForTimeout(3000);
  const redone = (await read()).filter((c, i) => c === after[i]).length;
  console.log(JSON.stringify({ summary, changed, undoSteps: steps, undoneByOneCtrlZ: back, redone, replaceMs }));
  await browser.close();
})();
