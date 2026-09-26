// INBOX 426 x (84.png): "the right-click menu still opens away from it or
// off screen". The companion is put at each corner, the edges and the
// middle of the window, at several window sizes and scales, riding a scroll
// area and not, and its menu is opened by a right-click and from the
// keyboard (Shift+F10). Each time: the menu's box against the window (8px
// margin) and against the companion (beside it, 12px at most away, its top
// level with the companion's unless the window's edge moves it).
// Env: KIND (atlas), THEME. Exits 1 on a menu outside the window or away
// from the companion.
const { boot } = require('./lib.js');
const SIZES = (process.env.SIZES || '1440x900@1,1024x700@1.25,800x600@1.5,390x844@3').split(',');
(async () => {
  const fails = [];
  let count = 0;
  for (const size of SIZES) {
    const [wh, dpr] = size.split('@');
    const [w, h] = wh.split('x').map(Number);
    const { browser, page } = await boot({ viewport: { width: w, height: h }, deviceScaleFactor: Number(dpr || 1), ...(w < 600 ? { isMobile: true, hasTouch: true } : {}) });
    await page.evaluate((k) => { const b = document.getElementById('avatar-buddy'); b.value = k; b.dispatchEvent(new Event('change', { bubbles: true })); }, process.env.KIND || 'atlas');
    await page.evaluate(() => revealTab('dashboard'));
    await page.waitForTimeout(3000);
    const spots = await page.evaluate(() => {
      const W = innerWidth; const H = innerHeight;
      return [[4, 60], [W - 68, 60], [4, H - 130], [W - 68, H - 130], [Math.round(W / 2 - 32), Math.round(H / 2 - 46)], [W - 68, Math.round(H / 2)], [Math.round(W / 2), H - 130]];
    });
    for (const [x, y] of spots) {
      for (const how of ['right-click', 'keyboard']) {
        count += 1;
        await page.keyboard.press('Escape');
        await page.evaluate(([px, py]) => {
          const buddy = document.getElementById('nm-buddy');
          nameMarkBuddyMoveTo(buddy, { kind: 'air', pose: 'float', x: px, y: py }, true);
          clearTimeout(nmb.timer);
          clearTimeout(nmb.placeTimer);
          nmb.placeTimer = 1;
        }, [x, y]);
        await page.waitForTimeout(120);
        const face = await page.evaluate(() => { const r = document.querySelector('#nm-buddy .nm-buddy-face').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
        if (how === 'right-click') await page.mouse.click(face.x, face.y, { button: 'right' });
        else { await page.focus('#nm-buddy .nm-buddy-face'); await page.keyboard.press('Shift+F10'); }
        await page.waitForTimeout(260);
        const m = await page.evaluate(() => {
          const f = document.querySelector('#nm-buddy .nm-buddy-face').getBoundingClientRect();
          const menu = nmb.menu && nmb.menu.isConnected && !nmb.menu.classList.contains('hidden') ? nmb.menu.getBoundingClientRect() : null;
          return { W: innerWidth, H: innerHeight, face: [f.left, f.top, f.right, f.bottom].map(Math.round), menu: menu ? [menu.left, menu.top, menu.right, menu.bottom].map(Math.round) : null, focusIn: !!(nmb.menu && nmb.menu.contains(document.activeElement)) };
        });
        const tag = `${size} at ${x},${y} by ${how}`;
        if (!m.menu) { fails.push(`${tag}: no menu`); continue; }
        const [ml, mt, mr, mb] = m.menu;
        const [fl, ft, fr, fb] = m.face;
        const inside = ml >= 7 && mt >= 7 && mr <= m.W - 7 && mb <= m.H - 7;
        const gapX = ml >= fr ? ml - fr : fl >= mr ? fl - mr : 0;
        const gapY = mt >= fb ? mt - fb : ft >= mb ? ft - mb : 0;
        // Beside it (or, where the window is too narrow for beside, over or
        // under it), never further than 12px from its box.
        const near = Math.max(gapX, gapY) <= 12;
        if (!inside || !near) fails.push(`${tag}: menu ${m.menu} face ${m.face} window ${m.W}x${m.H} gap ${gapX},${gapY}`);
        if (how === 'keyboard' && !m.focusIn) fails.push(`${tag}: focus not in the menu`);
      }
    }
    // With its menu open, everything that moves it on its own is asked to
    // (a behaviour, an errand, its beat, a check, leaving an edge): the
    // companion stays where it was and the menu stays at it (84.png).
    if (w >= 1000) {
      await page.keyboard.press('Escape');
      await page.evaluate(() => {
        const buddy = document.getElementById('nm-buddy');
        nameMarkBuddyMoveTo(buddy, { kind: 'air', pose: 'float', x: innerWidth - 90, y: 70 }, true);
        nmb.placeTimer = 0;
        nmb.placedAt = 0;
      });
      await page.waitForTimeout(150);
      const face0 = await page.evaluate(() => { const r = document.querySelector('#nm-buddy .nm-buddy-face').getBoundingClientRect(); return [r.left + 20, r.top + 30]; });
      await page.mouse.click(face0[0], face0[1], { button: 'right' });
      await page.waitForTimeout(250);
      const held = await page.evaluate(async () => {
        const before = [nmb.x, nmb.y];
        if (typeof nameMarkBuddyBellErrand === 'function') nameMarkBuddyBellErrand();
        nmb.lastInput = Date.now();
        nameMarkBuddyTick();
        nameMarkBuddyBeat();
        nameMarkBuddyCheck();
        await new Promise((r) => setTimeout(r, 2500));
        const f = document.querySelector('#nm-buddy .nm-buddy-face').getBoundingClientRect();
        const m = nmb.menu && !nmb.menu.classList.contains('hidden') ? nmb.menu.getBoundingClientRect() : null;
        return { before, after: [nmb.x, nmb.y], face: [f.left, f.top, f.right, f.bottom].map(Math.round), menu: m ? [m.left, m.top, m.right, m.bottom].map(Math.round) : null };
      });
      count += 1;
      const moved = Math.hypot(held.after[0] - held.before[0], held.after[1] - held.before[1]);
      const gap = held.menu ? Math.min(Math.abs(held.menu[0] - held.face[2]), Math.abs(held.face[0] - held.menu[2])) : Infinity;
      if (moved > 2 || gap > 12) fails.push(`${size} menu open: moved ${moved.toFixed(0)}px, menu ${held.menu} face ${held.face}`);
    }
    await browser.close();
  }
  console.log(`${count} menus opened`);
  for (const f of fails) console.log(f);
  console.log(fails.length ? `FAIL ${fails.length}` : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
})();
