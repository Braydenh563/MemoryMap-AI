// The Atlas guide panel's own '?' (INBOX 431: "its '?' button does
// nothing"). Not reproduced: opened from the status bar (desktop, >=680)
// and from the phone's More sheet (390), light and dark, the '?'
// (`[data-help-for="help-chat-help"]`, moved into the sheet head by
// `openHelpChat`, settings.js) opens `#help-chat-help` through the same
// `wireHelpPopover` (menus.js) every other help toggle in the app uses.
// Kept as a sweep rather than dropped: a regression here would be exactly
// this report again, and the check is cheap (no model, no chat turn).
const { boot } = require('./lib.js');

async function checkGuideHelp(page, openGuide) {
  await openGuide();
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => {
    const sheet = document.querySelector('[data-sheet="guide"]');
    const toggle = document.querySelector('[data-help-for="help-chat-help"]');
    return {
      sheetPresent: !!sheet,
      toggleInSheet: Boolean(sheet && toggle && sheet.contains(toggle)),
      toggleVisible: Boolean(toggle && toggle.getClientRects().length),
    };
  });
  if (!before.sheetPresent) return { ok: false, reason: 'guide sheet did not open' };
  if (!before.toggleInSheet) return { ok: false, reason: "the '?' toggle is not inside the open sheet" };
  if (!before.toggleVisible) return { ok: false, reason: "the '?' toggle has no layout box (invisible)" };

  await page.click('[data-help-for="help-chat-help"]');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => {
    const panel = document.getElementById('help-chat-help');
    const r = panel.getBoundingClientRect();
    return { hidden: panel.classList.contains('hidden'), width: r.width, height: r.height };
  });
  if (after.hidden || after.width < 20 || after.height < 20) {
    return { ok: false, reason: `popover did not open (hidden=${after.hidden}, ${after.width}x${after.height})` };
  }
  return { ok: true };
}

(async () => {
  const errors = [];
  const results = {};

  {
    const { page, browser } = await boot({ viewport: { width: 1093, height: 700 } });
    page.on('pageerror', (e) => errors.push('desktop: ' + String(e).slice(0, 160)));
    await page.waitForTimeout(800);
    results.desktop = await checkGuideHelp(page, () => page.click('#status-guide'));
    await browser.close();
  }

  {
    const { page, browser } = await boot({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    page.on('pageerror', (e) => errors.push('phone: ' + String(e).slice(0, 160)));
    await page.waitForTimeout(800);
    results.phone = await checkGuideHelp(page, async () => {
      await page.evaluate(() => openPhoneMoreSheet());
      await page.waitForTimeout(300);
      await page.click('.sheet-list >> text=Guide');
    });
    await browser.close();
  }

  console.log(JSON.stringify({ results, errors }, null, 2));
  const failed = Object.entries(results).filter(([, r]) => !r.ok);
  if (failed.length || errors.length) process.exit(1);
})().catch((e) => { console.error('SWEEP_ERROR', e.message, e.stack); process.exit(1); });
