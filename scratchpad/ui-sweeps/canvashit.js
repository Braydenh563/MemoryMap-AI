// INBOX 180: what is actually under the pointer on a busy board. The marquee
// only starts when the pointerdown target is empty canvas, so anything else
// covering the gaps between items is a drag that cannot select.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  const setup = await page.evaluate(async () => {
    const v = document.getElementById('library-view-whiteboard');
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle('hidden', s !== v);
    await initWhiteboard();
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `hit ${Date.now()}`, type: 'board' }) });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    await fetchWhiteboardState(board.id);
    // A note card, a sticky, a text box, an image-less object and a sketch:
    // the mix the owner's screenshot shows.
    const e = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'Some ideas for features I had:\n\nlots of text here', category: 'General' }) });
    await apiJson('/whiteboard/nodes', { method: 'POST', body: JSON.stringify({ entry_id: e.id, board_id: board.id, x: 620, y: 80, z: 1 }) });
    await apiJson('/whiteboard/objects', { method: 'POST', body: JSON.stringify({ board_id: board.id, kind: 'text', x: 60, y: 200, width: 220, height: 160, data: { content: 'sticky' } }) });
    await apiJson('/whiteboard/objects', { method: 'POST', body: JSON.stringify({ board_id: board.id, kind: 'text', x: 340, y: 220, width: 200, height: 120, data: { content: 'Leafeon image test' } }) });
    await apiJson('/whiteboard/sketches', { method: 'POST', body: JSON.stringify({ board_id: board.id, data: JSON.stringify({ d: 'M300 60 q 60 -40 120 0 q -60 40 -120 0', color: '#7dd3c8', width: 3 }) }) });
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 500));
    if (typeof setWbTool === 'function') setWbTool('select');
    return { objects: (wbState.objects || []).length, nodes: wbState.nodes.length, sketches: wbState.sketches.length };
  });
  console.log('board', JSON.stringify(setup));

  const probe = async (label) => {
    const grid = await page.evaluate(() => {
      const c = document.getElementById('whiteboard-container').getBoundingClientRect();
      const empty = (t) => !t.closest?.('.node-card, .sketch-group, .wb-object, .wb-sketch-handle-group, .wb-resize-handle');
      const counts = {};
      let blocked = 0, total = 0;
      for (let i = 1; i < 24; i++) {
        for (let j = 1; j < 14; j++) {
          const x = c.left + (c.width * i) / 24;
          const y = c.top + (c.height * j) / 14;
          const el = document.elementFromPoint(x, y);
          if (!el) continue;
          total++;
          if (empty(el)) continue;
          blocked++;
          const hit = el.closest('.node-card, .sketch-group, .wb-object, .wb-sketch-handle-group, .wb-resize-handle');
          const key = (hit.className.baseVal || hit.className || '').toString().trim().split(/\s+/)[0] || hit.tagName;
          counts[key] = (counts[key] || 0) + 1;
        }
      }
      return { total, blocked, counts };
    });
    console.log(label, JSON.stringify(grid));
    return grid;
  };
  await probe('nothing selected ');
  await page.evaluate(() => { wbSelectAllItems(); });
  await page.waitForTimeout(400);
  await probe('everything selected');
  await browser.close();
})();
