// The feminine Atlas's gown and brow (INBOX 480), drawn big for a look:
// the `full` level at 420px and the bust at 300px, per look and theme, plus
// the companion's large view per pose (stand, sit, hang, float, lie, curl,
// lean). Animations are paused at AT ms so a before and an after compare.
//   BASE=... OUT_DIR=... THEME=dark AT=1500 REDUCED=1 node atlasgown.js
const fs = require('fs');
const { boot } = require('./lib.js');
const OUT = process.env.OUT_DIR || '/tmp/atlasgown';
const AT = Number(process.env.AT || 1500);
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2, reducedMotion: process.env.REDUCED ? 'reduce' : undefined });
  for (const look of (process.env.LOOKS || 'feminine,masculine').split(',')) {
    await page.evaluate(([look]) => {
      localStorage.setItem('atlas-look', look);
      const b = document.getElementById('avatar-buddy'); b.value = 'me'; b.dispatchEvent(new Event('change', { bubbles: true }));
      document.getElementById('gown-stage')?.remove();
      const stage = document.createElement('div');
      stage.id = 'gown-stage';
      for (const [k, v] of Object.entries({ position: 'fixed', left: '0', top: '0', zIndex: '9999', display: 'flex', gap: '12px', alignItems: 'end', padding: '16px', background: 'var(--modal-bg-opaque)' })) stage.style[k] = v;
      document.body.appendChild(stage);
      const live = document.createElement('span'); live.className = 'nm-live';
      live.appendChild(atlasDraw(420, 'calm', 'full'));
      stage.append(live, atlasDraw(300, 'calm', 'bust'), atlasDraw(64, 'calm', 'head'), atlasDraw(24, 'calm', 'tiny'));
      //: The brow close up (INBOX 480): the head level at 360px, on a row of its own.
      const head = document.createElement('div');
      head.id = 'gown-head';
      for (const [k, v] of Object.entries({ position: 'fixed', left: '0', top: '470px', zIndex: '9999', padding: '8px', background: 'var(--modal-bg-opaque)' })) head.style[k] = v;
      head.append(atlasDraw(360, 'calm', 'head'));
      stage.appendChild(head);
    }, [look]);
    await page.waitForTimeout(800);
    await page.evaluate((AT) => { for (const a of document.getElementById('gown-stage').getAnimations({ subtree: true })) { a.pause(); a.currentTime = AT; } }, AT);
    await page.waitForTimeout(200);
    await page.locator('#gown-head').screenshot({ path: `${OUT}/head-${look.slice(0, 4)}.png` });
    await page.evaluate(() => { document.getElementById('gown-head').style.display = 'none'; });
    await page.locator('#gown-stage').screenshot({ path: `${OUT}/draw-${look.slice(0, 4)}.png` });
    await page.evaluate(() => document.getElementById('gown-stage').remove());
    if (process.env.NOPOSES) continue;
    await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      clearTimeout(nmb.timer);
      window.nameMarkBuddySchedule = () => {}; window.nameMarkBuddyTick = () => {};
      window.nameMarkBuddyQueuePlace = () => {}; window.nameMarkBuddyCheck = () => {};
      window.nameMarkBuddyTempo = () => {}; clearTimeout(nmbTempo.timer); nmbTempo.anims = [];
      window.nameMarkBuddyPickVariant = () => 0;
    });
    for (const pose of (process.env.POSES || 'stand,sit,hang,float,lie,curl,lean').split(',')) {
      const box = await page.evaluate(([pose]) => {
        const buddy = document.getElementById('nm-buddy');
        delete buddy.dataset.lean;
        nameMarkBuddyRide(null, 500, 420);
        const p = pose === 'lean' ? 'stand' : pose;
        nameMarkBuddyMoveTo(buddy, { kind: 'card', pose: p, legs: '', x: 500, y: 420 }, true);
        if (pose === 'lean') { buddy.dataset.pose = 'lean'; buddy.dataset.lean = 'l'; }
        const r = buddy.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      }, [pose]);
      await page.waitForTimeout(1200);
      await page.mouse.move(1100, 80);
      await page.evaluate((AT) => { for (const a of document.getElementById('nm-buddy').getAnimations({ subtree: true })) { a.pause(); a.currentTime = AT; } }, AT);
      await page.waitForTimeout(200);
      const pad = 60;
      await page.screenshot({ path: `${OUT}/pose-${look.slice(0, 4)}-${pose}.png`, clip: { x: box.x - pad, y: box.y - pad, width: box.w + 2 * pad, height: box.h + 2 * pad } });
    }
    await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'me'; b.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(300);
  }
  await browser.close();
  console.log('done', OUT);
})();
