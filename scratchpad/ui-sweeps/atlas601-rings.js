// INBOX 601 (the owner: "the celestial rings and planets on it which dont
// move or look different, and the astral swirl around each could have a bit
// of movement or subtle animation as well"). Atlas's large view, each look:
// over 6s, every 100ms, the computed transform, rotate, scale and opacity of
// each ring's frame (far and near half), its dust's turn, each planet's
// frame, glow and swirl; reports how many of each changed, each ring's tilt
// range (degrees), whether a ring's two halves and its planets' frame ever
// differ (they must be one ring), and the same under reduced motion (all
// still), and with the figure off screen (paused).
// Exits 1 when a ring, its dust, a glow or a swirl does not move, the halves
// part, or anything moves under reduced motion.
//   BASE=... THEME=dark node atlas601-rings.js
const { boot } = require('./lib.js');
(async () => {
  const fails = [];
  for (const [mode, opts] of [['on', {}], ['reduced', { reducedMotion: 'reduce' }]]) {
    for (const look of ['masculine', 'feminine']) {
      const { browser, page } = await boot({ viewport: { width: 1280, height: 800 }, ...opts });
      await page.evaluate((look) => { localStorage.setItem('atlas-look', look); document.documentElement.dataset.avatarMotion = 'always'; openNameMarkViewer('Atlas'); }, look);
      await page.waitForTimeout(1200);
      const got = await page.evaluate(async () => {
        const fig = document.querySelector('.nm-viewer .atl-figure-box');
        const groups = {
          frame: '.atl-rings-back .atl-ring-frame', near: '.atl-rings-front .atl-ring-frame', dust: '.atl-ring-spin',
          orbit: '.atl-orbit', glow: '.atl-orbiter-glow', swirl: '.atl-orbiter-swirl',
        };
        const read = (el) => { const cs = getComputedStyle(el); return `${cs.transform}|${cs.rotate}|${cs.scale}|${cs.opacity}`; };
        const els = Object.fromEntries(Object.entries(groups).map(([k, s]) => [k, [...fig.querySelectorAll(s)]]));
        const first = Object.fromEntries(Object.entries(els).map(([k, list]) => [k, list.map(read)]));
        const moved = Object.fromEntries(Object.keys(els).map((k) => [k, new Set()]));
        let parted = 0;
        const tilt = [[], [], []];
        for (let i = 0; i < 60; i += 1) {
          await new Promise((r) => setTimeout(r, 100));
          for (const [k, list] of Object.entries(els)) list.forEach((el, j) => { if (read(el) !== first[k][j]) moved[k].add(j); });
          for (let k = 0; k < 3; k += 1) {
            const vals = [...fig.querySelectorAll(`.atl-ring-frame-${k}, .atl-orbit-${k}`)].map((el) => getComputedStyle(el).transform);
            if (new Set(vals).size > 1) parted += 1;
            const m = new DOMMatrix(vals[0]);
            tilt[k].push((Math.atan2(m.b, m.a) * 180) / Math.PI);
          }
        }
        // Off screen: the loops pause.
        fig.classList.add('atl-off');
        fig.atlasTail && atlasTailWake(fig);
        await new Promise((r) => setTimeout(r, 300));
        const offA = els.frame.map(read).join();
        await new Promise((r) => setTimeout(r, 600));
        const offMoved = els.frame.map(read).join() !== offA;
        return {
          counts: Object.fromEntries(Object.entries(els).map(([k, list]) => [k, `${moved[k].size}/${list.length}`])),
          parted, offMoved,
          tiltRange: tilt.map((t) => +(Math.max(...t) - Math.min(...t)).toFixed(2)),
        };
      });
      console.log(mode, look, JSON.stringify(got));
      for (const [k, v] of Object.entries(got.counts)) {
        const [a, b] = v.split('/').map(Number);
        if (mode === 'on' && a < b) fails.push(`${look}: ${k} ${v} moved`);
        if (mode === 'reduced' && a > 0) fails.push(`${look} reduced: ${k} ${v} moved`);
      }
      if (got.parted) fails.push(`${look} ${mode}: a ring's halves parted ${got.parted} times`);
      if (got.offMoved) fails.push(`${look} ${mode}: the rings moved off screen`);
      await browser.close();
    }
  }
  console.log(fails.length ? `FAIL\n  ${fails.join('\n  ')}` : 'ok');
  process.exit(fails.length ? 1 : 0);
})();
