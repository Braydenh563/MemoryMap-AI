// The Ctrl/Cmd-K palette after its window moved to app-palette.js
// (2026-10-05): the chord loads it, typing filters rows, arrows and Enter run
// a row, Escape and a backdrop click close it, the chord toggles it, and
// Find anything's action rows still see the registry that stayed at boot.
//   BASE=http://127.0.0.1:8824 node scratchpad/ui-sweeps/split1005-palette.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const r = {};
  const open = () => page.evaluate(() => !document.getElementById('palette-overlay').classList.contains('hidden'));
  r.loadedBefore = await page.evaluate(() => typeof renderPalette);
  await page.keyboard.press('Control+k');
  await page.waitForFunction(() => !document.getElementById('palette-overlay').classList.contains('hidden'), null, { timeout: 5000 });
  r.loadedAfter = await page.evaluate(() => typeof renderPalette);
  r.rowsEmpty = await page.evaluate(() => document.querySelectorAll('#palette-list [role="option"], #palette-list li').length);
  await page.keyboard.type('timeline');
  await page.waitForTimeout(400);
  r.rowsTyped = await page.evaluate(() => [...document.querySelectorAll('#palette-list [role="option"], #palette-list li')].map((e) => e.textContent.trim().slice(0, 40)).slice(0, 3));
  r.activeDescendant = await page.evaluate(() => !!document.getElementById('palette-input').getAttribute('aria-activedescendant'));
  r.preview = await page.evaluate(() => !document.getElementById('palette-preview').classList.contains('hidden'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  r.closedByEnter = !(await open());
  r.tabAfterEnter = await page.evaluate(() => document.querySelector('.tab-page:not(.hidden)')?.id);
  // Chord toggles; Escape closes; arrows move.
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(300);
  r.opened2 = await open();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  r.arrowsOk = await page.evaluate(() => paletteIndex);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  r.closedByEscape = !(await open());
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(300);
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(300);
  r.closedByChord = !(await open());
  // Backdrop click.
  await page.evaluate(() => openPalette());
  await page.waitForTimeout(300);
  await page.mouse.click(5, 5);
  await page.waitForTimeout(300);
  r.closedByBackdrop = !(await open());
  // The status bar's Commands button.
  const btn = await page.$('#status-command');
  if (btn && (await btn.isVisible())) {
    await btn.click();
    await page.waitForTimeout(400);
    r.statusButton = await open();
    await page.keyboard.press('Escape');
  } else r.statusButton = 'no button';
  // The registry that stayed at boot, for Find anything.
  r.registry = await page.evaluate(() => paletteCommands().length);
  console.log(JSON.stringify(r));
  await browser.close();
})();
