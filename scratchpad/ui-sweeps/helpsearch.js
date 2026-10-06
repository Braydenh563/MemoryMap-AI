// Settings, Help search and emphasis (INBOX 520): type a query, count the
// visible folds, check the marks, the empty state, Esc and the emphasis nodes.
//   BASE=http://127.0.0.1:8803 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node helpsearch.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.click('#settings-btn');
  await page.waitForTimeout(600);
  await page.click('#settings-nav-help');
  await page.waitForSelector('#help-topics details', { timeout: 8000 });
  const stat = () => page.evaluate(() => {
    const vis = (e) => e.getClientRects().length > 0;
    const ds = [...document.querySelectorAll('#help-topics details')];
    const shown = ds.filter(vis);
    return {
      total: ds.length, shown: shown.length, open: shown.filter((d) => d.open).length,
      marks: document.querySelectorAll('#help-topics mark.help-hit').length,
      heads: [...document.querySelectorAll('#help-topics > h3')].filter(vis).length,
      empty: vis(document.getElementById('help-empty')),
      status: document.getElementById('help-search-status').textContent,
      kbd: document.querySelectorAll('#help-topics kbd').length,
      strong: document.querySelectorAll('#help-topics strong').length,
      code: document.querySelectorAll('#help-topics code').length,
      markBg: (() => { const m = document.querySelector('#help-topics mark.help-hit'); return m ? getComputedStyle(m).backgroundColor : null; })(),
    };
  });
  console.log('rest      ', JSON.stringify(await stat()));
  await page.focus('#help-search');
  for (const q of ['dark', 'ctrl+k', 'dark mode', 'zzzqq']) {
    await page.fill('#help-search', q);
    await page.waitForTimeout(150);
    console.log(JSON.stringify(q).padEnd(11), JSON.stringify(await stat()));
  }
  await page.fill('#help-search', 'ctrl');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const after = await stat();
  console.log('after Esc ', JSON.stringify(after), 'value=', await page.inputValue('#help-search'),
    'modalOpen=', await page.evaluate(() => !document.getElementById('settings-modal').classList.contains('hidden')));
  await page.fill('#help-search', 'ctrl');
  await page.waitForTimeout(150);
  await page.screenshot({ path: (process.env.SCRATCH || '.') + '/helpsearch.png' });
  console.log('errors', JSON.stringify(errs));
  await browser.close();
})();
