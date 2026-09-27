// The owner, 2026-09-27: "whenever I click near the companion when it is
// sleeping, not even on it just near it, it startles for about a second
// then goes instantly back to sleep"; "the companion gets frozen in its
// animation and with the exact same half lidded half mouth open expression
// every time when I hold down ctrl"; and a sleeping companion looked
// surprised for a moment on a tab click. All three were one listener in
// atlas.js: any pointerdown or keydown anywhere (a Ctrl auto-repeat too)
// set every Atlas "surprised" for 700ms and then snapped it back.
// With Atlas as the companion, asleep (the companion's own sleep and
// Atlas's sleepy mood), this: holds Ctrl for 2s (auto-repeat keydowns),
// clicks 150px from it, clicks a tab, and samples Atlas's mood and the
// companion's classes every 50ms. Then clicks it directly and samples 3s:
// the wake must be gradual (still sleepy-eyed or groggy for the first
// second) and it must not be asleep again for 20s.
// Exits 1 on any frame showing "surprised" or an open-eyed face before the
// direct click, or on a direct click that snaps awake or back to sleep.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(4500);
  const sleep = () => page.evaluate(() => {
    const buddy = document.getElementById('nm-buddy');
    nmb.lastInput = Date.now() - 9 * 60 * 1000;
    nmb.awakeUntil = 0;
    atlasLastInput = Date.now() - 11 * 60 * 1000;
    setAtlasMood('sleepy');
    buddy.classList.add('nmb-sleep');
  });
  await sleep();
  await page.waitForTimeout(400);
  const sample = () => page.evaluate(() => {
    const buddy = document.getElementById('nm-buddy');
    const svg = buddy.querySelector('.nm-atlas');
    const eye = buddy.querySelector('.atl-eye-open'); const open = eye ? Number(getComputedStyle(eye).opacity) : -1;
    return { mood: atlasMoodNow, asleep: buddy.classList.contains('nmb-sleep') || nmb.act === 'lie' || nmb.act === 'nap', open, acts: [...buddy.classList].filter((c) => /nmb-act-|nmb-stir|nmb-groggy|nmb-waking/.test(c)).join(' ') };
  });
  const watch = async (label, ms, during) => {
    const frames = [];
    const t0 = Date.now();
    const job = during ? during() : Promise.resolve();
    while (Date.now() - t0 < ms) { frames.push({ t: Date.now() - t0, ...(await sample()) }); await page.waitForTimeout(50); }
    await job;
    const bad = frames.filter((f) => f.mood !== 'sleepy' || !f.asleep || f.open > 0.2);
    console.log(`${label}: ${frames.length} frames, ${bad.length} awake or surprised`, bad[0] ? JSON.stringify(bad[0]) : '');
    return bad.length;
  };
  let bad = 0;
  // 1. Ctrl held: auto-repeat keydowns every 33ms.
  bad += await watch('ctrl held 2s', 2200, () => page.evaluate(async () => {
    const fire = (repeat) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', code: 'ControlLeft', ctrlKey: true, repeat, bubbles: true }));
    fire(false);
    for (let i = 0; i < 60; i += 1) { await new Promise((r) => setTimeout(r, 33)); fire(true); }
    document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', code: 'ControlLeft', bubbles: true }));
  }));
  // 2. A click 150px from it.
  const at = await page.evaluate(() => ({ x: nmb.x + NMB_W / 2, y: nmb.y + NMB_HEAD / 2 }));
  const nx = at.x > 720 ? at.x - 150 : at.x + 150;
  bad += await watch('click 150px away', 1600, () => page.mouse.click(nx, at.y));
  // 3. Three clicks close by (80px), fast.
  bad += await watch('three clicks 80px away', 2000, async () => { for (let i = 0; i < 3; i += 1) { await page.mouse.click(at.x + (at.x > 720 ? -80 : 80), at.y); await page.waitForTimeout(120); } });
  // 4. A tab click and straight back.
  bad += await watch('tab click and back', 1400, async () => { await page.click('.tab-btn[data-tab="notes"], [data-tab="notes"]'); await page.waitForTimeout(120); await page.click('.tab-btn[data-tab="dashboard"], [data-tab="dashboard"]'); });
  // 5. A direct click: gradual wake, not a snap, and awake for 20s.
  await sleep();
  await page.waitForTimeout(300);
  const face = await page.evaluate(() => { const r = document.querySelector('#nm-buddy .nm-buddy-face').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.click(face.x, face.y);
  const wake = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 3000) { wake.push({ t: Date.now() - t0, ...(await sample()) }); await page.waitForTimeout(100); }
  const openAt = wake.find((f) => f.open > 0.9)?.t ?? null;
  const surprised = wake.filter((f) => f.mood === 'surprised').length;
  console.log('direct click: eyes fully open at', openAt, 'ms; surprised frames', surprised, '; first', JSON.stringify(wake[0]), 'last', JSON.stringify(wake[wake.length - 1]));
  if (openAt !== null && openAt < 400) bad += 1;
  if (surprised) bad += 1;
  if (wake[wake.length - 1].asleep || wake[wake.length - 1].mood === 'sleepy') bad += 1;
  if (!process.env.QUICK) {
    await page.waitForTimeout(17000);
    const later = await sample();
    console.log('20s after:', JSON.stringify(later));
    if (later.asleep || later.mood === 'sleepy') bad += 1;
  }
  console.log(bad ? 'FAIL' : 'PASS');
  process.exitCode = bad ? 1 : 0;
  await browser.close();
})();
