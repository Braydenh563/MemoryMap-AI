// INBOX 455 (2) and 469: "more and better transitions between positions
// and moving across different and the same tab(s)", and the arms and legs
// used in them. Plays each way of going (avatars.js, `nameMarkBuddyRoute`)
// by moving the companion between two made-up places shaped for it, and
// reads, every animation frame: the frame time, where its host is drawn;
// over the move: layouts and style recalcs (CDP, against an idle window of
// the same length), every property its animations touch, and which limbs
// moved. Then a move taken over half way (no jump at the hand-over), and a
// tab entered from each side. Env: BASE, KIND (me|atlas), LOOK (masculine|
// feminine, for atlas), REDUCED=1 (OS reduced motion). Exits 1 when a move
// animates anything but transform and opacity, lays the page out, jumps
// more than 40px in a frame, or (REDUCED) travels rather than crossfades.
const { boot } = require('./lib.js');
const KIND = process.env.KIND || 'me';
const LOOK = process.env.LOOK || 'masculine';
const REDUCED = !!process.env.REDUCED;

const MOVES = KIND === 'atlas' ? [
  ['float', [400, 420], [560, 380]],
  ['glide', [300, 420], [700, 380]],
] : [
  ['walk', [400, 420], [560, 420]],
  ['small', [400, 420], [426, 420]],
  ['small', [426, 420], [400, 420]],
  ['small', [400, 420], [426, 420]],
  ['leap', [400, 420], [550, 360]],
  ['climb up', [400, 520], [460, 340]],
  ['climb down', [460, 340], [400, 520]],
  ['far', [160, 420], [520, 420]],
  ['far', [520, 420], [160, 420]],
  ['far', [160, 420], [520, 300]],
];

const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 }, reducedMotion: REDUCED ? 'reduce' : undefined });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metric = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await page.evaluate(([kind, look]) => {
    localStorage.setItem('atlas-look', look);
    localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy');
    b.value = kind;
    b.dispatchEvent(new Event('change', { bubbles: true }));
  }, [KIND, LOOK]);
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    clearTimeout(nmb.timer);
    window.nameMarkBuddySchedule = () => {};
    window.nameMarkBuddyTick = () => {};
    window.nameMarkBuddyQueuePlace = () => {};
    window.nameMarkBuddyCheck = () => {};
  });
  const play = (from, to, cut) => page.evaluate(async ([from, to, cut]) => {
    const buddy = document.getElementById('nm-buddy');
    const spot = (p) => ({ kind: 'card', pose: 'stand', legs: '', x: p[0], y: p[1] });
    nameMarkBuddyRide(null, from[0], from[1]);
    nameMarkBuddyMoveTo(buddy, spot(from), true);
    await new Promise((r) => setTimeout(r, 500));
    const frames = [];
    const props = new Set();
    const limbs = new Set();
    let t0 = performance.now();
    let last = t0;
    nameMarkBuddyMoveTo(buddy, spot(to));
    const route = buddy.dataset.route || '';
    await new Promise((res) => {
      const tick = (now) => {
        const b = buddy.getBoundingClientRect();
        frames.push({ dt: now - last, x: b.left, y: b.top });
        last = now;
        for (const a of buddy.getAnimations({ subtree: true })) {
          for (const k of a.effect?.getKeyframes?.() || []) for (const p of Object.keys(k)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(p)) props.add(p);
          const t = a.effect?.target;
          if (t && t.matches?.('.nmb-arm, .nmb-leg, .nmb-hold, .atl-lw-lower') && a.playState === 'running') limbs.add([...t.classList].find((c) => /^(nmb-(arm|leg|hold)-[lr]|atl-lw-lower)$/.test(c)));
        }
        if (cut && now - t0 > cut) {
          cut = 0;
          nameMarkBuddyMoveTo(buddy, spot([to[0] + 140, to[1] - 40]));
          frames.push({ cut: true });
        }
        if (now - t0 < 2600) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    const end = buddy.getBoundingClientRect();
    return { route, frames, props: [...props], limbs: [...limbs].filter(Boolean), end: [Math.round(end.left), Math.round(end.top)], travel: buddy.dataset.travel || '' };
  }, [from, to, cut]);

  const idle0 = await metric();
  await page.waitForTimeout(2600);
  const idle1 = await metric();
  const idleLayouts = idle1.LayoutCount - idle0.LayoutCount;
  let bad = 0;
  const report = (name, r, m0, m1) => {
    const dts = r.frames.filter((f) => !f.cut).slice(1).map((f) => f.dt);
    let jump = 0;
    let at = 0;
    const steps = r.frames.filter((f) => !f.cut);
    const cutAt = r.frames.findIndex((f) => f.cut);
    //: Per 16.7ms of time, so a frame the machine dropped (load from other
    //: work) is not read as the companion jumping; dropped frames are p95's.
    const per = (i) => Math.hypot(steps[i].x - steps[i - 1].x, steps[i].y - steps[i - 1].y) / Math.max(1, steps[i].dt / 16.7);
    for (let i = 1; i < steps.length; i += 1) {
      const d = per(i);
      if (d > jump) { jump = d; at = i; }
    }
    //: Velocity: the largest change of speed between two frames, the
    //: measure of a hand-over that is not smooth.
    let kick = 0;
    for (let i = 2; i < steps.length; i += 1) {
      const v1 = per(i - 1);
      const v2 = per(i);
      kick = Math.max(kick, Math.abs(v2 - v1));
    }
    const layouts = m1.LayoutCount - m0.LayoutCount;
    const styles = m1.RecalcStyleCount - m0.RecalcStyleCount;
    const okProps = r.props.every((p) => ['translate', 'rotate', 'scale', 'opacity', 'transform', 'clipPath'].includes(p));
    //: A layout per frame is thrash; a few per move (a class going on and
    //: off, read back by this sampler) are the base's too (3 to 5 a walk).
    //: Atlas lays out its own drawing whenever a part inside it moves (its
    //: arms, its head's tilt), paced at 20Hz: 49 a float on the base
    //: commit, so its bound is a layout a frame, which only thrash passes.
    const cap = KIND === 'atlas' ? 1 : 0.15;
    const tabs = name.includes('>');
    const wrong = !okProps || (jump > 40 && r.route !== 'poof') || (!tabs && layouts > steps.length * cap) || (REDUCED && !['', 'fade'].includes(r.route) && r.route && !r.route.startsWith('enter'));
    if (wrong) bad += 1;
    console.log(`${name.padEnd(11)} route ${String(r.route || '(crossfade)').padEnd(15)} p95 ${pct(dts, 0.95).toFixed(1)}ms max ${Math.max(...dts).toFixed(1)}ms  jump ${jump.toFixed(1)}px@${at}${cutAt >= 0 ? `(cut@${cutAt})` : ''} kick ${kick.toFixed(1)}  layouts ${layouts} (${((m1.LayoutDuration - m0.LayoutDuration) * 1000).toFixed(1)}ms; idle ${idleLayouts}) styles ${styles} (${((m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000).toFixed(1)}ms)  props ${r.props.join(',')}  limbs ${r.limbs.join(',') || '-'}${wrong ? '  WRONG' : ''}`);
  };
  const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const [name, from, to] of MOVES.filter(([n]) => !ONLY || ONLY.includes(n))) {
    const m0 = await metric();
    const r = await play(from, to, 0);
    const m1 = await metric();
    report(name, r, m0, m1);
  }
  if (!ONLY || ONLY.includes('taken over')) {
    const m0 = await metric();
    const r = await play(...(KIND === 'atlas' ? [[400, 420], [560, 380]] : [[400, 420], [550, 360]]), 300);
    const m1 = await metric();
    report('taken over', r, m0, m1);
  }
  // Entered from a side (the tab it left lies that way): a glide in from
  // the left to a place 500px in, a walk on from the right to one 100px in.
  for (const [name, side, x] of ONLY && !ONLY.includes('enter') ? [] : [['enter left', -1, 500], ['enter right', 1, 1440 - 64 - 100]]) {
    const m0 = await metric();
    const r = await page.evaluate(async ([side, x]) => {
      const buddy = document.getElementById('nm-buddy');
      const spot = { kind: 'card', pose: 'stand', legs: '', x, y: 420 };
      nameMarkBuddyRide(null, x, 420);
      nameMarkBuddyMoveTo(buddy, spot, true);
      nmb.cameFrom = side;
      const how = nameMarkBuddyEnter(buddy, spot);
      const frames = [];
      const props = new Set();
      const limbs = new Set();
      let last = performance.now();
      const t0 = last;
      await new Promise((res) => {
        const tick = (now) => {
          const b = buddy.getBoundingClientRect();
          frames.push({ dt: now - last, x: b.left, y: b.top });
          last = now;
          for (const a of buddy.getAnimations({ subtree: true })) {
            for (const k of a.effect?.getKeyframes?.() || []) for (const p of Object.keys(k)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(p)) props.add(p);
            const t = a.effect?.target;
            if (t && t.matches?.('.nmb-arm, .nmb-leg, .nmb-hold, .atl-lw-lower') && a.playState === 'running') limbs.add([...t.classList].find((c) => /^(nmb-(arm|leg|hold)-[lr]|atl-lw-lower)$/.test(c)));
          }
          if (now - t0 < 1800) requestAnimationFrame(tick); else res();
        };
        requestAnimationFrame(tick);
      });
      return { route: `enter-${how}`, frames: frames.filter((f) => f.x > -64 && f.x < 1440), props: [...props], limbs: [...limbs].filter(Boolean) };
    }, [side, x]);
    const m1 = await metric();
    report(name, r, m0, m1);
  }
  // Across tabs: from Dashboard to Chat (to its right) and back.
  for (const [from, to] of ONLY && !ONLY.includes('tabs') ? [] : [['dashboard', 'chat'], ['chat', 'dashboard']]) {
    await page.evaluate((t) => switchTab(t), from);
    await page.waitForTimeout(500);
    await page.evaluate(() => { nmb.tab = nameMarkBuddyTab(); nmb.away = false; document.getElementById('nm-buddy').classList.remove('nmb-away'); });
    const m0 = await metric();
    const r = await page.evaluate(async (to) => {
      const buddy = document.getElementById('nm-buddy');
      switchTab(to);
      const frames = [];
      const props = new Set();
      const limbs = new Set();
      let last = performance.now();
      const t0 = last;
      let route = '';
      await new Promise((res) => {
        const tick = (now) => {
          if (!nmb.away && !route) route = buddy.dataset.route || '';
          const b = buddy.getBoundingClientRect();
          frames.push({ dt: now - last, x: b.left, y: b.top, shown: !nmb.away });
          last = now;
          for (const a of buddy.getAnimations({ subtree: true })) {
            for (const k of a.effect?.getKeyframes?.() || []) for (const p of Object.keys(k)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(p)) props.add(p);
            const t = a.effect?.target;
            if (t && t.matches?.('.nmb-arm, .nmb-leg, .nmb-hold, .atl-lw-lower') && a.playState === 'running') limbs.add([...t.classList].find((c) => /^(nmb-(arm|leg|hold)-[lr]|atl-lw-lower)$/.test(c)));
          }
          if (now - t0 < 6500) requestAnimationFrame(tick); else res();
        };
        requestAnimationFrame(tick);
      });
      return { route, frames: frames.filter((f) => f.shown), props: [...props], limbs: [...limbs].filter(Boolean) };
    }, to);
    const m1 = await metric();
    report(`${from}>${to}`, r, m0, m1);
  }
  console.log(bad ? 'FAIL' : 'PASS');
  process.exitCode = bad ? 1 : 0;
  await browser.close();
})();
