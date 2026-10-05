// WORLD_CLASS_PLAN row 30: the selection bar's Move to space and Export
// selection, through the real controls. Two notes are ticked, moved to a
// second space, seen to leave this one, and brought back with Undo; then the
// same two are exported (the page's saveFile is captured, the zip is read).
//   BASE=http://127.0.0.1:8795 WIDTH=390 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node selectmove.js
const { boot } = require('./lib.js');
(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const { browser, page } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 }, ...(width < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const results = [];
  const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' ' + detail : ''}`); };
  const s = Date.now().toString(36).slice(-4);
  const setup = await page.evaluate(async (s) => {
    const space = await apiJson('/spaces', { method: 'POST', body: JSON.stringify({ name: `Sweep space ${s}` }) });
    const ids = [];
    for (const t of ['alpha', 'beta']) ids.push((await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Selmove ${t} ${s} note`, category: `Selcat ${s}` }) })).id);
    await loadEntries();
    await loadSpaces?.();
    return { space: space.id, ids };
  }, s);
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('select-btn').click());
  await page.waitForTimeout(400);
  for (const id of setup.ids) {
    await page.evaluate((id) => {
      const li = document.querySelector(`#entry-list [data-id="${id}"]`);
      const box = li && li.querySelector('input[type="checkbox"]');
      if (box) box.click();
    }, id);
  }
  const count = await page.evaluate(() => document.getElementById('batch-count').textContent);
  check('two notes are ticked', /^2 selected/.test(count), count);
  await page.evaluate(() => document.querySelector('#batch-more-host button').click());
  await page.waitForTimeout(300);
  const rows = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].filter((e) => e.getClientRects().length).map((e) => e.textContent.trim()));
  console.log('More rows:', JSON.stringify(rows));
  check('More has Move to space and Export selection', rows.some((r) => /Move to space/.test(r)) && rows.some((r) => /Export selection/.test(r)));
  // Export first (the menu is open).
  const zip = await page.evaluate(() => new Promise((resolve) => {
    window.saveFile = async (name, blob) => { const b = new Uint8Array(await blob.arrayBuffer()); resolve({ name, size: blob.size, magic: String.fromCharCode(b[0], b[1]) }); };
    [...document.querySelectorAll('[role="menuitem"]')].find((e) => /Export selection/.test(e.textContent)).click();
    setTimeout(() => resolve({ timeout: true }), 6000);
  }));
  check('Export selection yields a zip', zip.magic === 'PK' && /\.zip$/.test(zip.name || ''), JSON.stringify(zip));
  await page.evaluate(() => document.querySelector('#batch-more-host button').click());
  await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].find((e) => /Move to space/.test(e.textContent)).click());
  await page.waitForTimeout(400);
  const spaces = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].filter((e) => e.getClientRects().length).map((e) => ({ t: e.textContent.trim(), inside: e.getBoundingClientRect().right <= innerWidth && e.getBoundingClientRect().left >= 0 })));
  console.log('space rows:', JSON.stringify(spaces));
  check('the spaces menu lists the other space, inside the window', spaces.some((r) => r.t.includes(`Sweep space ${s}`)) && spaces.every((r) => r.inside));
  await page.evaluate((s) => [...document.querySelectorAll('[role="menuitem"]')].find((e) => e.textContent.includes(`Sweep space ${s}`)).click(), s);
  await page.waitForTimeout(1500);
  const after = await page.evaluate(async (setup) => {
    const here = await apiJson('/entries?limit=200');
    const there = await fetch('/entries?limit=200', { headers: { 'X-Workspace-ID': setup.space, 'X-Auth-Token': authToken() } }).then((r) => r.json());
    return { gone: setup.ids.every((id) => !here.some((e) => e.id === id)) || activeSpaceId() === 'all', there: setup.ids.every((id) => there.some((e) => e.id === id)), toasts: [...document.querySelectorAll('.toast')].map((t) => t.textContent.trim()) };
  }, setup);
  console.log(JSON.stringify(after));
  check('they are in the other space now', after.there);
  check('a toast says so with an Undo', after.toasts.some((t) => /Moved 2 to/.test(t) && /Undo/.test(t)), JSON.stringify(after.toasts));
  await page.evaluate(() => [...document.querySelectorAll('.toast .toast-action')].find((b) => /Undo/.test(b.textContent)).click());
  await page.waitForTimeout(1500);
  const back = await page.evaluate(async (setup) => {
    const here = await apiJson('/entries?limit=200');
    return setup.ids.every((id) => here.some((e) => e.id === id));
  }, setup);
  check('Undo puts them back', back);
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  const failed = results.filter((ok) => !ok).length;
  console.log(failed ? `FAIL ${failed}` : `PASS ${results.length} of ${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
