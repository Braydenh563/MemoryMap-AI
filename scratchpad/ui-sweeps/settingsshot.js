// Screenshots of Settings sections, for a before/after.
//   BASE=... THEME=dark SECTIONS=general,preferences OUT=/tmp/x PREFIX=426r3- node settingsshot.js
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: 900 } });
  if (process.env.LS) {
    await page.evaluate((ls) => { for (const [k, v] of Object.entries(JSON.parse(ls))) localStorage.setItem(k, v); }, process.env.LS);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    if (await page.isVisible('#lock-password').catch(() => false)) {
      await page.fill('#lock-password', 'testpassword123');
      await page.click('#lock-submit');
    }
    await page.waitForTimeout(3000);
  }
  for (const s of (process.env.SECTIONS || 'general').split(',')) {
    const [name, scrollTo] = s.split(':');
    await page.evaluate((x) => openSettingsModal(x), name);
    await page.waitForTimeout(1000);
    if (scrollTo) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        const pane = document.querySelector('#settings-modal .modal-content');
        pane.scrollTop += el.getBoundingClientRect().top - pane.getBoundingClientRect().top - 20;
      }, scrollTo);
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: `${process.env.OUT || '.'}/${process.env.PREFIX || ''}settings-${name}-${W}.png` });
  }
  await browser.close();
})();
