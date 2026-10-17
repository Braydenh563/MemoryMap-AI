// Computed styles of the split's halves in each no-model notice.
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
    console.log(name, JSON.stringify(await page.evaluate((s) => {
      const n = document.querySelector(s);
      const f = (el) => { const c = getComputedStyle(el); return { bg: c.backgroundColor, bd: c.borderTopColor, h: c.height, minH: c.minHeight, mt: c.marginTop, disp: c.display, ai: c.alignItems }; };
      const m = n.querySelector('.split-button-main');
      return { hover: m.matches(':hover'), focus: m.matches(':focus-visible'), active: (document.activeElement || {}).id, link: !!document.querySelector('link[href*="offline-split-lazy"]'), split: f(n.querySelector('.ai-offline-split')), main: f(n.querySelector('.split-button-main')), caret: f(n.querySelector('.split-button-caret')), note: f(n) };
    }, sel)));
  }
  await browser.close();
})();
