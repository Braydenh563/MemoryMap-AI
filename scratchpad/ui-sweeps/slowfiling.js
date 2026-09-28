// A note whose filing takes 35s (longer than the old 26s poller) must leave
// "Filing…" once it settles. Needs a server whose filing is slowed for notes
// containing SLOWNOTE.
const {boot} = require('./lib');
(async () => {
  const {browser, page} = await boot();
  await page.evaluate(() => { switchTab('notes'); showNotesSection('capture'); });
  await page.fill('#entry-content', 'SLOWNOTE groceries for the week');
  await page.click('#save-btn');
  await page.waitForTimeout(2000);
  const chips = () => page.evaluate(() => document.querySelectorAll('.chip.filing').length);
  const before = await chips();
  const statusBefore = await page.textContent('#save-status');
  await page.waitForTimeout(45000);
  console.log(JSON.stringify({before, statusBefore, after: await chips(), statusAfter: await page.textContent('#save-status')}));
  await browser.close();
})();
