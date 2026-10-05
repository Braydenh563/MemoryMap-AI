// INBOX 600 (the owner: "when I click on atlas in the enlarged view, it
// might sway or do something for a couple seconds but will then snap
// still"). Opens the large view for each case, clicks the figure (a poke)
// at 1.5s and again at 9s, and over 20s reads, every frame, every
// element's transform, translate, rotate, scale and opacity in the figure
// and every path's `d` there; reports the longest run with no change at
// all ("still"), and the largest single-frame jump of the head's centre
// ("snap", px, after the 2.2 times enlargement).
// Cases: atlas-m, atlas-f (Atlas's large view, his and her look), buddy-m,
// buddy-f (the Atlas companion visiting its large view), plain (a plain
// face's large view), plain-buddy (the "You" companion visiting).
// Exits 1 when any case has no part move 0.75px for over 1s, or a part
// jerks over 4px in a frame in the 250ms after a hand-back.
//   BASE=... CASES=atlas-m,plain THEME=dark node atlas600-still.js
const { boot } = require('./lib.js');
const ALL = ['atlas-m', 'atlas-f', 'buddy-m', 'buddy-f', 'plain', 'plain-buddy'];
(async () => {
  const out = {};
  const fails = [];
  for (const c of (process.env.CASES || ALL.join(',')).split(',')) {
    const { browser, page } = await boot({ viewport: { width: 1280, height: 800 }, ...(process.env.REDUCED ? { reducedMotion: 'reduce' } : {}) });
    const look = c.endsWith('-f') ? 'feminine' : 'masculine';
    await page.evaluate((look) => { localStorage.setItem('atlas-look', look); document.documentElement.dataset.avatarMotion = 'always'; }, look);
    const buddy = c.startsWith('buddy') ? 'atlas' : c === 'plain-buddy' ? 'me' : '';
    if (buddy) {
      await page.evaluate((k) => {
        localStorage.removeItem('nm-buddy-spots');
        const b = document.getElementById('avatar-buddy');
        b.value = k;
        b.dispatchEvent(new Event('change', { bubbles: true }));
      }, buddy);
      await page.waitForTimeout(3500);
      await page.evaluate(() => document.querySelector('#nm-buddy .nm-buddy-face').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
    } else {
      await page.evaluate((seed) => openNameMarkViewer(seed), c === 'plain' ? 'Brayden' : 'Atlas');
    }
    await page.waitForTimeout(800);
    const got = await page.evaluate(async (trace) => {
      const fig = document.querySelector('.nm-viewer .nm-viewer-figure');
      const target = () => fig.querySelector('#nm-buddy .nm-buddy-face') || fig.querySelector('.name-mark') || fig;
      const poke = () => {
        const r = target().getBoundingClientRect();
        const o = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.3 };
        target().dispatchEvent(new MouseEvent('click', o));
      };
      const read = () => {
        const parts = [];
        for (const el of fig.querySelectorAll('*')) {
          const cs = getComputedStyle(el);
          parts.push(cs.transform, cs.translate, cs.rotate, cs.scale, cs.opacity);
          if (el.tagName === 'path') parts.push(el.getAttribute('d'));
        }
        return parts.join('|');
      };
      // The parts an eye follows: the head, the tail's stars, a planet,
      // each arm, the body. Their centres, in screen px.
      const SEL = ['.nm-buddy-head', '.atl-layer-tail .atl-tail-core', '.atl-orbiter', '.nmb-arm-r:not(.atl-arm-probe)', '.nmb-arm-l:not(.atl-arm-probe)', '.nm-char', '.atl-lw-breathe'];
      const pts = () => SEL.map((s) => {
        const el = fig.querySelector(s);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.width || r.height ? [r.left + r.width / 2, r.top + r.height / 2] : null;
      });
      let last = read();
      let lastChange = performance.now();
      const t0 = performance.now();
      // "calm": the longest span in which no followed part moved 0.75px from
      // where it was at the span's start (what reads as still).
      // "jerk": the largest second difference of a part's centre between
      // frames (px), which a snap shows and a smooth move does not.
      let anchor = pts(); let anchorT = 0; let calm = 0; let calmAt = 0;
      // "handback": the largest jerk in the 250ms after a hand-back (an act's
      // class leaving the companion, or the figure's mood changing), which is
      // where the owner saw it "snap still"; an act's own fast keyframes
      // while it plays are its design, reported in "jerk" only.
      let prevMood = fig.querySelector('.atl-figure-box')?.dataset.atlasMood || ''; let backT = -1e9; let back = 0; let backAt = 0; let backWhat = '';
      let prevCls = ""; let jerkCtx = ""; let p1 = anchor; let p2 = anchor; let t1 = 0; let t2 = -16.7; let jerk = 0; let jerkAt = 0; let jerkWhat = '';
      let longest = 0; let longestAt = 0; let frames = 0;
      let poked = 0;
      const loops = [];
      while (performance.now() - t0 < 20000) {
        await new Promise((r) => requestAnimationFrame(r));
        const t = performance.now() - t0;
        if (poked === 0 && t > 1500) { poke(); poked = 1; }
        if (poked === 1 && t > 9000) { poke(); poked = 2; }
        frames += 1;
        if (trace && frames % 60 === 0) loops.push([Math.round(t), fig.getAnimations({ subtree: true }).length]);
        const p = pts();
        if (p.some((q, i) => q && anchor[i] && Math.hypot(q[0] - anchor[i][0], q[1] - anchor[i][1]) > 0.75)) {
          if (t - anchorT > calm) { calm = t - anchorT; calmAt = t; }
          anchor = p; anchorT = t;
        }
        const cls = document.getElementById('nm-buddy')?.className || '';
        const mood = fig.querySelector('.atl-figure-box')?.dataset.atlasMood || '';
        const acts = (c) => c.split(' ').filter((x) => x.startsWith('nmb-act-'));
        // A hand-back: the mood changes, or an act's class goes and no other
        // comes (back to its idle); one act giving way to the next is the
        // next act's own start, reported in "jerk" only.
        if (mood !== prevMood || (acts(prevCls).length && !acts(cls).length)) backT = t;
        prevMood = mood;
        p.forEach((q, i) => {
          if (!q || !p1[i] || !p2[i]) return;
          // The change of velocity between frames, as px a frame at 60 a
          // second, so a loaded machine's long frames do not read as jerks.
          const k = 16.7 * 16.7;
          const dtA = Math.max(1, t - t1); const dtB = Math.max(1, t1 - t2);
          const j = Math.hypot((q[0] - p1[i][0]) / dtA - (p1[i][0] - p2[i][0]) / dtB, (q[1] - p1[i][1]) / dtA - (p1[i][1] - p2[i][1]) / dtB) * k / Math.max(16.7, (dtA + dtB) / 2);
          if (t - backT < 250 && j > back) { back = j; backAt = t; backWhat = SEL[i]; }
          if (j > jerk) { jerk = j; jerkAt = t; jerkWhat = SEL[i]; jerkCtx = [prevCls, (document.getElementById("nm-buddy")?.className || ""), fig.querySelector(".atl-figure-box")?.dataset.atlasMood || ""].join(" | "); }
        });
        p2 = p1; p1 = p; t2 = t1; t1 = t;
        prevCls = document.getElementById("nm-buddy")?.className || "";
        const now = read();
        if (now !== last) {
          const gap = performance.now() - lastChange;
          if (gap > longest) { longest = gap; longestAt = t; }
          lastChange = performance.now();
          last = now;
        }
      }
      const gap = performance.now() - lastChange;
      if (gap > longest) { longest = gap; longestAt = 20000; }
      if (20000 - anchorT > calm) { calm = 20000 - anchorT; calmAt = 20000; }
      return { frames, calmMs: Math.round(calm), calmEndsAt: Math.round(calmAt), stillMs: Math.round(longest), jerkPx: +jerk.toFixed(2), jerkAt: Math.round(jerkAt), jerkWhat, jerkCtx, handbackPx: +back.toFixed(2), handbackAt: Math.round(backAt), handbackWhat: backWhat, ...(trace ? { loops } : {}) };
    }, !!process.env.TRACE);
    out[c] = got;
    console.log(c, JSON.stringify(got));
    if (got.calmMs > 1000) fails.push(`${c}: no part moved 0.75px for ${got.calmMs}ms (ending ${got.calmEndsAt}ms)`);
    if (got.stillMs > 1000) fails.push(`${c}: still for ${got.stillMs}ms (ending ${got.stillEndsAt}ms)`);
    if (got.handbackPx > 4) fails.push(`${c}: ${got.handbackWhat} jerked ${got.handbackPx}px at ${got.handbackAt}ms, handing back`);
    await browser.close();
  }
  console.log(JSON.stringify(out));
  console.log(fails.length ? `FAIL\n  ${fails.join('\n  ')}` : 'ok');
  process.exit(fails.length ? 1 : 0);
})();
