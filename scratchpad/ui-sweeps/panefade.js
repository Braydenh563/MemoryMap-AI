// Ledger 1420: a Settings section fades in on switch (CSS only). Samples opacity right after the click.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => document.getElementById('recovery-key-dialog')?.close());
  await page.evaluate(() => document.getElementById('settings-btn').click());
  await page.waitForTimeout(800);
  const r = await page.evaluate(async () => {
    document.querySelector('#settings-modal [data-section="appearance"]').click();
    const el = document.getElementById('settings-appearance');
    const out = { motion: document.documentElement.dataset.uiMotion, anim: getComputedStyle(el).animationName, dur: getComputedStyle(el).animationDuration, samples: [] };
    for (let i = 0; i < 4; i++) { out.samples.push(+(+getComputedStyle(el).opacity).toFixed(2)); await new Promise((r) => setTimeout(r, 60)); }
    return out;
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
