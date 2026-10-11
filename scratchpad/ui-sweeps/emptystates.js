// Notes > Questions and Library > Recordings empty states: icon centred over the block (centres within 2px).
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => document.getElementById('recovery-key-dialog')?.close());
  const measure = (sel) => page.evaluate((sel) => {
    const li = document.querySelector(sel);
    if (!li) return { found: false };
    const r = li.getBoundingClientRect();
    const i = li.querySelector('.empty-icon i').getBoundingClientRect();
    const b = li.querySelector('button')?.getBoundingClientRect();
    const t = li.querySelector('.empty-title').getBoundingClientRect();
    return { found: true, h: Math.round(r.height), iconDx: +(i.x + i.width / 2 - (r.x + r.width / 2)).toFixed(1),
      iconAboveTitle: i.bottom <= t.top + 1, btnDx: b ? +(b.x + b.width / 2 - (r.x + r.width / 2)).toFixed(1) : null,
      btnBelow: b ? b.top >= t.bottom : null };
  }, sel);
  await page.evaluate(() => document.querySelector('#tab-btn-notes')?.click());
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('#notes-subtabs [data-section="questions"]')?.click());
  await page.waitForTimeout(1500);
  console.log('questions open', JSON.stringify(await measure('#questions-list .questions-empty')));
  for (const v of ['answered', 'dropped']) {
    await page.selectOption('#questions-state', v).catch(() => {});
    await page.evaluate((v) => { const s = document.getElementById('questions-state'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, v);
    await page.waitForTimeout(800);
    console.log('questions', v, JSON.stringify(await measure('#questions-list .questions-empty')));
  }
  await page.evaluate(() => document.querySelector('#tab-btn-library')?.click());
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-recordings"]')?.click());
  await page.waitForTimeout(1500);
  console.log('recordings', JSON.stringify(await measure('#recordings-list .recordings-empty')));
  await browser.close();
})();
