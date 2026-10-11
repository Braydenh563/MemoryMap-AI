// The Help pane's search field sits under Welcome and tours, above the topics
// it filters (INBOX 871). Measures the order, the gap, the Tab order and
// overflow.   BASE=... W=390 THEME=dark node helpsearchpos.js
const { boot, OUT } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: 900 } });
  await page.getByRole('button', { name: 'Skip for now' }).click({ timeout: 2000 }).catch(() => {});
  await page.evaluate(() => openSettingsModal('help'));
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const top = (s) => document.querySelector(s)?.getBoundingClientRect();
    const card = top('#settings-help .tour-replay'), field = top('#help-search'), topics = top('#help-topics');
    const pane = document.getElementById('settings-help');
    // Tab order: focusable elements of the pane in DOM order.
    const order = [...pane.querySelectorAll('button, input, a[href], summary')].filter((e) => e.offsetParent).slice(0, 40).map((e) => e.id || e.className.split(' ')[0]);
    return {
      cardBottom: Math.round(card.bottom), fieldTop: Math.round(field.top), fieldBottom: Math.round(field.bottom), topicsTop: Math.round(topics.top),
      gapAbove: Math.round(field.top - card.bottom), gapBelow: Math.round(topics.top - field.bottom),
      searchIndex: order.indexOf('help-search'), lastTourIndex: order.lastIndexOf('tour-start-btn'), manualIndex: order.indexOf('help-open-manual'),
      paneOverflow: pane.scrollWidth > pane.clientWidth, pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  console.log(JSON.stringify(r));
  await page.fill('#help-search', 'connect'); await page.waitForTimeout(500);
  console.log(await page.textContent('#help-search-status'));
  await page.screenshot({ path: `${OUT}/helpsearchpos-${W}-${process.env.THEME || 'light'}.png` });
  await browser.close();
})();
