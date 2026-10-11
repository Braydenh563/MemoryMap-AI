// Settings, About, Maintenance (aboutkit, 2026-10-11): the group fits at
// 1440 and 390, Check this computer draws its rows inside the group, the
// uninstall dialog fits, and a phone (another device) sees the refusal with
// the buttons off.
//   BASE=http://127.0.0.1:8892 THEME=dark node scratchpad/ui-sweeps/maintenance.js
const { boot: libBoot } = require('./lib.js');

//: A fresh data dir offers the recovery key once; it is not what is measured.
async function boot(opts) {
  const booted = await libBoot(opts);
  await booted.page.evaluate(() => document.getElementById('recovery-key-skip')?.click());
  await booted.page.evaluate(() => { const d = document.getElementById('recovery-key-dialog'); if (d && d.open) d.close(); });
  return booted;
}

async function measure(phone) {
  const opts = phone ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : {};
  const { browser, page } = await boot(opts);
  const out = { width: phone ? 390 : 1440, theme: process.env.THEME || 'light' };
  await page.evaluate(() => openSettingsModal('about'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('maintenance-group').scrollIntoView());
  const fit = () => page.evaluate(() => {
    const group = document.getElementById('maintenance-group');
    const g = group.getBoundingClientRect();
    const past = [...group.querySelectorAll('button, .setting-row, .setting-control, small, p')]
      .filter((el) => el.offsetParent)
      .map((el) => [el.id || el.className, Math.round(el.getBoundingClientRect().right - g.right)])
      .filter(([, over]) => over > 0.5);
    return {
      group: [Math.round(g.width), Math.round(group.scrollWidth - group.clientWidth)],
      page: document.documentElement.scrollWidth - innerWidth,
      buttons: [...document.querySelectorAll('#maintenance-actions button')].filter((b) => b.offsetParent)
        .map((b) => [b.textContent.trim(), Math.round(b.getBoundingClientRect().height), b.disabled]),
      past,
    };
  });
  out.before = await fit();
  await page.click('#maintenance-doctor');
  await page.waitForFunction(() => document.querySelectorAll('#maintenance-doctor-rows .doctor-row').length > 0, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  out.after = await fit();
  out.rows = await page.evaluate(() => [...document.querySelectorAll('#maintenance-doctor-rows .doctor-row')].map((row) => {
    const mark = row.querySelector('.doctor-mark');
    return [row.querySelector('.setting-label > span').textContent.trim(), mark.getAttribute('aria-label'), getComputedStyle(mark).color];
  }));
  out.status = await page.textContent('#maintenance-status');
  await page.click('#maintenance-uninstall');
  await page.waitForSelector('.uninstall-card');
  out.uninstall = await page.evaluate(() => {
    const card = document.querySelector('.uninstall-card');
    const c = card.getBoundingClientRect();
    return {
      card: [Math.round(c.left), Math.round(c.right), innerWidth, card.scrollWidth - card.clientWidth],
      steps: card.querySelectorAll('.uninstall-steps li').length,
      command: card.querySelector('.uninstall-command')?.textContent || '',
      copy: !!card.querySelector('.uninstall-command-row button'),
      foot: [...card.querySelectorAll('.confirm-actions button')].map((b) => b.textContent.trim()),
    };
  });
  await page.keyboard.press('Escape');
  out.uninstallClosed = await page.evaluate(() => !document.querySelector('.uninstall-card'));
  await browser.close();
  return out;
}

async function phoneRefusal() {
  const { browser, page } = await boot({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  //: Another device, as the server tells it: a forwarded address.
  await page.route('**/system/**', (route) => route.continue({
    headers: { ...route.request().headers(), 'x-forwarded-for': '192.168.0.50' },
  }));
  await page.evaluate(() => openSettingsModal('about'));
  await page.waitForTimeout(1500);
  const out = await page.evaluate(() => ({
    status: document.getElementById('maintenance-status').textContent,
    disabled: [...document.querySelectorAll('#maintenance-actions button')].every((b) => b.disabled),
  }));
  await browser.close();
  return out;
}

(async () => {
  for (const phone of [false, true]) console.log(JSON.stringify(await measure(phone)));
  console.log('refusal', JSON.stringify(await phoneRefusal()));
})().catch((e) => { console.error(e); process.exit(1); });
