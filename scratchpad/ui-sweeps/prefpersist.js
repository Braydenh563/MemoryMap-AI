// INBOX 509: Settings switches that used to snap back now stay as set.
const { boot } = require('./lib.js');
const IDS = ['pref-warm-search-model', 'pref-background-filing', 'pref-ai-first-filing', 'pref-auto-caption-images', 'pref-auto-read-image-text'];
(async () => {
  const { browser, page } = await boot();
  const read = () => page.evaluate(async (ids) => {
    openSettingsModal('tasks'); await new Promise((r) => setTimeout(r, 800));
    return ids.map((id) => [id, document.getElementById(id)?.checked]);
  }, IDS);
  const before = await read();
  for (const id of IDS) await page.evaluate((id) => document.getElementById(id).click(), id);
  await page.waitForTimeout(800);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.fill('#lock-password', 'testpassword123').catch(() => {});
  await page.click('#lock-submit').catch(() => {});
  await page.waitForTimeout(2500);
  const after = await read();
  for (const id of IDS) await page.evaluate((id) => document.getElementById(id).click(), id);
  await page.waitForTimeout(800);
  console.log(JSON.stringify({ before, after }));
  await browser.close();
})();
