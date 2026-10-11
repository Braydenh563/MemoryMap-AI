// INBOX 888: "I tried pinching to zoom out on my phone when on the whiteboard
// and instead I accidentally started moving a note :("
//
//   BASE=http://127.0.0.1:8951 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/wbpinch.js
//
// A real two-finger gesture through CDP touch events at 390x844: the first
// finger lands on a note and moves, a second finger lands on bare canvas (or
// on the same note), both spread. Measured: where the note ends up (its data
// position and its drawn transform), what the zoom did, and what was saved.
// Also: a first finger that moves under the slop must not move the note.
const { boot } = require('./lib.js');
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
(async () => {
  const fails = [];
  const check = (label, ok, detail) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`); if (!ok) fails.push(label); };
  const { browser, ctx, page } = await boot({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, scale: 3, userAgent: UA });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i })) });
  const ids = await page.evaluate(async () => {
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `pinch ${Date.now()}`, type: 'board' }) });
    await switchTab('library'); await new Promise((r) => setTimeout(r, 600));
    await openWhiteboardBoard(board.id);
    await new Promise((r) => setTimeout(r, 900));
    const e = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'A note to not move', category: 'General' }) });
    const n = await apiJson('/whiteboard/nodes', { method: 'POST', body: JSON.stringify({ entry_id: e.id, board_id: board.id, x: 60, y: 120, z: 1, width: 200, height: 110 }) });
    const t = await apiJson('/whiteboard/objects', { method: 'POST', body: JSON.stringify({ board_id: board.id, kind: 'text', x: 60, y: 300, width: 160, height: 70, data: { content: 'Text box' } }) });
    await fetchWhiteboardState();
    renderWhiteboardNow();
    wbSelectToolRef?.('select');
    localStorage.setItem('wb-snap', 'off');
    d3.select(document.getElementById('whiteboard-container')).call(wbZoom.transform, d3.zoomIdentity);
    await new Promise((r) => setTimeout(r, 500));
    return { board: board.id, n: n.id, t: t.id };
  });
  const centre = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  const state = () => page.evaluate(({ n, t }) => {
    const k = d3.zoomTransform(document.getElementById('whiteboard-container')).k;
    const node = wbState.nodes.find((x) => x.id === n);
    const obj = wbState.objects.find((x) => x.id === t);
    return { k: +k.toFixed(3), nx: node.x, ny: node.y, tx: obj.x, ty: obj.y,
      cardTransform: document.querySelector(`.node-card[data-id="${n}"]`).style.transform,
      objTransform: document.querySelector(`.wb-object[data-id="${t}"]`)?.style.transform };
  }, ids);
  const saved = () => page.evaluate(async ({ n }) => (await apiJson(`/whiteboard/nodes/${n}`)).x, ids).catch(() => null);
  const reset = async () => {
    await page.evaluate(async ({ n, t }) => {
      const node = wbState.nodes.find((x) => x.id === n); node.x = 60; node.y = 120;
      const obj = wbState.objects.find((x) => x.id === t); obj.x = 60; obj.y = 300;
      d3.select(document.getElementById('whiteboard-container')).call(wbZoom.transform, d3.zoomIdentity);
      renderWhiteboardNow();
    }, ids);
    await page.waitForTimeout(400);
  };
  const writes = [];
  page.on('request', (r) => { if (/\/whiteboard\/(nodes|objects)\/\d+/.test(r.url()) && r.method() === 'PUT') writes.push(r.url()); });
  const cases = [
    ['note', `.node-card[data-id="${ids.n}"]`],
    ['text box', `.wb-object[data-id="${ids.t}"]`],
  ];
  for (const [label, sel] of cases) {
    for (const second of ['bare canvas', 'same item']) {
      await reset();
      const s0 = await state();
      const a = await centre(sel);
      const b = second === 'bare canvas' ? { x: 330, y: 560 } : { x: a.x + 30, y: a.y + 10 };
      await touch('touchStart', [{ x: a.x, y: a.y }]);
      for (let i = 1; i <= 4; i++) { await touch('touchMove', [{ x: a.x - i * 6, y: a.y - i * 4 }]); await page.waitForTimeout(16); }
      const mid = await state();
      await touch('touchStart', [{ x: a.x - 24, y: a.y - 16 }, b]);
      for (let i = 1; i <= 12; i++) {
        await touch('touchMove', [{ x: a.x - 24 - i * 6, y: a.y - 16 - i * 6 }, { x: b.x + i * 6, y: b.y + i * 6 }]);
        await page.waitForTimeout(16);
      }
      writes.length = 0;
      await touch('touchEnd', []);
      await page.waitForTimeout(700);
      const s1 = await state();
      check(`${label}, 2nd finger on ${second}: nothing saved`, writes.length === 0, `${writes.length} PUTs`);
      const same = label === 'note' ? [s1.nx === s0.nx && s1.ny === s0.ny, `${s0.nx},${s0.ny} -> mid ${mid.nx},${mid.ny} -> ${s1.nx},${s1.ny}`]
        : [s1.tx === s0.tx && s1.ty === s0.ty, `${s0.tx},${s0.ty} -> mid ${mid.tx},${mid.ty} -> ${s1.tx},${s1.ty}`];
      check(`${label}, 2nd finger on ${second}: item back at its start`, same[0], same[1]);
      check(`${label}, 2nd finger on ${second}: pinch zooms`, Math.abs(s1.k - s0.k) > 0.05, `k ${s0.k} -> ${s1.k}`);
    }
    // slop: a first finger that wiggles 3px grabs nothing
    await reset();
    const a = await centre(sel);
    const s0 = await state();
    await touch('touchStart', [{ x: a.x, y: a.y }]);
    await touch('touchMove', [{ x: a.x + 5, y: a.y + 4 }]);
    await page.waitForTimeout(40);
    const during = await state();
    await touch('touchEnd', []);
    const key = label === 'note' ? ['nx', 'ny'] : ['tx', 'ty'];
    check(`${label}: 6px wiggle moves nothing`, during[key[0]] === s0[key[0]] && during[key[1]] === s0[key[1]], `${s0[key[0]]},${s0[key[1]]} -> ${during[key[0]]},${during[key[1]]}`);
    // and a real drag still moves it, by the whole distance (the slop is not lost)
    await reset();
    await touch('touchStart', [{ x: a.x, y: a.y }]);
    for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: a.x + i * 5, y: a.y + i * 3 }]); await page.waitForTimeout(16); }
    await touch('touchEnd', []);
    await page.waitForTimeout(500);
    const s2 = await state();
    const dx = s2[key[0]] - s0[key[0]], dy = s2[key[1]] - s0[key[1]];
    check(`${label}: a real drag still moves it by the finger's distance`, Math.abs(dx - 50) <= 2 && Math.abs(dy - 30) <= 2, `moved ${dx},${dy} for a 50,30 drag`);
  }
  await browser.close();
  console.log(fails.length ? `FAILED ${fails.length}` : 'all passed');
  process.exit(fails.length ? 1 : 0);
})();
