// The graph's hover, frame by frame (the owner, 2026-10-04: "when I hover over
// parts of the graph, the labels and stuff just suddenly appear and it is very
// visually confronting").
//
// Hovers a hub, then leaves it, dispatching the pointer events in the page so
// the clock starts at the event, and samples the canvas on every animation
// frame for 420ms after each:
//
//   dimNode   a non-neighbour dot's centre pixel, as the share of the way it
//             has travelled from its resting colour to where it ends (0..1)
//   label     dark ink pixels inside a non-neighbour's placed label box, as a
//             share of the resting count (1 at rest, 0 once it has gone)
//   hubLabel  ink pixels inside the hovered hub's own label box
//   edge      a non-neighbour link's midpoint pixel, share travelled
//
// A pop is a series whose first sampled frame is already at its end value;
// a fade is a run of in-between values over 150 to 200ms. Prints JSON per
// phase with frames, ms to reach 95%, and the largest single-frame step.
//
//   BASE=http://127.0.0.1:8795 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/graphfade.js        (seed: graphlook.js first)
//   REDUCED=1 measures under prefers-reduced-motion (expect one-frame steps).
const { boot } = require('./lib.js');

(async () => {
  const opts = process.env.REDUCED ? { reducedMotion: 'reduce' } : {};
  const { browser, page } = await boot(opts);
  try {
    await page.evaluate(() => switchTab('graph'));
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(250);
      const done = await page.evaluate(() => gcTab.nodes.length && gcTab.ticks > 5 && gcTab.alpha < 0.002);
      if (done) break;
    }
    await page.waitForTimeout(1500);
    const out = await page.evaluate(async () => {
      const s = gcTab;
      const t = s.transform;
      const rect = s.canvas.getBoundingClientRect();
      const dpr = s.canvas.width / rect.width;
      const deg = (n) => (s.adj.get(n.id) || { size: 0 }).size;
      const nodes = s.nodes.filter((n) => Number.isFinite(n.x));
      const hub = nodes.slice().sort((a, b) => deg(b) - deg(a))[0];
      const near = s.adj.get(hub.id) || new Set();
      const boxes = new Map((s.labelBoxes || []).map((b) => [b.id, b]));
      const far = nodes.filter((n) => n.id !== hub.id && !near.has(n.id));
      const farDot = far.sort((a, b) => b.r - a.r)[0];
      const farLabel = far.find((n) => boxes.has(n.id));
      const farEdge = s.edges.find((e) => e.kind !== 'similar' && e.source && e.target
        && e.source.id !== hub.id && e.target.id !== hub.id
        && Math.hypot(e.source.x - e.target.x, e.source.y - e.target.y) * t.k > 60);
      const ctx = s.canvas.getContext('2d');
      const px = (wx, wy) => {
        const x = Math.round((wx * t.k + t.x) * dpr);
        const y = Math.round((wy * t.k + t.y) * dpr);
        return [...ctx.getImageData(x, y, 1, 1).data];
      };
      // Dark ink inside a world box: the label fill is --ink, which is far
      // darker (light) or lighter (dark) than anything else drawn there.
      const dark = document.documentElement.dataset.mode === 'dark';
      const ink = (box) => {
        if (!box) return 0;
        const x = Math.round((box.left * t.k + t.x) * dpr);
        const y = Math.round((box.top * t.k + t.y) * dpr);
        const w = Math.max(1, Math.round((box.right - box.left) * t.k * dpr));
        const h = Math.max(1, Math.round((box.bottom - box.top) * t.k * dpr));
        const d = ctx.getImageData(x, y, w, h).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) {
          const lum = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * (d[i + 3] / 255);
          // Summed, not thresholded: a threshold reads a linear fade as a
          // cliff, since every glyph pixel crosses it at about one alpha.
          n += dark ? lum : 255 - lum;
        }
        return n;
      };
      // A curved link's middle is the quadratic's, a quarter of each end and
      // half the control point.
      let mid = farEdge ? { x: (farEdge.source.x + farEdge.target.x) / 2, y: (farEdge.source.y + farEdge.target.y) / 2 } : null;
      if (farEdge && gcCurvedLinks(s)) {
        const c = gcBowPoint(farEdge.source, farEdge.target);
        mid = { x: 0.25 * farEdge.source.x + 0.5 * c.x + 0.25 * farEdge.target.x, y: 0.25 * farEdge.source.y + 0.5 * c.y + 0.25 * farEdge.target.y };
      }
      const sample = () => ({
        dimNode: px(farDot.x, farDot.y),
        edge: mid ? px(mid.x, mid.y) : null,
        label: ink(farLabel ? boxes.get(farLabel.id) : null),
      });
      const fire = (type) => {
        const sx = rect.left + hub.x * t.k + t.x;
        const sy = rect.top + hub.y * t.k + t.y;
        s.canvas.dispatchEvent(new PointerEvent(type, { clientX: sx, clientY: sy, bubbles: true }));
      };
      const run = async (type) => {
        const frames = [];
        const t0 = performance.now();
        fire(type);
        while (performance.now() - t0 < 420) {
          await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
          const smp = sample();
          smp.ms = performance.now() - t0;
          smp.hubLabel = ink(hubBox);
          frames.push(smp);
        }
        return frames;
      };
      // The hub's label is measured in one fixed box, the one it fills while
      // hovered (the whole title, wider than the resting one), found by a
      // hover before the measured one.
      let hubBox = null;
      fire('pointermove');
      await new Promise((r) => setTimeout(r, 400));
      hubBox = s.labelBoxes.find((b) => b.id === hub.id);
      fire('pointerleave');
      await new Promise((r) => setTimeout(r, 400));
      const rest = sample();
      rest.hubLabel = ink(hubBox);
      const enter = await run('pointermove');
      await new Promise((r) => setTimeout(r, 300));
      const held = sample();
      held.hubLabel = ink(hubBox);
      const leave = await run('pointerleave');
      return { rest, held, enter, leave, hub: hub.preview, farLabel: farLabel?.preview, edge: Boolean(farEdge) };
    });
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]);
    const series = (frames, key, from, to) => frames.map((f) => {
      if (key === 'label' || key === 'hubLabel') {
        const span = to[key] - from[key];
        return span ? (f[key] - from[key]) / span : 1;
      }
      if (!from[key] || !to[key]) return 1;
      const span = dist(from[key], to[key]);
      return span ? Math.min(1, dist(from[key], f[key]) / span) : 1;
    });
    const report = (name, frames, from, to) => {
      const row = { phase: name };
      for (const key of ['dimNode', 'edge', 'label', 'hubLabel']) {
        const v = series(frames, key, from, to);
        let reach = null;
        let step = 0;
        let prev = 0;
        v.forEach((x, i) => {
          if (reach === null && x >= 0.95) reach = Math.round(frames[i].ms);
          step = Math.max(step, x - prev);
          prev = x;
        });
        const inBetween = v.filter((x) => x > 0.05 && x < 0.95).length;
        row[key] = { reach95ms: reach, maxStep: +step.toFixed(2), inBetweenFrames: inBetween, first: +v[0].toFixed(2) };
      }
      return row;
    };
    console.log(JSON.stringify({ hub: out.hub, farLabel: out.farLabel, restInk: out.rest.label, hubInkHeld: out.held.hubLabel }));
    console.log(JSON.stringify(report('enter', out.enter, out.rest, out.held)));
    console.log(JSON.stringify(report('leave', out.leave, out.held, out.rest)));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
