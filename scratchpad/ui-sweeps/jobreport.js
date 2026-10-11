// Ledger 1406: Settings, Background jobs shows a Report button on the import row after an import.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => document.getElementById('recovery-key-dialog')?.close());
  const made = await page.evaluate(async () => {
    const zip = await (await api('/export/folder')).blob();
    const fd = new FormData(); fd.append('files', zip, 'notebook.zip');
    const r = await api('/import/app?source=memorymap', { method: 'POST', body: fd });
    return r.status;
  });
  await page.evaluate(() => document.getElementById('settings-btn').click());
  await page.waitForTimeout(800);
  await page.evaluate(() => { const sec = document.getElementById('job-runs-list').closest('.settings-section').id.replace('settings-', ''); document.querySelector(`#settings-modal [data-section="${sec}"]`).click(); document.querySelectorAll('#settings-modal details').forEach((d) => d.open = true); document.getElementById('job-runs-list').scrollIntoView(); refreshJobRuns(); });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const li = [...document.querySelectorAll('#job-runs-list li')].find((x) => x.querySelector('strong').textContent === 'Import');
    const b = li && [...li.querySelectorAll('button')].find((x) => /Report/.test(x.textContent));
    return { found: !!b, h: b && Math.round(b.getBoundingClientRect().height) };
  });
  console.log('import post', made, JSON.stringify(r));
  await browser.close();
})();
