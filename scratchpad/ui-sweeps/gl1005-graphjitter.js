// gl1005: INBOX 586, "the graph is a little jittery when nodes move around or
// adjust position". Samples 20 notes' screen positions on every animation
// frame, (a) through a settle (Tree, then back to Force, so the force layout
// relaxes from the tree's shape) and (b) after a drag is released, and reads
// the motion: how many frames in the middle of the motion show no movement at
// all (judder: the draw and the simulation out of step), how often a note's
// direction flips from one frame to the next (oscillation), the largest
// single-frame step against the median one (snaps), and how often the camera
// itself moved (a refit mid-settle).
//   BASE=http://127.0.0.1:8861 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   [VIEWPORT=390x844] [THEME=dark] node gl1005-graphjitter.js
const { boot } = require("./lib.js");
const [W, H] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
(async () => {
  const { page, browser } = await boot({ viewport: { width: W, height: H } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  await page.evaluate(() => localStorage.setItem("graph-layout", "force"));
  await page.evaluate(() => document.getElementById("tab-btn-graph")?.click());
  await page.waitForFunction(() => window.__graphDebug && window.__graphDebug.nodes > 0, null, { timeout: 60000 });
  const settle = async () => {
    for (let i = 0; i < 40; i++) {
      const t0 = await page.evaluate(() => window.__graphDebug.ticks);
      await page.waitForTimeout(800);
      if ((await page.evaluate(() => window.__graphDebug.ticks)) === t0) return;
    }
  };
  await settle();
  // Record on every animation frame for `ms`, after `action` runs.
  const record = (ms) =>
    page.evaluate(
      (ms) =>
        new Promise((resolve) => {
          const ids = graphNodesRef.filter((n) => /^\d+$/.test(String(n.id))).slice(0, 20).map((n) => n.id);
          const frames = [];
          const t0 = performance.now();
          const step = () => {
            const g = window.__graphDebug;
            const t = g.transform;
            const byId = new Map(graphNodesRef.map((n) => [n.id, n]));
            frames.push({
              at: performance.now() - t0,
              t: [t.x, t.y, t.k],
              ticks: g.ticks,
              pts: ids.map((id) => {
                const n = byId.get(id);
                return n ? [n.x * t.k + t.x, n.y * t.k + t.y] : null;
              }),
            });
            if (performance.now() - t0 < ms) requestAnimationFrame(step);
            else resolve(frames);
          };
          requestAnimationFrame(step);
        }),
      ms
    );
  const read = (frames) => {
    const steps = [];
    let still = 0, moving = 0, flips = 0, pairs = 0, cam = 0;
    let lastMoving = -1, firstMoving = -1;
    const per = frames.map((f, i) => {
      if (!i) return 0;
      const p = frames[i - 1];
      if (f.t.some((v, k) => Math.abs(v - p.t[k]) > (k === 2 ? 1e-4 : 0.01))) cam += 1;
      let m = 0;
      f.pts.forEach((q, j) => {
        const r = p.pts[j];
        if (q && r) m = Math.max(m, Math.hypot(q[0] - r[0], q[1] - r[1]));
      });
      return m;
    });
    per.forEach((m, i) => {
      if (m > 0.05) {
        if (firstMoving < 0) firstMoving = i;
        lastMoving = i;
      }
    });
    for (let i = Math.max(1, firstMoving); i <= lastMoving; i++) {
      if (per[i] > 0.05) {
        moving += 1;
        steps.push(per[i]);
      } else still += 1;
    }
    // Direction flips: per note, the sign of its x step against the last
    // frame it moved in, counted only for steps over half a pixel.
    for (let j = 0; j < (frames[0]?.pts.length || 0); j++) {
      let prev = 0;
      for (let i = Math.max(1, firstMoving); i <= lastMoving; i++) {
        const a = frames[i - 1].pts[j], b = frames[i].pts[j];
        if (!a || !b) continue;
        const dx = b[0] - a[0];
        if (Math.abs(dx) < 0.5) continue;
        if (prev && Math.sign(dx) !== Math.sign(prev)) flips += 1;
        pairs += 1;
        prev = dx;
      }
    }
    // Unevenness: how much one frame's step differs from the frame before's,
    // as a share of the two (0 is perfectly even motion; a judder of
    // 2, 0, 1, 2, 0 steps reads near 1). The median over the motion.
    const ratios = [];
    for (let i = Math.max(2, firstMoving + 1); i <= lastMoving; i++) {
      const m = (per[i] + per[i - 1]) / 2;
      if (m > 0.3) ratios.push(Math.abs(per[i] - per[i - 1]) / m);
    }
    ratios.sort((a, b) => a - b);
    const uneven = ratios.length ? Math.round(ratios[Math.floor(ratios.length / 2)] * 100) / 100 : 0;
    const uneven90 = ratios.length ? Math.round(ratios[Math.floor(ratios.length * 0.9)] * 100) / 100 : 0;
    steps.sort((a, b) => a - b);
    const median = steps.length ? steps[Math.floor(steps.length / 2)] : 0;
    return {
      frames: frames.length,
      motionFrames: moving + still,
      stillShare: moving + still ? Math.round((still / (moving + still)) * 100) / 100 : 0,
      flipShare: pairs ? Math.round((flips / pairs) * 100) / 100 : 0,
      uneven,
      uneven90,
      maxStep: Math.round((steps[steps.length - 1] || 0) * 10) / 10,
      medianStep: Math.round(median * 10) / 10,
      cameraMoves: cam,
      ticks: (frames[frames.length - 1]?.ticks || 0) - (frames[0]?.ticks || 0),
    };
  };
  // (a) A settle from the tree's shape.
  await page.evaluate(() => {
    localStorage.setItem("graph-layout", "tree");
    renderGraph();
  });
  await page.waitForTimeout(800);
  const settleRec = page.evaluate(() => {
    localStorage.setItem("graph-layout", "force");
    graphAutoFitDone = true; // hold the camera: the motion of the notes is what is measured
    renderGraph();
  });
  const a = read(await record(4000));
  await settleRec;
  await settle();
  // (b) A drag released.
  const pos = await page.evaluate(() => {
    const t = window.__graphDebug.transform;
    const r = document.getElementById("graph-canvas").getBoundingClientRect();
    const n = graphNodesRef.find((m) => /^\d+$/.test(String(m.id)) && r.left + m.x * t.k + t.x > r.left + 80 && r.left + m.x * t.k + t.x < r.right - 160 && r.top + m.y * t.k + t.y > r.top + 80 && r.top + m.y * t.k + t.y < r.bottom - 80);
    return [r.left + n.x * t.k + t.x, r.top + n.y * t.k + t.y];
  });
  await page.mouse.move(pos[0], pos[1]);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(pos[0] + i * 8, pos[1] + i * 4);
  const recP = record(3000);
  await page.mouse.up();
  const b = read(await recP);
  console.log(JSON.stringify({ viewport: `${W}x${H}`, settle: a, release: b, errors }));
  await browser.close();
})();
