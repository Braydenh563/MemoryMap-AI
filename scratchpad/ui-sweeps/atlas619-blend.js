// INBOX 619 (d) (the owner: "it still snaps between behaviours and no
// behaviours"). The Atlas companion, each look, standing on a card with its
// own schedule stopped: each act (and each mood with a loop of its own) is
// started from idle and ended at its length, then the next, with every
// animation on and in the companion paused and stepped by hand 16ms of its
// own time a frame (the rig's springs held). Every frame,
// the screen box of each moving part (the arms, the character, the body
// layer, the lower body's box, the head) is read; a part's move in a frame
// is how far its box went, scaled to a 60fps frame. A snap is a frame whose
// move is a spike: over SPIKE px (default 1.5) more than the larger of the
// frames either side of it (a fast act is fast for several frames; a snap
// is one). Reports, per behaviour, the largest spike within 200ms of its
// start and of its end, and the largest in its middle, for comparison.
// Exits 1 when a start or an end spikes over SPIKE and over 1.5 times
// the largest spike in the behaviour's own middle.
//   BASE=... LOOKS=feminine,masculine THEME=dark VIEW=390 node atlas619-blend.js
const { boot } = require('./lib.js');
(async () => {
  const SPIKE = Number(process.env.SPIKE || 1.5);
  const width = Number(process.env.VIEW || 1440);
  const acts = (process.env.ACTS || 'wave,hop,stretch,yawn,scratch,shrug,cheer,facepalm,nod,wiggle,tilt,look,glance').split(',');
  const moods = (process.env.MOODS || 'happy,love,laughing,surprised,thinking,sad').split(',');
  const fails = [];
  for (const look of (process.env.LOOKS || 'feminine,masculine').split(',')) {
    const { browser, page } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 } });
    await page.evaluate((look) => {
      localStorage.setItem('atlas-look', look);
      document.documentElement.dataset.avatarMotion = 'always';
      const b = document.getElementById('avatar-buddy');
      b.value = 'atlas';
      b.dispatchEvent(new Event('change', { bubbles: true }));
    }, look);
    await page.waitForTimeout(3500);
    await page.evaluate((width) => {
      clearTimeout(nmb.timer);
      window.nameMarkBuddySchedule = () => {};
      window.nameMarkBuddyTick = () => {};
      window.nameMarkBuddyQueuePlace = () => {};
      window.nameMarkBuddyCheck = () => {};
      const buddy = document.getElementById('nm-buddy');
      const x = Math.round(width / 2);
      nameMarkBuddyRide(null, x, 420);
      nameMarkBuddyMoveTo(buddy, { kind: 'card', pose: 'stand', legs: '', x, y: 420 }, true);
      // Every animation on and in the companion is paused and stepped by
      // hand, 16ms of its own time a frame, so a loaded machine's dropped
      // frames cannot pass for snaps (or hide them); the rig's springs and
      // the companion's pacer, which run on the real clock, are held.
      window.nameMarkBuddyTempo = () => {};
      clearTimeout(nmbTempo.timer);
      window.__run = (start, ms, end) => {
        const parts = [...buddy.querySelectorAll('.nmb-arm:not(.atl-arm-probe), .nm-buddy-char, .atl-layer-body, .atl-lw-lower, .atl-head:not(.atl-lids)')];
        const read = () => parts.map((el) => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; });
        const held = new Set();
        const hold = () => { for (const a of buddy.getAnimations({ subtree: true })) if (!held.has(a)) { a.pause(); held.add(a); } };
        const step = () => { for (const a of held) if (a.playState !== 'finished' && a.playState !== 'idle') a.currentTime = (a.currentTime || 0) + 16; };
        hold();
        const frames = [];
        let last = read();
        for (let i = 0; i < 4; i += 1) { step(); const n = read(); frames.push({ t: -64 + i * 16, d: n.map((r, k) => Math.max(...r.map((v, j) => Math.abs(v - last[k][j])))) }); last = n; }
        start();
        clearTimeout(nmb.timer);
        clearTimeout(atlasMoodTimer);
        hold();
        for (let t = 0; t <= ms + 700; t += 16) {
          if (t === Math.round(ms / 16) * 16) { end(); hold(); }
          const n = read();
          frames.push({ t, d: n.map((r, k) => Math.max(...r.map((v, j) => Math.abs(v - last[k][j])))) });
          last = n;
          step();
        }
        for (const a of held) if (a.playState === 'paused') a.play();
        return frames;
      };
    }, width);
    await page.waitForTimeout(1200);
    const out = {};
    let worst = { spike: 0 };
    const runs = [...acts.map((a) => ['act', a]), ...moods.map((m) => ['mood', m])];
    for (const [kind, name] of runs) {
      const r = await page.evaluate(async ([kind, name]) => {
        const ms = kind === 'act' ? (NAME_MARK_BUDDY_ACTS[name] || { ms: 1500 }).ms : 2600;
        const frames = window.__run(() => {
          if (kind === 'act') nameMarkBuddyAct(name, 60000);
          else setAtlasMood(name, 60000, { quiet: true });
        }, ms, () => {
          if (kind === 'act') nameMarkBuddyAct('');
          else setAtlasMood('calm', 0, { quiet: true });
        });
        const spike = (i) => Math.max(...frames[i].d.map((d, p) => d - Math.max(frames[i - 1]?.d[p] ?? 0, frames[i + 1]?.d[p] ?? 0)));
        let start = 0; let end = 0; let mid = 0;
        for (let i = 1; i < frames.length - 1; i += 1) {
          const s = spike(i);
          const t = frames[i].t;
          if (t >= -16 && t < 200) start = Math.max(start, s);
          else if (Math.abs(t - ms) < 250) end = Math.max(end, s);
          else mid = Math.max(mid, s);
        }
        return { start: +start.toFixed(2), end: +end.toFixed(2), mid: +mid.toFixed(2) };
      }, [kind, name]);
      out[name] = r;
      for (const at of ['start', 'end']) if (r[at] > worst.spike) worst = { spike: r[at], what: `${name} ${at}` };
      //: An act's own fast keyframes spike in its middle too: a start or an
      //: end is a snap when it spikes past SPIKE and past 1.5 times that.
      const cap = Math.max(SPIKE, r.mid * 1.5);
      if (r.start > cap || r.end > cap) fails.push(`${look} ${name}: ${JSON.stringify(r)}`);
      await page.waitForTimeout(600);
    }
    console.log(look, width, JSON.stringify(out));
    console.log(look, 'worst', JSON.stringify(worst));
    await browser.close();
  }
  console.log(fails.length ? `FAIL\n  ${fails.join('\n  ')}` : 'ok');
  process.exit(fails.length ? 1 : 0);
})();
