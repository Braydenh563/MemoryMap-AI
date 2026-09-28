const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1093, height: 614 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(800);
  // Flip to the compact row view, if the toggle exists.
  const flipped = await page.evaluate(() => {
    if (typeof setNotesViewMode === 'function') { setNotesViewMode('rows'); return 'fn'; }
    const list = document.getElementById('entry-list');
    if (list) { list.classList.add('is-rows'); return 'class'; }
    return null;
  });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const list = document.getElementById('entry-list');
    const li = list && list.querySelector('li:not(:has(textarea))');
    if (!li) return { none: true };
    const meta = li.querySelector('.entry-meta');
    const title = li.querySelector('.entry-title');
    return {
      isRows: list.classList.contains('is-rows'),
      liHeight: Math.round(li.getBoundingClientRect().height),
      metaMargin: meta ? getComputedStyle(meta).margin : null,
      metaGap: meta ? getComputedStyle(meta).gap : null,
      metaAlign: meta ? getComputedStyle(meta).alignItems : null,
      titleMargin: title ? getComputedStyle(title).marginBottom : null,
    };
  });
  console.log('flipped via', flipped, JSON.stringify(r, null, 1));
  console.log('errors', JSON.stringify(errors));
  await browser.close();
})();
