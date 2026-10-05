// The feminine Atlas's lustre (INBOX 550, 554, 555, 556, 559, 563), as
// numbers.
//
//   BASE=http://127.0.0.1:8823 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     SCRATCH=/tmp/x REF_DIR=/tmp/x/base node scratchpad/ui-sweeps/atlasluster.js
//   PART=fringe,wisps,dress,tail,hair,body,gap,masc,motion,cost  (default: all)
//   RUNS=3        frame-cost runs (median)
//   REF_DIR=dir   atlas.js and 08-consistency.css from before, served in
//                 place of the app's (lib.js's OVERRIDE_*) for every "before"
//
// `turn` everywhere is the largest change of direction along an outline per
// 0.1 unit of length, in degrees: a hard point turns 120 or more in one
// step, a round end of radius 0.25 about 25.
// - fringe: every `.atl-fringe-lock` in a full drawing, its turn and its
//   tip's width over its root's (from the outline: twice the distance from
//   the centreline to the nearest outline point); the cap's own turn.
// - wisps: per wisp, its front and back runs, the largest turn over its
//   cores, its widths at 3%, 30% and 97% along, the alpha its cores paint on
//   a clear page along its centreline (the ends near 0); the glints, their
//   sizes; in the companion, whether the back runs' layer is under the body.
// - dress: its outline's turn, the overlap (IoU) of its shape with
//   REF_DIR's, its parts, and any stroke on it (none: no outline).
// - tail (INBOX 565): her comet tail's length now over before, its tip's
//   width, its filaments and their paint beside the wings'.
// - hair (INBOX 567): her locks, their largest turn, and the pixels midway
//   between neighbouring locks in the companion (the page in none).
// - body: the head's height over the figure's (head top to the lowest point
//   of the body), the face's height over its width, her hips over her
//   shoulders; now and before.
// - gap (INBOX 555): pixels along the hair's outer arc, 0.8 inside it, in
//   the companion at 6x on a magenta page, three moods, four phases of every
//   running loop: how many are the page's colour (none should be).
// - masc: the masculine figure's layers, markup now and before: which
//   differ (only the head may, INBOX 563), and 6x pixels.
// - motion: her figure's loops (name and period) with motion on, and how
//   many of the INBOX 550 and 554 loops run under reduced motion and Off.
// - cost: main-thread time (CDP TaskDuration) over 8s with her companion
//   figure, and separately a 208px full mark, minus the page without; now
//   and before, interleaved.
const { boot } = require('./lib.js');
const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const PARTS = (process.env.PART || 'fringe,wisps,dress,tail,hair,body,gap,masc,motion,cost').split(',');
const RUNS = Number(process.env.RUNS || 3);
const REF_DIR = process.env.REF_DIR || '';
const SCRATCH = process.env.SCRATCH || '/tmp';
const PY = process.env.PY || '/home/user/MemoryMap-AI/.venv/bin/python';
//: Pixels that differ between two PNGs (the count); the alpha at given
//: device pixels, the largest in a 3x3 patch; the RGB at given pixels.
const DIFF = 'import sys\nfrom PIL import Image, ImageChops\na=Image.open(sys.argv[1]).convert("RGBA");b=Image.open(sys.argv[2]).convert("RGBA")\nprint(-1 if a.size!=b.size else sum(1 for p in ImageChops.difference(a,b).getdata() if max(p)>2))';
const ALPHA = 'import sys,json\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert("RGBA");w,h=im.size\nout=[]\nfor t,x,y in json.loads(sys.argv[2]):\n  out.append([t,max(im.getpixel((min(w-1,max(0,x+dx)),min(h-1,max(0,y+dy))))[3] for dx in (-1,0,1) for dy in (-1,0,1))])\nprint(json.dumps(out))';
const RGB = 'import sys,json\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert("RGB");w,h=im.size\nprint(json.dumps([im.getpixel((min(w-1,max(0,x)),min(h-1,max(0,y)))) for x,y in json.loads(sys.argv[2])]))';
const BG = [255, 0, 255];

const side = (ref) => {
  if (ref) { process.env.OVERRIDE_JS = `atlas.js=${REF_DIR}/atlas.js`; process.env.OVERRIDE_CSS = `08-consistency.css=${REF_DIR}/08-consistency.css`; }
  else { delete process.env.OVERRIDE_JS; delete process.env.OVERRIDE_CSS; }
};

const GEOMETRY = () => {
  window.__lusterOutline = (path) => {
    const n = path.getTotalLength();
    const pts = [];
    for (let s = 0; s <= n; s += 0.1) { const p = path.getPointAtLength(s); pts.push([p.x, p.y]); }
    let turn = 0;
    for (let i = 2; i < pts.length; i += 1) {
      const a = Math.atan2(pts[i - 1][1] - pts[i - 2][1], pts[i - 1][0] - pts[i - 2][0]);
      const b = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
      let d = Math.abs(b - a) * 180 / Math.PI;
      if (d > 180) d = 360 - d;
      if (Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) > 0.02) turn = Math.max(turn, d);
    }
    return { pts, turn: +turn.toFixed(1) };
  };
  window.__lusterWidth = (pts, c) => 2 * Math.min(...pts.map(([x, y]) => Math.hypot(x - c[0], y - c[1])));
};

async function mountFigure(page, look, extra = {}) {
  await page.evaluate(({ look, extra }) => {
    localStorage.setItem('atlas-look', look);
    document.getElementById('luster-box')?.remove();
    document.getElementById('nm-buddy')?.remove();
    const box = document.createElement('div'); box.id = 'luster-box';
    Object.assign(box.style, { position: 'fixed', left: '0', top: '0', width: '160px', height: '170px', zIndex: '9999', overflow: 'hidden', background: '#f3f4fa' });
    const holder = document.createElement('div'); holder.id = 'nm-buddy';
    Object.assign(holder.style, { position: 'absolute', left: '40px', top: '40px', width: '64px', height: '92px' });
    if (extra.pose && extra.pose !== 'stand') holder.dataset.pose = extra.pose;
    const mood = extra.mood || 'calm';
    try { atlasMoodNow = mood; } catch (e) {}
    const fig = atlasFigure(); Object.assign(fig.style, { position: 'relative', display: 'block', width: '64px', height: '92px' });
    for (const svg of fig.querySelectorAll('svg')) atlasApply(svg, mood);
    holder.append(fig); box.append(holder); document.body.append(box);
    if (extra.still) for (const el of box.querySelectorAll('*')) el.style.animation = 'none';
  }, { look, extra });
}

async function drawingPart(fn, arg) {
  const { browser, page } = await boot({ viewport: { width: 520, height: 700 }, scale: 6 });
  await page.evaluate(GEOMETRY);
  await page.evaluate(() => { document.documentElement.dataset.avatarMotion = 'off'; });
  const out = await fn(page, arg);
  await page.evaluate(() => localStorage.removeItem('atlas-look'));
  await browser.close();
  return out;
}

const fringePart = (page) => page.evaluate(() => {
  localStorage.setItem('atlas-look', 'feminine');
  const svg = atlasDraw(400, 'calm', 'full');
  document.body.append(svg);
  const spec = ATLAS_LOOKS.feminine;
  const locks = [...svg.querySelectorAll('.atl-fringe-lock')].map((p, i) => {
    const { pts, turn } = window.__lusterOutline(p);
    const seg = spec.fringe[i].seg;
    const w = (t) => +window.__lusterWidth(pts, atlasSegsAt(seg, t)).toFixed(2);
    return { turn, root: w(0.04), tip: w(0.96), taper: +(w(0.96) / w(0.04)).toFixed(2) };
  });
  const capTurn = window.__lusterOutline(svg.querySelector('.atl-cap-fill')).turn;
  const inCap = !!svg.querySelector('.atl-hair-cap .atl-fringe-lock');
  const parts = ['atl-fringe-shadow', 'atl-fringe-sheen', 'atl-flyaway'].map((c) => svg.querySelectorAll(`.${c}`).length);
  svg.remove();
  return { locks: locks.length, maxTurn: Math.max(...locks.map((l) => l.turn)), maxTaper: Math.max(...locks.map((l) => l.taper)), capTurn, inCapGroup: inCap, shadowSheenFlyaway: parts, each: locks };
});

async function wispsPart(page) {
  const out = await page.evaluate(() => {
    localStorage.setItem('atlas-look', 'feminine');
    const svg = atlasDraw(400, 'calm', 'full');
    svg.id = 'luster-svg';
    Object.assign(svg.style, { position: 'fixed', left: '0', top: '0', zIndex: '9999' });
    document.body.append(svg);
    const spec = ATLAS_LOOKS.feminine;
    const each = spec.wisps.map((wisp, i) => {
      const cores = [...svg.querySelectorAll(`.atl-astral-core[data-wisp="${i}"]`)];
      const outl = cores.map((p) => window.__lusterOutline(p));
      const pts = outl.flatMap((o) => o.pts);
      const w = (t) => +window.__lusterWidth(pts, atlasSegsAt(wisp.seg, t)).toFixed(2);
      return { runs: { front: cores.filter((c) => c.dataset.run === 'front').length, back: cores.filter((c) => c.dataset.run === 'back').length }, turn: Math.max(...outl.map((o) => o.turn)), w03: w(0.03), w30: w(0.3), w97: w(0.97) };
    });
    window.__lusterCore = (i) => {
      //: Everything hidden but this wisp's cores (CSSOM: the page's CSP
      //: refuses a <style> written here).
      for (const el of [document.documentElement, document.body]) { el.style.background = 'transparent'; el.style.visibility = 'hidden'; }
      svg.style.visibility = 'hidden';
      for (const el of svg.querySelectorAll('*')) el.style.visibility = 'hidden';
      //: The masks' contents live in the shared defs, which must show.
      for (const d of document.querySelectorAll('svg.atl-defs')) d.style.visibility = 'visible';
      const cores = [...svg.querySelectorAll(`.atl-astral-core[data-wisp="${i}"]`)];
      for (const c of cores) c.style.visibility = 'visible';
      const box = svg.getBoundingClientRect();
      return [0.01, 0.04, 0.5, 0.96, 0.99].map((t) => {
        const [x, y] = atlasSegsAt(spec.wisps[i].seg, t);
        const q = new DOMPoint(x, y).matrixTransform(cores[0].getScreenCTM());
        return [t, Math.round((q.x - box.left) * 6), Math.round((q.y - box.top) * 6)];
      });
    };
    const glints = [...svg.querySelectorAll('.atl-wisp-glint')];
    return { glints: glints.length, glintSizes: new Set(glints.map((g) => g.dataset.k)).size, oldDots: svg.querySelectorAll('.atl-astral-sparkle').length, each };
  });
  for (let i = 0; i < out.each.length; i += 1) {
    const pts = await page.evaluate((i) => window.__lusterCore(i), i);
    await page.waitForTimeout(300);
    const file = `${SCRATCH}/atlasluster-core${i}.png`;
    const r = await page.evaluate(() => { const b = document.getElementById('luster-svg').getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: b.height }; });
    await page.screenshot({ path: file, omitBackground: true, clip: r });
    out.each[i].alpha = JSON.parse(execFileSync(PY, ['-c', ALPHA, file, JSON.stringify(pts)]).toString());
  }
  await page.evaluate(() => { document.getElementById('luster-svg')?.remove(); for (const el of [document.documentElement, document.body]) { el.style.background = ''; el.style.visibility = ''; } });
  await mountFigure(page, 'feminine', { still: true });
  out.backLayerUnderBody = await page.evaluate(() => {
    const kids = [...document.querySelector('#luster-box .atl-figure-box').children];
    const at = (cls) => kids.findIndex((k) => k.classList.contains(cls) || k.querySelector(`:scope > .${cls}`));
    return at('atl-layer-wisps-back') >= 0 && at('atl-layer-wisps-back') < at('atl-layer-body');
  });
  return out;
}

async function dressPart() {
  let refFill = null;
  if (REF_DIR) {
    side(true);
    refFill = await drawingPart((page) => page.evaluate(() => { localStorage.setItem('atlas-look', 'feminine'); atlasBuild(); return ATLAS_LOOKS.feminine.sower.fill; }));
    side(false);
  }
  return drawingPart((page, refFill) => page.evaluate((refFill) => {
    localStorage.setItem('atlas-look', 'feminine');
    const svg = atlasDraw(400, 'calm', 'full');
    document.body.append(svg);
    const fill = svg.querySelector('.atl-sower-fill');
    const { turn } = window.__lusterOutline(fill);
    let iou = null;
    if (refFill) {
      //: Both shapes rasterised at 10 px a unit; the overlap over the union.
      const k = 10;
      const c = document.createElement('canvas'); c.width = 90 * k; c.height = 70 * k;
      const ctx = c.getContext('2d');
      const mask = (d) => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.setTransform(k, 0, 0, k, 20 * k, -40 * k); ctx.fill(new Path2D(d)); return ctx.getImageData(0, 0, c.width, c.height).data; };
      const a = mask(fill.getAttribute('d'));
      const b = mask(refFill);
      //: Whole, and below y 64 (the dress past the hips, which INBOX 563
      //: narrowed on purpose).
      const count = (fromY) => {
        let and = 0; let or = 0;
        for (let i = 3; i < a.length; i += 4) {
          if (Math.floor((i - 3) / 4 / c.width) / k + 40 < fromY) continue;
          const x = a[i] > 127; const y = b[i] > 127;
          if (x && y) and += 1;
          if (x || y) or += 1;
        }
        return +(and / or).toFixed(3);
      };
      iou = { whole: count(-99), belowHips: count(64) };
    }
    const parts = Object.fromEntries(['atl-dress-neb', 'atl-dress-sheen', 'atl-dress-rim', 'atl-dress-star', 'atl-dress-glint', 'atl-dress-mote', 'atl-sower-glow'].map((c) => [c, svg.querySelectorAll(`.${c}`).length]));
    const strokes = [...svg.querySelectorAll('.atl-sower *')].filter((el) => getComputedStyle(el).stroke !== 'none').length;
    const dust = [...svg.querySelectorAll('.atl-dress-star')].map((p) => (p.getAttribute('d').match(/a([0-9.]+)/g) || []).map((m) => +m.slice(1)))[0] || [];
    return { turn, iouWithBefore: iou, parts, strokes, dustSizes: new Set(dust).size, mask: fill.parentElement.getAttribute('mask') };
  }, refFill), refFill);
}

async function bodyPart(ref) {
  side(ref);
  const out = await drawingPart(async (page) => {
    const res = {};
    for (const look of ['feminine', 'masculine']) {
      await mountFigure(page, look, { still: true });
      await page.waitForTimeout(800);
      res[look] = await page.evaluate((look) => {
        const box = document.querySelector('#luster-box .atl-figure-box');
        const headSkin = [...box.querySelectorAll('.atl-layer-body .atl-head .atl-skin')].find((p) => p.getAttribute('d') === ATLAS_HEAD_PATH);
        const h = headSkin.getBoundingClientRect();
        let bottom = 0;
        for (const p of box.querySelectorAll('.atl-layer-body .atl-fills > *, .atl-layer-lower .atl-fills .atl-sower-fill, .atl-layer-lower .atl-fills .atl-ribbon-veil, [class*="atl-layer-leg"] .atl-fills .atl-skin')) bottom = Math.max(bottom, p.getBoundingClientRect().bottom);
        const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', ATLAS_HEAD_PATH); tmp.append(path); document.body.append(tmp);
        const bb = path.getBBox();
        const spec = ATLAS_LOOKS[look];
        path.setAttribute('d', spec.torsoNow);
        const n = path.getTotalLength();
        const rows = {};
        for (let s = 0; s <= n; s += 0.05) { const q = path.getPointAtLength(s); const y = Math.round(q.y * 2) / 2; (rows[y] ||= []).push(q.x); }
        const wAt = (y0, y1) => Math.max(...Object.entries(rows).filter(([y]) => +y >= y0 && +y <= y1).map(([, xs]) => Math.max(...xs) - Math.min(...xs)));
        tmp.remove();
        return { headOverHeight: +(h.height / (bottom - h.top)).toFixed(3), faceAspect: +(bb.height / bb.width).toFixed(3), hipsOverShoulders: +(wAt(55, 62) / wAt(37, 38.5)).toFixed(2), hips: +wAt(55, 62).toFixed(1) };
      }, look);
    }
    return res;
  });
  side(false);
  return out;
}

async function gapPart() {
  const { browser, page } = await boot({ viewport: { width: 520, height: 700 }, scale: 6 });
  await page.evaluate(() => { document.documentElement.dataset.avatarMotion = 'always'; });
  const out = { samples: 0, background: 0, worst: [] };
  for (const mood of ['calm', 'surprised', 'happy']) {
    await mountFigure(page, 'feminine', { mood });
    //: Magenta behind her, which no part of her is, so a sample that is the
    //: page cannot be mistaken for her palest hair.
    await page.evaluate(() => { document.getElementById('luster-box').style.background = '#ff00ff'; });
    await page.waitForTimeout(1500);
    for (const phase of [0, 0.25, 0.5, 0.75]) {
      const pts = await page.evaluate((phase) => {
        const box = document.getElementById('luster-box');
        for (const a of box.getAnimations({ subtree: true })) {
          a.pause();
          const d = a.effect.getComputedTiming().duration;
          if (Number.isFinite(d)) a.currentTime = d * phase;
        }
        const cap = box.querySelector('.atl-layer-body .atl-cap-fill');
        const m = cap.getScreenCTM();
        const r = box.getBoundingClientRect();
        //: The cap's outer arc (its first two curves, from the left temple
        //: over the crown to the right), 0.8 in toward the head's middle.
        const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tmp.setAttribute('d', cap.getAttribute('d').split('C').slice(0, 3).join('C'));
        cap.parentNode.append(tmp);
        const n = tmp.getTotalLength();
        const res = [];
        for (let i = 1; i < 40; i += 1) {
          const q = tmp.getPointAtLength((n * i) / 40);
          const dx = 31 - q.x; const dy = 24 - q.y; const len = Math.hypot(dx, dy);
          const p = new DOMPoint(q.x + (dx / len) * 0.8, q.y + (dy / len) * 0.8).matrixTransform(m);
          res.push([Math.round((p.x - r.left) * 6), Math.round((p.y - r.top) * 6)]);
        }
        tmp.remove();
        return res;
      }, phase);
      const file = `${SCRATCH}/atlasluster-gap.png`;
      await (await page.$('#luster-box')).screenshot({ path: file });
      const rgb = JSON.parse(execFileSync(PY, ['-c', RGB, file, JSON.stringify(pts)]).toString());
      for (const c of rgb) {
        out.samples += 1;
        const d = Math.max(...c.map((v, k) => Math.abs(v - BG[k])));
        if (d < 40) { out.background += 1; if (out.worst.length < 5) out.worst.push({ mood, phase, c }); }
      }
    }
  }
  await page.evaluate(() => localStorage.removeItem('atlas-look'));
  await browser.close();
  return out;
}

async function mascPart() {
  const snap = async (ref) => {
    side(ref);
    const res = await drawingPart(async (page) => {
      const layers = await page.evaluate(() => {
        localStorage.setItem('atlas-look', 'masculine');
        const span = document.createElement('span'); span.append(atlasDraw(92, 'calm', 'figure'));
        //: The head's own geometry (its outline and the cheeks), named, so
        //: a layer can be compared with the head's changes taken out.
        const head = (html) => ATLAS_GEO.cheeks.reduce((h, [x, y], i) => h.replace(`cx="${x}" cy="${y}"`, `cheek${i}`), html.split(ATLAS_HEAD_PATH).join('HEAD').split(ATLAS_HEAD_EDGE).join('EDGE'));
        return Object.fromEntries([...span.querySelectorAll('svg.atl-layer')].map((s) => [s.dataset.atlasLayer, [s.outerHTML, head(s.outerHTML)]]));
      });
      await mountFigure(page, 'masculine', { still: true });
      await page.waitForTimeout(1200);
      const file = `${SCRATCH}/atlasluster-masc-${ref ? 'ref' : 'now'}.png`;
      await (await page.$('#luster-box')).screenshot({ path: file });
      return { layers, file };
    });
    side(false);
    return res;
  };
  const now = await snap(false);
  if (!REF_DIR) return { note: 'set REF_DIR to compare' };
  const ref = await snap(true);
  const differ = Object.keys(now.layers).filter((k) => now.layers[k][0] !== ref.layers[k][0]);
  const beyondHead = differ.filter((k) => now.layers[k][1] !== ref.layers[k][1]);
  return { layersDiffer: differ, differBeyondTheHead: beyondHead, pixelsDiffering: +execFileSync(PY, ['-c', DIFF, now.file, ref.file]).toString() };
}

async function motionPart() {
  const out = {};
  for (const [name, opts, attr] of [['on', {}, 'always'], ['reduced', { reducedMotion: 'reduce' }, 'always'], ['off', {}, 'off']]) {
    const { browser, page } = await boot({ viewport: { width: 520, height: 700 }, ...opts });
    await page.evaluate((attr) => { document.documentElement.dataset.avatarMotion = attr; }, attr);
    await mountFigure(page, 'feminine');
    await page.waitForTimeout(1200);
    out[name] = await page.evaluate(() => {
      const box = document.querySelector('#luster-box .atl-figure-box');
      const anims = [box, ...box.querySelectorAll('*')].flatMap((el) => el.getAnimations());
      const loops = [...new Set(anims.map((a) => `${a.animationName} ${+(a.effect.getComputedTiming().duration / 1000).toFixed(1)}s`))].sort();
      const ours = anims.filter((a) => ['atl-float', 'atl-hem-wind', 'atl-glint-twinkle', 'atl-wisp-drift'].includes(a.animationName)).length;
      return { loops, ours };
    });
    await page.evaluate(() => localStorage.removeItem('atlas-look'));
    await browser.close();
  }
  return out;
}

async function costPart() {
  const measure = async (what, ref) => {
    side(ref);
    const { browser, ctx, page } = await boot({ viewport: { width: 1280, height: 800 } });
    await page.evaluate((what) => {
      document.documentElement.dataset.avatarMotion = 'always';
      localStorage.setItem('atlas-look', 'feminine');
      document.getElementById('nm-buddy')?.remove();
      const stage = document.createElement('div'); stage.id = 'cost-stage';
      Object.assign(stage.style, { position: 'fixed', right: '16px', top: '80px', zIndex: '9999', display: 'flex', gap: '8px', alignItems: 'end' });
      document.body.append(stage);
      if (what === 'figure') {
        const holder = document.createElement('div'); holder.id = 'nm-buddy';
        Object.assign(holder.style, { position: 'relative', width: '64px', height: '92px' });
        const fig = atlasFigure(); Object.assign(fig.style, { position: 'relative', display: 'block', width: '64px', height: '92px' });
        holder.append(fig); stage.append(holder);
      }
      if (what === 'mark') stage.append(nameMarkLive('Atlas', 208));
    }, what);
    await page.waitForTimeout(2000);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable');
    const read = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    const a = await read();
    await page.waitForTimeout(8000);
    const b = await read();
    await page.evaluate(() => localStorage.removeItem('atlas-look'));
    await browser.close();
    side(false);
    return (b.TaskDuration - a.TaskDuration) * 1000;
  };
  const median = (xs) => xs.slice().sort((x, y) => x - y)[Math.floor(xs.length / 2)];
  const sides = REF_DIR ? ['now', 'ref'] : ['now'];
  const runs = {};
  for (let i = 0; i < RUNS; i += 1) for (const s of sides) for (const what of ['none', 'figure', 'mark']) (runs[`${s}-${what}`] ||= []).push(await measure(what, s === 'ref'));
  const out = {};
  for (const s of sides) {
    const none = median(runs[`${s}-none`]);
    out[s] = Object.fromEntries(['figure', 'mark'].map((w) => [w, +(median(runs[`${s}-${w}`]) - none).toFixed(1)]));
  }
  if (REF_DIR) out.change = Object.fromEntries(['figure', 'mark'].map((w) => [w, `${(100 * (out.now[w] / out.ref[w] - 1)).toFixed(1)}%`]));
  out.runs = Object.fromEntries(Object.entries(runs).map(([k, v]) => [k, v.map((x) => +x.toFixed(0))]));
  return out;
}

//: INBOX 565: her tail's centreline length, now and before, its width at
//: the tip, its filaments, and the paint of the filaments and of the tip's
//: glow beside the wings' own (the same colours, the tail's fainter).
async function tailPart(ref) {
  side(ref);
  const out = await drawingPart((page) => page.evaluate(() => {
    localStorage.setItem('atlas-look', 'feminine');
    const spec = ATLAS_LOOKS.feminine;
    let len = 0;
    const n = spec.tail.length * 40;
    let prev = atlasSegsAt(spec.tail, 0);
    for (let i = 1; i <= n; i += 1) { const q = atlasSegsAt(spec.tail, i / n); len += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
    const svg = atlasDraw(400, 'calm', 'full');
    document.body.append(svg);
    const cs = (sel, prop) => { const el = svg.querySelector(sel); return el ? `${getComputedStyle(el)[prop]} @${getComputedStyle(el).opacity}` : null; };
    const res = { length: +len.toFixed(1), tipWidth: +spec.tailWidth(1).toFixed(2), filaments: (svg.querySelector('.atl-tail-filament')?.getAttribute('d').match(/M/g) || []).length, filament: cs('.atl-tail-filament', 'stroke'), earFeather: cs('.atl-ear-feather', 'stroke'), tipGlow: cs('.atl-tail-tip-glow', 'fill'), earGlow: cs('.atl-ear-glow:not(.atl-tail-tip-glow)', 'fill') };
    svg.remove();
    return res;
  }));
  side(false);
  return out;
}

//: INBOX 567: her long hair's locks (count, the largest turn on their
//: outlines, so no point), and, in the companion at 6x on a magenta page,
//: the pixels midway between neighbouring locks down their fall, which
//: must be hair (the mass behind), never the page.
async function hairPart() {
  const shape = await drawingPart((page) => page.evaluate(() => {
    localStorage.setItem('atlas-look', 'feminine');
    const svg = atlasDraw(400, 'calm', 'full');
    document.body.append(svg);
    const locks = [...svg.querySelectorAll('.atl-mane .atl-lock:not(.atl-hair-mass)')];
    const turns = locks.map((p) => window.__lusterOutline(p).turn);
    svg.remove();
    return { locks: locks.length, maxTurn: Math.max(...turns) };
  }));
  const { browser, page } = await boot({ viewport: { width: 520, height: 700 }, scale: 6 });
  await page.evaluate(() => { document.documentElement.dataset.avatarMotion = 'off'; });
  await mountFigure(page, 'feminine', { still: true });
  await page.evaluate(() => { document.getElementById('luster-box').style.background = '#ff00ff'; });
  await page.waitForTimeout(1200);
  const pts = await page.evaluate(() => {
    const box = document.getElementById('luster-box');
    const mane = box.querySelector('.atl-layer-body .atl-mane');
    const m = mane.querySelector('path').getScreenCTM();
    const r = box.getBoundingClientRect();
    const locks = ATLAS_LOOKS.feminine.locks.filter((l) => !l.mass).slice(0, 4);
    const res = [];
    for (let i = 0; i < locks.length - 1; i += 1) {
      for (let t = 0.3; t <= 0.81; t += 0.1) {
        const a = atlasSegsAt(locks[i].seg, t);
        const b = atlasSegsAt(locks[i + 1].seg, t);
        const q = new DOMPoint((a[0] + b[0]) / 2, (a[1] + b[1]) / 2).matrixTransform(m);
        res.push([Math.round((q.x - r.left) * 6), Math.round((q.y - r.top) * 6)]);
      }
    }
    return res;
  });
  const file = `${SCRATCH}/atlasluster-hair.png`;
  await (await page.$('#luster-box')).screenshot({ path: file });
  const rgb = JSON.parse(execFileSync(PY, ['-c', RGB, file, JSON.stringify(pts)]).toString());
  await page.evaluate(() => localStorage.removeItem('atlas-look'));
  await browser.close();
  return { ...shape, between: rgb.length, pageBetween: rgb.filter((c) => Math.max(...c.map((v, k) => Math.abs(v - BG[k]))) < 40).length };
}

(async () => {
  const out = {};
  if (PARTS.includes('hair')) out.hair = await hairPart();
  if (PARTS.includes('tail')) {
    out.tail = { now: await tailPart(false), ...(REF_DIR ? { before: await tailPart(true) } : {}) };
    if (out.tail.before) out.tail.lengthRatio = +(out.tail.now.length / out.tail.before.length).toFixed(2);
  }
  if (PARTS.includes('fringe')) out.fringe = await drawingPart(fringePart);
  if (PARTS.includes('wisps')) out.wisps = await drawingPart(wispsPart);
  if (PARTS.includes('dress')) out.dress = await dressPart();
  if (PARTS.includes('body')) out.body = { now: await bodyPart(false), ...(REF_DIR ? { before: await bodyPart(true) } : {}) };
  if (PARTS.includes('gap')) out.gap = await gapPart();
  if (PARTS.includes('masc')) out.masc = await mascPart();
  if (PARTS.includes('motion')) out.motion = await motionPart();
  if (PARTS.includes('cost')) out.cost = await costPart();
  console.log(JSON.stringify(out, null, 1));
})();
