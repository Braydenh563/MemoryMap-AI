// UX-08 (audit 2026-10-05): Ctrl+K finds the bin, Questions, backups, undo and
// the theme by the words people type, and the bin row lands on the bin.
//   BASE=... node ux1005-palette.js
const { boot } = require('./lib');

(async () => {
  const { browser, page } = await boot({});
  const words = ['questions', 'backup', 'undo', 'bin', 'trash', 'theme', 'restore', 'deleted'];
  const found = {};
  for (const word of words) {
    await page.evaluate(() => openPalette());
    await page.fill('#palette-input', word);
    await page.waitForTimeout(250);
    found[word] = await page.evaluate(() => [...document.querySelectorAll('#palette-list [role="option"], #palette-list .rich-picker-row')]
      .slice(0, 3).map((r) => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 50)));
    await page.keyboard.press('Escape');
  }
  console.log(JSON.stringify(found, null, 1));
  await page.evaluate(() => openPalette());
  await page.fill('#palette-input', 'trash');
  await page.waitForTimeout(250);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  const bin = await page.evaluate(() => ({
    tab: localStorage.getItem('activeTab'),
    checked: document.getElementById('library-show-binned')?.checked,
  }));
  console.log(JSON.stringify(bin));
  await page.evaluate(() => openPalette());
  await page.fill('#palette-input', 'questions');
  await page.waitForTimeout(250);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  const q = await page.evaluate(() => ({ visible: !!document.getElementById('questions')?.offsetParent }));
  console.log(JSON.stringify(q));
  const ok = words.every((w) => found[w].length) && bin.tab === 'library' && bin.checked && q.visible;
  console.log(ok ? 'ok' : 'FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
