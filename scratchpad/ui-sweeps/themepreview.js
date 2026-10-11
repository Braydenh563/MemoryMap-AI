// Ledger 1451/1452: hovering a theme card previews it; leaving restores; Surprise me picks another.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => document.getElementById('recovery-key-dialog')?.close());
  await page.evaluate(() => document.getElementById('settings-btn').click());
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('#settings-modal [data-section="appearance"]').click());
  await page.waitForTimeout(500);
  await page.evaluate(() => { for (const d of document.querySelectorAll('#settings-modal details')) d.open = true; });
  const snap = () => page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return { preset: document.documentElement.dataset.themePreset, accent: cs.getPropertyValue('--accent').trim(), bg: getComputedStyle(document.body).backgroundColor, stored: localStorage.getItem('themePreset') };
  });
  const before = await snap();
  const names = await page.$$eval('#theme-presets .theme-card', (c) => c.map((x) => x.dataset.preset));
  const target = names.find((n) => n !== before.preset);
  const card = page.locator(`#theme-presets .theme-card[data-preset="${target}"]`);
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  await page.waitForTimeout(500);
  const during = await snap();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(400);
  const after = await snap();
  console.log('before', before, '\nduring', during, '\nafter', after);
  console.log('hover changed preset:', during.preset === target, 'stored untouched:', during.stored === before.stored, 'restored:', after.preset === before.preset && after.accent === before.accent);
  await page.locator('#theme-surprise').scrollIntoViewIfNeeded();
  await page.click('#theme-surprise');
  await page.waitForTimeout(500);
  const s = await snap();
  console.log('surprise', s, 'changed:', s.stored && s.stored !== before.preset);
  await browser.close();
})();
