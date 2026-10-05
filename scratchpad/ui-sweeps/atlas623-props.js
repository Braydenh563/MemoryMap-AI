// INBOX 623 (the owner: "can the atlas agent also animate the props and
// icons as well for various actions and behaviours??"). The Atlas companion,
// each look, standing on a card with its own schedule stopped: each prop is
// shown the way the app shows it (an act, a context class, a pose), and for
// 2.4s every frame reads (a) the prop's grip (the point its own motion turns
// about: the lantern's string top, the bell's top, the moon's top, the
// book's spine, the map's corner, the coil's middle), mapped once through
// the prop's own transform and once through its holder's, the gap between
// the two in screen px (0 when it stays where it is held), and (b) how far
// its far top corner moved against its holder and how much its opacity
// changed (its own motion).
// REDUCED=1 runs under the system's reduced motion, where nothing of its own
// may move. Exits 1 when a grip ever opens over 0.5px, a prop shows no
// motion of its own (under 0.3px and 0.1 opacity), or under REDUCED moves.
//   BASE=... LOOKS=feminine,masculine THEME=dark VIEW=390 REDUCED=1 node atlas623-props.js
const { boot } = require('./lib.js');
const PROPS = [
  // [name, how to show it, the moving element, grip [x, y] or null (its box's top middle or centre), cls]
  ['lantern', { act: 'lantern' }, '.nmp-lantern', [48.2, 61]],
  ['lantern star', { act: 'lantern' }, '.nmp-lantern .atl-sparkle', 'box'],
  ['bell', { act: 'bell' }, '.nmp-bell', 'top'],
  ['cable', { cls: 'nmb-offline' }, '.nmp-cable .atl-prop-zap', null],
  ['music', { cls: 'nmb-music' }, '.nmp-headphones .atl-prop-cup-glow', 'box'],
  ['glasses', { cls: 'nmb-reading' }, '.nmp-glasses .atl-prop-lens', null],
  ['book', { cls: 'nmb-reading' }, '.nmp-book .atl-prop-page:nth-of-type(2)', [31, 90.2]],
  ['map', { act: 'map' }, '.nmp-map', [42, 92.4]],
  ['coil', { pose: 'sit' }, '.nmp-coil', [31, 72]],
  ['moon', { pose: 'sit', cls: 'nmb-night' }, '.nmp-nightcap', 'top'],
  ['bubble', { act: 'startle' }, '.nmp-bubble', 'box'],
];
(async () => {
  const width = Number(process.env.VIEW || 1440);
  const reduced = !!process.env.REDUCED;
  const fails = [];
  for (const look of (process.env.LOOKS || 'feminine,masculine').split(',')) {
    const { browser, page } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 }, ...(reduced ? { reducedMotion: 'reduce' } : {}) });
    await page.evaluate(([look, reduced]) => {
      localStorage.setItem('atlas-look', look);
      if (!reduced) document.documentElement.dataset.avatarMotion = 'always';
      const b = document.getElementById('avatar-buddy');
      b.value = 'atlas';
      b.dispatchEvent(new Event('change', { bubbles: true }));
    }, [look, reduced]);
    await page.waitForTimeout(3500);
    await page.evaluate((width) => {
      clearTimeout(nmb.timer);
      window.nameMarkBuddySchedule = () => {};
      window.nameMarkBuddyTick = () => {};
      window.nameMarkBuddyQueuePlace = () => {};
      window.nameMarkBuddyCheck = () => {};
      window.nameMarkBuddyContext = () => {};
      const buddy = document.getElementById('nm-buddy');
      const x = Math.round(width / 2);
      nameMarkBuddyRide(null, x, 420);
      nameMarkBuddyMoveTo(buddy, { kind: 'card', pose: 'stand', legs: '', x, y: 420 }, true);
    }, width);
    await page.waitForTimeout(1200);
    const out = {};
    for (const [name, how, sel, grip] of PROPS) {
      const r = await page.evaluate(async ([how, sel, grip]) => {
        const buddy = document.getElementById('nm-buddy');
        const box = buddy.querySelector('.atl-figure-box');
        const el = box.querySelector(sel);
        if (!el) return { missing: true };
        if (how.pose) buddy.dataset.pose = how.pose;
        if (how.cls) buddy.classList.add(how.cls);
        if (how.act) nameMarkBuddyAct(how.act, 20000);
        atlasTailWake(box);
        await new Promise((r) => setTimeout(r, 500));
        const NS = 'http://www.w3.org/2000/svg';
        const local = () => {
          if (Array.isArray(grip)) return grip;
          const b = el.getBBox();
          return grip === 'top' ? [b.x + b.width / 2, b.y] : [b.x + b.width / 2, b.y + b.height / 2];
        };
        // A point through an element's own transform: a group takes a probe
        // child; a leaf (a path, a circle) has its own transform applied to
        // the point in its holder's space.
        const at = (g, x, y) => {
          if (g === el && !(el instanceof SVGGElement)) {
            const m = el.parentNode.getCTM().inverse().multiply(el.getCTM());
            const q = new DOMPoint(x, y).matrixTransform(m);
            return at(el.parentNode, q.x, q.y);
          }
          return probe(g, x, y);
        };
        const probe = (g, x, y) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 0.01); g.appendChild(c); const q = c.getBoundingClientRect(); c.remove(); return [q.left + q.width / 2, q.top + q.height / 2]; };
        const [gx, gy] = local();
        const far = () => { const b = el.getBBox(); return [b.x + b.width, b.y]; };
        const [fx, fy] = far();
        let gap = 0; let moved = 0; let lo = 1; let hi = 0; let shown = 0; let frames = 0;
        // Its own motion: its far corner through its own transform, less the
        // same point through its holder's (the arm's or the body's sway).
        const rel = () => { const a = at(el, fx, fy); const b = at(el.parentNode, fx, fy); return [a[0] - b[0], a[1] - b[1]]; };
        const start = rel();
        const t0 = performance.now();
        while (performance.now() - t0 < 2400) {
          await new Promise((r) => requestAnimationFrame(r));
          frames += 1;
          const root = el.closest('.nmp') || el;
          shown = Math.max(shown, +getComputedStyle(root).opacity);
          // Through its own transform and through its holder's: where the
          // grip is drawn, and where it is held.
          const own = at(el, gx, gy);
          const held = at(el.parentNode, gx, gy);
          gap = Math.max(gap, Math.hypot(own[0] - held[0], own[1] - held[1]));
          const f = rel();
          moved = Math.max(moved, Math.hypot(f[0] - start[0], f[1] - start[1]));
          const o = +getComputedStyle(el).opacity;
          lo = Math.min(lo, o); hi = Math.max(hi, o);
        }
        nameMarkBuddyAct('');
        if (how.cls) buddy.classList.remove(how.cls);
        buddy.dataset.pose = 'stand';
        return { shown: +shown.toFixed(2), gap: +gap.toFixed(2), moved: +moved.toFixed(2), flicker: +(hi - lo).toFixed(2), frames };
      }, [how, sel, grip]);
      out[name] = r;
      const why = [];
      if (r.missing) why.push('not drawn');
      else {
        if (r.shown < 0.5) why.push(`not shown (${r.shown})`);
        if (r.gap > 0.5) why.push(`grip opens ${r.gap}px`);
        if (!reduced && r.moved < 0.3 && r.flicker < 0.1) why.push('no motion of its own');
        if (reduced && (r.moved > 0.3 || r.flicker > 0.1)) why.push(`moves under reduced motion (${r.moved}px, ${r.flicker})`);
      }
      if (why.length) fails.push(`${look} ${name}: ${why.join(', ')}`);
      await page.waitForTimeout(500);
    }
    console.log(look, width, reduced ? 'reduced' : '', JSON.stringify(out));
    await browser.close();
  }
  console.log(fails.length ? `FAIL\n  ${fails.join('\n  ')}` : 'ok');
  process.exit(fails.length ? 1 : 0);
})();
