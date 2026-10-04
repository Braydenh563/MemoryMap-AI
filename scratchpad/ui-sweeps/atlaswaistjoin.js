// Where the feminine Atlas's lower body meets the torso (INBOX 480, the
// owner: "there is two wierd thin string like appendages coming from the
// feminine atlas lower body up top"), drawn very large: the full level at
// 1800px, the band from the chest to the hips cropped, in light and dark.
// Also the companion itself at 4x, per pose. Env: BASE, OUT_DIR, THEME, HIDE.
const fs = require('fs');
const { boot } = require('./lib.js');
const OUT = process.env.OUT_DIR || '/tmp/atlaswaistjoin';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    localStorage.setItem('atlas-look', 'feminine');
    const b = document.getElementById('avatar-buddy'); b.value = 'me'; b.dispatchEvent(new Event('change', { bubbles: true }));
    const host = document.createElement('div');
    host.id = 'waist-big';
    for (const [k, v] of Object.entries({ position: 'fixed', left: '0', top: '-620px', zIndex: '9999', background: 'var(--modal-bg-opaque)' })) host.style[k] = v;
    const live = document.createElement('span'); live.className = 'nm-live';
    live.append(atlasDraw(1800, 'calm', 'full'));
    host.append(live);
    document.body.appendChild(host);
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => { for (const a of document.getElementById('waist-big').getAnimations({ subtree: true })) { a.pause(); a.currentTime = 1500; } });
  await page.screenshot({ path: `${OUT}/waist-full.png`, clip: { x: 300, y: 0, width: 900, height: 700 } });
  await page.evaluate(() => document.getElementById('waist-big').remove());
  await browser.close();
  const second = await boot({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 4 });
  const p2 = second.page;
  await p2.evaluate(() => { localStorage.setItem('atlas-look', 'feminine'); const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true })); });
  await p2.waitForTimeout(2500);
  await p2.evaluate(() => {
    clearTimeout(nmb.timer);
    window.nameMarkBuddySchedule = () => {}; window.nameMarkBuddyTick = () => {};
    window.nameMarkBuddyQueuePlace = () => {}; window.nameMarkBuddyCheck = () => {};
  });
  for (const pose of (process.env.POSES || 'stand,float,sit,lie').split(',')) {
    const box = await p2.evaluate(([pose]) => {
      const buddy = document.getElementById('nm-buddy');
      nameMarkBuddyRide(null, 400, 400);
      nameMarkBuddyMoveTo(buddy, { kind: 'card', pose, legs: '', x: 400, y: 400 }, true);
      const r = buddy.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }, [pose]);
    await p2.waitForTimeout(1200);
    //: HIDE=".a, .b" hides those parts, to find which one draws a line (by
    //: element style: the CSP refuses an injected style sheet).
    if (process.env.HIDE) await p2.evaluate((sel) => { for (const el of document.querySelectorAll(`#nm-buddy :is(${sel})`)) el.style.display = 'none'; }, process.env.HIDE);
    await p2.mouse.move(980, 20);
    await p2.evaluate(() => { for (const a of document.getElementById('nm-buddy').getAnimations({ subtree: true })) { a.pause(); a.currentTime = 1500; } });
    await p2.screenshot({ path: `${OUT}/pose-${pose}.png`, clip: { x: box.x - 30, y: box.y - 20, width: box.w + 60, height: box.h + 50 } });
  }
  await second.browser.close();
  console.log('done', OUT);
})();
