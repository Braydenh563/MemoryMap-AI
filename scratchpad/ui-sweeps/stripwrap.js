// The expanded (wrap) formatting strip, row by row (INBOX 426 round 4, item
// A3: at 1024 the strip's own group of three sat alone on a third row).
// Prints each row's items, used width and free width, for the widths given.
//
//   BASE=http://127.0.0.1:8793 WIDTHS=1024,1280,1440,820 node scratchpad/ui-sweeps/stripwrap.js
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');
const WIDTHS = (process.env.WIDTHS || '1024,1280,1440,820').split(',').map(Number);
let bad = 0;
(async () => {
  for (const width of WIDTHS) {
    const { browser, page } = await boot({ viewport: { width, height: 800 } });
    await page.evaluate(() => {
      localStorage.setItem('doc-toolbar-mode', 'wrap');
      localStorage.setItem('doc-toolbar-mode-migrated-2026-09-09', '1');
      localStorage.setItem('doc-toolbar-collapsed', '0');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    if (await page.isVisible('#lock-password').catch(() => false)) {
      await page.fill('#lock-password', 'testpassword123');
      await page.click('#lock-submit');
      await page.waitForTimeout(3000);
    }
    await openDoc(page, { title: 'Strip rows', content: '# Strip rows\n\nText.' });
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      const bar = document.getElementById('doc-toolbar');
      const cs = getComputedStyle(bar);
      const inner = bar.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const kids = [...bar.children].filter((k) => k.checkVisibility() && k.getBoundingClientRect().width > 0);
      const rows = new Map();
      for (const k of kids) {
        const b = k.getBoundingClientRect();
        const key = Math.round(b.top / 8);
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key).push({ n: k.classList.contains('doc-toolbar-tools') ? 'GROUP' : (k.getAttribute('aria-label') || k.title || k.textContent).trim().slice(0, 10), l: b.left, r: b.right });
      }
      const barLeft = bar.getBoundingClientRect().left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
      const g = bar.querySelector('.doc-toolbar-tools');
      const gs = getComputedStyle(g);
      return {
        trimmed: bar.classList.contains('is-group-trimmed'),
        group: [Math.round(g.getBoundingClientRect().width), gs.marginLeft, gs.paddingLeft, [...g.children].filter((c) => c.checkVisibility()).map((c) => Math.round(c.getBoundingClientRect().width))],
        inner: Math.round(inner),
        rows: [...rows.values()].map((items) => ({ n: items.length, used: Math.round(items[items.length - 1].r - barLeft), last: items[items.length - 1].n, only: items.length === 1 ? items[0].n : null })),
      };
    });
    const alone = r.rows.some((row) => row.only === 'GROUP');
    if (alone) bad++;
    console.log(`${alone ? 'FAIL' : 'ok  '} ${width}: trimmed ${r.trimmed} group ${JSON.stringify(r.group)} inner ${r.inner}px, ${r.rows.length} rows ${JSON.stringify(r.rows)}`);
    await browser.close();
  }
  console.log(bad ? `${bad} failing` : 'no row holds the group alone');
})();
