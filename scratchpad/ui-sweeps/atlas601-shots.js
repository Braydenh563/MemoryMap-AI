// INBOX 601: Atlas's large view, each look, at 3x, held at T ms (default
// 0, every loop at its start) for looking at the tail's join, the rings
// and the planets. Shots: shots/atlas601-<look>-<theme>-<T>.png.
//   BASE=... LOOKS=masculine,feminine T=0,2000 THEME=dark node atlas601-shots.js
const { boot, OUT } = require('./lib.js');
(async () => {
  for (const look of (process.env.LOOKS || 'masculine,feminine').split(',')) {
    const { browser, page } = await boot({ viewport: { width: 1280, height: 800 }, scale: 3 });
    await page.evaluate((look) => { localStorage.setItem('atlas-look', look); document.documentElement.dataset.avatarMotion = 'always'; }, look);
    await page.evaluate(() => openNameMarkViewer('Atlas'));
    for (const T of (process.env.T || '0').split(',').map(Number)) {
      await page.waitForTimeout(T ? T : 1200);
      const box = await page.evaluate(() => { const r = document.querySelector('.nm-viewer-figure').getBoundingClientRect(); return { x: r.left - 40, y: r.top - 30, width: r.width + 80, height: r.height + 60 }; });
      await page.screenshot({ path: `${OUT}/atlas601-${look}-${process.env.THEME || 'light'}-${T}.png`, clip: box });
    }
    await browser.close();
  }
})();
