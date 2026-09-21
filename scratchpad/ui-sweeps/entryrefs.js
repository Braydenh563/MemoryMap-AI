// INBOX 246: the "Referenced by" row under a note card, driven from its own
// menu the way a person reaches it.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(4000);
  await page.evaluate(() => { switchTab('notes'); showNotesSection('browse'); });
  await page.waitForTimeout(2500);
  const opened = await page.evaluate(() => {
    const card = [...document.querySelectorAll('#entry-list > li')]
      .find((li) => li.textContent.includes('The roof quote') && li.textContent.includes('Two thousand'));
    if (!card) return 'no card';
    const kebab = [...card.querySelectorAll('button')].find((b) => (b.title || '') === 'More actions');
    if (!kebab) return 'no kebab';
    kebab.click();
    return true;
  });
  await page.waitForTimeout(600);
  const clicked = await page.evaluate(() => {
    const item = [...document.querySelectorAll('.action-menu button, .action-menu [role="menuitem"]')]
      .find((b) => b.textContent.includes('Referenced by'));
    if (!item) return [...document.querySelectorAll('.action-menu button')].map((b) => b.textContent.trim());
    item.click();
    return true;
  });
  await page.waitForTimeout(2500);
  const row = await page.evaluate(() => {
    const card = [...document.querySelectorAll('#entry-list > li')]
      .find((li) => li.textContent.includes('Two thousand'));
    const links = card && [...card.querySelectorAll('.entry-links')].pop();
    if (!links) return 'no row';
    return {
      label: links.querySelector('.muted')?.textContent,
      rows: [...links.querySelectorAll('.entry-related-row')].map((r) => ({
        chip: r.querySelector('.chip')?.textContent.trim(),
        how: r.querySelector('.entry-reference-how')?.textContent,
        title: r.querySelector('.chip')?.title,
      })),
      overflowsCard: links.getBoundingClientRect().right > card.getBoundingClientRect().right + 1,
    };
  });
  console.log('menu:', opened, clicked === true ? 'clicked' : clicked);
  console.log(JSON.stringify(row, null, 1));
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
