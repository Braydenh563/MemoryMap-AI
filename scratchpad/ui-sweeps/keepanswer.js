// The answer, kept (CHAT_PLAN B12): asks the owner's question in Ask (gold
// notebook), opens the ⋯ beside Copy, reads its rows, then saves the answer
// as a document and as a mind map of its notes, reads both back through the
// API, and undoes both (Ctrl+Z's stack, `undoLast`).
//
//   BASE=http://127.0.0.1:8872 SCRATCH=<dir> PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/keepanswer.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => { switchTab('notes'); if (window.showNotesSection) showNotesSection('ask'); });
  await page.waitForTimeout(500);
  await page.fill('#question', 'What have I saved about courses & study?');
  await page.evaluate(() => askQuestion());
  await page.waitForFunction(() => !document.querySelector('#ask-answer-more')?.classList.contains('hidden'), null, { timeout: 15000 });
  await page.locator('#ask-answer-more button').first().click();
  await page.waitForTimeout(300);
  const rows = await page.evaluate(() => [...document.querySelectorAll('.action-menu:not(.hidden) .menu-item')].map((r) => r.innerText.trim()));
  const box = await page.locator('#ask-answer-more').boundingBox();
  await page.screenshot({ path: `${process.env.SCRATCH}/shots/keep-menu.png`, clip: { x: Math.max(0, box.x - 420), y: Math.max(0, box.y - 20), width: 640, height: 220 } });
  await page.keyboard.press('Escape');
  const before = await page.evaluate(async () => ({ docs: (await apiJson('/documents')).length ?? null }));
  await page.evaluate(() => askKeepAsDocument());
  await page.waitForTimeout(1200);
  await page.evaluate(() => askKeepAsMap());
  await page.waitForTimeout(1500);
  const made = await page.evaluate(async () => {
    const docs = await apiJson('/documents');
    const list = Array.isArray(docs) ? docs : docs.items || [];
    const doc = list.find((d) => /courses & study/i.test(d.title || ''));
    const stack = undoStack.slice(-2).map((a) => a.label);
    return { doc: doc ? doc.title : null, stack, kept: askKept && askKept.noteIds.length };
  });
  await page.evaluate(async () => { await undoStack.pop().undo(); await undoStack.pop().undo(); });
  await page.waitForTimeout(800);
  const after = await page.evaluate(async () => {
    const docs = await apiJson('/documents');
    const list = Array.isArray(docs) ? docs : docs.items || [];
    return { doc: !!list.find((d) => /courses & study/i.test(d.title || '')) };
  });
  console.log(JSON.stringify({ rows, before, made, afterUndo: after }, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
