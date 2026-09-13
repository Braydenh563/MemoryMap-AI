// INBOX 180: the tapered branch. Measures the drawn ribbon's width at both
// ends against the stroke it replaced, and checks the hit twin is still the
// centreline.
const { boot, OUT } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1280, height: 820 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  const out = await page.evaluate(async () => {
    const v = document.getElementById('library-view-whiteboard');
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle('hidden', s !== v);
    await initWhiteboard();
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `ribbon ${Date.now()}`, type: 'map' }) });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    await fetchWhiteboardState(board.id);
    const mk = async (x, y, text, parent) => {
      const made = await apiJson('/whiteboard/objects', {
        method: 'POST',
        body: JSON.stringify({ board_id: board.id, kind: 'topic', x, y, width: 170, height: 52, data: { content: text } }),
      });
      // `parent_id` is not part of the object payload: the tree is moved, not
      // declared (the same `/move` the transplant uses).
      if (parent) {
        Object.assign(made, await apiJson(`/whiteboard/boards/${board.id}/nodes/${made.id}/move`, {
          method: 'PUT', body: JSON.stringify({ parent_id: parent }),
        }));
      }
      return made;
    };
    const root = await mk(180, 360, 'Root');
    const a = await mk(460, 220, 'First branch', root.id);
    const b = await mk(460, 380, 'Second branch', root.id);
    await mk(760, 200, 'Leaf', a.id);
    // One edge set to a plain straight line, to prove the styles still differ.
    const c = await mk(460, 540, 'Straight one', root.id);
    await apiJson(`/whiteboard/objects/${c.id}`, {
      method: 'PUT',
      body: JSON.stringify({ kind: 'topic', board_id: board.id, x: c.x, y: c.y, width: c.width, height: c.height, data: { content: 'Straight one', edge_style: 'straight' } }),
    });
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 700));
    const edges = [...document.querySelectorAll('.wb-map-edge')].map((e) => {
      const cs = getComputedStyle(e);
      const box = e.getBBox();
      return {
        cls: e.getAttribute('class'),
        fill: cs.fill, stroke: cs.stroke, strokeWidth: cs.strokeWidth,
        marker: cs.markerEnd,
        // The ribbon's own thickness at each end, from the path data: the
        // first and last pairs of matching samples are the two edges of the
        // shape at t=0 and t=1.
        thickness: (() => {
          const nums = (e.getAttribute('d').match(/-?\d+(\.\d+)?/g) || []).map(Number);
          if (nums.length < 8) return null;
          const first = [nums[0], nums[1]];
          const lastPair = [nums[nums.length - 2], nums[nums.length - 1]];
          const mid = nums.length / 2;
          const across = [nums[mid], nums[mid + 1]];
          const back = [nums[mid - 2], nums[mid - 1]];
          return {
            atParent: +Math.hypot(first[0] - lastPair[0], first[1] - lastPair[1]).toFixed(2),
            atChild: +Math.hypot(back[0] - across[0], back[1] - across[1]).toFixed(2),
          };
        })(),
        w: Math.round(box.width), h: Math.round(box.height),
      };
    });
    const hits = [...document.querySelectorAll('.wb-map-edge-hit')].map((e) => (e.getAttribute('d') || '').slice(0, 12));
    return { edges, hits, arrows: document.querySelectorAll('#wb-map-arrow').length };
  });
  for (const e of out.edges) {
    console.log(`${e.cls}: fill ${e.fill}, stroke ${e.stroke} ${e.strokeWidth}, marker ${e.marker}, ends ${JSON.stringify(e.thickness)}`);
  }
  console.log('hit twins (centrelines):', JSON.stringify(out.hits));
  await page.screenshot({ path: `${OUT}/mapribbon-${process.env.THEME || 'light'}.png` });
  console.log(`${OUT}/mapribbon-${process.env.THEME || 'light'}.png`);
  await browser.close();
})();
