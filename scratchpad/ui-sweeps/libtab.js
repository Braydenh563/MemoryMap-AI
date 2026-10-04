// INBOX 516: inside an open board or map, the Library tab button gets you back.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  for (const kind of ['board', 'map']) {
    await page.evaluate(() => switchTab('library'));
    await page.waitForTimeout(800);
    const opened = await page.evaluate(async (kind) => {
      const list = await apiJson(`/whiteboard/boards${kind === 'map' ? '?type=map' : ''}`).catch(() => []);
      const b = (list.boards || list)[0];
      if (!b) return null;
      await openWhiteboardBoard(b.id);
      return b.id;
    }, kind);
    await page.waitForTimeout(1500);
    const before = await page.evaluate(() => {
      const t = document.getElementById('tab-btn-library').getBoundingClientRect();
      const hit = document.elementFromPoint(t.x + t.width / 2, t.y + t.height / 2);
      return { hit: hit && (hit.id || hit.className).toString().slice(0, 60), boardOpen: !document.getElementById('wb-canvas-view').classList.contains('hidden') };
    });
    await page.click('#tab-btn-library').catch((e) => before.clickErr = String(e).slice(0, 120));
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => ({ boardOpen: !document.getElementById('wb-canvas-view').classList.contains('hidden'), landing: !document.getElementById('wb-boards-landing').classList.contains('hidden') }));
    console.log(kind, opened, JSON.stringify({ before, after }));
  }
  await browser.close();
})();
