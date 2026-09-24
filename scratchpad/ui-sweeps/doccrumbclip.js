// Probe: is the outline breadcrumb's first crumb drawn whole, or clipped?
//   BASE=http://127.0.0.1:8810 node scratchpad/ui-sweeps/doccrumbclip.js
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');
(async () => {
  const { browser, page } = await boot();
  await openDoc(page, { title: 'A document with a reasonably long title', content: '# Dock\n\nText.' });
  const r = await page.evaluate(() => {
    const nav = document.getElementById('doc-crumbs');
    const items = [...nav.querySelectorAll('li')].map((li) => {
      const b = li.getBoundingClientRect();
      const inner = li.firstElementChild;
      return { text: li.textContent.trim(), left: b.left, right: b.right, w: b.width,
        sw: inner ? inner.scrollWidth : null, cw: inner ? inner.clientWidth : null,
        maxw: inner ? getComputedStyle(inner).maxWidth : null };
    });
    const nb = nav.getBoundingClientRect();
    return { navLeft: nb.left, navW: nb.width, scrollLeft: nav.scrollLeft, sw: nav.scrollWidth, cw: nav.clientWidth,
      mask: getComputedStyle(nav).maskImage || getComputedStyle(nav).webkitMaskImage, items };
  });
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
