// Does a content-visibility rule take effect on a list, and how many of its
// rows are skipped? (INBOX 400 (1)). Reports, per selector, the computed
// value on the first and last match and whether the last match's children
// are being styled (a skipped subtree's descendants report no computed
// display change, so the probe is `checkVisibility({contentVisibilityAuto})`).
//   TAB=timeline SEL='.timeline-feed > .timeline-bucket' node f2-cv.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  if (process.env.EXP_CSS) {
    await page.evaluate((css) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }, process.env.EXP_CSS);
  }
  await page.evaluate((x) => switchTab(x), process.env.TAB || 'timeline');
  await page.waitForTimeout(3000);
  const r = await page.evaluate((sel) => {
    const els = [...document.querySelectorAll(sel)];
    if (!els.length) return 'none';
    const skipped = els.filter((e) => e.firstElementChild && !e.firstElementChild.checkVisibility({ contentVisibilityAuto: true })).length;
    return { n: els.length, cv: getComputedStyle(els[els.length - 1]).contentVisibility, skipped, lastH: els[els.length - 1].getBoundingClientRect().height };
  }, process.env.SEL);
  console.log(JSON.stringify(r));
  await browser.close();
})();
