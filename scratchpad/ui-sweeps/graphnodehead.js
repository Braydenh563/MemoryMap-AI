// The node panel's header under a title long enough to have caused the
// report it was fixed for ("the x close button ... gets pushed out of place
// by the note title, and the note title gets cut off with no ellipse",
// 2026-09-09), plus the action band's own geometry against the panel.
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers NODE_PATH=/opt/node22/lib/node_modules \
//     BASE=http://127.0.0.1:8931 W=1440 node scratchpad/ui-sweeps/graphnodehead.js
//
// `graphnode.js` opens whatever note is first in the list, which on a seeded
// notebook is short. A header that holds at 20 characters says nothing about
// the one that was reported.
const { boot } = require('./lib.js');
const W = Number(process.env.W || 1440);
const H = Number(process.env.H || 900);
(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: H } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(2500);
  const opened = await page.evaluate(async () => {
    const list = (typeof allEntries !== 'undefined' ? allEntries : []).filter((e) => !e.binned);
    const e = list[0];
    if (!e) return 'no notes';
    await openGraphPopup({ clientX: 300, clientY: 200, stopPropagation() {} }, { id: e.id, category: e.category });
    return e.id;
  });
  await page.waitForTimeout(1200);
  // The title is written by graph.js from the note; set it directly, which is
  // what a note called this would give the header anyway.
  const m = await page.evaluate(() => {
    const t = document.getElementById('graph-popup-title');
    t.textContent = 'Reading notes on the second brain literature, part four: what a graph actually answers';
    t.title = t.textContent;
    const p = document.getElementById('graph-popup');
    const head = p.querySelector('.graph-popup-head');
    const close = document.getElementById('graph-popup-close');
    const ident = p.querySelector('.graph-popup-ident');
    const panel = p.getBoundingClientRect();
    const tr = t.getBoundingClientRect();
    const cr = close.getBoundingClientRect();
    const acts = p.querySelector('.graph-popup-actions');
    const ar = acts.getBoundingClientRect();
    const cs = getComputedStyle(acts);
    return {
      panel: { w: Math.round(panel.width), h: Math.round(panel.height), left: Math.round(panel.left), right: Math.round(panel.right), bottom: Math.round(panel.bottom) },
      headH: Math.round(head.getBoundingClientRect().height),
      titleLines: Math.round(tr.height / parseFloat(getComputedStyle(t).lineHeight)),
      titleEllipsised: t.scrollWidth > t.clientWidth + 1,
      titleWhiteSpace: getComputedStyle(t).whiteSpace,
      identMinWidth: getComputedStyle(ident).minWidth,
      closeFromPanelRight: Math.round(panel.right - cr.right),
      closeFromPanelTop: Math.round(cr.top - panel.top),
      closeH: Math.round(cr.height),
      // The action band: is it the panel's own width, and is it centred?
      bandFromPanelLeft: Math.round(ar.left - panel.left),
      bandFromPanelRight: Math.round(panel.right - ar.right),
      bandFromPanelBottom: Math.round(panel.bottom - ar.bottom),
      bandJustify: cs.justifyContent,
      bandBackground: cs.backgroundColor,
      bandBorderTop: cs.borderTopWidth,
      panelScrolls: p.scrollHeight > p.clientHeight,
    };
  });
  console.log(JSON.stringify({ w: W, opened, ...m, errors: errs }, null, 1));
  await browser.close();
})();
