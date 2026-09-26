// Median rendered height of a list's rows, for a contain-intrinsic-size.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  for (const [tab, sel] of [['notes', '#entry-list > li'], ['timeline', '.timeline-feed .timeline-row'], ['library', '#library-grid .library-card']]) {
    await page.evaluate((x) => switchTab(x), tab);
    await page.waitForTimeout(2500);
    const r = await page.evaluate((s) => {
      const hs = [...document.querySelectorAll(s)].map((e) => e.getBoundingClientRect().height).sort((a, b) => a - b);
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return { n: hs.length, min: hs[0], med: hs[hs.length >> 1], max: hs[hs.length - 1], rem };
    }, sel);
    console.log(tab, JSON.stringify(r));
  }
  await browser.close();
})();
