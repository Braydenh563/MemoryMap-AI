// fe1005: what each repaint after a patched save costs at 5,000 notes.
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  await page.click('[data-tab="notes"]').catch(() => {});
  await page.waitForFunction(() => typeof entriesComplete !== "undefined" && entriesComplete, null, { timeout: 120000 });
  await page.waitForTimeout(2000);
  const out = await page.evaluate(() => {
    const time = (fn) => {
      const t = performance.now();
      for (let i = 0; i < 3; i++) fn();
      return Math.round(((performance.now() - t) / 3) * 10) / 10;
    };
    return {
      sort: time(() => allEntries.slice().sort(entryListOrder)),
      renderEntries: time(() => renderEntries()),
      renderSidebar: time(() => renderSidebar()),
      renderStatusBar: time(() => renderStatusBar()),
      fillCategoryOptions: time(() => fillCategoryOptions($("entry-category"), null)),
    };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
