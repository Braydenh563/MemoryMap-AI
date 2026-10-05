// UX-09 (audit 2026-10-05): no selection popup over the tab bar after an Ask.
//   BASE=... node ux1005-askpopup.js
const { boot } = require('./lib');

(async () => {
  const { browser, page } = await boot({});
  await page.evaluate(async () => { await switchTab('notes'); showNotesSection('ask'); });
  await page.waitForTimeout(600);
  await page.fill('#question', 'What have I saved recently?');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  const got = await page.evaluate(() => {
    const q = document.getElementById('question');
    const popups = [...document.querySelectorAll('.selection-popup')].filter((p) => p.offsetParent !== null && !p.classList.contains('hidden'));
    const answer = document.getElementById('ask');
    return {
      selected: [q.selectionStart, q.selectionEnd],
      popups: popups.length,
      answer: (answer?.textContent || '').replace(/\s+/g, ' ').trim().slice(-300),
    };
  });
  console.log(JSON.stringify(got));
  console.log(got.popups ? 'FAIL' : 'ok');
  await browser.close();
  process.exit(got.popups ? 1 : 0);
})();
