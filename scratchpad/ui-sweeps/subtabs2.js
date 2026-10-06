// INBOX 522: hover, focus and scrolled states of a .tabs-line strip.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.click('#tab-btn-library'); await page.waitForTimeout(600);
  const b = page.locator('#library-subtabs button:not(.active)').first();
  await b.hover(); await page.waitForTimeout(300);
  console.log('hover', await b.evaluate((e) => { const c = getComputedStyle(e); return [c.color, c.backgroundColor]; }));
  await page.mouse.move(700, 500);
  await b.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  console.log('focus', await b.evaluate((e) => { const c = getComputedStyle(e); return [document.activeElement === e, c.outlineStyle, c.outlineWidth, c.outlineColor]; }));
  await page.evaluate(() => document.getElementById('library-subtabs').setAttribute('data-scrolled', '1'));
  console.log('scrolled', await page.evaluate(() => { const c = getComputedStyle(document.getElementById('library-subtabs')); return [c.backgroundColor, c.backdropFilter, c.boxShadow.slice(0, 80)]; }));
  await page.screenshot({ path: '/tmp/mm-t9/shots/subtabs-states.png', clip: { x: 0, y: 60, width: 1440, height: 70 } });
  await browser.close();
})();
