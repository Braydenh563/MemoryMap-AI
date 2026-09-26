// INBOX 426 (z), image 86: Atlas in the guide panel's head. The mark, what
// it draws, and the title beside it: the drawing must sit inside the head
// (not spill below it), centred on the two lines of the title, and not be
// cut by anything.
//
//   BASE=http://127.0.0.1:8793 THEME=dark W=1440 SHOTS=/tmp/x node scratchpad/ui-sweeps/guidehead.js
const { boot } = require('./lib.js');
const W = Number(process.env.W || 1440);
(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: 900 }, deviceScaleFactor: Number(process.env.DPR || 1) });
  await page.evaluate(() => openHelpChat());
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const head = document.querySelector('[data-sheet="guide"] .sheet-head');
    const mark = head?.querySelector('.atlas-mark');
    const words = head?.querySelector('.atlas-head-words');
    if (!mark) return { missing: true };
    const hb = head.getBoundingClientRect(), mb = mark.getBoundingClientRect(), wb = words.getBoundingClientRect();
    // The painted extent: every descendant's box.
    let top = mb.top, bottom = mb.bottom, left = mb.left, right = mb.right;
    for (const el of mark.querySelectorAll('*')) {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      top = Math.min(top, b.top); bottom = Math.max(bottom, b.bottom); left = Math.min(left, b.left); right = Math.max(right, b.right);
    }
    const clip = [];
    for (let p = mark; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (/(hidden|clip)/.test(o.overflow + o.overflowX + o.overflowY)) {
        const pb = p.getBoundingClientRect();
        if (top < pb.top - 0.5 || bottom > pb.bottom + 0.5 || left < pb.left - 0.5 || right > pb.right + 0.5) clip.push(p.className.toString().slice(0, 30) || p.tagName);
      }
    }
    return {
      head: [Math.round(hb.top), Math.round(hb.bottom)],
      mark: [Math.round(mb.width), Math.round(mb.height)],
      painted: [Math.round(top), Math.round(bottom), Math.round(right - left), Math.round(bottom - top)],
      spillsBelow: Math.round(bottom - hb.bottom),
      spillsAbove: Math.round(hb.top - top),
      centreOff: Math.round(((top + bottom) / 2 - (wb.top + wb.bottom) / 2) * 10) / 10,
      // What is seen when the mark clips (a disc): the mark's own box.
      markCentreOff: Math.round(((mb.top + mb.bottom) / 2 - (wb.top + wb.bottom) / 2) * 10) / 10,
      markInsideHead: mb.top >= hb.top - 0.5 && mb.bottom <= hb.bottom + 0.5,
      wordsH: Math.round(wb.height),
      clippedBy: clip,
      html: mark.outerHTML.slice(0, 200),
    };
  });
  console.log(JSON.stringify(r, null, 1));
  if (process.env.SHOTS) {
    const b = await page.evaluate(() => { const h = document.querySelector('[data-sheet="guide"] .sheet-head').getBoundingClientRect(); return { x: h.left - 12, y: h.top - 12, width: h.width + 24, height: h.height + 24 }; });
    await page.screenshot({ path: `${process.env.SHOTS}/guidehead-${W}.png`, clip: b });
  }
  await browser.close();
})();
