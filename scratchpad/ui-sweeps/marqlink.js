// INBOX 180, the case the earlier probe missed: a marquee drag that starts on
// a connector line rather than on bare canvas. A link cannot be dragged by its
// middle, so if it claims the gesture the selection never begins, and on the
// owner's board the curves run right across the middle of the canvas.
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
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `link ${Date.now()}`, type: 'board' }) });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    await fetchWhiteboardState(board.id);
    const mk = async (x, y, text) => apiJson('/whiteboard/objects', {
      method: 'POST',
      body: JSON.stringify({ board_id: board.id, kind: 'text', x, y, width: 180, height: 90, data: { content: text } }),
    });
    const a = await mk(80, 120, 'left');
    const b = await mk(560, 320, 'right');
    // The app's own link, through whatever function the link tools use.
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 300));
    // A link is a sketch whose data names its two ends (see wbLinkEndpoints).
    await apiJson('/whiteboard/sketches', {
      method: 'POST',
      body: JSON.stringify({
        board_id: board.id, x: 0, y: 0, z: 1,
        data: JSON.stringify({
          type: 'link-curved',
          sourceId: a.id, sourceKind: 'object',
          targetId: b.id, targetKind: 'object',
          color: '#7dd3c8',
        }),
      }),
    });
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 400));
    if (typeof setWbTool === 'function') setWbTool('select');
    const paths = [...document.querySelectorAll('#wb-svg-layer path, #wb-overlay-zoom-group path')]
      .map((p) => {
        const r = p.getBoundingClientRect();
        return { cls: (p.getAttribute('class') || ''), w: Math.round(r.width), h: Math.round(r.height), cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), stroke: getComputedStyle(p).strokeWidth };
      })
      .filter((p) => p.w > 40 || p.h > 40);
    return { a: a.id, b: b.id, sketches: wbState.sketches.length, paths, fns: [] };
  });
  console.log('setup', JSON.stringify(setup));
  // The measurement: start a marquee drag exactly on the connector's middle
  // and see whether anything is selected when it ends.
  const link = setup.paths.find((p) => p.cls.includes('hitbox'));
  if (link) {
    const under = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      const empty = !el.closest?.('.node-card, .sketch-group:not(.wb-link-sketch), .wb-object, .wb-sketch-handle-group, .wb-resize-handle');
      return { el: el.tagName.toLowerCase() + '.' + (el.className.baseVal || el.className || ''), empty };
    }, [link.cx, link.cy]);
    console.log('start point', JSON.stringify(under));
    await page.mouse.move(link.cx, link.cy);
    await page.mouse.down();
    await page.mouse.move(link.cx - 200, link.cy - 200, { steps: 12 });
    const mid = await page.evaluate(() => document.querySelectorAll('.wb-marquee').length);
    await page.mouse.move(link.cx - 420, link.cy - 330, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({ selected: wbMultiSelection.size, strays: document.querySelectorAll('.wb-marquee').length }));
    console.log(`drag from the connector: marquee drawn ${mid}, selected ${after.selected}, strays ${after.strays}`);
    // The regression this could have caused: a plain click on a link must
    // still select the link, not clear the board.
    await page.evaluate(() => { wbMultiSelection.clear(); wbSelectedItem = null; wbApplySelectionHighlight(); });
    await page.mouse.move(link.cx, link.cy);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(300);
    const clicked = await page.evaluate(() => ({
      item: wbSelectedItem ? `${wbSelectedItem.kind}:${wbSelectedItem.id}` : null,
      multi: wbMultiSelection.size,
      strays: document.querySelectorAll('.wb-marquee').length,
    }));
    console.log('plain click on the connector:', JSON.stringify(clicked));
  }
  for (const p of setup.paths.slice(0, 4)) {
    const under = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return 'none';
      const hit = el.closest('.node-card, .sketch-group, .wb-object, .wb-sketch-handle-group, .wb-resize-handle');
      return `${el.tagName.toLowerCase()}.${(el.className.baseVal || el.className || '').toString().trim()} blocked=${hit ? (hit.className.baseVal || hit.className) : 'no'}`;
    }, [p.cx, p.cy]);
    console.log(`path ${p.cls} at ${p.cx},${p.cy} stroke ${p.stroke}: ${under}`);
  }
  await browser.close();
})();
