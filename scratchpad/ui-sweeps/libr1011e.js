// libr-1011 row 1226: the Settings switch for keeping the audio of live captions.
const { boot } = require('./lib.js');
const W = Number(process.env.W || 1440);
(async () => {
  const { browser, page } = await boot({ args: ['--disable-dev-shm-usage', '--disable-gpu'], viewport: { width: W, height: W > 800 ? 900 : 844 } });
  const out = { W, theme: process.env.THEME || 'light' };
  await page.evaluate(() => openSettingsModal('general'));
  await page.waitForTimeout(2500);
  out.row = await page.evaluate(async () => {
    await ensureModule('meetings');
    await new Promise((r) => setTimeout(r, 1500));
    const box = document.querySelector('input[data-mic-pref="captionsKeepAudio"]');
    if (!box) return { found: false, hosts: document.querySelectorAll('.mic-controls').length };
    box.scrollIntoView({ block: 'center' });
    const row = box.closest('label');
    const r = row.getBoundingClientRect();
    const sibs = [...row.parentElement.children].filter((c) => c !== row).map((c) => c.getBoundingClientRect());
    const overlap = sibs.some((s) => s.width && s.height && !(s.right <= r.left || s.left >= r.right || s.bottom <= r.top || s.top >= r.bottom));
    const before = box.checked;
    box.click();
    const stored = prefs.bool('captionsKeepAudio', false);
    box.click();
    return { found: true, before, afterClick: stored, restored: prefs.bool('captionsKeepAudio', false), label: row.innerText, w: Math.round(r.width), h: Math.round(r.height), inView: r.left >= 0 && r.right <= innerWidth, overlap, pageOverflow: document.documentElement.scrollWidth > innerWidth };
  });
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/libr1011e-${W}-${out.theme}.png` });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
