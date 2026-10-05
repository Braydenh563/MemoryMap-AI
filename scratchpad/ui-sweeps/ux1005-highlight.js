// UX-19 (audit 2026-10-05): "Highlight in a colour…" offers the colours to
// pick, rather than asking for a colour's name.   BASE=... node ux1005-highlight.js
const { boot } = require('./lib');

(async () => {
  const { browser, page } = await boot({});
  await page.evaluate(async () => { await switchTab('dashboard'); });
  await page.waitForTimeout(1500);
  const box = page.locator('textarea[aria-label="Quick capture"]').first();
  await box.click();
  await page.keyboard.type('pick up the parcel');
  await page.keyboard.press('Shift+Home');
  await page.mouse.up();
  await page.waitForTimeout(700);
  const opener = page.locator('.selection-popup button[aria-label="Actions for the selected text"]').first();
  const shown = await opener.isVisible().catch(() => false);
  let colours = [];
  let value = '';
  if (shown) {
    await opener.click();
    await page.waitForTimeout(300);
    await page.locator('.action-menu:not(.hidden) button', { hasText: 'Highlight in a colour' }).first().click();
    await page.waitForTimeout(400);
    colours = await page.evaluate(() => [...document.querySelectorAll('.action-menu:not(.hidden) button')].map((b) => b.textContent.trim()));
    const dialog = await page.evaluate(() => !!document.querySelector('.modal-overlay:not(.hidden) input'));
    await page.locator('.action-menu:not(.hidden) button', { hasText: 'Green' }).first().click();
    await page.waitForTimeout(300);
    value = await box.inputValue();
    console.log(JSON.stringify({ shown, colours, typedDialog: dialog, value }));
  } else {
    console.log(JSON.stringify({ shown }));
  }
  const ok = shown && colours.join(',') === 'Green,Blue,Pink,Purple,Orange' && value === '==green|pick up the parcel==';
  console.log(ok ? 'ok' : 'FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
