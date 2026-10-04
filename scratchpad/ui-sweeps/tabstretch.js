// INBOX 522: the top tab bar right after reload and unlock.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 }, deviceScaleFactor: Number(process.env.DPR || 1) });
  const m = () => page.evaluate(() => {
    const bar = document.getElementById('tab-bar'); const b = bar.getBoundingClientRect();
    const btns = [...bar.querySelectorAll('button[data-tab]')].filter((x) => x.offsetParent);
    const f = btns[0].getBoundingClientRect(), l = btns[btns.length - 1].getBoundingClientRect();
    const s = getComputedStyle(bar);
    return { bar: [Math.round(b.x), Math.round(b.width)], first: Math.round(f.x - b.x), lastGap: Math.round(b.right - l.right), jc: s.justifyContent, flex: s.flex, w: s.width, ind: (() => { const i = bar.querySelector('[class*="glide"],[class*="indicator"]'); return i && [i.className, Math.round(i.getBoundingClientRect().width)]; })() };
  });
  console.log('booted', JSON.stringify(await m()));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300); console.log('lock', JSON.stringify(await m()));
  await page.fill('#lock-password', 'testpassword123').catch(() => {}); await page.click('#lock-submit').catch(() => {});
  for (const t of [100, 600, 2500]) { await page.waitForTimeout(t); console.log('after unlock +' + t, JSON.stringify(await m())); }
  await browser.close();
})();
