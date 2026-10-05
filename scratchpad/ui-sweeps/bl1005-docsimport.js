// BACKLOG section 99: Library, Documents, the more menu, "Import a file as a
// document". Drives the real control: opens the menu, measures the item, picks
// two files (one readable, one not), and checks the list, the toasts and the
// stored documents. Run at 1440 and 390, light and dark:
//
//   BASE=http://127.0.0.1:8856 node scratchpad/ui-sweeps/bl1005-docsimport.js
//   BASE=... THEME=dark PHONE=1 node scratchpad/ui-sweeps/bl1005-docsimport.js
const { boot } = require('./lib.js');

(async () => {
  const phone = !!process.env.PHONE;
  const opts = phone
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1440, height: 900 } };
  const { browser, page, OUT } = await boot(opts);
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push(ok);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`);
  };
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(600);
  await page.click('#library-subtabs button[data-target="library-view-docs"]');
  await page.waitForTimeout(800);

  // The menu item is reachable and whole inside the viewport.
  await page.click('#library-docs-more-menu summary');
  await page.waitForTimeout(300);
  const box = await page.evaluate(() => {
    const el = document.getElementById('library-docs-import');
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: innerWidth, h: innerHeight,
      clippedX: el.scrollWidth > el.clientWidth + 1, clippedY: el.scrollHeight > el.clientHeight + 1,
      font: cs.fontSize, height: r.height,
    };
  });
  check('item inside the viewport', box.left >= 0 && box.right <= box.w && box.top >= 0 && box.bottom <= box.h,
    JSON.stringify({ l: Math.round(box.left), r: Math.round(box.right), w: box.w }));
  check('item text not clipped', !box.clippedX && !box.clippedY);
  check('item is tall enough to press', box.height >= (phone ? 40 : 24), `height ${Math.round(box.height)}`);
  await page.screenshot({ path: `${OUT}/bl1005-docsimport-menu${phone ? '-390' : '-1440'}-${process.env.THEME || 'light'}.png` });

  // Contrast of the item's text against the menu surface (computed colours).
  const colours = await page.evaluate(() => {
    const el = document.getElementById('library-docs-import');
    const parse = (c) => { const n = (c.match(/[\d.]+/g) || []).map(Number); return c.startsWith('color(') ? n.map((v, i) => (i < 3 ? v * 255 : v)) : n; };
    const lum = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    let bg = null;
    for (let n = el; n && !bg; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c.length >= 3 && (c.length === 3 || c[3] > 0.9)) bg = c;
    }
    const fg = parse(getComputedStyle(el).color);
    const [a, b] = [lum(fg), lum(bg || [255, 255, 255])];
    return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), fg, bg };
  });
  check('text contrast >= 4.5', colours.ratio >= 4.5, colours.ratio.toFixed(2) + ' ' + JSON.stringify({fg: colours.fg, bg: colours.bg}));

  // Pick one readable file and one the server refuses.
  const intercepted = [];
  page.on('response', (r) => { if (r.url().includes('/documents/import')) intercepted.push(r.status()); });
  await page.click('#library-docs-import', { trial: true }).catch(() => {});
  await page.setInputFiles('#library-docs-import-input', [
    { name: 'bl1005-import.md', mimeType: 'text/markdown', buffer: Buffer.from('# Imported from a file\n\nA paragraph.\n') },
    { name: 'bl1005-refused.zip', mimeType: 'application/zip', buffer: Buffer.from('PK\x03\x04') },
  ]);
  await page.waitForTimeout(2500);
  check('both files were posted', intercepted.length === 2, JSON.stringify(intercepted));
  check('the readable one was accepted and the zip refused', intercepted.includes(201) && intercepted.includes(415), JSON.stringify(intercepted));
  const listText = await page.evaluate(() => document.getElementById('library-docs-list').innerText);
  check('the list shows the new document', /Imported from a file|bl1005-import/.test(listText), listText.slice(0, 80).replace(/\n/g, ' | '));
  const toasts = await page.evaluate(() => [...document.querySelectorAll('.toast, [role="status"]')].map((n) => n.innerText).join(' || '));
  check('a toast named the refused file', /bl1005-refused\.zip/.test(toasts), toasts.slice(0, 160));
  const stored = await page.evaluate(async () => {
    const r = await fetch('/documents?q=Imported', { headers: { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() } });
    return (await r.json());
  });
  const rows = Array.isArray(stored) ? stored : (stored.items || []);
  check('the document is stored', rows.some((d) => /Imported from a file|bl1005-import/.test(d.title || '')), JSON.stringify(rows.map((d) => d.title)));
  check('the file input was cleared for the next pick', (await page.evaluate(() => document.getElementById('library-docs-import-input').value)) === '');
  await page.screenshot({ path: `${OUT}/bl1005-docsimport-after${phone ? '-390' : '-1440'}-${process.env.THEME || 'light'}.png` });

  check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 200));
  await browser.close();
  const failed = results.filter((r) => !r).length;
  console.log(failed ? `FAILED ${failed}` : 'ALL PASS');
  process.exit(failed ? 1 : 0);
})();
