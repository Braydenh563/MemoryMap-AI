// Renders the companion figure at 6x in several poses and moods, both
// looks, for a look (INBOX 550). Writes $SCRATCH/shots/atlas550-<tag>-*.png.
// ACT=nmb-act-wave (or nmb-walking) adds that class to the companion's box.
//   BASE=... THEME=light|dark TAG=before SCRATCH=... node atlas550-render.js
const { boot } = require('./lib.js');
const THEME = process.env.THEME || 'light';
const TAG = process.env.TAG || 'now';
const POSES = (process.env.POSES || 'stand,sit,float,lie,curl').split(',');
const MOODS = (process.env.MOODS || 'calm,happy,love').split(',');
const LOOKS = (process.env.LOOKS || 'feminine').split(',');
(async () => {
  const { browser, page, OUT } = await boot({ viewport: { width: 520, height: 700 }, scale: 6 });
  for (const look of LOOKS) {
    for (const pose of POSES) {
      for (const mood of (pose === 'stand' ? MOODS : ['calm'])) {
        await page.evaluate(({ look, pose, mood, act }) => {
          document.documentElement.dataset.avatarMotion = 'off';
          localStorage.setItem('atlas-look', look);
          document.getElementById('a550-box')?.remove();
          document.getElementById('nm-buddy')?.remove();
          const box = document.createElement('div'); box.id = 'a550-box';
          Object.assign(box.style, { position: 'fixed', left: '0', top: '0', width: '160px', height: '170px', zIndex: '9999', overflow: 'hidden' });
          box.style.background = document.documentElement.dataset.theme === 'dark' ? '#16162a' : '#f3f4fa';
          try { atlasMoodNow = mood; } catch (e) {}
          const holder = document.createElement('div'); holder.id = 'nm-buddy';
          Object.assign(holder.style, { position: 'absolute', left: '40px', top: '40px', width: '64px', height: '92px' });
          if (pose !== 'stand') holder.dataset.pose = pose;
          if (act) holder.classList.add(act);
          const fig = atlasFigure(); Object.assign(fig.style, { position: 'relative', display: 'block', width: '64px', height: '92px' });
          holder.append(fig); box.append(holder); document.body.append(box);
          for (const svg of fig.querySelectorAll('svg')) atlasApply(svg, mood);
          for (const el of box.querySelectorAll('*')) el.style.animation = 'none';
        }, { look, pose, mood, act: process.env.ACT || '' });
        await page.waitForTimeout(1400);
        const el = await page.$('#a550-box');
        const p = `${OUT}/atlas550-${TAG}-${THEME}-${look}-${pose}-${mood}${process.env.ACT ? '-' + process.env.ACT : ''}.png`;
        await el.screenshot({ path: p });
        console.log(p);
      }
    }
  }
  await page.evaluate(() => localStorage.removeItem('atlas-look'));
  await browser.close();
})();
