// The Quick access manager: no strip reserved for the hidden move buttons.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab('dashboard')); await page.waitForTimeout(800);
  await page.evaluate(() => { quickEditing = true; renderQuickLinks(); });
  await page.waitForTimeout(600);
  await page.click('.quick-edit-add'); await page.waitForTimeout(500);
  const m = () => page.evaluate(() => {
    const item = document.querySelector('.quick-manage-item[draggable="true"]') || document.querySelector('.quick-manage-item');
    const label = item.querySelector('label.note-picker-row').getBoundingClientRect();
    const list = item.parentElement.getBoundingClientRect();
    const mv = item.querySelector('.quick-manage-moves');
    const r = mv && mv.getBoundingClientRect();
    const check = item.querySelector('input[type=checkbox], .note-picker-check, [class*="check"]');
    const c = check && check.getBoundingClientRect();
    return { rightGap: Math.round(list.right - label.right), moves: r && [Math.round(r.left), Math.round(r.right), getComputedStyle(mv).opacity], check: c && [Math.round(c.left), Math.round(c.right)], labelRight: Math.round(label.right) };
  });
  console.log('rest', JSON.stringify(await m()));
  await page.hover('.quick-manage-item[draggable="true"]').catch(() => {});
  await page.waitForTimeout(250);
  console.log('hover', JSON.stringify(await m()));
  await browser.close();
})();
