// INBOX 262 (4) and (5): "the group selection box missing a rotate node, not
// being able to drag the edges of a group selection, if I drag the selected
// group, the group selection box doesnt move with the selected objects when
// actively draging them around."
//
// Selects two cards, drags one, and reads the outline's position mid-drag
// against the cards' own. Also counts the chrome the box is drawn with, so
// "missing a rotate node" is a number rather than a reading of a screenshot.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const v = document.getElementById('library-view-whiteboard');
    if (v.classList.contains('hidden') || !v.offsetParent) {
      for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle('hidden', s !== v);
    }
    await initWhiteboard(); wbShowCanvasView(); await fetchWhiteboardState();
    await new Promise((r) => setTimeout(r, 600));
  });
  const setup = await page.evaluate(async () => {
    for (let i = 0; i < 2; i++) {
      const e = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `group drag card ${i}`, category: 'General' }) });
      const n = await apiJson('/whiteboard/nodes', { method: 'POST', body: JSON.stringify({ entry_id: e.id, board_id: window.currentBoardId ?? null, x: 120 + i * 320, y: 140, z: 1 }) });
      wbState.nodes.push(n);
    }
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 400));
    if (window.currentTool !== 'select' && typeof setWbTool === 'function') setWbTool('select');
    // Select both through the app's own multi-selection, not by faking state.
    const cards = [...document.querySelectorAll('.node-card')].slice(-2);
    wbMultiSelection.clear();
    for (const c of cards) wbMultiSelection.add(wbMultiKey('node', Number(c.dataset.id)));
    wbApplySelectionHighlight();
    await new Promise((r) => setTimeout(r, 500));
    const r = cards[0].getBoundingClientRect();
    // By id, not by DOM position: a card is re-stacked as it is dragged, so
    // `querySelectorAll(...).slice(-2)` reads a different pair mid-drag and
    // reported a 410px "card shift" across a 180px drag.
    window.__ids = cards.map((c) => Number(c.dataset.id));
    return { cards: cards.length, ids: window.__ids, cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + 14) };
  });
  console.log('setup', JSON.stringify(setup));

  const chrome = await page.evaluate(() => {
    const g = document.querySelector('.wb-multi-handle-group');
    if (!g) return { present: false };
    return {
      present: true,
      box: g.querySelectorAll('.wb-sketch-selection-box').length,
      resizeHandles: [...g.querySelectorAll('.wb-sketch-resize-handle')].map((h) => h.getAttribute('data-handle')),
      rotateHandles: g.querySelectorAll('.wb-sketch-rotate-handle').length,
      stems: g.querySelectorAll('.wb-rotate-handle-stem').length,
    };
  });
  console.log('chrome', JSON.stringify(chrome));

  const read = () => page.evaluate(() => {
    const b = document.querySelector('.wb-multi-handle-group .wb-sketch-selection-box');
    const cr = window.__ids.map((id) => {
      const c = document.querySelector(`.node-card[data-id="${id}"]`);
      return c ? Math.round(c.getBoundingClientRect().left) : null;
    });
    return { boxLeft: b ? Math.round(b.getBoundingClientRect().left) : null, cardLefts: cr };
  });

  const before = await read();
  await page.mouse.move(setup.cx, setup.cy);
  await page.mouse.down();
  await page.mouse.move(setup.cx + 90, setup.cy + 60, { steps: 12 });
  await page.waitForTimeout(150);
  const during = await read();
  await page.mouse.move(setup.cx + 180, setup.cy + 120, { steps: 12 });
  await page.waitForTimeout(150);
  const during2 = await read();
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const after = await read();

  const cardShift = during.cardLefts[0] - before.cardLefts[0];
  const boxShift = during.boxLeft - before.boxLeft;
  console.log(JSON.stringify({ before, during, during2, after, cardShift, boxShift,
    followsDrag: Math.abs(cardShift - boxShift) <= 2 }, null, 1));
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
