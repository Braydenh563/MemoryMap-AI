// Visual parity for the Atlas companion: every animation under #nm-buddy is
// paused at the same time (currentTime) and the companion's box is captured, per
// look and mood, to OUT_DIR/<name>.png. Run on the base and on the change, then
// `node companionshots.js diff <dirA> <dirB>` prints the differing pixels per
// shot (a page canvas decodes the PNGs; no extra packages).
// Env: BASE, OUT_DIR, AT (ms, default 3000), REDUCED=1, ONLY=name,name, VARIANT=0|1|2 (the arm and lie variant held), NOFLOAT=1.
const fs = require('fs');
const { boot } = require('./lib.js');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const SHOTS = [
  ['masc-calm', 'masculine', 'calm', ''],
  ['fem-calm', 'feminine', 'calm', ''],
  ['masc-happy', 'masculine', 'happy', ''],
  ['fem-sleepy', 'feminine', 'sleepy', ''],
  ['masc-lie', 'masculine', 'calm', 'lie'],
  ['fem-curl', 'feminine', 'calm', 'curl'],
  ['masc-lean-l', 'masculine', 'calm', 'lean-l'],
];

async function diff(a, b) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let bad = 0;
  for (const f of fs.readdirSync(a).filter((x) => x.endsWith('.png')).sort()) {
    if (!fs.existsSync(`${b}/${f}`)) { console.log(f, 'missing in', b); bad += 1; continue; }
    const enc = (p) => `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
    const r = await page.evaluate(async ([x, y]) => {
      const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; });
      const [ia, ib] = await Promise.all([load(x), load(y)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: [ia.width, ia.height, ib.width, ib.height] };
      const px = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
      const da = px(ia); const db = px(ib);
      let n = 0; let max = 0; let sum = 0;
      for (let k = 0; k < da.length; k += 4) {
        const d = Math.max(Math.abs(da[k] - db[k]), Math.abs(da[k + 1] - db[k + 1]), Math.abs(da[k + 2] - db[k + 2]), Math.abs(da[k + 3] - db[k + 3]));
        if (d > 8) n += 1;
        if (d > max) max = d;
        sum += d;
      }
      return { w: ia.width, h: ia.height, over8: n, max, mean: +(sum / (da.length / 4)).toFixed(4) };
    }, [enc(`${a}/${f}`), enc(`${b}/${f}`)]);
    console.log(f.padEnd(18), JSON.stringify(r));
    if (r.size || r.over8 > 12) bad += 1;
  }
  await browser.close();
  console.log(bad ? 'DIFFERS' : 'MATCH');
  process.exitCode = bad ? 1 : 0;
}

async function shoot() {
  const OUT = process.env.OUT_DIR || '/tmp/atl-shots';
  const AT = Number(process.env.AT || 3000);
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 }, reducedMotion: process.env.REDUCED ? 'reduce' : undefined });
  await page.evaluate(() => {
    localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    clearTimeout(nmb.timer);
    window.nameMarkBuddySchedule = () => {}; window.nameMarkBuddyTick = () => {};
    window.nameMarkBuddyQueuePlace = () => {}; window.nameMarkBuddyCheck = () => {};
    // The pacer steps the animations inside a drawing on its own clock, which would undo the freeze.
    window.nameMarkBuddyTempo = () => {}; clearTimeout(nmbTempo.timer); nmbTempo.anims = [];
    // The arm and lie variants are picked at random on each new place; hold one.
    window.nameMarkBuddyPickVariant = () => Number(window.__variant || 0);
  });
  await page.evaluate((v) => { window.__variant = v; }, Number(process.env.VARIANT || 0));
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const [name, look, mood, pose] of SHOTS.filter(([n]) => !only || only.includes(n))) {
    await page.evaluate(([look]) => {
      localStorage.setItem('atlas-look', look);
      const b = document.getElementById('avatar-buddy'); b.value = 'me'; b.dispatchEvent(new Event('change', { bubbles: true }));
    }, [look]);
    await page.waitForTimeout(400);
    await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(2500);
    await page.evaluate(async ([mood, pose]) => {
      const buddy = document.getElementById('nm-buddy');
      clearTimeout(nmb.timer);
      nameMarkBuddyRide(null, 500, 420);
      nameMarkBuddyMoveTo(buddy, { kind: 'card', pose: pose === 'lie' || pose === 'curl' ? pose : 'stand', legs: '', x: 500, y: 420 }, true);
      if (mood !== 'calm') setAtlasMood(mood, 0, { quiet: true });
      if (pose.startsWith('lean')) { buddy.dataset.lean = pose.endsWith('l') ? 'l' : 'r'; buddy.querySelector('.atl-figure-box').dataset.lean = buddy.dataset.lean; }
    }, [mood, pose]);
    await page.waitForTimeout(2500);
    await page.mouse.move(1200, 100);
    const box = await page.evaluate((AT) => {
      const buddy = document.getElementById('nm-buddy');
      for (const a of buddy.getAnimations({ subtree: true })) { a.pause(); a.currentTime = AT; }
      const r = buddy.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }, AT);
    await page.waitForTimeout(300);
    const pad = 50;
    await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.w + 2 * pad, height: box.h + 2 * pad } });
    console.log('shot', name);
  }
  // Mid-float: the move's own animations (host, limbs, arms) held at fixed times.
  for (const [look, at] of process.env.NOFLOAT ? [] : [['masculine', 250], ['masculine', 500], ['feminine', 250], ['feminine', 500]]) {
    await page.evaluate(([look]) => {
      localStorage.setItem('atlas-look', look);
      const b = document.getElementById('avatar-buddy'); b.value = 'me'; b.dispatchEvent(new Event('change', { bubbles: true }));
    }, [look]);
    await page.waitForTimeout(400);
    await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      clearTimeout(nmb.timer);
      window.nameMarkBuddySchedule = () => {}; window.nameMarkBuddyTick = () => {};
      window.nameMarkBuddyQueuePlace = () => {}; window.nameMarkBuddyCheck = () => {};
    // The pacer steps the animations inside a drawing on its own clock, which would undo the freeze.
    window.nameMarkBuddyTempo = () => {}; clearTimeout(nmbTempo.timer); nmbTempo.anims = [];
    // The arm and lie variants are picked at random on each new place; hold one.
    window.nameMarkBuddyPickVariant = () => Number(window.__variant || 0);
      const buddy = document.getElementById('nm-buddy');
      nameMarkBuddyRide(null, 400, 420);
      nameMarkBuddyMoveTo(buddy, { kind: 'card', pose: 'stand', legs: '', x: 400, y: 420 }, true);
    });
    await page.waitForTimeout(1500);
    await page.evaluate(([at]) => {
      const buddy = document.getElementById('nm-buddy');
      nameMarkBuddyMoveTo(buddy, { kind: 'card', pose: 'stand', legs: '', x: 560, y: 380 });
      for (const a of buddy.getAnimations({ subtree: true })) { a.pause(); a.currentTime = at; }
    }, [at]);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/float-${look.slice(0, 4)}-${at}.png`, clip: { x: 330, y: 330, width: 330, height: 220 } });
    console.log('shot float', look, at);
  }
  await browser.close();
}

if (process.argv[2] === 'diff') diff(process.argv[3], process.argv[4]); else shoot();
