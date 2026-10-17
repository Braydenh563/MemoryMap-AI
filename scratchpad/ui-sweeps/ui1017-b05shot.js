// Element screenshots of the no-model notices (ui1017-b05.js measures them).
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 390);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { prefs.set('hideOfflineNotice', 'off'); });
  for (const [name, go, sel] of [
    ['ask', () => page.evaluate(() => { switchTab('notes'); showNotesSection('ask'); }), '#ask-offline'],
    ['chat', () => page.evaluate(() => switchTab('chat')), '#chat-offline'],
  ]) {
    await go();
    await page.waitForTimeout(1800);
    await page.locator(sel).screenshot({ path: `${process.env.SCRATCH || '.'}/b05-${name}-${W}.png` });
    console.log(name, JSON.stringify(await page.evaluate((s) => { const n = document.querySelector(s); return [...n.children].map((c) => [c.className.slice(0, 30), Math.round(c.getBoundingClientRect().width), Math.round(c.getBoundingClientRect().height)]); }, sel)));
  }
  await browser.close();
})();
