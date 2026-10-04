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
  //: **The join, measured** (INBOX 535: "make sure it actually looks joined
  //: to the body and that the corners and hard edges dont show"): with the
  //: constellation, the wisps and the nebula hidden (they cross the waist
  //: on purpose), each of five vertical lines through the waist and hips,
  //: figure y 46 to 72, inside the waist's width (27.5 to 34.5, so no line
  //: crosses the figure's own outline, which is an edge on purpose), is
  //: read pixel by pixel; the largest change between
  //: two neighbouring pixels, as a share of full scale, is the step. A seam
  //: or a box edge is a step of most of the line's range in a pixel or two;
  //: a fade is a level or two. Fails over 10%.
  const profile = await page.evaluate(async () => {
    const svg = document.querySelector('#waist-big svg');
    for (const el of svg.querySelectorAll('.atl-core, .atl-astral, .atl-band, .atl-orbits, .atl-ring, .atl-tail, .nmb-arm, .atl-seeds, .atl-sparkle, .atl-mane, .atl-sower-sparkle')) el.style.display = 'none';
    const box = svg.getBoundingClientRect();
    const k = box.height / 110;
    const at = (x, y) => [box.left + (x + 12) * k, box.top + (y + 10) * k];
    return { k, lines: [27.5, 29, 31, 33, 34.5].map((x) => [x, at(x, 46), at(x, 72)]) };
  });
  await page.waitForTimeout(200);
  const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1400, height: 1000 } });
  const steps = await page.evaluate(async ([src, lines]) => {
    const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    return lines.map(([x, [px, y0], [, y1]]) => {
      const lum = [];
      for (let y = Math.max(0, Math.round(y0)); y < Math.min(img.height, Math.round(y1)); y += 1) {
        const [r, gg, b] = g.getImageData(Math.round(px), y, 1, 1).data;
        lum.push(0.2126 * r + 0.7152 * gg + 0.0722 * b);
      }
      const range = Math.max(...lum) - Math.min(...lum);
      let step = 0;
      for (let i = 1; i < lum.length; i += 1) step = Math.max(step, Math.abs(lum[i] - lum[i - 1]));
      return [x, +(step / 255).toFixed(3), Math.round(range)];
    });
  }, [`data:image/png;base64,${shot.toString('base64')}`, profile.lines]);
  const worst = Math.max(...steps.map((s) => s[1]));
  console.log(worst <= 0.1 ? 'ok ' : 'BAD', 'waist join steps [x, step, range]', JSON.stringify(steps));
  if (worst > 0.1) process.exitCode = 1;
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
