// INBOX 159 (exports reachable from notifications and Settings) and INBOX
// 111 (the chat composer keeps a dragged height), each as a number.
//
//   BASE=http://127.0.0.1:8931 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node exports.js
const { boot, BASE } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  const bad = [];

  // 159: an export through the app's own save route lands in the folder,
  // the notification records it, the Settings list shows it with a download.
  const saved = await page.evaluate(async () => {
    const r = await apiJson('/files/save', { method: 'POST', body: JSON.stringify({ filename: 'sweep-export.txt', content_base64: btoa('hello') }) });
    const list = await apiJson('/files/exports');
    return { path: r.path, count: list.files.length, first: list.files[0] && list.files[0].filename, bytes: list.files[0] && list.files[0].bytes };
  });
  console.log(`159 save        ${saved.path}, list ${saved.count} file(s), newest ${saved.first} ${saved.bytes}B`);
  if (saved.first !== 'sweep-export.txt' || saved.bytes !== 5) bad.push('exports list does not show the saved file');

  const note = await page.evaluate(() => {
    recordNotification({ kind: 'export', title: 'Saved sweep-export.txt', detail: 'x', key: 'export:sweep', action: { exports: true } });
    return JSON.parse(localStorage.getItem('mm-notifications') || localStorage.getItem('notifications') || '[]').some((n) => n.action && n.action.exports);
  }).catch((e) => 'ERR ' + e.message);
  console.log(`159 notify      export notification stored with action.exports ${note}`);

  await page.evaluate(() => openSettingsModal('data', 'exports-recent'));
  await page.waitForTimeout(900);
  const rows = await page.evaluate(() => {
    const list = document.getElementById('exports-list');
    const row = list.querySelector('.exports-row');
    const name = row && row.querySelector('.exports-name');
    const btn = row && row.querySelector('button');
    const empty = document.getElementById('exports-empty');
    const section = document.getElementById('settings-data');
    return {
      rows: list.children.length,
      emptyHidden: empty.classList.contains('hidden'),
      sectionShown: section && !section.classList.contains('hidden'),
      rowH: row && Math.round(row.getBoundingClientRect().height),
      nameEllipsis: name && getComputedStyle(name).textOverflow,
      btnH: btn && Math.round(btn.getBoundingClientRect().height),
      btnText: btn && btn.textContent.trim(),
      overflow: list.scrollWidth > list.clientWidth,
    };
  });
  console.log(`159 settings    section shown ${rows.sectionShown}, ${rows.rows} row(s), empty hidden ${rows.emptyHidden}, row ${rows.rowH}px, button ${rows.btnH}px "${rows.btnText}", name ellipsis ${rows.nameEllipsis}, x-overflow ${rows.overflow}`);
  if (!rows.sectionShown || rows.rows < 1 || !rows.emptyHidden || rows.nameEllipsis !== 'ellipsis' || rows.overflow) bad.push('exports rows wrong');

  // The download route serves the bytes with auth.
  const dl = await page.evaluate(async () => {
    const r = await api('/files/exports/sweep-export.txt');
    return { status: r.status, text: await r.text() };
  });
  console.log(`159 download    ${dl.status} "${dl.text}"`);
  if (dl.status !== 200 || dl.text !== 'hello') bad.push('download route wrong');

  // 111: a dragged composer height is kept, with and without text.
  await page.evaluate(() => { document.getElementById('settings-close').click(); switchTab('chat'); });
  await page.waitForTimeout(600);
  const drag = await page.evaluate(async () => {
    const box = document.getElementById('chat-input');
    box.value = '';
    box.dataset.maxPx = '220';
    autoGrow(box);
    const emptyH = box.getBoundingClientRect().height;
    box.value = 'one line';
    box.dispatchEvent(new Event('input'));
    await new Promise((r) => setTimeout(r, 50));
    const typedH = box.getBoundingClientRect().height;
    box.value = '';
    box.dispatchEvent(new Event('input'));
    await new Promise((r) => setTimeout(r, 50));
    const clearedH = box.getBoundingClientRect().height;
    const kept = box.dataset.maxPx;
    box.dataset.maxPx = String(Math.round(innerHeight * 0.9));
    autoGrow(box);
    const capped = box.getBoundingClientRect().height;
    delete box.dataset.maxPx; localStorage.removeItem('chat-composer-height'); autoGrow(box);
    return { emptyH, typedH, clearedH, kept, capped, limit: Math.round(innerHeight * 0.7) };
  });
  console.log(`111 composer    dragged 220: empty ${drag.emptyH}px, typed ${drag.typedH}px, cleared ${drag.clearedH}px, maxPx kept ${drag.kept}; a 90vh drag applies as ${drag.capped}px (limit ${drag.limit})`);
  if (drag.emptyH < 219 || drag.typedH < 219 || drag.clearedH < 219 || drag.kept !== '220') bad.push('composer drag not kept');
  if (drag.capped > drag.limit + 1) bad.push('composer drag exceeds the window cap');

  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
