// INBOX 425 (i): how much of the window the documents editor gives the page.
//
// Measures, at each viewport, every band of chrome above the first line of
// text (app header, tab strip, the doc dock, the formatting strip, the
// breadcrumb row), the status bar below it, the first line's top, and the
// writing column's width and height as a share of the window. FOCUS=1 does
// the same with focus mode on, which is the number the mode is for.
//
//   BASE=http://127.0.0.1:8810 node scratchpad/ui-sweeps/docroom.js
//   VIEWS=live,source,split,rendered FOCUS=1 node scratchpad/ui-sweeps/docroom.js
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const SIZES = (process.env.SIZES || '1440x900,1366x768')
  .split(',').map((s) => s.split('x').map(Number));
const VIEWS = (process.env.VIEWS || 'live').split(',');

(async () => {
  const rows = [];
  for (const [w, h] of SIZES) {
    const { browser, page } = await boot({ viewport: { width: w, height: h } });
    await openDoc(page, {
      title: 'Room',
      content: '# Room to write\n\n' + 'A line of prose to measure. '.repeat(40) + '\n',
    });
    for (const view of VIEWS) {
      await page.evaluate((v) => setDocView(v), view);
      await page.waitForTimeout(400);
      if (process.env.FOCUS) {
        await page.evaluate(() => toggleDocFocus(true));
        await page.waitForTimeout(500);
      }
      const m = await page.evaluate(() => {
        const box = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || r.height === 0) return { h: 0 };
          return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), h: +r.height.toFixed(1), w: +r.width.toFixed(1) };
        };
        // The first *visible* surface: Read hides the editor's wrap rather
        // than the editor itself, so `:not(.hidden)` alone finds a line with
        // a zero box there.
        const seen = (el) => el && el.getClientRects().length > 0 && el.getBoundingClientRect().height > 0;
        const firstLine = [...document.querySelectorAll('#doc-editor .cm-content .cm-line, #doc-preview > *')]
          .find(seen);
        const fr = firstLine ? firstLine.getBoundingClientRect() : null;
        const scroller = [...document.querySelectorAll('#doc-editor .cm-scroller, #doc-preview')].find(seen);
        const sr = scroller ? scroller.getBoundingClientRect() : null;
        return {
          header: box('#top-bar'),
          tabs: box('#tab-bar') || box('.tabs'),
          dock: box('.doc-dock'),
          toolbar: box('#doc-toolbar'),
          crumbs: box('#doc-crumbs'),
          status: box('#doc-statusbar'),
          hint: box('#doc-status'),
          footer: box('#status-bar'),
          sidebar: box('#doc-sidebar'),
          focusBar: box('#doc-focus-bar'),
          firstLineTop: fr ? +fr.top.toFixed(1) : null,
          lineW: fr ? +fr.width.toFixed(1) : null,
          lineLeft: fr ? +fr.left.toFixed(1) : null,
          scrollTop: sr ? +sr.top.toFixed(1) : null,
          scrollH: sr ? +sr.height.toFixed(1) : null,
        };
      });
      m.size = `${w}x${h}`;
      m.view = view;
      m.heightShare = m.scrollH ? +(m.scrollH / h * 100).toFixed(1) : null;
      m.widthShare = m.lineW ? +(m.lineW / w * 100).toFixed(1) : null;
      rows.push(m);
      if (process.env.SHOT) {
        await page.screenshot({ path: `${process.env.SCRATCH || '.'}/docroom-${w}-${view}${process.env.FOCUS ? '-focus' : ''}.png` });
      }
      if (process.env.FOCUS) await page.evaluate(() => toggleDocFocus(false));
    }
    await browser.close();
  }
  for (const r of rows) console.log(JSON.stringify(r));
})();
