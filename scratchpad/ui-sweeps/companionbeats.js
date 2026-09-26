// INBOX 426 k, l, m, p: fast tab switching, pinning, resize, the menu's
// place, call back, and that nothing runs per frame when the page is idle.
const { boot } = require('./lib.js');
const SHOTS = `${process.env.SCRATCH || '.'}/shots`;
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => localStorage.removeItem('nm-buddy-spots'));
  await page.evaluate((k) => { const b = document.getElementById('avatar-buddy'); b.value = k; b.dispatchEvent(new Event('change', { bubbles: true })); }, process.env.KIND || 'me');
  await page.evaluate(() => revealTab('dashboard'));
  await page.waitForTimeout(6000);
  await page.evaluate(() => {
    window.__moves = [];
    const orig = window.nameMarkBuddyMoveTo;
    window.nameMarkBuddyMoveTo = function (b, spot, instant) {
      window.__moves.push({ t: Math.round(performance.now()), kind: spot.kind, x: Math.round(spot.x), y: Math.round(spot.y), instant: !!instant, from: new Error().stack.split('\n')[2].trim().split(' ')[1] });
      return orig.call(this, b, spot, instant);
    };
    window.__op = 1;
    const buddy = document.getElementById('nm-buddy');
    const loop = () => { window.__op = Math.min(window.__op, Number(getComputedStyle(buddy).opacity)); if (!window.__stop) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  // 1. Fast tab switching: eight switches 150ms apart.
  const t0 = await page.evaluate(() => performance.now());
  for (const tab of ['notes', 'chat', 'graph', 'notes', 'reminders', 'timeline', 'notes', 'dashboard']) {
    await page.evaluate((t) => revealTab(t), tab);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(7000);
  const fast = await page.evaluate((s) => ({ moves: window.__moves.map((m) => ({ ...m, t: m.t - s })), minOpacity: window.__op }), t0);
  console.log('fast switching', JSON.stringify(fast));
  // 2. Pinned: no move of its own on any tab.
  await page.evaluate(() => { window.__moves = []; });
  await page.click('#nm-buddy .nm-buddy-face', { button: 'right' });
  await page.waitForTimeout(300);
  const menu = await page.evaluate(() => {
    const face = document.querySelector('#nm-buddy .nm-buddy-face').getBoundingClientRect();
    const m = nmb.menu && nmb.menu.getBoundingClientRect();
    return m ? { face: [face.left, face.top, face.right, face.bottom].map(Math.round), menu: [m.left, m.top, m.right, m.bottom].map(Math.round), gapX: Math.round(Math.min(Math.abs(m.left - face.right), Math.abs(face.left - m.right))), dTop: Math.round(m.top - face.top) } : null;
  });
  console.log('menu', JSON.stringify(menu));
  await page.screenshot({ path: `${SHOTS}/menu-after.png`, clip: { x: Math.max(0, Math.min(menu.face[0], menu.menu[0]) - 20), y: Math.max(0, Math.min(menu.face[1], menu.menu[1]) - 20), width: 520, height: 300 } });
  await page.evaluate(() => { const b = [...nmb.menu.querySelectorAll('button')].find((x) => /Stay here/.test(x.textContent)); b.click(); });
  const pinnedAt = await page.evaluate(() => [nmb.x, nmb.y, nmb.pinned]);
  for (const tab of ['notes', 'chat', 'graph', 'reminders', 'dashboard']) {
    await page.evaluate((t) => revealTab(t), tab);
    await page.waitForTimeout(1200);
  }
  await page.waitForTimeout(5000);
  const pinned = await page.evaluate(() => ({ moves: window.__moves.filter((m) => !m.instant || m.from !== 'run'), at: [nmb.x, nmb.y], pinned: nmb.pinned }));
  console.log('pinned', JSON.stringify(pinnedAt), JSON.stringify(pinned));
  // 3. Resize smaller and back: always inside the window.
  await page.setViewportSize({ width: 900, height: 600 });
  await page.waitForTimeout(800);
  const small = await page.evaluate(() => { const r = document.getElementById('nm-buddy').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom, innerWidth, innerHeight].map(Math.round); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(800);
  console.log('resize small', JSON.stringify(small));
  // 4. Call back from off screen.
  await page.evaluate(() => { const b = document.getElementById('nm-buddy'); b.style.transform = 'translate(3000px, -400px)'; nmb.x = 3000; nmb.y = -400; });
  await page.evaluate(() => nameMarkBuddyCallBack());
  await page.waitForTimeout(1200);
  const back = await page.evaluate(() => { const r = document.getElementById('nm-buddy').getBoundingClientRect(); return { box: [r.left, r.top, r.right, r.bottom].map(Math.round), spots: localStorage.getItem('nm-buddy-spots'), pinned: nmb.pinned }; });
  console.log('call back', JSON.stringify(back));
  // 5. Idle: no frame loop.
  await page.waitForTimeout(3000);
  const idle = await page.evaluate(() => new Promise((resolve) => {
    let calls = 0;
    const orig = window.nameMarkBuddyFollowFrame;
    window.nameMarkBuddyFollowFrame = (t) => { calls += 1; return orig(t); };
    setTimeout(() => resolve({ followFrames2s: calls, loopPending: !!nmbFollow.frame, glued: !!nmb.glue, perch: nmb.perch }), 2000);
  }));
  console.log('idle', JSON.stringify(idle));
  await page.evaluate(() => { window.__stop = true; });
  await browser.close();
})();
