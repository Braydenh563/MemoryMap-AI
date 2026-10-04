// INBOX 524: drag in the Quick access manager (Playwright's dragTo drives real HTML5 drag events).
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const added = () => page.$$eval('ul[aria-label="On your dashboard"] .quick-manage-item', (els) => els.map((e) => e.dataset.id));
  await page.evaluate(() => switchTab('dashboard')); await page.waitForTimeout(800);
  await page.evaluate(() => { quickEditing = true; renderQuickLinks(); });
  await page.waitForTimeout(500);
  await page.click('.quick-edit-add'); await page.waitForTimeout(400);
  console.log('before', JSON.stringify(await added()));
  const items = page.locator('ul[aria-label="On your dashboard"] .quick-manage-item');
  const n = await items.count();
  await items.nth(n - 1).locator('.quick-manage-grip').dragTo(items.nth(0), { targetPosition: { x: 40, y: 3 } });
  await page.waitForTimeout(300);
  console.log('after dragTo top', JSON.stringify(await added()));
  // the two buttons: move the first down
  await items.nth(0).hover();
  await items.nth(0).locator('.quick-manage-move').nth(1).click();
  console.log('after Move down button', JSON.stringify(await added()));
  console.log('buttons disabled at ends', await page.$$eval('ul[aria-label="On your dashboard"] .quick-manage-item', (els) => [els[0].querySelectorAll('.quick-manage-move')[0].disabled, els[els.length - 1].querySelectorAll('.quick-manage-move')[1].disabled]));
  await page.screenshot({ path: (process.env.SCRATCH || '.') + `/shots/qm-drag-${process.env.THEME || 'light'}.png` });
  await browser.close();
})();
