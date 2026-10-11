// Ledger 1548: an opened row with no title, first line centre vs the chevron's centre.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => switchTab('notes')); await page.waitForTimeout(3500);
  await page.evaluate(() => { const b = document.querySelector('#notes-view-rows, [data-view="rows"]'); if (b) b.click(); try { applyNotesViewMode && 0; } catch (e) {} });
  await page.evaluate(() => { const l = document.getElementById('entry-list'); l.classList.add('is-rows'); });
  await page.waitForTimeout(500);
  const out = await page.evaluate(() => {
    const li = document.querySelector('#entry-list li');
    const btn = li.querySelector(':scope > .row-expand');
    if (btn) btn.click();
    return !!btn;
  });
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => {
    const li = document.querySelector('#entry-list li.row-expanded') || document.querySelector('#entry-list li');
    const L = li.getBoundingClientRect();
    const chev = li.querySelector(':scope > .row-expand'); const C = chev && chev.getBoundingClientRect();
    const content = li.querySelector(':scope > .entry-content') || li.querySelector('.entry-content');
    const title = li.querySelector(':scope > .entry-title');
    const first = title && title.offsetParent ? title : content;
    const range = document.createRange(); range.selectNodeContents(first.firstChild || first);
    const rects = range.getClientRects(); const t = rects[0] || first.getBoundingClientRect();
    return { expanded: li.classList.contains('row-expanded'), hasTitle: !!(title && title.offsetParent && title.textContent.trim()),
      chevronCentre: C && +(C.top + C.height / 2 - L.top).toFixed(1), chevH: C && C.height,
      firstLineCentre: +(t.top + t.height / 2 - L.top).toFixed(1), padTop: getComputedStyle(li).paddingTop, lh: getComputedStyle(first).lineHeight, fs: getComputedStyle(first).fontSize };
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
