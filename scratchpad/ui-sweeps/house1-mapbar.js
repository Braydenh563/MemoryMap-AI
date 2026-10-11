// Ledger 1549: the map's topic strip (#wb-map-strip) at 390: rows, size, overflow.
const { boot, openBoardsTab, waitForBoardOpen } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 390);
  const { browser, page } = await boot({ viewport: { width: W, height: 844 }, hasTouch: W < 600, isMobile: W < 600 });
  const id = await page.evaluate(async () => {
    const b = await api('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: 'strip probe', type: 'map', layout: 'tree-right' }) });
    const board = typeof b.json === 'function' ? await b.json() : b;
    const root = await api(`/whiteboard/boards/${board.id}/nodes`, { method: 'POST', body: JSON.stringify({ kind: 'topic', text: 'Root' }) });
    const r = typeof root.json === 'function' ? await root.json() : root;
    await api(`/whiteboard/boards/${board.id}/nodes`, { method: 'POST', body: JSON.stringify({ kind: 'topic', parent_id: r.id, text: 'Child' }) });
    return board.id;
  });
  await openBoardsTab(page);
  await page.evaluate((i) => openWhiteboardBoard(i), id);
  await waitForBoardOpen(page, 2);
  await page.waitForTimeout(800);
  await page.evaluate(() => { const n = document.querySelector('#whiteboard-container .wb-object'); if (n) n.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
  await page.mouse.click(W / 2, 300).catch(() => {});
  const nodes = await page.$$('#whiteboard-container .wb-object'); const node = nodes[nodes.length - 1];
  if (node) await node.click({ force: true }).catch(() => {});
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => {
    const s = document.getElementById('wb-map-strip');
    if (!s) return { present: false };
    const cs = getComputedStyle(s); const b = s.getBoundingClientRect();
    const kids = [...s.children].filter((c) => c.offsetParent);
    const tops = [...new Set(kids.map((c) => Math.round(c.getBoundingClientRect().top)))];
    return { present: true, hidden: s.classList.contains('hidden'), w: Math.round(b.width), h: Math.round(b.height), rows: tops.length, wrap: cs.flexWrap, right: Math.round(b.right), vw: innerWidth, scrollW: s.scrollWidth, clientW: s.clientWidth };
  });
  console.log(JSON.stringify({ width: W, ...r }));
  await browser.close();
})();
