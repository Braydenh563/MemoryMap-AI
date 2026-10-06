// UX-05 (audit 2026-10-05): "Trip plan", Enter, "Day one" gives the title
// "Trip plan" and a body starting "Day one".  BASE=... node ux1005-doctitle.js
const { boot } = require('./lib');

(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => typeof createDocument === 'function', null, { timeout: 15000 });
  await page.evaluate(async () => { switchTab('documents'); await createDocument(); });
  await page.waitForTimeout(1500);
  await page.focus('#doc-title');
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Trip plan');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Day one: arrive in Lisbon.');
  await page.waitForTimeout(300);
  const got = await page.evaluate(() => ({
    title: document.getElementById('doc-title').value,
    body: (typeof docCmView !== 'undefined' && docCmView) ? docCmView.state.doc.toString() : document.getElementById('doc-content').value,
    focus: document.activeElement?.id || document.activeElement?.className,
  }));
  console.log(JSON.stringify(got));
  const ok = got.title === 'Trip plan' && got.body.startsWith('Day one');
  console.log(ok ? 'ok' : 'FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
