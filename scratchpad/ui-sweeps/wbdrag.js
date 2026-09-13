// INBOX 114: the per-move cost of dragging a card on a busy board, as a
// number. Adds 40 cards to the current board each run (a scratch data dir).
//
//   BASE=http://127.0.0.1:8931 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node wbdrag.js
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  const vis = await page.evaluate(async () => {
    const v = document.getElementById('library-view-whiteboard');
    if (v.classList.contains('hidden') || !v.offsetParent) { for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle('hidden', s !== v); }
    await initWhiteboard(); wbShowCanvasView(); await fetchWhiteboardState(); await new Promise((r) => setTimeout(r, 400)); await fetchWhiteboardState(); await new Promise((r) => setTimeout(r, 500));
    const c = document.getElementById('whiteboard-container').getBoundingClientRect();
    return { w: Math.round(c.width), h: Math.round(c.height), tool: window.currentTool, board: window.currentBoardId };
  });
  console.log('view', JSON.stringify(vis));
  const setup = await page.evaluate(async () => {
    const N = 40;
    const before = wbState.nodes.length;
    for (let i = 0; i < N; i++) {
      const e = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `board card ${i} with a couple of lines of text so the card has a body`, category: 'General' }) });
      const n = await apiJson('/whiteboard/nodes', { method: 'POST', body: JSON.stringify({ entry_id: e.id, board_id: window.currentBoardId ?? null, x: 60 + (i % 8) * 240, y: 60 + Math.floor(i / 8) * 180, z: 1 }) });
      wbState.nodes.push(n);
    }
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 300));
    const card = document.querySelector('.node-card');
    if (window.currentTool !== 'select' && typeof setWbTool === 'function') setWbTool('select');
    const r = card.getBoundingClientRect();
    return { before, cards: document.querySelectorAll('.node-card').length, cx: r.left + r.width / 2, cy: r.top + 12, tool: window.currentTool };
  });
  console.log('setup', JSON.stringify(setup));
  // instrument
  await page.evaluate(() => {
    window.__prof = { calls: {}, time: {}, frames: [], moves: 0 };
    for (const name of ['wbAlignmentGuides', 'wbUpdateSelectionBar', 'wbUpdateLinkedSketches', 'wbShowAlignmentGuides', 'wbItemBBox', 'wbApplyBulkMove', 'wbClearAlignmentGuides', 'wbSnap', 'wbLinkedSketchesFor', 'wbRenderNavigator', 'wbSyncGridToTransform', 'renderWhiteboard']) {
      const orig = window[name]; if (typeof orig !== 'function') continue;
      window[name] = function (...a) { const t = performance.now(); try { return orig.apply(this, a); } finally { const d = performance.now() - t; __prof.calls[name] = (__prof.calls[name] || 0) + 1; __prof.time[name] = (__prof.time[name] || 0) + d; } };
    }
    document.getElementById('whiteboard-container').addEventListener('pointermove', () => { __prof.moves++; }, true);
    let last = performance.now();
    const tick = (t) => { __prof.frames.push(t - last); last = t; if (__prof.on) requestAnimationFrame(tick); };
    __prof.on = true; requestAnimationFrame(tick);
    // long tasks
    __prof.long = [];
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) __prof.long.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] }); } catch {}
  });
  const report = async (label) => {
    const p = await page.evaluate(() => { const o = { ...__prof }; __prof.calls = {}; __prof.time = {}; __prof.frames = []; __prof.moves = 0; __prof.long = []; return o; });
    const f = p.frames.slice(5); const slow = f.filter((x) => x > 20).length; const max = Math.max(...f);
    const cost = Object.entries(p.time).map(([k, v]) => `${k} ${v.toFixed(1)}ms/${p.calls[k]}`).join(', ');
    console.log(`${label}: ${p.moves} moves, ${f.length} frames, ${slow} over 20ms, max ${max.toFixed(1)}ms, long tasks ${JSON.stringify(p.long)}\n   ${cost}`);
  };
  await page.mouse.move(setup.cx, setup.cy);
  await page.mouse.down();
  await page.mouse.move(setup.cx + 300, setup.cy + 200, { steps: 120 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  await report('drag card (40 cards)');
  // pan: drag on empty canvas
  const empty = await page.evaluate(() => { const c = document.getElementById('whiteboard-container').getBoundingClientRect(); return { x: c.right - 40, y: c.bottom - 40 }; });
  await page.mouse.move(empty.x, empty.y);
  await page.mouse.down();
  await page.mouse.move(empty.x - 400, empty.y - 200, { steps: 120 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  await report('pan (40 cards)');
  // layout cost: does each move force layout? count offsetWidth reads in wbItemBBox already; measure a synthetic move
  const synth = await page.evaluate(() => {
    const d = wbState.nodes[0]; const el = document.querySelector(`.node-card[data-id="${d.id}"]`);
    const t0 = performance.now();
    for (let i = 0; i < 50; i++) { el.style.transform = `translate(${d.x + i}px, ${d.y}px)`; wbAlignmentGuides('node', d.id, d.x + i, d.y, 200, 100); }
    return ((performance.now() - t0) / 50).toFixed(2);
  });
  console.log(`114 drag        transform + alignment guides per move ${synth}ms on ${setup.cards} cards (was 7.67ms on 80 before the per-gesture box cache)`);
  await browser.close();
  if (Number(synth) > 2) { console.log('FAIL: per-move cost over 2ms'); process.exit(1); }
  console.log('PASS'); return;
  await browser.close();
})().catch((e) => console.log('ERR', e.message));
