// Screenshot named static overlays / dialogs: node popupshot.js id1 id2
// BASE, W, H, THEME, TAG (file suffix) as in popupinv.js. Output in /tmp/pop18.
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { browser, page } = await boot(W < 600
    ? { viewport: { width: W, height: +(process.env.H || 844) }, hasTouch: true, isMobile: true }
    : { viewport: { width: W, height: +(process.env.H || 900) } });
  for (const id of process.argv.slice(2)) {
    await page.evaluate((i) => { const e = document.getElementById(i); if (e.tagName === 'DIALOG') e.showModal(); else e.classList.remove('hidden'); }, id);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `/tmp/pop18/${id}-${process.env.TAG || 'a'}.png` });
    await page.evaluate((i) => { const e = document.getElementById(i); if (e.tagName === 'DIALOG') e.close(); else e.classList.add('hidden'); }, id);
  }
  await browser.close();
})();
