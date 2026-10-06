// INBOX 475: the gap between the popup agent's head (avatar + title) and its
// input, against other dialog heads. BASE=http://127.0.0.1:8875 node palettegap.js
const { boot } = require('./lib.js');
(async () => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
    const { page, browser } = await boot({ viewport: vp });
    await page.keyboard.press('Control+Shift+A');
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      const box = (el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top * 10) / 10, bottom: Math.round(b.bottom * 10) / 10, h: Math.round(b.height * 10) / 10 }; };
      const head = document.querySelector('.command-palette-head');
      const bar = document.querySelector('.command-palette-bar');
      const input = document.getElementById('command-palette-input');
      const mark = head.querySelector('.atlas-mark');
      const title = head.querySelector('.dialog-head-title');
      const cs = (el, p) => getComputedStyle(el)[p];
      return {
        visible: head.offsetParent !== null,
        head: box(head), mark: box(mark), title: box(title), bar: box(bar), input: box(input),
        headToInput: Math.round((box(input).top - Math.max(box(mark).bottom, box(title).bottom)) * 10) / 10,
        headToBar: Math.round((box(bar).top - box(head).bottom) * 10) / 10,
        barPadTop: cs(bar, 'paddingTop'), headPadTop: cs(head, 'paddingTop'), headPadBottom: cs(head, 'paddingBottom'),
        space4: cs(document.documentElement, '--space-4'),
      };
    });
    console.log(vp.width, JSON.stringify(r));
    await page.screenshot({ path: `${process.env.SCRATCH || '/tmp'}/pg-${vp.width}.png`, clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, 420) } });
    await browser.close();
  }
})();
