// Probe for docfocus.js: the focus-mode state and the column's geometry, once.
//   BASE=http://127.0.0.1:8810 node scratchpad/ui-sweeps/docfocusprobe.js
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');
(async () => {
  const { browser, page } = await boot();
  await openDoc(page, { title: 'Probe', content: '# Focus\n\n' + 'Words to write. '.repeat(60) });
  await page.evaluate(() => toggleDocFocus(true));
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const q = (s) => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return { x: Math.round(b.left), w: Math.round(b.width), y: Math.round(b.top), h: Math.round(b.height), pos: cs.position, disp: cs.display, gtc: cs.gridTemplateColumns, maxw: cs.maxWidth, ml: cs.marginLeft }; };
    return {
      cls: document.getElementById('tab-documents').className,
      tab: q('#tab-documents'), layout: q('#tab-documents > .doc-layout'), main: q('.doc-main'),
      panes: q('#doc-panes'), wrap: q('#doc-source-wrap'), editor: q('#doc-editor'), cm: q('#doc-editor .cm-editor'),
      content: q('#doc-editor .cm-content'), line: q('#doc-editor .cm-line'),
    };
  });
  console.log(JSON.stringify(r, null, 1));
  if (process.env.SHOT) await page.screenshot({ path: `${process.env.SCRATCH || '.'}/docfocusprobe.png` });
  await browser.close();
})();
