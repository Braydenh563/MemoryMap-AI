// The pieces moved out of the boot scripts for the gzip budget (2026-10-05):
// each one's stand-in or bundle brings the real function in on first use.
//   BASE=http://127.0.0.1:8793 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/bootbudget-lazy.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const out = await page.evaluate(async () => {
    const r = {};
    r.vaultBefore = [typeof unlockPrivateNotes, typeof ensureVaultOpen];
    // ensureVaultOpen resolves true when the vault is already open, so the
    // real function ran through the stand-in and returned its answer.
    r.vaultAnswer = await ensureVaultOpen();
    r.vaultReal = !String(window.unlockPrivateNotes).includes('ensureModule');
    r.rowBefore = typeof notePickerRow;
    await ensureModule('attachTo');
    r.rowAttach = [typeof notePickerRow, typeof updateNotePickerCount, typeof notePickerThumb];
    await ensureModule('library');
    r.remind = typeof remindAbout;
    await ensureModule('settingsControls');
    r.skill = [typeof chosenSkillVerify, typeof chosenSkillTools];
    return r;
  });
  console.log(JSON.stringify(out), 'pageerrors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
