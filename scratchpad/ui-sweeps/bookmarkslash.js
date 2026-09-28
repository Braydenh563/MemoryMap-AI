// "/" → Bookmark link in the capture box writes [title](url) at the caret.
const {boot} = require('./lib');
(async () => {
  const {browser, page} = await boot();
  await page.evaluate(async () => {
    await apiJson('/bookmarks', {method: 'POST', body: JSON.stringify({url: 'https://canvas.qut.edu.au/', title: 'QUT Canvas'})});
    switchTab('notes'); showNotesSection('capture');
  });
  await page.click('#entry-content');
  await page.keyboard.type('See ');
  await page.keyboard.type('/bookmark');
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  const rows = await page.$$('.entry-pick-list button, .entry-pick-list li');
  if (rows.length) await rows[0].click();
  await page.waitForTimeout(600);
  console.log(JSON.stringify({rows: rows.length, value: await page.inputValue('#entry-content')}));
  await browser.close();
})();
