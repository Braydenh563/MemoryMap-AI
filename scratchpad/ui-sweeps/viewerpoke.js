// The large view's figure keeps its size (the owner: "when I click on atlas
// in the larger view window sometimes it shrinks for a sec then expands back
// to full height after the animation is finished"). Opens the large view of
// Atlas and reads the drawn figure's height every frame: after a click on
// it, and through each mood whose loop moves the whole body (delighted,
// laughing, sleepy, love, confused), which is what a poke can set going. A
// mood may lift, tilt or squash it a little; its size must stay within 8%
// of the range it breathes through at rest.
//
//   BASE=http://127.0.0.1:8830 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/viewerpoke.js        (RM=reduce; exits 1)
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 }, reducedMotion: process.env.RM || 'no-preference' });
  const rows = [];
  let rest = { min: 0, max: 0 };
  try {
    //: Performance mode turns itself on for a machine of 2 cores or 4 GB
    //: (this sandbox), and it stills every face, which would hide the very
    //: thing measured here. Off, as on the owner's machine.
    const motion = await page.evaluate(() => {
      localStorage.setItem('perf', 'off');
      applyAppearance();
      return document.documentElement.dataset.motion;
    });
    if (motion === 'reduced') console.log('note: motion is reduced, the mood loops will not run');
    await page.evaluate(() => openNameMarkViewer('Atlas'));
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      const fig = document.querySelector('.nm-viewer-figure');
      //: The union of the drawn parts, so a squash or a shrink of any group
      //: shows, whatever element carries it.
      window.__drawn = () => {
        let top = Infinity;
        let bottom = -Infinity;
        for (const el of fig.querySelectorAll('path, circle, ellipse, rect, polygon, line, use')) {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          top = Math.min(top, r.top);
          bottom = Math.max(bottom, r.bottom);
        }
        return bottom - top;
      };
      window.__watch = (ms) => new Promise((resolve) => {
        const hs = [];
        const start = performance.now();
        const tick = () => {
          hs.push(window.__drawn());
          if (performance.now() - start < ms) requestAnimationFrame(tick);
          else resolve({ min: Math.round(Math.min(...hs)), max: Math.round(Math.max(...hs)), frames: hs.length });
        };
        requestAnimationFrame(tick);
      });
    });
    //: At rest it breathes and sways, so rest is a range, read over a second.
    rest = await page.evaluate(() => window.__watch(1000));
    const watching = page.evaluate(() => window.__watch(1100));
    await page.click('.nm-viewer-stage');
    rows.push({ what: 'click', ...(await watching) });
    for (const mood of ['delighted', 'laughing', 'sleepy', 'love', 'confused']) {
      const got = await page.evaluate(async (m) => {
        const box = document.querySelector('.nm-viewer-figure > .atl-figure-box');
        if (!box) return { min: 0, max: 0, frames: 0, note: 'no figure box' };
        box.dataset.atlasMood = m;
        const r = await window.__watch(m === 'sleepy' ? 2400 : 1300);
        delete box.dataset.atlasMood;
        return r;
      }, mood);
      rows.push({ what: mood, ...got });
    }
  } finally {
    await browser.close();
  }
  let failed = 0;
  for (const row of rows) {
    const ok = row.min >= rest.min * 0.92 && row.max <= rest.max * 1.08;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${row.what}: height ${row.min} to ${row.max} (rest ${rest.min} to ${rest.max}, ${row.frames} frames)`);
  }
  console.log(failed ? `FAIL ${failed}` : 'PASS');
  process.exitCode = failed ? 1 : 0;
})();
