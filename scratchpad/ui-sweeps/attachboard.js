// INBOX 246: putting a note on a board from the note's own menu, then
// checking the board really has it and the note's "Referenced by" says so.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(4000);
  await page.evaluate(() => { switchTab('notes'); showNotesSection('capture'); });
  await page.waitForTimeout(800);
  await page.fill('#entry-content', 'A note that is about to be put on a board.');
  await page.click('#save-btn');
  await page.waitForTimeout(3500);
  await page.evaluate(() => showNotesSection('browse'));
  await page.waitForTimeout(2000);

  const open = async (label) => page.evaluate((want) => {
    const card = [...document.querySelectorAll('#entry-list > li')]
      .find((li) => li.textContent.includes('about to be put on a board'));
    if (!card) return 'no card';
    const kebab = [...card.querySelectorAll('button')].find((b) => (b.title || '') === 'More actions');
    if (!kebab) return 'no kebab';
    kebab.click();
    const item = [...document.querySelectorAll('.action-menu button')].find((b) => b.textContent.includes(want));
    if (!item) return [...document.querySelectorAll('.action-menu button')].map((b) => b.textContent.trim());
    item.click();
    return true;
  }, label);

  console.log('menu:', await open('Add to a board or map'));
  await page.waitForTimeout(2500);
  const panel = await page.evaluate(() => {
    const p = document.querySelector('.inline-action');
    if (!p) return 'no panel';
    return {
      text: p.querySelector('.muted')?.textContent,
      options: [...p.querySelectorAll('select option')].map((o) => o.textContent),
      buttons: [...p.querySelectorAll('button')].map((b) => b.textContent.trim()),
    };
  });
  console.log('panel:', JSON.stringify(panel));
  if (panel === 'no panel' || !panel.options.length) { console.log('FAIL: no boards to pick'); await browser.close(); process.exit(1); }

  await page.evaluate(() => {
    const p = document.querySelector('.inline-action');
    [...p.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Attach').click();
  });
  await page.waitForTimeout(3000);
  console.log('toast:', await page.evaluate(() => document.querySelector('.toast')?.textContent?.slice(0, 60)));

  console.log('refs:', await open('Referenced by'));
  await page.waitForTimeout(2500);
  console.log('rows:', JSON.stringify(await page.evaluate(() => {
    const card = [...document.querySelectorAll('#entry-list > li')].find((li) => li.textContent.includes('about to be put on a board'));
    const links = card && [...card.querySelectorAll('.entry-links')].pop();
    if (!links) return 'no row';
    return [...links.querySelectorAll('.entry-related-row')].map((r) => `${r.querySelector('.chip')?.textContent.trim()} (${r.querySelector('.entry-reference-how')?.textContent})`);
  })));
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
