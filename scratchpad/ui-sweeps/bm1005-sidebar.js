// INBOX 596: the board sidebar. "the dropdown menu from the library is a
// little off position. the side dock of the bottom toolbar in the whiteboard
// is ugly, poorly structured and designed and clashes with the side panel ...
// the height of this side bar changes on the whiteboard and mindmap and I
// want mind map specific stuff in that sidebar too as half of it is empty
// when on the mind map ... can you add preset whiteboard and mind map
// templates that are draggable from the library??"
// Measures, on a board and on a map:
//   (1) the Library's ... menu against its button: the menu's right edge on
//       the button's right (within 2px) and its top within 8px under it;
//   (2) the sidebar against the bottom tool dock: no overlap (want 0px);
//   (3) the sidebar's height on a board and on a map: the same (within 1px);
//   (4) the tabs a map shows: none that does not apply there (Layers, Notes
//       for cards), and at least one map tab besides the Outline;
//   (5) the Library on each kind has templates of that kind, and dragging one
//       onto the canvas adds what it holds;
//   (6) DOCK=side: one column width on both kinds, its cells in at most four
//       columns and none past the padding; below 600, the collapsed tool
//       picker answers its own centre with the sidebar open.
// Pass: every line PASS.
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.click('[data-tab="library"]');
  await page.waitForFunction(() => ['initWhiteboard', 'wbOpenSidebar', 'wbMapTidyFresh'].every((f) => typeof window[f] === 'function'), null, { timeout: 15000 });
  const made = await page.evaluate(async () => {
    await initWhiteboard();
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `side ${Date.now()}` }) });
    const map = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `sidemap ${Date.now()}`, type: 'map', layout: 'tree-right' }) });
    const root = await apiJson(`/whiteboard/boards/${map.id}/nodes`, { method: 'POST', body: JSON.stringify({ kind: 'topic', text: 'Centre' }) });
    await apiJson(`/whiteboard/boards/${map.id}/nodes`, { method: 'POST', body: JSON.stringify({ kind: 'topic', text: 'A branch', parent_id: root.id }) });
    return { board: board.id, map: map.id };
  });
  const rect = (sel) => page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null;
  }, sel);
  const overlap = (a, b) => (a && b ? Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t)) : 0);
  // DOCK=side: the tool dock docked as a column on the left (Board, the
  // dock toggle), the "side dock" the owner's screenshot shows.
  const dock = process.env.DOCK || 'bottom';
  await page.evaluate((dock) => {
    const panel = document.getElementById('wb-tools-panel');
    if (panel.dataset.dock !== dock) document.getElementById('wb-dock-toggle').click();
  }, dock);
  console.log(`dock: ${dock}`);
  const heights = {};
  const widths = {};
  for (const kind of ['board', 'map']) {
    await page.evaluate(async (id) => {
      await openWhiteboardBoard(id);
      if (wbIsMap()) await wbMapTidyFresh();
      wbOpenSidebar('library', { focus: false });
    }, made[kind]);
    await page.waitForTimeout(900);
    const side = await rect('#wb-sidebar');
    heights[kind] = side?.h;
    // the tool dock and each of its groups: what the sidebar must clear
    const docks = await page.evaluate(() => [...document.querySelectorAll('#wb-tools-panel, #wb-map-dock, .wb-map-dock')].filter((el) => el.getBoundingClientRect().width).map((el) => { const r = el.getBoundingClientRect(); return { id: el.id || el.className, l: r.left, t: r.top, r: r.right, b: r.bottom }; }));
    const worst = Math.max(0, ...docks.map((d) => overlap(side, d)));
    const col = await page.evaluate(() => {
      const p = document.getElementById('wb-tools-panel');
      const r = p.getBoundingClientRect();
      // the cells' left edges across every row (a select excepted), and any
      // control past the panel's padding: a side column lines up as four.
      const cells = [...p.querySelectorAll('.wb-tool-section-row > :not(.select-shell)')].map((k) => k.getBoundingClientRect()).filter((k) => k.width);
      const inner = r.right - parseFloat(getComputedStyle(p).paddingRight);
      return { w: Math.round(r.width), h: Math.round(r.height), scrolls: p.scrollHeight > p.clientHeight + 1, sections: [...p.querySelectorAll('.wb-tool-section')].filter((x) => x.getBoundingClientRect().width).length, xs: [...new Set(cells.map((k) => Math.round(k.left - r.left)))].sort((a, b) => a - b), past: cells.filter((k) => k.right > inner + 0.5).length };
    });
    widths[kind] = col.w;
    console.log(`${kind} tool dock: ${col.w}x${col.h}, ${col.sections} sections, scrolls ${col.scrolls}, cell columns at [${col.xs}], ${col.past} past the padding`);
    if (dock === 'side' && W >= 600) console.log(`${kind} side column: ${col.xs.length} columns, ${col.past} past ${col.xs.length <= 4 && !col.past ? 'PASS' : 'FAIL'}`);
    if (W < 600) {
      const hit = await page.evaluate(() => { const o = document.getElementById('wb-tools-opener'); const r = o.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && o.contains(e); });
      console.log(`${kind} tool picker answers its own centre with the sidebar open ${hit ? 'PASS' : 'FAIL'}`);
    }
    console.log(`W${W} ${kind}: sidebar ${side ? `${Math.round(side.l)},${Math.round(side.t)} ${Math.round(side.w)}x${Math.round(side.h)}` : 'none'}; overlap with the tool dock ${Math.round(worst)}px² ${worst === 0 ? 'PASS' : 'FAIL'}`);
    // the tabs
    const tabs = await page.evaluate(() => [...document.querySelectorAll('#wb-sidebar [data-side-tab]')].filter((t) => !t.hidden && t.getBoundingClientRect().width).map((t) => t.dataset.sideTab));
    if (kind === 'map') {
      const wrong = tabs.filter((t) => ['layers', 'notes', 'pages'].includes(t));
      const mapTabs = tabs.filter((t) => !['library', 'layers', 'notes', 'pages', 'outline'].includes(t));
      console.log(`map tabs: [${tabs}]; board-only ${wrong.length}, map-only besides Outline ${mapTabs.length} ${!wrong.length && mapTabs.length ? 'PASS' : 'FAIL'}`);
    } else {
      console.log(`board tabs: [${tabs}]`);
    }
    // (1) the ... menu
    await page.evaluate(() => wbOpenSidebar('library', { focus: false }));
    await page.waitForTimeout(400);
    const btn = await rect('#wb-lib-more');
    if (btn) {
      await page.click('#wb-lib-more');
      await page.waitForTimeout(400);
      const menu = await page.evaluate(() => {
        const m = [...document.querySelectorAll('.action-menu')].find((el) => !el.classList.contains('hidden') && el.getBoundingClientRect().width);
        if (!m) return null;
        const r = m.getBoundingClientRect();
        return { l: r.left, t: r.top, r: r.right, b: r.bottom };
      });
      if (menu) {
        const dx = Math.round(menu.r - btn.r);
        const dy = Math.round(menu.t - btn.b);
        console.log(`${kind} library menu: right edge ${dx}px from the button's, top ${dy}px under it ${Math.abs(dx) <= 2 && dy >= 0 && dy <= 8 ? 'PASS' : 'FAIL'}`);
      } else console.log(`${kind} library menu: did not open FAIL`);
      await page.keyboard.press('Escape');
    }
    // (5) templates of this kind in the Library, and a drag onto the canvas
    const tpl = await page.evaluate((kind) => {
      const tiles = [...document.querySelectorAll('#wb-lib-list [data-lib-template]')].filter((t) => t.getBoundingClientRect().width);
      return { count: tiles.length, kinds: [...new Set(tiles.map((t) => t.dataset.libTemplate))] };
    }, kind);
    console.log(`${kind} templates in the library: ${tpl.count} [${tpl.kinds}] ${tpl.count >= 3 && tpl.kinds.every((k) => k === kind) ? 'PASS' : 'FAIL'}`);
    if (tpl.count) {
      const before = await page.evaluate(() => (wbState.objects || []).length + (wbState.sketches || []).length);
      const canvas = await rect('#whiteboard-container');
      // At phone width the open sidebar covers the board, and a finger does
      // not drag a tile: a press places it, the way the Library says.
      if (W < 600) await page.locator('#wb-lib-list [data-lib-template]').first().click();
      else await page.locator('#wb-lib-list [data-lib-template]').first().dragTo(page.locator('#whiteboard-container'), { targetPosition: { x: canvas.w * 0.65, y: canvas.h * 0.45 }, force: true });
      await page.waitForTimeout(1500);
      const after = await page.evaluate(() => (wbState.objects || []).length + (wbState.sketches || []).length);
      console.log(`${kind} template ${W < 600 ? 'pressed' : 'dragged'} in: ${after - before} items added ${after - before >= 3 ? 'PASS' : 'FAIL'}`);
    }
  }
  const dh = Math.abs((heights.board || 0) - (heights.map || 0));
  console.log(`sidebar height board ${Math.round(heights.board)} map ${Math.round(heights.map)}: ${dh <= 1 ? 'PASS' : 'FAIL'}`);
  if (dock === 'side' && W >= 600) console.log(`side column width board ${widths.board} map ${widths.map}: ${widths.board === widths.map ? 'PASS' : 'FAIL'}`);
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/bm1005-sidebar-${W}.png` });
  console.log(`page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
  await browser.close();
})();
