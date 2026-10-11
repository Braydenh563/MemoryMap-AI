// A pinch on the whiteboard zooms, whichever finger lands on a handle
// (phone-1011, the owner's INBOX 888 carried on). Two real touch points
// through CDP at a phone's size: one finger on bare board, the other on a
// selected object's resize grip or its rotate grip, then both move apart.
// Pass: the object's x, y, width, height and rotation are unchanged and the
// zoom scale moved. Each grip is tried with either finger landing first.
//
//   BASE=http://127.0.0.1:8790 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/wbpinchhandle.js
// OVERRIDE_JS="whiteboard.js=/path/base.js" measures a base for "before".
const { boot, openBoardsTab, waitForBoardOpen } = require('./lib.js');

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function touch(cdp, type, points) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: p.id })),
  });
}

(async () => {
  const { browser, ctx, page } = await boot({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, scale: 3, userAgent: IPHONE_UA });
  const cdp = await ctx.newCDPSession(page);
  await openBoardsTab(page);
  await page.evaluate(async () => {
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `Pinch ${Date.now()}` }) });
    await openWhiteboardBoard(board.id);
    return board.id;
  });
  await waitForBoardOpen(page, 0);
  //: A text box (an object) and a card (a node): their grips are built by
  //: separate code (`objectRotateDrag`, `nodeRotateDrag` and the two resizes).
  const items = await page.evaluate(async () => {
    const made = await wbCreateObject('text', { content: 'Pinch me' }, 0, 0, 160, 120, 1);
    const entry = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'Pinch card', defer_filing: true }) });
    const node = await apiJson('/whiteboard/nodes', { method: 'POST', body: JSON.stringify({ entry_id: entry.id, board_id: window.currentBoardId, x: 0, y: 200, z: 1 }) });
    wbState.nodes.push(node);
    await loadEntries();
    renderWhiteboardNow();
    wbZoomToFit({ animate: false });
    return [
      { label: 'text box', kind: 'object', list: 'objects', id: made.id, el: `.wb-object[data-id="${made.id}"]` },
      { label: 'card', kind: 'node', list: 'nodes', id: node.id, el: `.wb-card.node-card[data-id="${node.id}"]` },
    ];
  });
  await waitForBoardOpen(page, 1);
  const state = (item) => page.evaluate((it) => {
    const o = wbState[it.list].find((x) => x.id === it.id);
    const box = document.querySelector(it.el).getBoundingClientRect();
    const k = d3.zoomTransform(document.getElementById('whiteboard-container')).k;
    return { x: o.x, y: o.y, w: Math.round(box.width / k), h: Math.round(box.height / k), r: Number(o.rotation) || 0, k };
  }, item);
  const grip = (item, selector) => page.evaluate(([it, sel]) => {
    selectWbItem(it.kind, it.id);
    renderWhiteboardNow();
    const el = document.querySelector(`${it.el} ${sel}`);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2), w: b.width, h: b.height };
  }, [item, selector]);
  const bare = await page.evaluate(() => {
    const b = document.getElementById('whiteboard-container').getBoundingClientRect();
    return { x: Math.round(b.left + 40), y: Math.round(b.bottom - 60) };
  });

  let fails = 0;
  for (const item of items) for (const [name, selector] of [['resize grip', '.wb-resize-handle[data-handle="se"]'], ['rotate grip', '.wb-rotate-handle']]) {
    for (const order of ['board first', 'grip first']) {
      await page.evaluate(() => wbZoomToFit({ animate: false }));
      await page.waitForTimeout(250);
      const at = await grip(item, selector);
      if (!at) { console.log(`FAIL ${item.label} ${name}: no grip on screen`); fails++; continue; }
      await page.waitForTimeout(150);
      const before = await state(item);
      const g = { id: 1, ...at };
      const b = { id: 0, ...bare };
      const first = order === 'board first' ? b : g;
      const second = order === 'board first' ? g : b;
      await touch(cdp, 'touchStart', [first]);
      await page.waitForTimeout(60);
      await touch(cdp, 'touchStart', [first, second]);
      // Apart, along the line between them, in eight steps.
      const dx = Math.sign(g.x - b.x) || 1, dy = Math.sign(g.y - b.y) || 1;
      for (let i = 1; i <= 8; i++) {
        const pts = [{ ...b, x: b.x - dx * 6 * i, y: b.y - dy * 6 * i }, { ...g, x: g.x + dx * 6 * i, y: g.y + dy * 6 * i }];
        await touch(cdp, 'touchMove', order === 'board first' ? pts : pts.reverse());
        await page.waitForTimeout(30);
      }
      await touch(cdp, 'touchEnd', []);
      await page.waitForTimeout(500);
      const after = await state(item);
      const kept = ['x', 'y', 'w', 'h', 'r'].every((key) => Math.abs(after[key] - before[key]) < 0.5);
      const zoomed = Math.abs(after.k - before.k) > 0.02;
      const ok = kept && zoomed;
      if (!ok) fails++;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${item.label} ${name}, ${order}: grip ${Math.round(at.w)}x${Math.round(at.h)}; object ${before.x},${before.y} ${before.w}x${before.h} r${before.r} -> ${after.x},${after.y} ${after.w}x${after.h} r${after.r}; zoom ${before.k.toFixed(3)} -> ${after.k.toFixed(3)}`);
    }
  }
  await browser.close();
  console.log(fails ? `FAIL: ${fails}` : 'PASS: all');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
