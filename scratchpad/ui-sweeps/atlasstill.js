// One look, every pose, animations and transitions off, at 6x: still frames
// for a pixel comparison between two builds ("the masculine look is
// pixel-identical"). Compare with scratchpad/pngpixel.py's read_png.
//   LOOK=masculine TAG=before BASE=... SCRATCH=... node atlasstill.js
const { boot } = require('./lib.js');
const LOOK = process.env.LOOK || 'masculine';
const TAG = process.env.TAG || 'after';
const THEME = process.env.THEME || 'light';
const POSES = (process.env.POSES || 'stand,sit,float,lie-2,lie,curl').split(',');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 600, height: 700 } });
  for (const pose of POSES) {
    await page.evaluate(({ look, pose }) => {
      document.getElementById('atl-still')?.remove();
      localStorage.setItem('atlas-look', look);
      const box = document.createElement('div'); box.id = 'atl-still';
      Object.assign(box.style, { position: 'fixed', left: '0', top: '0', width: '600px', height: '700px', zIndex: '9999', overflow: 'hidden', background: '#808080' });
      document.getElementById('nm-buddy')?.remove();
      const holder = document.createElement('div'); holder.id = 'nm-buddy';
      Object.assign(holder.style, { position: 'absolute', left: '110px', top: '70px', width: '64px', height: '92px', transform: 'scale(6)', transformOrigin: '0 0' });
      const fig = atlasFigure(); Object.assign(fig.style, { position: 'relative', display: 'block', width: '64px', height: '92px' });
      if (pose !== 'stand') holder.dataset.pose = pose;
      for (const el of [holder, ...fig.querySelectorAll('*'), fig]) { el.style.animation = 'none'; el.style.transition = 'none'; }
      holder.append(fig); box.append(holder); document.body.append(box);
    }, { look: LOOK, pose });
    await page.waitForTimeout(700);
    const el = await page.$('#atl-still');
    await el.screenshot({ path: `${process.env.SCRATCH || '.'}/shots/still-${TAG}-${THEME}-${LOOK}-${pose}.png` });
  }
  await page.evaluate(() => localStorage.removeItem('atlas-look'));
  await browser.close();
})();
