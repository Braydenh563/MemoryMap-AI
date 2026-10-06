// INBOX 473: how many body lines a clamped Notes card shows, per density and
// viewport. Seeds (once) titled notes with long bodies and a Markdown link;
// BASE=http://127.0.0.1:8875 node scratchpad/ui-sweeps/notepreview.js
const { boot } = require('./lib.js');
const MARK = 'PVSEED';
const body = (n) => Array.from({ length: n }, (_, i) =>
  `Paragraph ${i + 1} of the long note: the quick brown fox jumps over the lazy dog while the contractor measures the kitchen wall twice and writes it down.`).join('\n\n');
const NOTES = [
  `# ${MARK} Kitchen plan\n\n${body(6)}\n\nSee [the quotes](https://example.com/quotes) and **bold** text.`,
  `# ${MARK} Quarterly review\n\n${body(5)}`,
  `${MARK} A note without a heading. ${body(4)}`,
];
(async () => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const { page, browser } = await boot({ viewport: vp });
    const have = await page.evaluate(async (m) => {
      const r = await apiJson('/entries?limit=200');
      return (r.items || r).filter((e) => (e.content || '').includes(m)).length;
    }, MARK);
    if (!have) {
      await page.evaluate(async (notes) => {
        for (const content of notes) await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) });
      }, NOTES);
    }
    await page.evaluate(() => switchTab('notes'));
    await page.waitForTimeout(1500);
    for (const density of ['compact', 'comfortable', 'spacious']) {
      await page.evaluate((d) => { document.documentElement.dataset.density = d; }, density);
      await page.waitForTimeout(300);
      const out = await page.evaluate((m) => {
        return [...document.querySelectorAll('#entry-list > li')]
          .filter((li) => li.textContent.includes(m))
          .map((li) => {
            const c = li.querySelector('.entry-content');
            const cs = getComputedStyle(c);
            const lh = parseFloat(cs.lineHeight);
            return {
              clamped: c.classList.contains('entry-clamped'),
              lines: Math.round(c.clientHeight / lh),
              clampCss: cs.webkitLineClamp,
              more: !!li.querySelector('.entry-more'),
              cardH: Math.round(li.getBoundingClientRect().height),
              text: c.textContent.slice(0, 40),
            };
          });
      }, MARK);
      console.log(vp.width, density, JSON.stringify(out));
    }
    await page.screenshot({ path: `${process.env.SCRATCH || '/tmp'}/np-${vp.width}.png` });
    await browser.close();
  }
})();
