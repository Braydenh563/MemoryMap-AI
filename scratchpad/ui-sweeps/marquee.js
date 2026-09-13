// INBOX 180: "I cant drag highlight to select shapes". Drags a rectangle over
// empty canvas on a board and on a map, and asks what came back selected.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);

  const run = async (type, opts = {}) => {
    const setup = await page.evaluate(async (label) => {
      const boardType = label.startsWith('map') ? 'map' : 'board';
      const v = document.getElementById('library-view-whiteboard');
      for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle('hidden', s !== v);
      await initWhiteboard();
      const board = await apiJson('/whiteboard/boards', {
        method: 'POST',
        body: JSON.stringify({ name: `marquee ${boardType} ${Date.now()}`, type: boardType }),
      });
      window.currentBoardId = board.id;
      wbShowCanvasView();
      await fetchWhiteboardState(board.id);
      // Three text objects in a row near the origin.
      for (let i = 0; i < 3; i++) {
        await apiJson('/whiteboard/objects', {
          method: 'POST',
          body: JSON.stringify({
            board_id: board.id, kind: boardType === 'map' ? 'topic' : 'text',
            x: 80 + i * 220, y: 120, width: 180, height: 70,
            data: { content: `thing ${i}` },
          }),
        });
      }
      await fetchWhiteboardState(board.id);
      renderWhiteboardNow();
      await new Promise((r) => setTimeout(r, 400));
      if (typeof setWbTool === 'function') setWbTool('select');
      // Optionally leave the board somewhere other than the identity
      // transform, which is where every earlier probe of this ran.
      if (window.__zoomTo) window.__zoomTo();
      await new Promise((r) => setTimeout(r, 300));
      if (window.__preselect) wbSelectAllItems();
      // Where the three objects are on screen, and a clear patch of canvas.
      const boxes = (wbState.objects || []).map((o) => ({ id: o.id, kind: o.kind, x: o.x, y: o.y, w: o.width, h: o.height }));
      const el = [...document.querySelectorAll('.wb-object')].map((e) => {
        const r = e.getBoundingClientRect();
        return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) };
      });
      const cbox = document.getElementById('whiteboard-container').getBoundingClientRect();
      return { container: { l: Math.round(cbox.left), t: Math.round(cbox.top), r: Math.round(cbox.right), b: Math.round(cbox.bottom) }, board: board.id, tool: window.currentTool, objects: boxes.length, boxes, el, sel: wbMultiSelection.size };
    }, type);
    console.log(`${type}: objects ${setup.objects}, tool ${setup.tool}, on screen`, JSON.stringify(setup.el));
    if (!setup.el.length) { console.log(`${type}: nothing drawn, cannot drag`); return; }
    const box = setup.container;
    const left = Math.max(box.l + 8, Math.min(...setup.el.map((e) => e.l)) - 40);
    const top = Math.max(box.t + 8, Math.min(...setup.el.map((e) => e.t)) - 40);
    const right = Math.min(box.r - 8, Math.max(...setup.el.map((e) => e.r)) + 40);
    const bottom = Math.min(box.b - 8, Math.max(...setup.el.map((e) => e.b)) + 40);
    const under = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el ? el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className : el.className.baseVal || '') : 'none';
    }, [left, top]);
    console.log(`${type}: drag ${left},${top} -> ${right},${bottom}; under the start point: ${under}`);
    await page.mouse.move(left, top);
    await page.mouse.down();
    await page.mouse.move(left + 30, top + 20, { steps: 5 });
    const mid = await page.evaluate(() => ({
      marquees: document.querySelectorAll('.wb-marquee').length,
      box: (() => { const m = document.querySelector('.wb-marquee'); return m ? m.getAttribute('width') + 'x' + m.getAttribute('height') : null; })(),
    }));
    await page.mouse.move(right, bottom, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({
      selected: wbMultiSelection.size,
      keys: [...wbMultiSelection],
      strays: document.querySelectorAll('.wb-marquee').length,
      highlighted: document.querySelectorAll('.wb-selected').length,
      transform: (() => { const g = document.getElementById('wb-zoom-group'); return g ? g.getAttribute('transform') : null; })(),
    }));
    console.log(`${type}: mid-drag ${JSON.stringify(mid)} -> after ${JSON.stringify(after)}`);
  };

  await run('board');
  await run('map');
  // Same two, with the board panned and zoomed first: every earlier probe of
  // this ran at the identity transform, and a person's board never is.
  await page.evaluate(() => {
    window.__zoomTo = () => {
      const sel = d3.select('#whiteboard-container');
      wbZoom.transform(sel, d3.zoomIdentity.translate(160, 90).scale(0.62));
    };
  });
  await run('board (panned and zoomed)');
  await run('map (panned and zoomed)');
  await page.evaluate(() => { window.__preselect = true; });
  await run('board (panned, everything already selected)');
  await browser.close();
})();
