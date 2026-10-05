// Settings > Packages: the gap between a row's title line and its
// description (OPEN.md, uipolish-0924 item 5: "a 16px gap"), at three widths.
// Prints the distinct gaps; PASS when none is over 14px (it was reported as 16, measured 12.8)
// As numbers.
//   BASE=http://127.0.0.1:8851 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node packagesgap.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  let worst = 0;
  for (const w of [1440, 1024, 820, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.evaluate(() => openSettingsModal('extras'));
    await page.waitForTimeout(1200);
    const rows = await page.evaluate(() => [...document.querySelectorAll('#extras-list .extras-row')].map((r) => {
      const head = r.querySelector('.entry-meta');
      const desc = [...r.children].find((c) => c !== head && c.getClientRects().length && /\S/.test(c.textContent));
      const h = head.getBoundingClientRect();
      const d = desc ? desc.getBoundingClientRect() : null;
      return { name: r.querySelector('strong')?.textContent.slice(0, 20), gap: d ? Math.round((d.top - h.bottom) * 10) / 10 : null };
    }));
    const gaps = rows.map((r) => r.gap).filter((g) => g !== null);
    console.log(`@${w}: ${rows.length} rows, gaps ${[...new Set(gaps)].join('/')}px`);
    worst = Math.max(worst, ...gaps, 0);
    await page.evaluate(() => document.getElementById('settings-close').click());
  }
  await browser.close();
  console.log(worst > 14 ? `FAIL: worst gap ${worst}px` : `PASS: worst gap ${worst}px`);
  process.exit(worst > 14 ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
