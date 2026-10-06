// INBOX 516: inside an open board or map, the Library tab button gets you back.
const { boot, openBoardsTab, waitForBoardOpen } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  for (const kind of ['board', 'map']) {
    await openBoardsTab(page);
    //: Creates the board or map itself. The list holds only boards "in use"
    //: (a card on them), so on a fresh data dir `list[0]` was undefined, the
    //: sweep opened nothing and its "board" case measured the landing page.
    const opened = await page.evaluate(async (kind) => {
      const made = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `Library tab sweep ${kind}`, type: kind }) });
      await openWhiteboardBoard(made.id);
      return made.id;
    }, kind);
    await waitForBoardOpen(page);
    const before = await page.evaluate(() => {
      const t = document.getElementById('tab-btn-library').getBoundingClientRect();
      const hit = document.elementFromPoint(t.x + t.width / 2, t.y + t.height / 2);
      return { hit: hit && (hit.id || hit.className).toString().slice(0, 60), boardOpen: !document.getElementById('wb-canvas-view').classList.contains('hidden') };
    });
    await page.click('#tab-btn-library').catch((e) => before.clickErr = String(e).slice(0, 120));
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => ({ boardOpen: !document.getElementById('wb-canvas-view').classList.contains('hidden'), landing: !document.getElementById('wb-boards-landing').classList.contains('hidden') }));
    const ok = before.boardOpen && !after.boardOpen && after.landing;
    console.log(ok ? 'OK  ' : 'FAIL', kind, opened, JSON.stringify({ before, after }));
    if (!ok) process.exitCode = 1;
  }
  await browser.close();
})();
