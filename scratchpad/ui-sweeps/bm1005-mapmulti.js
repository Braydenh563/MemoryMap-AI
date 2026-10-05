// INBOX 617: "on the mind map when selecting a group of nodes, it defaults to
// the whiteboard selection and popup menus and right click menus etc". One
// map, a root and four children; a marquee round three of the children.
// Measures:
//   (1) the board's group box: its 8 resize handles and rotate knob (want 0);
//   (2) each picked topic keeps its own selected outline (want 3);
//   (3) the context bar: which groups show (want the map's, not arrange or
//       order), and a map action on it works on all three (fold, colour);
//   (4) the right-click menu on a picked topic: its rows (want map rows, no
//       board-only rows such as Bring to front or Align).
// Pass: every line PASS.
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.click('[data-tab="library"]');
  await page.waitForFunction(() => ['initWhiteboard', 'wbFormatSyncSoon', 'wbMapTidyFresh'].every((f) => typeof window[f] === 'function'), null, { timeout: 15000 });
  const ids = await page.evaluate(async () => {
    await initWhiteboard();
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `multi ${Date.now()}`, type: 'map', layout: 'tree-right' }) });
    const root = await apiJson(`/whiteboard/boards/${board.id}/nodes`, { method: 'POST', body: JSON.stringify({ kind: 'topic', text: 'Centre' }) });
    const kids = [];
    for (const t of ['One', 'Two', 'Three', 'Four']) {
      kids.push((await apiJson(`/whiteboard/boards/${board.id}/nodes`, { method: 'POST', body: JSON.stringify({ kind: 'topic', text: t, parent_id: root.id }) })).id);
    }
    // a grandchild under One, so Fold has something to fold
    await apiJson(`/whiteboard/boards/${board.id}/nodes`, { method: 'POST', body: JSON.stringify({ kind: 'topic', text: 'Under one', parent_id: kids[0] }) });
    await openWhiteboardBoard(board.id);
    await wbMapTidyFresh();
    // framed, so a phone width has every topic on screen
    wbZoomToFit();
    await new Promise((r) => setTimeout(r, 900));
    return { board: board.id, root: root.id, kids };
  });
  const picked = ids.kids.slice(0, 3);
  if (process.env.DEBUG) console.log(JSON.stringify(await page.evaluate((p) => p.map((id) => { const el = document.querySelector(`.wb-object[data-id="${id}"]`); const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), hit?.className?.baseVal ?? hit?.className, hit?.id]; }), ids.kids.slice(0, 3))));
  const boxes = [];
  for (const id of picked) boxes.push(await (await page.$(`.wb-object[data-id="${id}"]`)).boundingBox());
  const minX = Math.min(...boxes.map((b) => b.x)) - 14, minY = Math.min(...boxes.map((b) => b.y)) - 14;
  const maxX = Math.max(...boxes.map((b) => b.x + b.width)) + 14, maxY = Math.max(...boxes.map((b) => b.y + b.height)) + 14;
  // At phone width a drag on bare canvas pans, so the three are Shift-clicked
  // there instead; the selection that results is the same.
  if (W < 600) {
    await page.keyboard.down('Shift');
    for (const b of boxes) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.keyboard.up('Shift');
  } else {
  // the marquee starts on bare canvas to the right of the picked topics
  await page.mouse.move(maxX + 40, minY);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(maxX + 40 + (minX - maxX - 40) * i / 10, minY + (maxY - minY) * i / 10);
  await page.mouse.up();
  }
  await page.waitForTimeout(600);
  const state = await page.evaluate((picked) => {
    const visible = (el) => el && el.offsetParent !== null && el.getBoundingClientRect().width > 0;
    const group = document.querySelector('.wb-multi-handle-group');
    const handles = group ? group.querySelectorAll('.wb-sketch-resize-handle, .wb-resize-handle, [class*="handle"]:not(g)').length : 0;
    const outlined = picked.filter((id) => document.querySelector(`.wb-object[data-id="${id}"]`)?.classList.contains('wb-selected')).length;
    const bar = document.getElementById('wb-context');
    const groups = bar && visible(bar) ? [...bar.querySelectorAll('[data-wb-ctx]')].filter((g) => !g.classList.contains('hidden') && visible(g)).map((g) => g.dataset.wbCtx) : [];
    const grips = [...document.querySelectorAll('.wb-map-resize-grip')].filter(visible).length;
    return { selected: wbMultiSelection.size, groupBox: Boolean(group), handles, outlined, groups, grips };
  }, picked);
  console.log(`W${W} marquee: ${state.selected} selected; board group box ${state.groupBox} (${state.handles} handles) ${!state.groupBox ? 'PASS' : 'FAIL'}; own outlines ${state.outlined}/3 ${state.outlined === 3 ? 'PASS' : 'FAIL'}; resize grips shown ${state.grips} ${state.grips === 0 ? 'PASS' : 'FAIL'}`);
  const boardOnly = ['arrange', 'order'];
  const hasMap = state.groups.includes('mapmulti');
  console.log(`context bar groups: [${state.groups}] ${hasMap && !state.groups.some((g) => boardOnly.includes(g)) ? 'PASS' : 'FAIL'}`);
  if (hasMap) {
    // Fold from the bar: One has a child, so One folds
    await page.click('#wb-mapmulti-fold');
    await page.waitForTimeout(600);
    const folded = await page.evaluate((id) => Boolean(wbState.objects.find((o) => o.id === id)?.data?.collapsed), ids.kids[0]);
    console.log(`bar Fold: the picked branch with children folded ${folded} ${folded ? 'PASS' : 'FAIL'}`);
    await page.click('#wb-mapmulti-fold');
    await page.waitForTimeout(600);
    // Bold from the bar, all three
    await page.click('#wb-mapmulti-bold');
    await page.waitForTimeout(600);
    const bold = await page.evaluate((picked) => picked.filter((id) => wbState.objects.find((o) => o.id === id)?.data?.bold).length, picked);
    console.log(`bar Bold: ${bold}/3 bold ${bold === 3 ? 'PASS' : 'FAIL'}`);
    // one Ctrl+Z takes Bold off all three: one undo step for the selection
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(700);
    const undone = await page.evaluate((picked) => picked.filter((id) => wbState.objects.find((o) => o.id === id)?.data?.bold).length, picked);
    console.log(`one Ctrl+Z: ${undone}/3 still bold ${undone === 0 ? 'PASS' : 'FAIL'}`);
    const placed = await page.evaluate(() => { const r = document.getElementById('wb-context').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.width > 0; });
    console.log(`bar inside the window: ${placed} ${placed ? 'PASS' : 'FAIL'}`);
    const still = await page.evaluate(() => wbMultiSelection.size);
    console.log(`selection kept after the bar's actions: ${still} ${still === 3 ? 'PASS' : 'FAIL'}`);
  }
  // right-click a picked topic
  const b = boxes[1];
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: 'right' });
  await page.waitForTimeout(500);
  const menu = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.menu-item, [role="menuitem"]')].filter((el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0 && !el.closest('#wb-context, .wb-board-menu, #wb-map-strip'));
    return rows.map((r) => r.textContent.trim().replace(/\s+/g, ' '));
  });
  const boardRows = menu.filter((r) => /front|back|align|distribute|group\b|lock/i.test(r));
  const mapRows = menu.filter((r) => /fold|task|bold|summar|colour/i.test(r));
  console.log(`right-click menu: [${menu.join(' | ')}]; board-only rows ${boardRows.length}, map rows ${mapRows.length} ${!boardRows.length && mapRows.length >= 2 ? 'PASS' : 'FAIL'}`);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/bm1005-mapmulti-${W}.png` });
  console.log(`page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
  await browser.close();
})();
