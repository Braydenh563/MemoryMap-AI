// Settings after every listener inside the window moved to
// settings-controls.js (2026-10-05): the first open loads the file before the
// window shows, every pane opens without a page error, and a few moved
// listeners from different source files still act.
//   BASE=http://127.0.0.1:8824 node scratchpad/ui-sweeps/split1005-settings.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const r = {};
  r.before = await page.evaluate(() => typeof SETTINGS_CONTROLS_READY);
  // The window must be open synchronously on every open after the first.
  await page.evaluate(() => { openSettingsModal('models'); });
  await page.waitForFunction(() => !document.getElementById('settings-modal').classList.contains('hidden'), null, { timeout: 8000 });
  r.afterFirst = await page.evaluate(() => typeof SETTINGS_CONTROLS_READY);
  await page.waitForTimeout(1500);
  const sections = await page.evaluate(() => [...document.querySelectorAll('#settings-nav [data-section], #settings-nav button')].map((b) => b.dataset.section || b.id).filter(Boolean));
  r.sections = sections.length;
  for (const s of sections) {
    await page.evaluate((name) => { openSettingsModal(name); }, s);
    await page.waitForTimeout(350);
  }
  // Second open is synchronous.
  r.syncSecondOpen = await page.evaluate(() => {
    closeSettingsModal();
    openSettingsModal('searchindex');
    return !document.getElementById('settings-modal').classList.contains('hidden');
  });
  await page.waitForTimeout(800);
  // wiring.js / settings-wiring.js / phone-shell.js listeners
  const puts = [];
  page.on('request', (q) => { if (q.method() === 'PUT' && q.url().includes('/preferences')) puts.push(q.url()); });
  await page.evaluate(() => { document.getElementById('pref-search-min-sim').value = 0.9; });
  await page.click('#pref-search-reset');
  await page.waitForTimeout(800);
  r.resetValue = await page.evaluate(() => document.getElementById('pref-search-min-sim').value);
  r.putOnReset = puts.length;
  await page.evaluate(() => openSettingsModal('about'));
  await page.waitForTimeout(500);
  await page.click('#update-check-now');
  await page.waitForTimeout(1200);
  r.updateStatus = await page.evaluate(() => document.getElementById('update-check-status').textContent);
  await page.evaluate(() => openSettingsModal('data'));
  await page.waitForTimeout(500);
  const chooser = page.waitForEvent('filechooser', { timeout: 4000 }).then(() => true).catch(() => false);
  await page.click('#import-md');
  r.importOpensPicker = await chooser;
  const dl = page.waitForEvent('download', { timeout: 6000 }).then((d) => d.suggestedFilename()).catch(() => null);
  await page.click('#export-json');
  r.exportJson = await dl;
  // Escape closes it.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  r.closed = await page.evaluate(() => document.getElementById('settings-modal').classList.contains('hidden'));
  console.log(JSON.stringify(r));
  await browser.close();
})();
