// The update check and its dialogs after they moved to update-dialogs.js
// (2026-10-05): the stand-ins load the file, a mocked "newer version" answer
// opens the dialog, the source-checkout dialog opens and closes on Escape.
//   BASE=http://127.0.0.1:8824 node scratchpad/ui-sweeps/split1005-updates.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const result = {};
  result.loadedBefore = await page.evaluate(() => typeof showUpdateAvailableDialog);
  await page.route('**/update/check', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ checked: true, update_available: true, latest: '9.9.9', current: '0.0.1', can_auto_apply: false, notes: 'x' }),
    })
  );
  await page.evaluate(() => { localStorage.removeItem('update-seen-version'); });
  await page.evaluate(() => { checkForUpdate(true); });
  await page.waitForSelector('[role="dialog"][aria-label="A new version is available"]', { timeout: 5000 });
  result.loadedAfter = await page.evaluate(() => typeof showUpdateAvailableDialog);
  result.dialogText = await page.evaluate(() => document.querySelector('[role="dialog"][aria-label="A new version is available"]').innerText.slice(0, 80));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  result.availableClosed = !(await page.$('[role="dialog"][aria-label="A new version is available"]'));
  result.seenWritten = await page.evaluate(() => localStorage.getItem('update-seen-version'));
  // Settings -> About "Check now" (not silent): the status line is written.
  await page.evaluate(() => { checkForUpdate(false); });
  await page.waitForTimeout(800);
  result.status = await page.evaluate(() => document.getElementById('update-check-status').textContent);
  await page.evaluate(() => { showSourceUpdatedDialog({ from: '1', to: '2' }); });
  await page.waitForSelector('[role="dialog"][aria-label="MemoryMap AI was updated"]', { timeout: 5000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  result.sourceClosed = !(await page.$('[role="dialog"][aria-label="MemoryMap AI was updated"]'));
  console.log(JSON.stringify(result));
  await browser.close();
})();
