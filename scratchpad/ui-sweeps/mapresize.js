// MINDMAP_PLAN.md item 177: "resize a topic as a card resizes on the
// whiteboard". Measures the grip's own drag (a real mouse drag, not a
// synthetic event), what the server stores, and whether the tidy pass makes
// room for the new size instead of overlapping it.
const { boot, OUT } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  const seeded = await page.evaluate(async () => {
    const v = document.getElementById('library-view-whiteboard');
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle('hidden', s !== v);
    await initWhiteboard();
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `resize ${Date.now()}`, type: 'map' }) });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    await fetchWhiteboardState(board.id);
    const mk = async (x, y, text, parent) => {
      const made = await apiJson('/whiteboard/objects', {
        method: 'POST',
        body: JSON.stringify({ board_id: board.id, kind: 'topic', x, y, width: 170, height: 52, data: { content: text } }),
      });
      if (parent) Object.assign(made, await apiJson(`/whiteboard/boards/${board.id}/nodes/${made.id}/move`, {
        method: 'PUT', body: JSON.stringify({ parent_id: parent }),
      }));
      return made;
    };
    const root = await mk(180, 360, 'Root');
    const a = await mk(520, 240, 'Branch one', root.id);
    await mk(520, 420, 'Branch two', root.id);
    await mk(860, 220, 'Leaf', a.id);
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 600));
    const el = document.querySelector(`.wb-object[data-id="${a.id}"]`);
    return { boardId: board.id, id: a.id, w: el.offsetWidth, h: el.offsetHeight, minHeight: getComputedStyle(el).minHeight };
  });
  console.log(`before: ${seeded.w}x${seeded.h}px, min-height ${seeded.minHeight}`);

  // The grip is opacity 0 until the node is hovered or selected, so the drag
  // starts by pointing at the node: the same order a person's hand takes.
  const node = await page.$(`.wb-object[data-id="${seeded.id}"]`);
  const box = await node.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(250);
  const gripOpacity = await page.evaluate((id) => {
    const g = document.querySelector(`.wb-object[data-id="${id}"] .wb-map-resize-grip`);
    return g ? getComputedStyle(g).opacity : 'missing';
  }, seeded.id);
  const grip = await page.$(`.wb-object[data-id="${seeded.id}"] .wb-map-resize-grip`);
  const gb = await grip.boundingBox();
  console.log(`grip: ${gb ? `${Math.round(gb.width)}x${Math.round(gb.height)} at (${Math.round(gb.x)}, ${Math.round(gb.y)})` : 'no box'}, opacity on hover ${gripOpacity}`);
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i += 1) {
    await page.mouse.move(gb.x + gb.width / 2 + i * 15, gb.y + gb.height / 2 + i * 7);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForTimeout(900);

  const after = await page.evaluate(async (s) => {
    const el = document.querySelector(`.wb-object[data-id="${s.id}"]`);
    const cs = getComputedStyle(el);
    const live = { w: el.offsetWidth, h: el.offsetHeight, minHeight: cs.minHeight, height: cs.height };
    // What the server actually kept, read back off the wire rather than off
    // the datum the drag just wrote.
    const state = await apiJson(`/whiteboard/?board_id=${s.boardId}`);
    const stored = state.objects.find((o) => o.id === s.id);
    const data = typeof stored.data === 'string' ? JSON.parse(stored.data) : stored.data;
    // And what the layout does with it: a tidy that ignored the width would
    // put the child's left edge inside the parent's box.
    await wbMapTidy({ quiet: true });
    await new Promise((r) => setTimeout(r, 700));
    const me = (wbState.objects || []).find((o) => o.id === s.id);
    const kid = (wbState.objects || []).find((o) => o.parent_id === s.id);
    const afterTidy = document.querySelector(`.wb-object[data-id="${s.id}"]`);
    return {
      live,
      stored: { w: stored.width, h: stored.height, sized: data.sized },
      gap: kid ? Math.round(kid.x - (me.x + me.width)) : null,
      afterTidy: { w: afterTidy.offsetWidth, h: afterTidy.offsetHeight },
    };
  }, seeded);
  console.log(`after drag: ${after.live.w}x${after.live.h}px, min-height ${after.live.minHeight}, height ${after.live.height}`);
  console.log(`stored: width ${after.stored.w}, height ${after.stored.h}, sized ${after.stored.sized}`);
  console.log(`after tidy: ${after.afterTidy.w}x${after.afterTidy.h}px, gap parent right edge to child left edge ${after.gap}px`);
  await page.screenshot({ path: `${OUT}/mapresize-${process.env.THEME || 'light'}.png` });
  console.log(`${OUT}/mapresize-${process.env.THEME || 'light'}.png`);
  await browser.close();
})();
