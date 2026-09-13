// INBOX 180: reconnecting a loose node on a map with the link tool. Before
// this the tool made a cross-link, a decoration over a tree the node still
// was not part of; it should adopt the loose node instead.
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
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `rejoin ${Date.now()}`, type: 'map' }) });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    await fetchWhiteboardState(board.id);
    const mk = async (x, y, text) => apiJson('/whiteboard/objects', {
      method: 'POST',
      body: JSON.stringify({ board_id: board.id, kind: 'topic', x, y, width: 180, height: 60, data: { content: text } }),
    });
    const root = await mk(120, 300, 'Root');
    const loose = await mk(520, 140, 'Loose');
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 500));
    const box = (id) => {
      const el = document.querySelector(`.wb-object[data-id="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    };
    return {
      root: root.id, loose: loose.id,
      rootBox: box(root.id), looseBox: box(loose.id),
      parents: (wbState.objects || []).map((o) => [o.id, o.parent_id ?? null]),
      sketches: wbState.sketches.length,
    };
  });
  console.log('before', JSON.stringify(setup));
  if (!setup.rootBox || !setup.looseBox) { console.log('nodes not drawn'); await browser.close(); return; }
  await page.evaluate(() => wbSelectToolRef('link-curved'));
  await page.waitForTimeout(300);
  await page.mouse.move(setup.rootBox.x, setup.rootBox.y);
  await page.mouse.down();
  await page.mouse.move((setup.rootBox.x + setup.looseBox.x) / 2, (setup.rootBox.y + setup.looseBox.y) / 2, { steps: 10 });
  await page.mouse.move(setup.looseBox.x, setup.looseBox.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => ({
    parents: (wbState.objects || []).map((o) => [o.id, o.parent_id ?? null]),
    sketches: wbState.sketches.length,
    treeEdges: document.querySelectorAll('.wb-map-edge').length,
    toast: document.querySelector('.toast, #toast')?.textContent?.trim()?.slice(0, 80) || null,
  }));
  console.log('after ', JSON.stringify(after));
  const joined = after.parents.some(([id, p]) => id === setup.loose && p === setup.root);
  console.log(joined ? 'ok: the loose topic is a branch of the root' : 'FAIL: still loose');

  // The other half of the rule: two nodes already in the tree still get a
  // cross-link, the decoration a map is entitled to, and the root is never
  // hung under one of its own children.
  const link2 = await page.evaluate(async ([rootId, childId]) => {
    const box = (id) => {
      const el = document.querySelector(`.wb-object[data-id="${id}"]`);
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    };
    return { root: box(rootId), child: box(childId) };
  }, [setup.root, setup.loose]);
  await page.mouse.move(link2.root.x, link2.root.y);
  await page.mouse.down();
  await page.mouse.move(link2.child.x, link2.child.y, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const second = await page.evaluate(() => ({
    parents: (wbState.objects || []).map((o) => [o.id, o.parent_id ?? null]),
    sketches: wbState.sketches.length,
  }));
  const rootStillRoot = second.parents.some(([id, p]) => id === setup.root && p === null);
  console.log('second link (both in the tree):', JSON.stringify(second),
    rootStillRoot && second.sketches === 1 ? 'ok: a cross-link, and the root is still the root' : 'FAIL');
  await browser.close();
  process.exit(joined && rootStillRoot && second.sketches === 1 ? 0 : 1);
})();
