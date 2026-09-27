// Settings, Account and security: "Allow other devices on this network".
//
//   BASE=http://127.0.0.1:8847 node scratchpad/ui-sweeps/lanaccess.js   (W=390 for a phone)
//
// Drives the switch the way a person would: on asks for the password through
// the lock card, a wrong one is said beside the field and changes nothing,
// the right one turns it on and the line under the switch says a restart is
// needed and which address to open; off asks for nothing and says the same.
const { boot } = require('./lib.js');
const fs = require('fs');

(async () => {
  const W = Number(process.env.W || 1440);
  const shots = process.env.SHOTS || '.';
  fs.mkdirSync(shots, { recursive: true });
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const out = [];
  const check = (name, ok, detail = '') => out.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`);
  const state = () => page.evaluate(() => ({
    checked: document.getElementById('account-allow-lan').checked,
    line: document.getElementById('account-lan-state').classList.contains('hidden') ? '' : document.getElementById('account-lan-state').textContent.trim(),
  }));
  await page.evaluate(() => openSettingsModal('account'));
  await page.waitForTimeout(1200);
  check('starts off', !(await state()).checked, JSON.stringify(await state()));
  await page.click('#account-allow-lan', { force: true });
  await page.waitForTimeout(500);
  const prompt = await page.evaluate(() => ({
    mode: document.getElementById('lock-overlay').dataset.mode,
    title: document.getElementById('lock-title').textContent,
  }));
  check('asks for the password', prompt.mode === 'prompt', JSON.stringify(prompt));
  await page.fill('#lock-password', 'not the password');
  await page.click('#lock-submit');
  await page.waitForTimeout(800);
  const wrong = await page.evaluate(() => document.getElementById('lock-error').textContent);
  check('a wrong password is said beside the field', wrong.length > 0, wrong);
  check('and changes nothing', !(await state()).checked);
  await page.fill('#lock-password', 'testpassword123');
  await page.click('#lock-submit');
  await page.waitForTimeout(1200);
  const on = await state();
  check('on, with a restart line', on.checked && /Restart the app/.test(on.line), JSON.stringify(on));
  await page.evaluate(() => document.getElementById('account-allow-lan').closest('.settings-group').scrollIntoView());
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shots}/lan-on-${W}.png` });
  await page.click('#account-allow-lan', { force: true });
  await page.waitForTimeout(1200);
  const off = await state();
  const promptAgain = await page.evaluate(() => !document.getElementById('lock-overlay').classList.contains('hidden'));
  check('off asks for nothing', !promptAgain && !off.checked, JSON.stringify(off));
  console.log(out.join('\n'));
  await browser.close();
})();
