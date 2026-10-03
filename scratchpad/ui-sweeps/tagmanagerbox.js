// Where the tag manager's card sits next to the Manage categories card
// (INBOX 447): both are `.manage-cat-card` sheets, so their boxes must agree.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(async () => { await switchTab('notes'); showNotesSection('browse'); await loadEntries(); });
  const box = async (name, open) => {
    await page.evaluate(open);
    await page.waitForSelector(`.sheet-overlay[data-sheet="${name}"] .manage-cat-row`);
    await page.waitForTimeout(900);
    const r = await page.$eval(`.sheet-overlay[data-sheet="${name}"] .sheet-card`, (e) => {
      const b = e.getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), height: Math.round(b.height), inner: innerHeight };
    });
    console.log(name, JSON.stringify(r));
    await page.screenshot({ path: `${process.env.SCRATCH || '.'}/box-${name}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  };
  await box('categories', () => openManageCategories());
  await box('tags', () => openTagsSheet());
  await browser.close();
})();
