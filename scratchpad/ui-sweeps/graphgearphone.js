// INBOX 885: tapping the graph settings gear on a phone must not leave the
// Layout select focused (which opens its picker). Prints the focused element
// 100 and 600 ms after the tap; FAIL when it is a select.
//
//   BASE=http://127.0.0.1:8941 node scratchpad/ui-sweeps/graphgearphone.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(4000);
  const fails = [];
  await page.tap('#graph-options-toggle');
  for (const t of [100, 500]) {
    await page.waitForTimeout(t);
    const a = await page.evaluate(() => { const e = document.activeElement; return { tag: e.tagName, id: e.id, inSheet: !!e.closest('.sheet-card') }; });
    console.log('after', t, JSON.stringify(a));
    if (a.tag === 'SELECT') fails.push('a select holds focus at ' + t);
    if (!a.inSheet) fails.push('focus is not inside the sheet at ' + t);
  }
  console.log(fails.length ? 'FAIL ' + fails.join('; ') : 'OK');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
