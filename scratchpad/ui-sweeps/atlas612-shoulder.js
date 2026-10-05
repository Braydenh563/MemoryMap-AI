// INBOX 612 (the owner: "the arm on the right for the feminine atlas
// actually separates from the body when it moves"). For each look, the
// Atlas companion: every 100ms over 20s of idle, then through each pose and
// gesture (stand, sit, float, hang, lie, walk, wave, cheer, think, shrug,
// facepalm, map, lantern, carry), reads where each drawn arm's root (its
// shoulder end, the first point of its centreline, in the arm's own group,
// so every turn the rig and the CSS give it is applied) is on screen, and
// how far that is from the torso's skin (0 when inside it; measured in the
// torso's own space through probe points, then in screen px). Also how far
// the arm's root is from where the torso would carry it (the shoulder
// anchor), so a root that slides along the body shows too.
// Exits 1 when any arm's root is ever outside the torso (gap over 0px).
//   BASE=... LOOKS=masculine,feminine THEME=dark node atlas612-shoulder.js
const { boot } = require('./lib.js');
(async () => {
  const fails = [];
  for (const look of (process.env.LOOKS || 'masculine,feminine').split(',')) {
    const { browser, page } = await boot({ viewport: { width: 1280, height: 800 } });
    await page.evaluate((look) => {
      localStorage.setItem('atlas-look', look);
      document.documentElement.dataset.avatarMotion = 'always';
      localStorage.removeItem('nm-buddy-spots');
      const b = document.getElementById('avatar-buddy');
      b.value = 'atlas';
      b.dispatchEvent(new Event('change', { bubbles: true }));
    }, look);
    await page.waitForTimeout(3500);
    await page.evaluate(() => {
      const NS = 'http://www.w3.org/2000/svg';
      const screen = (g, x, y) => {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 0.01);
        g.appendChild(c);
        const r = c.getBoundingClientRect();
        c.remove();
        return [r.left + r.width / 2, r.top + r.height / 2];
      };
      // The gap from a screen point to the torso's skin, in screen px.
      window.__gap = (box) => {
        const torso = box.querySelector('.atl-layer-body .atl-fills .nmb-torso > path.atl-skin');
        const tg = torso.parentNode;
        const o = screen(tg, 0, 0); const ex = screen(tg, 10, 0); const ey = screen(tg, 0, 10);
        const a = (ex[0] - o[0]) / 10; const b = (ex[1] - o[1]) / 10; const c = (ey[0] - o[0]) / 10; const d = (ey[1] - o[1]) / 10;
        const det = a * d - b * c;
        const local = ([sx, sy]) => { const dx = sx - o[0]; const dy = sy - o[1]; return [(d * dx - c * dy) / det, (-b * dx + a * dy) / det]; };
        const len = torso.getTotalLength();
        const outline = Array.from({ length: 240 }, (_, i) => torso.getPointAtLength((len * i) / 240));
        const out = {};
        const spec = ATLAS_LOOKS[box.dataset.atlasLook];
        for (const side of ['l', 'r']) {
          const arm = box.querySelector(`.atl-layer-body .atl-fills .nmb-arm-${side}:not(.atl-arm-probe)`);
          if (!arm || +getComputedStyle(arm).opacity < 0.05) continue;
          const [rx, ry] = (side === 'r' ? spec.arm : spec.armL)[0];
          const [lx, ly] = local(screen(arm, rx, ry));
          let gap = 0;
          if (!torso.isPointInFill(new DOMPoint(lx, ly))) {
            gap = Math.min(...outline.map((p) => Math.hypot(p.x - lx, p.y - ly))) * Math.hypot(a, b);
          }
          out[side] = { gap: +gap.toFixed(2), slide: +(Math.hypot(lx - rx, ly - ry) * Math.hypot(a, b)).toFixed(2), turn: getComputedStyle(arm).transform };
        }
        return out;
      };
    });
    const worst = { l: { gap: 0 }, r: { gap: 0 } };
    const note = (what, got) => {
      for (const side of ['l', 'r']) {
        if (got[side] && got[side].gap > worst[side].gap) worst[side] = { ...got[side], what };
        if (got[side] && !(worst[side].slideMax >= got[side].slide)) worst[side].slideMax = got[side].slide;
      }
    };
    // 20s idle on the page.
    const idle = await page.evaluate(async () => {
      const buddy = document.getElementById('nm-buddy');
      nameMarkBuddyAct('');
      nameMarkBuddyMoveTo(buddy, { kind: 'card', pose: 'stand', legs: '', x: 600, y: 400 }, true);
      const box = buddy.querySelector('.atl-figure-box');
      const rows = [];
      const t0 = performance.now();
      while (performance.now() - t0 < 20000) {
        await new Promise((r) => setTimeout(r, 100));
        rows.push(window.__gap(box));
      }
      return rows;
    });
    for (const row of idle) note('idle', row);
    for (const [name, how] of [
      ['sit', { pose: 'sit' }], ['float', { pose: 'float' }], ['hang', { pose: 'hang' }], ['lie', { act: 'lie' }], ['walk', { walk: true }],
      ['wave', { act: 'wave' }], ['cheer', { act: 'cheer' }], ['think', { mood: 'thinking' }], ['shrug', { act: 'shrug' }], ['facepalm', { act: 'facepalm' }],
      ['map', { act: 'map' }], ['lantern', { act: 'lantern' }], ['carry', { act: 'carry' }], ['love', { mood: 'love' }], ['worried', { mood: 'worried' }],
    ]) {
      const rows = await page.evaluate(async (how) => {
        const buddy = document.getElementById('nm-buddy');
        const box = buddy.querySelector('.atl-figure-box');
        nameMarkBuddyAct('');
        setAtlasMood('calm', 0, { quiet: true });
        buddy.classList.remove('nmb-walking');
        nameMarkBuddyMoveTo(buddy, { kind: 'card', pose: how.pose || 'stand', legs: '', x: 600, y: 400 }, true);
        if (how.act) nameMarkBuddyAct(how.act, 20000);
        if (how.mood) setAtlasMood(how.mood, 20000, { quiet: true });
        if (how.walk) buddy.classList.add('nmb-walking');
        const rows = [];
        // Every frame through the change (the rig's springs), then held.
        const t0 = performance.now();
        while (performance.now() - t0 < 1800) {
          await new Promise((r) => requestAnimationFrame(r));
          rows.push(window.__gap(box));
        }
        buddy.classList.remove('nmb-walking');
        return rows;
      }, how);
      for (const row of rows) note(name, row);
    }
    console.log(look, JSON.stringify(worst));
    for (const side of ['l', 'r']) if (worst[side].gap > 0) fails.push(`${look} ${side} arm: ${worst[side].gap}px from the body (${worst[side].what})`);
    await browser.close();
  }
  console.log(fails.length ? `FAIL\n  ${fails.join('\n  ')}` : 'ok');
  process.exit(fails.length ? 1 : 0);
})();
