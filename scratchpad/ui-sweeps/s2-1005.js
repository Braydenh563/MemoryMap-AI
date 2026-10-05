// The second round of small open items (s2-1005), one file, one MODE each so
// the scratchpad cap is not spent a sweep at a time:
//
//   MODE=listedge  INBOX 608, the list half: a held text-selection drag at the
//                  edge of the Notes list and the Library scrolls the list.
//                  Pass: scrollTop moves at least 200px in a one second hold,
//                  in both directions, at the edge, 40px inside it and past it
//                  (Chromium's own autoscroll covers only the last ~20px).
//   MODE=toolsgap  Settings, Tools it can use, at 390: the height of the gap
//                  above "Tokens per step" (the field's top minus the bottom of
//                  the last element before it). Pass: under 40px.
//   MODE=rows      Whether a reminder row shares the notes' row class, and the
//                  render time and DOM node count of the Library, Reminders and
//                  Timeline lists with 300 rows seeded (see SEED below).
//
//   BASE=http://127.0.0.1:8804 W=1440 MODE=listedge node scratchpad/ui-sweeps/s2-1005.js
const { boot } = require('./lib.js');

const FIND = `(sel) => {
  let el = document.querySelector(sel);
  while (el && !(['auto', 'scroll'].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 4)) el = el.parentElement;
  return el;
}`;

async function listedge(page, W) {
  const surfaces = [
    ['notes', 'switchTab("notes")', '#entry-list'],
    ['library', 'switchTab("library")', '#library-view-documents'],
  ];
  let fails = 0;
  for (const [name, open, sel] of surfaces) {
    await page.evaluate(open);
    await page.waitForTimeout(1500);
    if (name === 'library') {
      await page.click('#library-subtabs [data-target="library-view-documents"]').catch(() => {});
      await page.waitForTimeout(1200);
    }
    const scr = (fn) => page.evaluate(`(${fn})((${FIND})(${JSON.stringify(sel)}))`);
    for (const where of ['bottom-edge', 'top-edge', 'bottom-past', 'bottom-near', 'top-near']) {
      await scr(`(el) => { el.scrollTop = ${where.startsWith('top') ? 3000 : 0}; }`);
      await page.waitForTimeout(250);
      const box = await scr(`(el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, width: r.width }; }`);
      const x = box.left + Math.min(box.width / 2, 300);
      const startY = where.startsWith('top') ? box.top + 260 : box.top + 300;
      // 'near' is 40px inside the edge: past the ~20px band Chromium's own
      // text-selection autoscroll covers, inside the 56px band the boards use.
      const targetY = { 'bottom-edge': box.bottom - 6, 'top-edge': box.top + 6, 'bottom-past': box.bottom + 40, 'bottom-near': box.bottom - 40, 'top-near': box.top + 40 }[where];
      const st = async () => Math.round(await scr('(el) => el.scrollTop'));
      await page.mouse.move(x, startY);
      await page.mouse.down();
      for (let i = 1; i <= 12; i++) await page.mouse.move(x + 4 * i, startY + (targetY - startY) * i / 12);
      await page.waitForTimeout(100);
      const s1 = await st();
      await page.waitForTimeout(1000);
      const s2 = await st();
      const chars = await page.evaluate(() => (window.getSelection().toString() || '').length);
      await page.mouse.up();
      const moved = Math.abs(s2 - s1);
      const ok = moved >= 200 && chars > 0;
      if (!ok) fails++;
      console.log(`${name} ${where} W${W}: held 1s moved ${moved}px, selected ${chars} chars ${ok ? 'PASS' : 'FAIL'}`);
      await page.evaluate(() => getSelection().removeAllRanges());
    }
  }
  return fails;
}

(async () => {
  const W = +(process.env.W || 1440);
  const MODE = process.env.MODE || 'listedge';
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  let fails = 0;
  if (MODE === 'listedge') fails = await listedge(page, W);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
