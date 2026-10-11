// Which pixels pop on a hover: per pixel, the largest one-frame step as a
// share of its whole change from rest to end. Pop = step > 70% of change.
//   BASE=... node popscan.js [in|out]   writes pop-<phase>.png (red = pop, green = eased)
const { boot } = require('./lib.js');
const fs = require('fs');
(async () => {
  const opts = process.env.REDUCED ? { reducedMotion: 'reduce' } : {};
  const { browser, page } = await boot(opts);
  try {
    await page.evaluate(() => switchTab('graph'));
    for (let i = 0; i < 200; i++) {
      await page.waitForTimeout(250);
      if (await page.evaluate(() => gcTab.nodes.length && gcTab.settledSig)) break;
    }
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.__fake = performance.now() + 1000;
      performance.now = () => window.__fake;
      gcTab.drawQueued = true;
      gcTab.userZoomed = true; gcTab.fitCheck = 0;
      window.__step = () => { window.__fake += 16.7; gcTab.drawQueued = false; const q = gcTab; q.drawQueued = true; gcDraw(q); };
    });
    for (const phase of (process.env.PHASES || 'in,out').split(',')) {
      await page.evaluate((phase) => {
        const s = gcTab;
        const deg = (n) => (s.adj.get(n.id) || { size: 0 }).size;
        const hub = window.__hub || s.nodes.slice().sort((a, b) => deg(b) - deg(a))[0];
        window.__hub = hub;
        const t = s.transform;
        const r = s.canvas.getBoundingClientRect();
        const W = s.canvas.width, H = s.canvas.height, STEP = 2;
        const ctx = s.ctx;
        const grab = () => {
          const d = ctx.getImageData(0, 0, W, H).data;
          const out = new Int16Array(Math.ceil(W / STEP) * Math.ceil(H / STEP));
          let o = 0;
          for (let y = 0; y < H; y += STEP) for (let x = 0; x < W; x += STEP) { const i = (y * W + x) * 4; const a = d[i + 3]; out[o++] = Math.round(((d[i] + d[i + 1] + d[i + 2]) * a + 765 * (255 - a)) / 255); }
          return out;
        };
        window.__g = { grab, frames: [grab()], W, H, STEP };
        if (phase === 'in') s.canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + hub.x * t.k + t.x, clientY: r.top + hub.y * t.k + t.y, bubbles: true }));
        else if (phase === 'out') s.canvas.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
        else {
          const counts = new Map();
          for (const n of s.nodes) counts.set(n.category, (counts.get(n.category) || 0) + 1);
          const cat = window.__cat || [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
          window.__cat = cat;
          window.__before = s.nodes.length;
          window.__t0 = [s.transform.k, s.transform.x, s.transform.y, s.dims.w, s.dims.h].map((v) => +v.toFixed(2));
          if (phase === 'hide') graphHiddenCategories.add(cat); else graphHiddenCategories.delete(cat);
          renderGraph();
        }
      }, phase);
      if (phase === 'hide' || phase === 'show') {
        await page.waitForFunction(() => gcTab.nodes.length !== window.__before, null, { timeout: 30000, polling: 20 });
        console.log(JSON.stringify(await page.evaluate(() => ({ t: [gcTab.transform.k, gcTab.transform.x, gcTab.transform.y].map((v) => +v.toFixed(2)), t0: window.__t0, dims: [gcTab.dims.w, gcTab.dims.h], uz: gcTab.userZoomed, leaving: gcTab.leaving ? gcTab.leaving.ghosts.length : 0, lines: !!(gcTab.leaving && gcTab.leaving.lines), born: gcTab.nodes.filter((n) => n._born !== undefined).length }))));
      }
      await page.evaluate(() => { for (let f = 0; f < 36; f++) { window.__step(); window.__g.frames.push(window.__g.grab()); } });
      const res = await page.evaluate((phase) => {
        const { frames, W, H, STEP } = window.__g;
        const times = frames.map((_, i) => i * 16);
        const n = frames[0].length, last = frames[frames.length - 1];
        let changed = 0, pops = 0;
        const mask = new Uint8Array(n);
        // Sparks move by design; skip pixels whose change is not monotone-ish.
        for (let p = 0; p < n; p++) {
          const total = Math.abs(last[p] - frames[0][p]);
          if (total < 90) continue;
          let maxStep = 0;
          for (let f = 1; f < frames.length; f++) maxStep = Math.max(maxStep, Math.abs(frames[f][p] - frames[f - 1][p]));
          changed++;
          if (maxStep > 0.7 * total) { pops++; mask[p] = 2; } else mask[p] = 1;
        }
        return { phase, frames: frames.length, times: times.join(','), changed, pops, popShare: +(pops / (changed || 1)).toFixed(2),
          w: Math.ceil(W / STEP), h: Math.ceil(H / STEP), mask: Array.from(mask).join(''), f0: Array.from(frames[0]).map((v) => Math.round(v / 3)), f1: Array.from(frames[1]).map((v) => Math.round(v / 3)), fl: Array.from(last).map((v) => Math.round(v / 3)) };
      }, phase);
      const { mask, w, h, f0, f1, fl, ...rest } = res;
      for (const [nm, fr] of [['f0', f0], ['f1', f1], ['fl', fl]]) fs.writeFileSync(`${process.env.OUT || '.'}/${phase}-${nm}.pgm`, Buffer.concat([Buffer.from(`P5 ${w} ${h} 255\n`), Buffer.from(fr)]));
      console.log(JSON.stringify(rest));
      // PGM-ish via PPM, viewable after convert.
      const buf = Buffer.alloc(w * h * 3, 255);
      for (let i = 0; i < w * h; i++) {
        if (mask[i] === '2') { buf[i * 3] = 220; buf[i * 3 + 1] = 0; buf[i * 3 + 2] = 0; }
        else if (mask[i] === '1') { buf[i * 3] = 0; buf[i * 3 + 1] = 160; buf[i * 3 + 2] = 0; }
      }
      fs.writeFileSync(`${process.env.OUT || '.'}/pop-${phase}.ppm`, Buffer.concat([Buffer.from(`P6 ${w} ${h} 255\n`), buf]));
      await page.waitForTimeout(800);
    }
  } finally {
    await browser.close();
  }
})();
