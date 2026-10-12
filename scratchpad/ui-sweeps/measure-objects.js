// measure-1010 items 2 and 3: board open at 500 objects, document open at 50,000 words, and the dashboard
// widgets' interactive surface (what each rendered widget lets a person click).
//
//   BASE=http://127.0.0.1:8794 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/measure-objects.js
//   PHASE=board,doc,widgets (default all)
const { boot, openBoardsTab, waitForBoardOpen } = require('./lib.js');
const RUNS = +(process.env.RUNS || 5);
const phases = (process.env.PHASE || 'board,doc,widgets').split(',');
const p50 = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
(async () => {
  const { browser, page } = await boot();
  if (phases.includes('board')) {
    const t0 = Date.now();
    const id = await page.evaluate(async () => {
      const post = async (path, body) => (await api(path, { method: 'POST', body: JSON.stringify(body) })).json();
      const board = await post('/whiteboard/boards', { name: 'measure 500', type: 'board' });
      for (let i = 0; i < 500; i++) {
        await post('/whiteboard/objects', { kind: 'text', board_id: board.id, x: (i % 25) * 220, y: Math.floor(i / 25) * 140, width: 200, height: 100, data: { content: 'Card ' + i + ' with a few words of text on it' } });
      }
      return board.id;
    });
    console.log('BOARD seeded 500 objects in', Date.now() - t0, 'ms, board', id);
    const ts = [];
    for (let i = 0; i < RUNS; i++) {
      await page.evaluate(() => switchTab('notes'));
      await page.waitForTimeout(800);
      await openBoardsTab(page);
      const ms = await page.evaluate(async (bid) => {
        const t = performance.now();
        openWhiteboardBoard(bid);
        await new Promise((resolve) => {
          const tick = () => {
            const bar = document.getElementById('wb-topbar');
            const box = document.getElementById('whiteboard-container');
            const n = document.querySelectorAll('#whiteboard-container .wb-object').length;
            if (bar && bar.offsetParent && box && box.offsetParent && n >= 500) resolve(); else setTimeout(tick, 5);
          };
          tick();
        });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return Math.round(performance.now() - t);
      }, id);
      ts.push(ms);
    }
    console.log('BOARD open (call to 500 .wb-object + 2 frames) p50', p50(ts), JSON.stringify(ts));
    const objs = await page.evaluate(() => document.querySelectorAll('#whiteboard-container .wb-object').length);
    console.log('BOARD objects in DOM', objs);
  }
  if (phases.includes('doc')) {
    const words = 'the quick brown fox jumps over lazy dogs while writing notes about gardens budgets travel plans and reading lists'.split(' ');
    let body = '';
    for (let i = 0; i < 50000; i++) { body += words[i % words.length] + (i % 12 === 11 ? '.\n\n' : ' '); }
    const id = await page.evaluate(async (content) => {
      const r = await api('/documents', { method: 'POST', body: JSON.stringify({ title: 'measure 50k words', content }) });
      return (await r.json()).id;
    }, body);
    console.log('DOC created', id, 'chars', body.length, 'words', body.split(/\s+/).length);
    const ts = [], first = [];
    for (let i = 0; i < RUNS; i++) {
      await page.evaluate(() => switchTab('notes'));
      await page.waitForTimeout(800);
      await page.evaluate(() => switchTab('documents'));
      await page.waitForTimeout(2500);
      const r = await page.evaluate(async (did) => {
        const t = performance.now();
        const p = openDocument(did);
        let firstText = 0;
        const iv = setInterval(() => { if (!firstText) { const c = document.querySelector('#tab-documents .cm-content, #doc-box'); if (c && ((c.textContent || c.value || '').length > 1000)) firstText = performance.now() - t; } }, 2);
        await p;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        clearInterval(iv);
        return { call: Math.round(performance.now() - t), firstText: Math.round(firstText) };
      }, id);
      ts.push(r.call); first.push(r.firstText);
    }
    console.log('DOC open (call to resolved + 2 frames) p50', p50(ts), JSON.stringify(ts), 'first editor text', JSON.stringify(first));
  }
  if (phases.includes('widgets')) {
    const res = await page.evaluate(async () => {
      const names = Object.keys(DASH_WIDGETS);
      await api('/preferences', { method: 'PUT', body: JSON.stringify({ dashboard_layout: { order: names, hidden: [], wide: [], sizes: {} } }) });
      return names.length;
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    await page.evaluate(() => switchTab('dashboard'));
    await page.waitForTimeout(8000);
    const rows = await page.evaluate(() => [...document.querySelectorAll('section.dash-widget[data-widget]')].map((s) => {
      const body = s;
      const kinds = {};
      const add = (k) => { kinds[k] = (kinds[k] || 0) + 1; };
      s.querySelectorAll('a[href], button, [role=button], input, select, textarea, [tabindex="0"], summary').forEach((e) => add(e.tagName.toLowerCase()));
      const clickable = [...s.querySelectorAll('*')].filter((e) => getComputedStyle(e).cursor === 'pointer').length;
      return { widget: s.dataset.widget, textChars: (s.textContent || '').trim().length, interactive: kinds, pointerCursorEls: clickable };
    }));
    console.log('WIDGETS defined', res, 'rendered', rows.length);
    for (const r of rows) console.log('W', JSON.stringify(r));
  }
  await browser.close();
})();
