// UX-06 (audit 2026-10-05): the Library's Create names the concept map for
// what it makes and offers New mind map, which opens the board dialog on Mind
// map.  BASE=... W=390 node ux1005-create.js
const { boot } = require('./lib');

(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 }, ...(W < 600 ? { isMobile: true, hasTouch: true } : {}) });
  await page.evaluate(() => { switchTab('library'); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => openLibraryCreatePicker());
  await page.waitForTimeout(500);
  const rows = await page.evaluate(() => [...document.querySelectorAll('.library-create-list button')].map((b) => ({
    kind: b.dataset.kind, text: b.textContent.replace(/\s+/g, ' ').trim(),
    overflow: b.scrollWidth > b.clientWidth + 1,
  })));
  console.log(JSON.stringify(rows, null, 1));
  await page.click('.library-create-list button[data-kind="mindmap"]');
  await page.waitForTimeout(2500);
  const dialog = await page.evaluate(() => {
    const on = [...document.querySelectorAll('[aria-pressed="true"], [aria-checked="true"], .active')]
      .map((el) => el.textContent.trim()).filter((t) => /mind map/i.test(t));
    return { mindMapChosen: on.length > 0, title: document.querySelector('.modal-card h2, .modal-card h3')?.textContent };
  });
  console.log(JSON.stringify(dialog));
  const ok = rows.some((r) => r.kind === 'mindmap') && dialog.mindMapChosen && !rows.some((r) => r.overflow);
  console.log(ok ? 'ok' : 'FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
