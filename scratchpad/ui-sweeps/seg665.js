// INBOX 665: the map topic bar's doors, the size stepper, the markers popover
// and the theme dialog, measured at W in THEME (light or dark). Every choice
// row must be one line (each preview row's buttons share one top; the icon
// palette is two rows of six by design), every control one height (32, or 44
// below 820 and under touch), nothing past the door's edge, the glyph ink at
// 3:1 or better on its ground, and no console errors. The note strip is
// `seg665-toolbar.js`.
//   BASE=... THEME=dark W=390 node scratchpad/ui-sweeps/seg665.js
const { boot, openBoardsTab } = require('./lib.js');
const W = Number(process.env.W || 1440);
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? 'PASS' : 'FAIL'}  ${W} ${n}${c || d === undefined ? '' : '  ' + d}`); };
(async () => {
  const { page, browser } = await boot({ viewport: { width: W, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  await openBoardsTab(page, ['initWhiteboard', 'wbMapTidyFresh', 'wbWireMapChoices']);
  const kid = await page.evaluate(async () => {
    await initWhiteboard();
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `seg665 ${Date.now()}`, type: 'map', layout: 'tree-right' }) });
    const root = await apiJson(`/whiteboard/boards/${board.id}/nodes`, { method: 'POST', body: JSON.stringify({ kind: 'topic', text: 'Centre' }) });
    const kid = await apiJson(`/whiteboard/boards/${board.id}/nodes`, { method: 'POST', body: JSON.stringify({ kind: 'topic', text: 'A branch', parent_id: root.id }) });
    await apiJson(`/whiteboard/boards/${board.id}`, { method: 'PUT', body: JSON.stringify({ theme: { shape: 'pill', spine: 'none', font_size: 19 } }) });
    await openWhiteboardBoard(board.id);
    await wbMapTidyFresh();
    return kid.id;
  });
  const b = await (await page.$(`.wb-object[data-id="${kid}"]`)).boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(600);
  const want = W < 820 ? 44 : 32;
  // Contrast of each control's ink on the first painted ground behind it.
  const inkCheck = (sel) => page.evaluate((s) => {
    // Through a canvas, so an oklch() or color() value reads as sRGB rather
    // than as its own numbers (the accent ink is a relative oklch colour).
    const cv = document.createElement('canvas'); cv.width = cv.height = 1;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    const parse = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
    const lum = ([r, g, bl]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl); };
    const ground = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if ((c[3] ?? 1) > 0.5) return c; } return [255, 255, 255]; };
    let worst = 99; let who = '';
    for (const el of document.querySelectorAll(s)) {
      if (!el.getClientRects().length) continue;
      const ink = parse(getComputedStyle(el).color);
      const g = ground(el);
      const [a, c] = [lum(ink), lum(g)];
      const ratio = (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05);
      if (ratio < worst) { worst = ratio; who = el.getAttribute('aria-label') || el.title; }
    }
    return { worst: Math.round(worst * 100) / 100, who };
  }, sel);
  const bar = await page.evaluate(() => {
    const strip = document.getElementById('wb-map-strip');
    const r = strip.getBoundingClientRect();
    const st = strip.querySelector('.wb-map-size-stepper');
    return { w: Math.round(r.width), h: Math.round(r.height), stepper: st ? Math.round(st.getBoundingClientRect().width) : 0, seg: strip.querySelectorAll('.seg').length, inView: r.left >= 0 && r.right <= innerWidth };
  });
  console.log(`bar ${JSON.stringify(bar)}`);
  ok('the bar has no pill well and a size stepper', bar.seg === 0 && bar.stepper > 0, JSON.stringify(bar));
  for (const door of ['Text', 'Shape', 'Branch line']) {
    await page.evaluate((d) => [...document.querySelectorAll('#wb-map-strip [data-wb-menu-toggle]')].find((x) => x.textContent.trim() === d).click(), door);
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const menu = [...document.querySelectorAll('.wb-map-strip-menu')].find((x) => !x.classList.contains('hidden'));
      if (!menu) return null;
      const mr = menu.getBoundingClientRect();
      const cs = getComputedStyle(menu);
      const inner = [mr.left + parseFloat(cs.paddingLeft), mr.right - parseFloat(cs.paddingRight)];
      const rows = [...menu.querySelectorAll('.wb-map-picks')].map((row) => {
        const btns = [...row.querySelectorAll('button')];
        const tops = new Set(btns.map((x) => Math.round(x.getBoundingClientRect().top)));
        const right = Math.max(...btns.map((x) => x.getBoundingClientRect().right));
        return { name: row.getAttribute('aria-label'), lines: tops.size, grid: row.classList.contains('is-grid'), n: btns.length, heights: [...new Set(btns.map((x) => Math.round(x.getBoundingClientRect().height)))], over: Math.round(right - inner[1]) };
      });
      const toggles = [...menu.querySelectorAll('.wb-menu-controls > button')].map((x) => Math.round(x.getBoundingClientRect().height));
      return { id: menu.id, h: Math.round(mr.height), inView: mr.left >= 0 && mr.right <= innerWidth + 0.5, rows, toggles, seg: menu.querySelectorAll('.seg').length };
    });
    if (!m) { ok(`${door} door opens`, false); continue; }
    console.log(`${m.id} ${m.h}px ${JSON.stringify(m.rows)}`);
    ok(`${door}: no pill well`, m.seg === 0);
    ok(`${door}: every preview row one line (the icon palette two)`, m.rows.every((r) => r.lines === (r.grid ? 2 : 1)), JSON.stringify(m.rows));
    ok(`${door}: one control height (${want})`, m.rows.every((r) => r.heights.length === 1 && Math.abs(r.heights[0] - want) <= 1) && m.toggles.every((h) => Math.abs(h - want) <= 1), JSON.stringify({ rows: m.rows.map((r) => r.heights), toggles: m.toggles }));
    ok(`${door}: nothing past the door's edge`, m.rows.every((r) => r.over <= 0) && m.inView, JSON.stringify(m.rows.map((r) => r.over)));
    const ink = await inkCheck('.wb-map-strip-menu:not(.hidden) .wb-map-pick');
    ok(`${door}: preview ink at 3:1 or more`, ink.worst >= 3, JSON.stringify(ink));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
  // A preview press reaches the topic: Box, then Ellipse.
  const pressed = await page.evaluate(async (id) => {
    const btn = [...document.querySelectorAll('#wb-map-shape-menu .wb-map-pick')].find((x) => x.getAttribute('aria-label') === 'Ellipse');
    btn.click();
    await new Promise((r) => setTimeout(r, 700));
    const node = (wbState.objects || []).find((o) => o.id === id);
    return { shape: node?.data?.shape, pressed: btn.getAttribute('aria-pressed') };
  }, kid);
  ok('a preview press sets the topic', pressed.shape === 'ellipse' && pressed.pressed === 'true', JSON.stringify(pressed));
  const size = await page.evaluate(async (id) => {
    const st = document.querySelector('.wb-map-size-stepper');
    const before = st.querySelector('.stepper-unit').textContent;
    st.querySelector('[aria-label="Larger text"]').click();
    await new Promise((r) => setTimeout(r, 700));
    const node = (wbState.objects || []).find((o) => o.id === id);
    return { before, after: st.querySelector('.stepper-unit').textContent, stored: node?.data?.font_size };
  }, kid);
  // A main branch draws at its level's 17px, between M and L: one step up is L.
  ok('the stepper steps the size', size.before === '17px' && size.stored === 19 && size.after === 'L', JSON.stringify(size));
  // The markers popover.
  await page.evaluate((id) => wbMapOpenMarkers(id), kid);
  await page.waitForTimeout(500);
  const mk = await page.evaluate(() => {
    const pop = document.querySelector('.wb-map-markers-pop');
    if (!pop) return null;
    const pr = pop.getBoundingClientRect();
    return {
      seg: pop.querySelectorAll('.seg').length,
      inView: pr.left >= 0 && pr.right <= innerWidth + 0.5,
      rows: [...pop.querySelectorAll('.wb-map-picks')].map((row) => {
        const btns = [...row.querySelectorAll('button')];
        return { name: row.getAttribute('aria-label'), lines: new Set(btns.map((x) => Math.round(x.getBoundingClientRect().top))).size, h: [...new Set(btns.map((x) => Math.round(x.getBoundingClientRect().height)))], over: Math.round(Math.max(...btns.map((x) => x.getBoundingClientRect().right)) - pr.right) };
      }),
    };
  });
  console.log(`markers ${JSON.stringify(mk)}`);
  ok('markers: no pill well, Priority, Progress and Flag one line each', mk && mk.seg === 0 && mk.rows.length === 3 && mk.rows.every((r) => r.lines === 1 && r.over <= 0) && mk.inView, JSON.stringify(mk));
  const mink = await inkCheck('.wb-map-markers-pop .wb-map-pick');
  ok('markers: preview ink at 3:1 or more', mink.worst >= 3, JSON.stringify(mink));
  await page.evaluate(() => wbMapCloseMarkers());
  // The theme dialog's level switch.
  const th = await page.evaluate(async () => {
    wbMapThemeDialog();
    await new Promise((r) => setTimeout(r, 400));
    const card = document.querySelector('.wb-info-card');
    const scope = card?.querySelector('.wb-map-theme-scope select');
    const out = { seg: card ? card.querySelectorAll('.seg').length : -1, scope: Boolean(scope) };
    document.querySelector('.wb-info-card [data-dialog-close], .wb-info-card .dialog-close, .wb-info-card button[aria-label="Close"]')?.click();
    return out;
  });
  ok('theme dialog: the level switch is a select, no pill well', th.scope && th.seg === 0, JSON.stringify(th));
  ok('no console errors', errors.length === 0, errors.join(' | '));
  console.log(bad ? `${bad} FAIL` : 'all pass');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
