// Library > Images, filtered by kind of picture (owner ask, 2026-09-23:
// "All / Sketches / Uploaded images", keeping the sort).
//
// Uploads one sketch-pad PNG (`sketch-<stamp>.png`, the name saveSketch
// gives it) and one ordinary PNG through /media/upload, opens the Images
// sub-tab at 1184x760, and checks: the "Kinds" menu is on Images and not on
// Files, unticking a kind hides exactly its tiles, the last kind cannot be
// unticked, the caption says what is on, the sort still applies, and the dock
// stays one row. Exit 1 on any failure.
//
//   BASE=http://127.0.0.1:8791 node scratchpad/ui-sweeps/liborigin.js
const {boot, OUT} = require('./lib.js');
(async () => {
  const {browser, page} = await boot({viewport: {width: 1184, height: 760}});
  await page.evaluate(async () => {
    // A 1x1 PNG, the same bytes under two names.
    const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
    for (const name of ['sketch-2026-09-23-10-00-00.png', 'holiday-photo.png']) {
      const form = new FormData();
      form.append('file', new Blob([bytes], {type: 'image/png'}), name);
      await fetch('/media/upload', {method: 'POST', headers: {'X-Auth-Token': authToken()}, body: form});
    }
    switchTab('library');
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-media-kind="images"]')?.click());
  await page.waitForTimeout(1600);
  const names = () => page.evaluate(() => [...document.querySelectorAll('#library-images-grid .library-image-tile')]
    .filter((t) => t.offsetParent !== null).map((t) => t.querySelector('figcaption')?.textContent || ''));
  const fails = [];
  const state = async () => page.evaluate(() => {
    const menu = document.getElementById('library-media-origin-menu');
    const dock = document.querySelector('[data-dock-name="library-media"]');
    const kids = [...dock.querySelectorAll('.dock-group, .dock-identity, .dock-actions')].filter((el) => el.offsetParent !== null);
    const tops = kids.map((el) => { const r = el.getBoundingClientRect(); return Math.round((r.top + r.bottom) / 2); });
    return {menuShown: menu.offsetParent !== null, caption: document.getElementById('library-media-origin-label').textContent,
      dockRows: new Set(tops).size, dockH: Math.round(dock.getBoundingClientRect().height),
      btn: (() => { const b = document.getElementById('library-media-origin-btn').getBoundingClientRect(); return {w: Math.round(b.width), h: Math.round(b.height), cy: Math.round(b.top + b.height / 2)}; })(),
      search: (() => { const b = document.getElementById('library-images-search').getBoundingClientRect(); return {cy: Math.round(b.top + b.height / 2)}; })()};
  });
  const all = await names();
  const s0 = await state();
  console.log('all', JSON.stringify(all), JSON.stringify(s0));
  if (!s0.menuShown) fails.push('menu not shown on Images');
  if (s0.caption !== 'Kinds: all') fails.push(`caption ${s0.caption}`);
  if (Math.abs(s0.btn.cy - s0.search.cy) > 1) fails.push(`menu button cy ${s0.btn.cy} vs search ${s0.search.cy}`);
  const hasSketch = all.some((n) => /^sketch-/.test(n));
  const hasUpload = all.some((n) => n === 'holiday-photo.png');
  if (!hasSketch || !hasUpload) fails.push('seeded tiles missing');

  await page.click('#library-media-origin-btn');
  await page.waitForTimeout(200);
  // Every row's words start on one edge (a short label was once centred).
  const lefts = await page.evaluate(() => [...document.querySelectorAll('#library-media-origins label > span')]
    .map((s) => Math.round(s.getBoundingClientRect().left)));
  console.log('label lefts', JSON.stringify(lefts));
  if (new Set(lefts).size !== 1) fails.push(`label lefts ${lefts}`);
  // Untick uploads: only sketches remain.
  await page.click('#library-media-origins label:nth-child(2)');
  await page.waitForTimeout(300);
  const sketches = await names();
  const s1 = await state();
  const open1 = await page.evaluate(() => document.getElementById('library-media-origin-menu').open);
  const lastDisabled = await page.evaluate(() => document.querySelector('[data-image-origin="sketch"]').disabled);
  console.log('sketches', JSON.stringify(sketches), s1.caption, 'open', open1, 'last disabled', lastDisabled);
  if (sketches.some((n) => !/^sketch/i.test(n)) || !sketches.length) fails.push('sketch filter wrong');
  if (s1.caption !== 'Kinds: sketches') fails.push(`caption ${s1.caption}`);
  if (!open1) fails.push('menu closed on a tick');
  if (!lastDisabled) fails.push('last kind can be turned off');
  // Swap: uploads on, sketches off.
  await page.click('#library-media-origins label:nth-child(2)');
  await page.waitForTimeout(200);
  await page.click('#library-media-origins label:nth-child(1)');
  await page.waitForTimeout(300);
  const uploads = await names();
  console.log('uploads', JSON.stringify(uploads));
  if (uploads.some((n) => /^sketch-/i.test(n)) || !uploads.includes('holiday-photo.png')) fails.push('upload filter wrong');
  // The sort still runs: A to Z over what is left.
  await page.evaluate(() => { const s = document.getElementById('library-media-sort'); s.value = 'az'; s.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(300);
  const sorted = await names();
  const want = [...sorted].sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
  if (JSON.stringify(sorted) !== JSON.stringify(want)) fails.push('sort not applied after filter');
  await page.screenshot({path: OUT + '/liborigin.png', clip: {x: 0, y: 60, width: 1184, height: 400}});
  // Files: the menu is not there.
  await page.evaluate(() => document.querySelector('#library-subtabs [data-media-kind="files"]')?.click());
  await page.waitForTimeout(900);
  const s2 = await state();
  if (s2.menuShown) fails.push('menu shown on Files');
  console.log(JSON.stringify({dockRows: s0.dockRows, dockH: s0.dockH, filesDockH: s2.dockH, btn: s0.btn, filesMenu: s2.menuShown}));
  if (s0.dockRows > 1) fails.push('dock wraps to ' + s0.dockRows + ' rows');
  console.log(fails.length ? 'FAIL ' + fails.join('; ') : 'OK library origin filter');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
