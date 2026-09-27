// INBOX 430: the companion shows and hides from anywhere: Ctrl+Shift+Y, the
// command palette and Find anything. Starts with Atlas on, presses the
// chord (gone), again (back as Atlas), then runs the palette's and Find's
// action rows. Exits 1 if any step leaves the companion in the wrong state.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(1500);
  const shown = () => page.evaluate(() => !!document.getElementById('nm-buddy') && localStorage.getItem('avatar-buddy') !== 'off');
  const steps = [];
  steps.push(['start', await shown(), true]);
  await page.mouse.click(700, 450);
  await page.keyboard.press('Control+Shift+Y');
  await page.waitForTimeout(600);
  steps.push(['chord hides', await shown(), false]);
  await page.keyboard.press('Control+Shift+Y');
  await page.waitForTimeout(1200);
  steps.push(['chord shows', await shown(), true]);
  steps.push(['same one back', await page.evaluate(() => localStorage.getItem('avatar-buddy')), 'atlas']);
  // The palette's action.
  await page.keyboard.press('Control+K');
  await page.waitForTimeout(400);
  await page.keyboard.type('show or hide the companion');
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  steps.push(['palette hides', await shown(), false]);
  // Find anything's.
  await page.keyboard.press('Control+P');
  await page.waitForTimeout(400);
  await page.keyboard.type('show or hide the companion');
  await page.waitForTimeout(1200);
  const row = await page.evaluate(() => [...document.querySelectorAll('#finder-results [role="option"], #finder-results li, #finder-results button')].find((el) => /companion/i.test(el.textContent))?.textContent.trim().slice(0, 60) || '');
  steps.push(['find lists it', !!row, true]);
  await page.evaluate(() => { const hit = finderHits.find((h) => h.kind === 'action' && /companion/i.test(h.title)); hit?.run(); });
  await page.waitForTimeout(1200);
  steps.push(['find shows', await shown(), true]);
  let bad = errors.length > 0;
  for (const [name, got, want] of steps) {
    const ok = got === want;
    if (!ok) bad = true;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got}`);
  }
  if (errors.length) console.log('errors:', errors.join(' | '));
  console.log(bad ? 'FAIL' : 'PASS');
  process.exitCode = bad ? 1 : 0;
  await browser.close();
})();
