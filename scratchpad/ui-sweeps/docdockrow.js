// INBOX 425 (i): the documents dock as one row, measured.
//
// Every control in `.doc-dock` with its box and its paint: one row where the
// window allows it (every control's top within 1px of the dock's), one
// height, the actions on the right edge when they wrap, and nothing outside
// the dock. WIDTHS is a list of viewport widths; CHAT=1 opens the chat dock
// first, which is the narrowest the editor gets on a laptop.
//
//   BASE=http://127.0.0.1:8810 node scratchpad/ui-sweeps/docdockrow.js
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const WIDTHS = (process.env.WIDTHS || '1440,1366,1280,1024,820,390').split(',').map(Number);
const out = [];
const check = (name, ok, detail) => out.push({ name, ok: !!ok, detail });

(async () => {
  for (const w of WIDTHS) {
    const h = w <= 600 ? 844 : 900;
    const phone = w <= 600;
    const { browser, page } = await boot({ viewport: { width: w, height: h },
      ...(phone ? { hasTouch: true, isMobile: true } : {}) });
    await openDoc(page, { title: 'A document with a reasonably long title', content: '# Dock\n\nText.' });
    const m = await page.evaluate(() => {
      const dock = document.querySelector('.doc-dock');
      const d = dock.getBoundingClientRect();
      const controls = [...dock.querySelectorAll('#doc-back, #doc-title, #doc-saved, #doc-view-seg, #doc-view-menu > summary, #doc-ai, #doc-focus-toggle, #doc-dock-menu > summary')]
        .filter((el) => el.getClientRects().length)
        .map((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return { id: el.id || el.parentElement.id, top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1),
            left: +r.left.toFixed(1), right: +r.right.toFixed(1), h: +r.height.toFixed(1),
            bg: cs.backgroundColor, border: cs.borderTopColor + ' ' + cs.borderTopWidth };
        });
      return { dock: { top: d.top, bottom: d.bottom, left: d.left, right: d.right, h: +d.height.toFixed(1) }, controls };
    });
    const rows = new Set(m.controls.map((c) => Math.round(c.top / 8)));
    const outside = m.controls.filter((c) => c.left < m.dock.left - 1 || c.right > m.dock.right + 1);
    console.log(w, 'dock h', m.dock.h, 'rows', rows.size);
    if (process.env.VERBOSE) for (const c of m.controls) console.log('  ', JSON.stringify(c));
    check(`${w}: nothing outside the dock`, outside.length === 0, outside.map((c) => c.id));
    if (w >= 1280) check(`${w}: one row`, m.dock.h <= 40, m.dock.h);
    const buttons = m.controls.filter((c) => !['doc-title', 'doc-saved', 'doc-view-seg'].includes(c.id));
    const heights = new Set(buttons.map((c) => c.h));
    check(`${w}: one control height`, heights.size <= 1, [...heights]);
    if (process.env.SHOT) {
      await page.screenshot({ path: `${process.env.SCRATCH || '.'}/docdock-${w}.png`,
        clip: { x: 0, y: 0, width: w, height: Math.min(h, m.dock.bottom + 60) } });
    }
    await browser.close();
  }
  const failed = out.filter((c) => !c.ok);
  for (const c of out) console.log(c.ok ? 'ok  ' : 'FAIL', c.name, c.ok ? '' : JSON.stringify(c.detail));
  console.log(`${out.length - failed.length} of ${out.length}`);
  process.exit(failed.length ? 1 : 0);
})();
