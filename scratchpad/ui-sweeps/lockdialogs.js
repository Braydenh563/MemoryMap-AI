// A lock puts away open modal dialogs (they sit in the top layer, above the
// lock screen, and make its password field inert) and an unlock puts them
// back as they were.
//   BASE=http://127.0.0.1:8781 node scratchpad/ui-sweeps/lockdialogs.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  let fails = 0;
  const ok = (name, cond, info) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}  ${info ?? ''}`); if (!cond) fails++; };
  await page.evaluate(() => { const d = document.querySelector('dialog'); d.dataset.probe = '1'; d.showModal(); });
  await page.evaluate(() => showLockScreen(false));
  await page.waitForTimeout(300);
  const locked = await page.evaluate(() => ({
    modal: document.querySelectorAll('dialog:modal').length,
    top: (() => { const i = document.getElementById('lock-password'); const b = i.getBoundingClientRect(); return document.elementFromPoint(b.left + 5, b.top + b.height / 2)?.id; })(),
  }));
  ok('no modal dialog over the lock screen', locked.modal === 0, JSON.stringify(locked));
  ok('the password field is on top', locked.top === 'lock-password', locked.top);
  await page.fill('#lock-password', 'testpassword123');
  await page.click('#lock-submit');
  await page.waitForTimeout(1500);
  const back = await page.evaluate(() => document.querySelector('dialog[data-probe]')?.matches(':modal'));
  ok('the dialog is back after unlocking', back === true, String(back));
  console.log(fails ? `FAILURES: ${fails}` : 'ALL PASS');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
