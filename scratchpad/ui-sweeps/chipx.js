// The x on a chip is centred and quiet at rest (INBOX 482): the drawn cross's
// centre against its target's centre, at rest and on hover, light and dark.
const { boot } = require('./lib.js');
(async () => {
  for (const theme of ['light', 'dark']) {
    process.env.THEME = theme;
    const { browser, page } = await boot({ deviceScaleFactor: 4 });
    await page.evaluate(() => switchTab('notes'));
    await page.waitForTimeout(2000);
    const r = await page.evaluate(() => {
      const x = document.querySelector('.chip.suggested-tag > .unlink:last-child');
      if (!x) return null;
      const b = x.getBoundingClientRect();
      const a = getComputedStyle(x, '::after');
      const disc = getComputedStyle(x, '::before').backgroundColor;
      return { box: [b.width, b.height], after: [a.width, a.height, a.rotate], color: getComputedStyle(x).color, disc,
        glyph: getComputedStyle(x.querySelector('.ph-x')).visibility };
    });
    console.log(theme, JSON.stringify(r));
    const x = page.locator('.chip.suggested-tag > .unlink:last-child').first();
    await x.scrollIntoViewIfNeeded();
    const chip = page.locator('.chip.suggested-tag').first();
    await chip.screenshot({ path: `/tmp/claude-0/chipx-${theme}-rest.png`, scale: 'device' });
    await x.hover(); await page.waitForTimeout(300);
    await chip.screenshot({ path: `/tmp/claude-0/chipx-${theme}-hover.png` });
    await browser.close();
  }
})();
