// Settings > Logs: request lines hidden unless "Show request lines" is on (INBOX 472).
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => { openSettingsModal('logs'); });
  await page.waitForTimeout(2500);
  const read = () => page.evaluate(() => {
    const rows = [...document.querySelectorAll('#settings-modal .log-line')].map((r) => r.textContent);
    return { rows: rows.length, access: rows.filter((t) => /HTTP\/1\.1"/.test(t)).length };
  });
  const off = await read();
  await page.evaluate(() => { const b = document.getElementById('log-requests'); b.checked = true; b.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(500);
  const on = await read();
  console.log(JSON.stringify({ off, on }));
  console.log(off.access === 0 && on.access > 0 ? 'PASS request lines hidden by default, shown on demand' : 'FAIL');
  await browser.close();
})();
