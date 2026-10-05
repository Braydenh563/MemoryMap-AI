// The 2026-10-05 inventions sweep (WORLD_CLASS_PLAN rows 21, 22, 24, 25):
// the model bench's group and rows, the margin reader in a document, the web
// clipper's bookmark and window, the import-from-another-app group.
//
//   BASE=http://127.0.0.1:8865 THEME=dark WIDTH=390 \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/inv1005-features.js
//
// Measures, never screenshots alone: each line is a number or a yes/no read
// from the DOM. The bench needs no model: /models/status is answered by the
// sweep (a running server with two models) and the report by a bench.json
// the sweep asks the caller to place (REPORT=1 writes nothing; see below).
const { boot, BASE } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, ctx, page } = await boot({ viewport: { width: WIDTH, height: 900 } });
  const out = [];
  const say = (k, v) => { const line = `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`; out.push(line); console.log(line); };
  const api = (path, opts = {}) => page.evaluate(async ([path, opts]) => {
    const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'X-Auth-Token': localStorage.getItem('token'), ...(opts.headers || {}) } });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, [path, opts]);

  // Seed: notes the bench and the margin can read.
  const notes = [
    ['Home', 'The boiler service is booked with Hendry Heating every October before the cold weather.'],
    ['Home', 'The flat rent is 900 pounds a month and is paid on the first of the month.'],
    ['Garden', 'Tomato seedlings went leggy because the grow lamp hung too far above the trays.'],
  ];
  for (const [category, content] of notes) await api('/entries', { method: 'POST', body: JSON.stringify({ content, category }) });

  // --- Settings, Import & export: the two new groups -------------------------
  await page.evaluate(() => openSettingsModal('data'));
  await page.waitForTimeout(1500);
  const data = await page.evaluate(() => {
    const box = (id) => { const el = document.getElementById(id); if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), visible: !!el.offsetParent }; };
    const link = document.getElementById('web-clip-bookmarklet');
    const buttons = [...document.querySelectorAll('#import-app-box button.ghost.small')].map((b) => Math.round(b.getBoundingClientRect().height));
    const pane = document.getElementById('settings-data');
    const head = document.querySelector('#import-app-box h3');
    return {
      importBox: box('import-app-box'), clipBox: box('web-clip-box'),
      bookmarkHref: (link.getAttribute('href') || '').slice(0, 30), bookmarkH: Math.round(link.getBoundingClientRect().height),
      bookmarkBorder: getComputedStyle(link).borderTopStyle, importButtons: buttons,
      headSize: head && getComputedStyle(head).fontSize,
      overflowX: pane ? pane.scrollWidth - pane.clientWidth : null,
    };
  });
  say('data', data);
  // A press inside the app is answered, not run.
  await page.click('#web-clip-bookmarklet');
  say('bookmark press', await page.textContent('#web-clip-status'));

  // --- Settings, Models: the bench group with a report -----------------------
  await page.route('**/models/status*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ollama_running: true, installed_models: [{ name: 'qwen2.5:3b' }, { name: 'llama3.2:3b' }, { name: 'nomic-embed-text' }], chat_model: 'llama3.2:3b' }) }));
  await page.route('**/models/bench', (route) => route.request().method() === 'GET'
    ? route.fulfill({ contentType: 'application/json', body: JSON.stringify({ running: false, enabled: true, report: { items: 40, seconds: 812, stopped: '', recommended: 'qwen2.5:3b', models: [
      { model: 'qwen2.5:3b', score: 0.86, filing: 0.9, citation: 0.85, tools: 0.8, answer_ms: 2400, tokens: 61, errors: 0, failures: [{ task: 'filing', entry_id: 3, question: 'File this note', expected: 'Garden', got: 'Home' }] },
      { model: 'llama3.2:3b', score: 0.71, filing: 0.75, citation: 0.7, tools: 0.6, answer_ms: 3100, tokens: 88, errors: 1, failures: [{ task: 'tools', entry_id: 2, question: 'Look up', expected: 'find_note(rent)', got: 'no tool call' }] },
    ] } }) })
    : route.continue());
  await page.evaluate(() => showSettingsSection('models'));
  await page.waitForTimeout(2000);
  say('bench', await page.evaluate(() => {
    const box = document.getElementById('bench-box');
    const rows = [...document.querySelectorAll('#bench-results .bench-row')];
    return {
      visible: !!box.offsetParent,
      switches: document.querySelectorAll('#bench-models input[type=checkbox]').length,
      rows: rows.map((r) => ({ h: Math.round(r.getBoundingClientRect().height), meta: r.querySelector('.bench-row-meta').textContent, labels: [...r.querySelectorAll('.chip')].map((c) => c.textContent), use: !!r.querySelector('button') })),
      metaSize: rows[0] && getComputedStyle(rows[0].querySelector('.bench-row-meta')).fontSize,
      status: document.getElementById('bench-status').textContent,
      overflowX: document.getElementById('settings-models').scrollWidth - document.getElementById('settings-models').clientWidth,
    };
  }));
  await page.unroute('**/models/status*');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // --- The margin reader in a document ---------------------------------------
  await openDoc(page, { title: 'Margin check', content: 'Start.\n\n' });
  await page.evaluate(() => setDocView('live'));
  await page.waitForTimeout(600);
  await page.evaluate(() => { localStorage.setItem('doc-margin-reader', '0'); document.getElementById('doc-margin-reader').click(); });
  await page.waitForTimeout(300);
  await page.click('#doc-editor .cm-content');
  await page.keyboard.press('Control+End');
  await page.keyboard.type('The flat rent is 950 pounds a month and is paid on the first of the month. Call the landlord on Thursday at 3pm.', { delay: 5 });
  await page.waitForTimeout(3500);
  say('margin', await page.evaluate(() => {
    const margin = document.getElementById('doc-margin');
    const editor = document.getElementById('doc-editor').getBoundingClientRect();
    const m = margin.getBoundingClientRect();
    const cards = [...margin.querySelectorAll('.doc-margin-card')];
    return {
      visible: !!margin.offsetParent, marginW: Math.round(m.width), editorW: Math.round(editor.width),
      beside: m.left >= editor.right - 1, below: m.top >= editor.bottom - 1,
      cards: cards.map((c) => ({ kind: c.querySelector('.chip').textContent, h: Math.round(c.getBoundingClientRect().height), overflow: c.scrollWidth - c.clientWidth })),
      bg: cards[0] && getComputedStyle(cards[0]).backgroundColor,
      pageOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }));

  // --- clip.html, the clipper's window ---------------------------------------
  const clip = await ctx.newPage();
  clip.on('pageerror', (e) => console.log('CLIP PAGEERROR:', e.message));
  const fragment = encodeURIComponent(JSON.stringify({ u: 'https://bread.example/sourdough?utm_source=x', t: 'Sourdough basics', s: 'Feed the starter equal weights of rye flour and water.' }));
  await clip.goto(`${BASE}/clip.html#${fragment}`, { waitUntil: 'domcontentloaded' });
  await clip.waitForTimeout(800);
  const before = await clip.evaluate(() => ({ status: document.getElementById('clip-status').textContent, title: document.getElementById('clip-title').value, save: !document.getElementById('clip-save').disabled, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth, bg: getComputedStyle(document.body).backgroundImage.slice(0, 40), ink: getComputedStyle(document.body).color, saveBg: getComputedStyle(document.getElementById("clip-save")).backgroundColor }));
  await clip.click('#clip-save');
  await clip.waitForTimeout(1200);
  say('clip', { ...before, after: await clip.textContent('#clip-status') });
  await clip.click('#clip-save').catch(() => {});
  const again = await api('/links/clip-page', { method: 'POST', body: JSON.stringify({ url: 'https://bread.example/sourdough', title: 'x', html: '' }) });
  say('clip again', { status: again.status, existing: again.body && again.body.existing });

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
