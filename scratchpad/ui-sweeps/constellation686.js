// INBOX 686: the Notebook constellation's Regenerate glides rather than
// redrawing in one frame. Measures, per frame, every star's step as a share
// of its whole journey (the owner's bound: no step over about 1/8), the same
// through an interrupted Regenerate, that Save PNG mid-glide saves the
// settled sky, and the cross-fade under Interface animations off and under
// reduced motion. Also a pixel measure that works on the old code too: the
// largest share of the whole picture's change that lands in one frame.
//
//   BASE=http://127.0.0.1:8825 THEME=dark node scratchpad/ui-sweeps/constellation686.js
//   OVERRIDE_JS=dashboard.js=/tmp/base-dashboard.js ...   (the old instant redraw)
//
// The stats are real, with their categories replaced by five of known size, so
// the sky has clusters to move whatever the data dir holds.
const { boot } = require('./lib.js');

const CATS = [
  { name: 'Work', count: 30 }, { name: 'Home', count: 18 }, { name: 'Ideas', count: 12 },
  { name: 'Reading', count: 8 }, { name: 'Health', count: 4 },
];

async function open(opts) {
  const { browser, ctx, page } = await boot(opts);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await ctx.route('**/insights/stats*', async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    body.categories = CATS;
    body.total_entries = CATS.reduce((n, c) => n + c.count, 0);
    await route.fulfill({ response: res, json: body });
  });
  // An empty notebook shows one getting-started card and no widgets, so a
  // fresh data dir gets three notes first.
  await page.evaluate(async () => {
    const have = await apiJson('/entries?limit=1').catch(() => []);
    if (!(Array.isArray(have) ? have.length : (have.items || have.entries || []).length)) {
      for (const content of ['Constellation sweep one', 'Constellation sweep two', 'Constellation sweep three']) {
        await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) });
      }
    }
    switchTab('dashboard');
    const l = dashLayout();
    if (!l.order.includes('art')) l.order.unshift('art');
    l.hidden = l.hidden.filter((h) => h !== 'art');
    await saveDashLayout(l);
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  if (await page.isVisible('#lock-password').catch(() => false)) {
    await page.fill('#lock-password', 'testpassword123');
    await page.click('#lock-submit');
  }
  await page.waitForTimeout(2500);
  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForFunction(() => document.querySelector('.art-holder canvas'), null, { timeout: 20000, polling: 200 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('[data-widget="art"]').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  return { browser, page, errs };
}

// Starts a per-frame recorder: star positions (new code) and a small pixel
// signature of the canvas (both codes), each with its timestamp.
async function record(page) {
  await page.evaluate(() => {
    window.__f = [];
    const grab = () => {
      const c = document.querySelector('.art-holder canvas');
      let px = null;
      if (c) {
        // A 60x44 thumbnail is plenty for "how much of the picture changed".
        const t = document.createElement('canvas'); t.width = 60; t.height = 44;
        const g = t.getContext('2d'); g.drawImage(c, 0, 0, 60, 44);
        px = Array.from(g.getImageData(0, 0, 60, 44).data.filter((_, i) => i % 4 !== 3));
      }
      const stars = typeof artInstance !== 'undefined' && artInstance && artInstance.artStars
        ? artInstance.artStars().map((s) => [s.cat + '#' + s.idx, s.x, s.y, s.vis]) : null;
      window.__f.push({ t: performance.now(), stars, px, canvas: c });
    };
    const loop = () => { grab(); if (window.__rec) requestAnimationFrame(loop); };
    window.__rec = true; requestAnimationFrame(loop);
  });
}
async function stop(page) {
  return page.evaluate(() => {
    window.__rec = false;
    const canvases = [];
    return window.__f.map((f) => {
      let ci = canvases.indexOf(f.canvas); if (ci < 0) { canvases.push(f.canvas); ci = canvases.length - 1; }
      return { t: f.t, stars: f.stars, px: f.px, ci };
    });
  });
}
// Clicked in the page so the click's own time is known to the frame: a
// Playwright click spends tens of ms on actionability first, and frames in
// that gap would be counted as the glide's.
const clickRegen = (page) => page.evaluate(() => {
  const at = performance.now();
  document.querySelector('[data-widget="art"] button[title="A fresh arrangement of the same notes"]').click();
  return at;
});

function pixelShare(frames, i0, i1) {
  const d = (a, b) => { let s = 0; for (let k = 0; k < a.length; k++) s += Math.abs(a[k] - b[k]); return s / a.length; };
  const total = d(frames[i0].px, frames[i1].px);
  // The old Regenerate tore the canvas down and awaited the stats before
  // mounting another: frames with no canvas at all are counted, and the step
  // across them is measured canvas to canvas.
  let max = 0; let blank = 0; let prev = frames[i0].px;
  for (let k = i0 + 1; k <= i1; k++) {
    if (!frames[k].px) { blank++; continue; }
    max = Math.max(max, d(prev, frames[k].px)); prev = frames[k].px;
  }
  return { total: +total.toFixed(2), maxFrame: +max.toFixed(2), share: +(max / (total || 1)).toFixed(3), blankFrames: blank };
}

// Per star: the step between consecutive frames as a share of that star's
// whole journey (start frame to the settled frame), and the same scaled to a
// 60 Hz frame by the frame's own duration, since a headless frame can be late.
function starSteps(frames, i0, i1) {
  const at = (f) => new Map(f.stars.map(([k, x, y, v]) => [k, { x, y, v }]));
  const start = at(frames[i0]); const end = at(frames[i1]);
  let maxShare = 0; let maxShare60 = 0; let maxPx = 0; let journeys = []; let worst = null;
  for (const [k, e] of end) {
    const s = start.get(k); if (!s) continue;
    const dist = Math.hypot(e.x - s.x, e.y - s.y);
    journeys.push(dist);
    if (dist < 20) continue; // a star that barely moves is all drift
    for (let i = i0 + 1; i <= i1; i++) {
      const a = at(frames[i - 1]).get(k); const b = at(frames[i]).get(k);
      if (!a || !b) continue;
      const step = Math.hypot(b.x - a.x, b.y - a.y);
      const dt = frames[i].t - frames[i - 1].t;
      maxPx = Math.max(maxPx, step);
      if (step / dist > maxShare) { maxShare = step / dist; worst = { k, i: i - i0, step: +step.toFixed(1), dist: +dist.toFixed(1), dt: +dt.toFixed(1) }; }
      maxShare60 = Math.max(maxShare60, (step / dist) * (16.7 / Math.max(dt, 16.7)));
    }
  }
  if (worst && process.env.DEBUG) {
    const series = [];
    for (let i = i0 + 1; i <= i1; i++) {
      const a = at(frames[i - 1]).get(worst.k); const b = at(frames[i]).get(worst.k);
      if (a && b) series.push([+(frames[i].t - frames[i - 1].t).toFixed(0), +Math.hypot(b.x - a.x, b.y - a.y).toFixed(1)]);
    }
    console.error('worst series [dt, step]:', JSON.stringify(series));
  }
  journeys.sort((a, b) => a - b);
  return { stars: journeys.length, medianJourney: +(journeys[journeys.length >> 1] || 0).toFixed(1),
    maxStepShare: +maxShare.toFixed(3), maxStepShareAt60: +maxShare60.toFixed(3), maxStepPx: +maxPx.toFixed(1), worst };
}

(async () => {
  const theme = process.env.THEME || 'light';
  const result = { theme };
  {
    const { browser, page, errs } = await open();
    const modern = await page.evaluate(() => !!(artInstance && artInstance.artStars));
    result.modern = modern;
    // 1. One Regenerate, recorded from just before the click to well after it settles.
    await record(page);
    await page.waitForTimeout(150);
    const clickAt = await clickRegen(page);
    await page.waitForTimeout(1400);
    let frames = await stop(page);
    const i0 = frames.findIndex((f) => f.t >= clickAt) - 1;
    const i1 = frames.length - 1;
    const dts = frames.slice(i0 + 1).map((f, k) => f.t - frames[i0 + k].t);
    result.frames = { n: i1 - i0, medianDt: +dts.sort((a, b) => a - b)[dts.length >> 1].toFixed(1), canvases: new Set(frames.map((f) => f.ci)).size };
    result.pixels = pixelShare(frames, i0, i1);
    if (modern) {
      result.glide = starSteps(frames, i0, i1);
      // When the stars stopped travelling: the last frame where any star still
      // moved more than a pixel beyond its drift.
      const moving = frames.map((f, i) => (i <= i0 || !f.stars ? 0 : Math.max(...f.stars.map(([k, x, y], j) => {
        const p = frames[i - 1].stars.find((s) => s[0] === k); return p ? Math.hypot(x - p[1], y - p[2]) : 0;
      }))));
      const last = moving.reduce((acc, m, i) => (m > 1 ? i : acc), i0);
      result.glide.settledMs = Math.round(frames[last].t - clickAt);

      // 2. Interrupted: a second Regenerate 300 ms into the first.
      await page.waitForTimeout(400);
      await record(page);
      await clickRegen(page);
      await page.waitForTimeout(300);
      const second = await clickRegen(page);
      await page.waitForTimeout(1400);
      frames = await stop(page);
      const j0 = frames.findIndex((f) => f.t >= second) - 1;
      result.interrupted = starSteps(frames, j0, frames.length - 1);
      // No spike at the interrupt: the largest step of any star in the five
      // frames after the second click against the five before it.
      const stepMax = (from, to) => {
        let m = 0;
        for (let i = Math.max(1, from); i <= Math.min(to, frames.length - 1); i++) {
          const a = new Map(frames[i - 1].stars.map((x) => [x[0], x]));
          for (const b of frames[i].stars) { const q = a.get(b[0]); if (q) m = Math.max(m, Math.hypot(b[1] - q[1], b[2] - q[2])); }
        }
        return +m.toFixed(1);
      };
      result.interrupted.stepPxBefore = stepMax(j0 - 4, j0);
      result.interrupted.stepPxAfter = stepMax(j0 + 1, j0 + 5);

      // 3. Save PNG mid-glide: what the save drew against what settles.
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const inst = artInstance; const orig = inst.saveCanvas;
        inst.saveCanvas = function () {
          window.__saved = inst.artStars().map((s) => [s.cat + '#' + s.idx, s.x, s.y]);
          window.__savedDataUrl = inst.drawingContext.canvas.toDataURL().length;
        };
        window.__restore = () => { inst.saveCanvas = orig; };
      });
      await clickRegen(page);
      await page.waitForTimeout(200);
      const mid = await page.evaluate(() => {
        const shown = artInstance.artStars().map((s) => [s.cat + '#' + s.idx, s.x, s.y]);
        document.querySelector('[data-widget="art"] button[title="Save this artwork as an image"]').click();
        const after = artInstance.artStars().map((s) => [s.cat + '#' + s.idx, s.x, s.y]);
        return { shown, after, saved: window.__saved };
      });
      await page.waitForTimeout(1200);
      const settled = await page.evaluate(() => artInstance.artStars().map((s) => [s.cat + '#' + s.idx, s.x, s.y]));
      await page.evaluate(() => window.__restore());
      const dist = (a, b) => Math.max(...a.map(([k, x, y]) => { const o = b.find((s) => s[0] === k); return Math.hypot(x - o[1], y - o[2]); }));
      result.savePng = {
        savedVsSettledMaxPx: +dist(mid.saved, settled).toFixed(1), // drift only: a few px
        shownVsSettledMaxPx: +dist(mid.shown, settled).toFixed(1), // mid-glide: far
        frameRestoredMaxPx: +dist(mid.after, mid.shown).toFixed(1), // the picture on screen is put back
      };

      // 4. Interface animations off: a quick cross-fade.
      await page.evaluate(() => { document.documentElement.dataset.uiMotion = 'off'; });
      await record(page);
      await page.waitForTimeout(100);
      const offAt = await clickRegen(page);
      await page.waitForTimeout(700);
      frames = await stop(page);
      const k0 = frames.findIndex((f) => f.t >= offAt) - 1;
      const share = pixelShare(frames, k0, frames.length - 1);
      const fadeFrames = frames.slice(k0 + 1).filter((f, i) => {
        const a = frames[k0 + i].px; let s = 0; for (let q = 0; q < a.length; q++) s += Math.abs(a[q] - f.px[q]); return s / a.length > share.total * 0.05;
      });
      result.uiMotionOff = { ...share, framesChanging: fadeFrames.length, spanMs: fadeFrames.length ? Math.round(fadeFrames[fadeFrames.length - 1].t - fadeFrames[0].t) : 0 };
      await page.evaluate(() => { document.documentElement.dataset.uiMotion = 'on'; });
    }
    result.errs = errs;
    await browser.close();
  }
  if (result.modern) {
    // 5. Reduced motion: a still sky; Regenerate cross-fades, then stops drawing.
    const { browser, page, errs } = await open({ reducedMotion: 'reduce' });
    await page.evaluate(() => {
      window.__draws = 0; const inst = artInstance; const d = inst.draw;
      inst.draw = function () { window.__draws++; return d.apply(this, arguments); };
    });
    await record(page);
    await page.waitForTimeout(100);
    const at = await clickRegen(page);
    await page.waitForTimeout(600);
    const draws = await page.evaluate(() => window.__draws);
    await page.waitForTimeout(600);
    const drawsLater = await page.evaluate(() => window.__draws);
    const frames = await stop(page);
    const r0 = frames.findIndex((f) => f.t >= at) - 1;
    result.reduced = { ...pixelShare(frames, r0, frames.length - 1), drawsDuringFade: draws, drawsAfter: drawsLater - draws };
    result.reducedErrs = errs;
    await browser.close();
  }
  console.log(JSON.stringify(result, null, 1));
})();
