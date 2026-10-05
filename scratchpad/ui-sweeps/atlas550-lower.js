// INBOX 554: the feminine lower body alone (the wisps, the band and the
// comet tail hidden), at 6x, light. Writes $SCRATCH/shots/atlas550-lower-<tag>.png.
const { boot } = require('./lib.js');
const TAG = process.env.TAG || 'now';
(async () => {
  const { browser, page, OUT } = await boot({ viewport: { width: 520, height: 700 }, scale: 6 });
  await page.evaluate(() => {
    document.documentElement.dataset.avatarMotion = 'off';
    localStorage.setItem('atlas-look', 'feminine');
    const box = document.createElement('div'); box.id = 'a550-box';
    Object.assign(box.style, { position: 'fixed', left: '0', top: '0', width: '160px', height: '170px', zIndex: '9999', overflow: 'hidden', background: '#f3f4fa' });
    const holder = document.createElement('div'); holder.id = 'nm-buddy';
    Object.assign(holder.style, { position: 'absolute', left: '40px', top: '40px', width: '64px', height: '92px' });
    const fig = atlasFigure(); Object.assign(fig.style, { position: 'relative', display: 'block', width: '64px', height: '92px' });
    holder.append(fig); box.append(holder); document.body.append(box);
    for (const el of box.querySelectorAll('*')) el.style.animation = 'none';
    for (const el of box.querySelectorAll('.atl-lw-wisps, [class*="atl-lw-glint"], .atl-lw-wisps-back, .atl-lw-neb, .atl-lw-neb-front, .atl-lw-tail, .atl-orbits')) el.style.visibility = 'hidden';
  });
  await page.waitForTimeout(1200);
  const p = `${OUT}/atlas550-lower-${TAG}.png`;
  await (await page.$('#a550-box')).screenshot({ path: p });
  console.log(p);
  await browser.close();
})();
