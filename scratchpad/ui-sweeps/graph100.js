// Brief 100: open, hover, a category hidden and shown, a return to the tab.
// Brief 100 measure: open, hover, leave/return, add. Prints one JSON per phase.
//   BASE=... node measure.js [label]   REDUCED=1 for reduced motion
const { boot } = require('./lib.js');
(async () => {
  const opts = process.env.REDUCED ? { reducedMotion: 'reduce' } : {};
  if (process.env.W) opts.viewport = { width: Number(process.env.W), height: Number(process.env.H || 844) };
  const { browser, page } = await boot(opts);
  try {
    // A rAF logger before the tab opens: frame gaps and what the canvas shows.
    await page.evaluate(() => {
      window.__f = [];
      window.__t0 = performance.now();
      const loop = (now) => {
        const s = typeof gcTab !== 'undefined' ? gcTab : null;
        const c = s && s.canvas;
        const op = c ? Number(getComputedStyle(c).opacity) : 0;
        window.__f.push([now, s && s.timing ? s.timing.frames : 0, op, s && s.timing ? s.timing.firstFrame : 0,
          s ? s.alpha : null, s && s.nodes ? s.nodes.length : 0]);
        if (window.__f.length < 900) requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      switchTab('graph');
    });
    await page.waitForTimeout(9000);
    const open = await page.evaluate(() => {
      const f = window.__f;
      let firstVisible = null, settledAt = null, maxGap = 0, gaps16 = 0, gaps50 = 0;
      for (let i = 1; i < f.length; i++) {
        const gap = f[i][0] - f[i - 1][0];
        maxGap = Math.max(maxGap, gap);
        if (gap > 20) gaps16 += 1;
        if (gap > 50) gaps50 += 1;
        if (firstVisible == null && f[i][1] > 0 && f[i][2] > 0.05 && f[i][5] > 0) firstVisible = f[i][0] - window.__t0;
        if (settledAt == null && firstVisible != null && f[i][4] != null && f[i][4] < 0.01) settledAt = f[i][0] - window.__t0;
      }
      // Opacity ramp: frames between first > 0 and 1.
      const ramp = f.filter((r) => r[2] > 0.02 && r[2] < 0.98).length;
      return { phase: 'open', nodes: gcTab.nodes.length, firstVisibleMs: Math.round(firstVisible), settledMs: Math.round(settledAt),
        frames: f.length, maxGapMs: Math.round(maxGap), gapsOver20: gaps16, gapsOver50: gaps50, opacityRampFrames: ramp,
        draws: gcTab.timing.frames, firstFrameAfterData: Math.round(gcTab.timing.firstFrame) };
    });
    console.log(JSON.stringify(open));
    // Wait for rest.
    for (let i = 0; i < 40; i++) {
      const done = await page.evaluate(() => gcTab.alpha < 0.002 || gcTab.settledSig);
      if (done) break;
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(800);
    // Wrap the draw to time it.
    await page.evaluate(() => {
      window.__d = [];
      const orig = gcDraw;
      gcDraw = function (s) { const t = performance.now(); orig(s); window.__d.push([t, performance.now() - t]); };
    });
    const hover = async (enter) => page.evaluate(async (enter) => {
      const s = gcTab;
      const deg = (n) => (s.adj.get(n.id) || { size: 0 }).size;
      const nodes = s.nodes.filter((n) => Number.isFinite(n.x));
      const hub = window.__hub || nodes.slice().sort((a, b) => deg(b) - deg(a))[0];
      window.__hub = hub;
      const near = s.adj.get(hub.id) || new Set();
      const tt = s.transform, inv = (n) => { const x = n.x * tt.k + tt.x, y = n.y * tt.k + tt.y; return x > 40 && y > 40 && x < s.dims.w - 40 && y < s.dims.h - 40; };
      const far = nodes.find((n) => n.id !== hub.id && !near.has(n.id) && inv(n));
      const farEdge = s.edges.find((e) => e.source.id !== hub.id && e.target.id !== hub.id && inv(e.source) && inv(e.target));
      const t = s.transform;
      const r = s.canvas.getBoundingClientRect();
      const sx = enter ? r.left + hub.x * t.k + t.x : r.left + 5;
      const sy = enter ? r.top + hub.y * t.k + t.y : r.top + 5;
      window.__d = [];
      const series = [];
      const t0 = performance.now();
      s.canvas.dispatchEvent(new PointerEvent(enter ? 'pointermove' : 'pointerleave', { clientX: sx, clientY: sy, bubbles: true, pointerType: 'mouse' }));
      await new Promise((done) => {
        const loop = (now) => {
          series.push([now - t0, far._lit, farEdge._lit, hub._grow || 0, s.hoverEase]);
          if (now - t0 < 500) requestAnimationFrame(loop); else done();
        };
        requestAnimationFrame(loop);
      });
      const process_raw = (ser) => ser.slice(0, 16).map((r) => r.map((v) => +(+v).toFixed(2)).join(',')).join(' ');
      const col = (i) => series.map((row) => row[i]);
      const stats = (vals) => {
        const end = vals[vals.length - 1], start = enter ? (i => vals[0])() : vals[0];
        let maxStep = 0, between = 0, reach = null;
        const span = Math.abs(end - (enter ? 1 : 0)) < 1e-6 && false ? 1 : 1;
        for (let i = 1; i < vals.length; i++) maxStep = Math.max(maxStep, Math.abs(vals[i] - vals[i - 1]));
        const lo = Math.min(...vals), hi = Math.max(...vals);
        for (const v of vals) if (v > lo + 0.05 * (hi - lo) && v < hi - 0.05 * (hi - lo)) between += 1;
        for (let i = 0; i < vals.length; i++) if (Math.abs(vals[i] - end) <= 0.05 * (hi - lo || 1)) { reach = Math.round(series[i][0]); break; }
        return { first: +(vals[0] ?? 0).toFixed(2), end: +(end ?? 0).toFixed(2), between, maxStep: +(maxStep / ((hi - lo) || 1)).toFixed(2), reachMs: reach };
      };
      const d = window.__d.map((x) => x[1]);
      return { phase: enter ? 'hover-in' : 'hover-out', farNode: stats(col(1)), farEdge: stats(col(2)), grow: stats(col(3)),
        raw: process_raw(series), draws: d.length, maxDrawMs: +Math.max(0, ...d).toFixed(1), meanDrawMs: +(d.reduce((a, b) => a + b, 0) / (d.length || 1)).toFixed(1) };
    }, enter);
    console.log(JSON.stringify(await hover(true)));
    await page.waitForTimeout(300);
    console.log(JSON.stringify(await hover(false)));
    // Leave: hide the biggest category, sample what is drawn.
    const leave = async (hide) => page.evaluate(async (hide) => {
      const s = gcTab;
      const counts = new Map();
      for (const n of s.nodes) counts.set(n.category, (counts.get(n.category) || 0) + 1);
      const cat = window.__cat || [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      window.__cat = cat;
      window.__d = [];
      const t0 = performance.now();
      if (hide) graphHiddenCategories.add(cat); else graphHiddenCategories.delete(cat);
      const before = s.nodes.length;
      renderGraph();
      const series = [];
      await new Promise((done) => {
        const loop = (now) => {
          const born = s.nodes.filter((n) => n._born !== undefined).length;
          series.push([now - t0, s.nodes.length, s.leaving ? s.leaving.length : 0, born, s.gliding ? 1 : 0]);
          if (now - t0 < 1500) requestAnimationFrame(loop); else done();
        };
        requestAnimationFrame(loop);
      });
      const swapAt = series.find((r) => r[1] !== before);
      const ghostFrames = series.filter((r) => r[2] > 0).length;
      const bornFrames = series.filter((r) => r[3] > 0).length;
      const d = window.__d.map((x) => x[1]);
      return { phase: hide ? 'hide-category' : 'show-category', cat, before, after: s.nodes.length, swapMs: swapAt ? Math.round(swapAt[0]) : null,
        ghostFrames, maxGhosts: Math.max(...series.map((r) => r[2])), bornFrames, maxBorn: Math.max(...series.map((r) => r[3])),
        draws: d.length, maxDrawMs: +Math.max(0, ...d).toFixed(1) };
    }, hide);
    console.log(JSON.stringify(await leave(true)));
    await page.waitForTimeout(1500);
    console.log(JSON.stringify(await leave(false)));
    await page.waitForTimeout(1500);
    // Re-open: switch away and back (the appear on a return).
    const reopen = await page.evaluate(async () => {
      switchTab('notes');
      await new Promise((r) => setTimeout(r, 600));
      const s = gcTab;
      const prior = new Map(s.nodes.map((n) => [n.id, [n.x, n.y]]));
      const t0 = performance.now();
      switchTab('graph');
      const series = [];
      await new Promise((done) => {
        const loop = (now) => {
          const op = Number(getComputedStyle(s.canvas).opacity);
          let moved = 0;
          for (const n of s.nodes) { const p = prior.get(n.id); if (p) moved = Math.max(moved, Math.hypot(n.x - p[0], n.y - p[1])); }
          series.push([now - t0, op, moved]);
          if (now - t0 < 2000) requestAnimationFrame(loop); else done();
        };
        requestAnimationFrame(loop);
      });
      return { phase: 'reopen', maxMoveWorld: Math.round(Math.max(...series.map((r) => r[2]))), opacityFrames: series.filter((r) => r[1] > 0.02 && r[1] < 0.98).length,
        firstOpaqueMs: Math.round((series.find((r) => r[1] > 0.98) || [null])[0]) };
    });
    console.log(JSON.stringify(reopen));
  } finally {
    await browser.close();
  }
})();
