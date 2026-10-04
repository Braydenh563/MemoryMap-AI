// Vertical alignment by ink, not by box (INBOX 494): for each control in a
// bar, the glyph's ink centre against its label's x-height centre, read from
// the pixels at 3x. Boxes lie here: an icon font's box and a text line box
// are centred on different things.
//   BASE=... SEL='#status-bar .status-item' W=1440 THEME=light node inkalign.js
// Prints one line per control: dy = icon ink centre minus x-height centre,
// in CSS px (positive: the icon sits low).
const { boot } = require('./lib.js');
const { execFileSync } = require('child_process');
const W = Number(process.env.W || 1440);
const SEL = process.env.SEL || '#status-bar .status-item, #status-bar button';
(async () => {
  const { browser, page, OUT } = await boot({ viewport: { width: W, height: 900 }, deviceScaleFactor: 3 });
  if (process.env.TAB) { await page.click(`[data-tab="${process.env.TAB}"]`).catch(() => {}); }
  await page.waitForTimeout(1500);
  const items = await page.evaluate((sel) => {
    const out = [];
    document.querySelectorAll(sel).forEach((el, i) => {
      if (!el.checkVisibility() || el.getBoundingClientRect().width < 4) return;
      el.dataset.inkIdx = i;
      const b = el.getBoundingClientRect();
      const icon = el.querySelector('i.ph, i[class*="ph-"], svg, .atlas-mark');
      const kbd = el.querySelector('kbd, .status-key');
      // The label: every text node not inside the icon or a key chip.
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let r = null;
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (!n.textContent.trim() || (icon && icon.contains(n)) || (kbd && kbd.contains(n))) continue;
        const range = document.createRange(); range.selectNodeContents(n);
        const rr = range.getBoundingClientRect();
        if (rr.width < 2) continue;
        r = r ? { left: Math.min(r.left, rr.left), right: Math.max(r.right, rr.right), top: Math.min(r.top, rr.top), bottom: Math.max(r.bottom, rr.bottom) } : { left: rr.left, right: rr.right, top: rr.top, bottom: rr.bottom };
      }
      const box = (e) => { if (!e) return null; const q = e.getBoundingClientRect(); return { left: q.left, right: q.right, top: q.top, bottom: q.bottom }; };
      out.push({ name: (el.getAttribute('aria-label') || el.textContent).trim().replace(/\s+/g, ' ').slice(0, 24), box: box(el), icon: box(icon), kbd: box(kbd), text: r });
    });
    return out;
  }, SEL);
  const shot = `${OUT}/ink-${W}-${process.env.THEME || 'light'}.png`;
  await page.screenshot({ path: shot });
  await browser.close();
  const py = process.env.PY || '/home/user/MemoryMap-AI/.venv/bin/python';
  const res = execFileSync(py, [__dirname + '/inkalign.py', shot, JSON.stringify(items)]).toString();
  process.stdout.write(res);
})();
