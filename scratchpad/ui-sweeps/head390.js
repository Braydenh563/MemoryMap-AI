// One question: why is the guide panel's head 63px tall at 390 and 48px at
// 1440? A head that wraps onto two rows on a phone is a different head.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 390, height: 844 } });
  await page.evaluate(() => openHelpChat());
  await page.waitForTimeout(500);
  const out = await page.evaluate(() => {
    const head = document.querySelector('[data-sheet="guide"] .sheet-head');
    const cs = getComputedStyle(head);
    const box = (el) => {
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    };
    return {
      head: box(head), wrap: cs.flexWrap, align: cs.alignItems, gap: cs.gap,
      kids: [...head.children].map((el) => Object.assign(
        { what: (el.className || el.tagName).toString().split(' ')[0] }, box(el)
      )),
    };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
