// Brief 77 row 4 (WORLD_CLASS 28.1 rules 1, 3): Board, Snapshots… saves a
// named version, shows its picture, and Restore then Ctrl+Z gives the board
// back object-equal (a deep compare of every object's words and box).
//
//   BASE=http://127.0.0.1:8823 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/wbsnap77.js
const { boot, openBoardsTab, waitForBoardOpen } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({});
  await openBoardsTab(page);
  const id = await page.evaluate(async () => {
    const b = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: 'Snap ' + Date.now(), type: 'board' }) });
    const mk = (content, x) => apiJson('/whiteboard/objects', { method: 'POST', body: JSON.stringify({ kind: 'text', data: { content }, board_id: b.id, x, y: 100, z: 1, width: 160, height: 80 }) });
    await mk('One', 100); await mk('Two', 400);
    return b.id;
  });
  await page.evaluate((i) => openWhiteboardBoard(i), id);
  await waitForBoardOpen(page, 2);
  const state = () => page.evaluate(() => JSON.stringify((wbState.objects || []).map((o) => [o.data?.content, o.x, o.y, o.width, o.height]).sort()));
  const kept = await state();
  await page.evaluate(() => wbRunCommand('snapshots')); await page.waitForTimeout(700);
  await page.click('#wb-snapshot-save'); await page.waitForTimeout(400);
  const asked = await page.evaluate(() => document.querySelector('.confirm-overlay:not(.hidden) input')?.value || '');
  await page.keyboard.press('Enter'); await page.waitForTimeout(900);
  const row = await page.evaluate(() => { const r = document.querySelector('.wb-snapshot-row'); return r && { name: r.querySelector('strong').textContent, svg: !!r.querySelector('.wb-snapshot-preview svg'), h: Math.round(r.getBoundingClientRect().height) }; });
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  // Change the board: one more box, one moved.
  await page.evaluate(async () => {
    await apiJson('/whiteboard/objects', { method: 'POST', body: JSON.stringify({ kind: 'text', data: { content: 'Three' }, board_id: window.currentBoardId, x: 700, y: 300, z: 1, width: 160, height: 80 }) });
    const two = wbState.objects.find((o) => o.data.content === 'Two');
    await apiJson(`/whiteboard/objects/${two.id}`, { method: 'PUT', body: JSON.stringify({ kind: two.kind, data: two.data, board_id: two.board_id, z: two.z, width: two.width, height: two.height, x: 420, y: 260 }) });
    await fetchWhiteboardState(); renderWhiteboardNow();
  });
  const changed = await state();
  await page.evaluate(() => wbRunCommand('snapshots')); await page.waitForTimeout(900);
  await page.click('.wb-snapshot-row button'); await page.waitForTimeout(1500);
  const restored = await state();
  await page.click('#whiteboard-container', { position: { x: 30, y: 30 } }).catch(() => {});
  await page.keyboard.press('Control+z'); await page.waitForTimeout(1500);
  const undone = await state();
  const out = { asked, row, restoredEqualsSnapshot: restored === kept, changedDiffers: changed !== kept, undoEqualsBefore: undone === changed };
  console.log(JSON.stringify(out));
  console.log(out.restoredEqualsSnapshot && out.undoEqualsBefore && out.changedDiffers ? 'PASS restore then Ctrl+Z is object-equal' : `FAIL ${restored} / ${undone} / ${changed}`);
  await browser.close();
})();
