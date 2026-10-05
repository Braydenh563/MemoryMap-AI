// The feminine Atlas's lustre (INBOX 550), as numbers: the fringe's strands,
// the astral wisps, the masculine look left alone, the reduced-motion path
// and the frame cost.
//
//   BASE=http://127.0.0.1:8823 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     SCRATCH=/tmp/x node scratchpad/ui-sweeps/atlasluster.js
//   PART=fringe,wisps,masc,motion,cost  (default: all)
//   RUNS=3                     frame-cost runs (median)
//   REF_DIR=/tmp/x/base        atlas.js and 08-consistency.css from before,
//                              measured interleaved with the app's own
//
// - fringe: every `.atl-fringe-lock` in a full drawing. `turn` is the largest
//   change of direction along its outline per 0.1 unit of length, in degrees
//   (a hard wedge point turns 120 or more in one step; a round tip of radius
//   0.25 about 25); `taper` is its tip's width over its root's, from the
//   outline itself (twice the distance from the centreline to the nearest
//   outline point). The old cap's own outline is measured the same way, as
//   the before.
// - wisps: every `.atl-astral-core`: widths at 3%, 30% and 97% along, the
//   largest turn, its gradient's stop opacities (ends near 0, middle high),
//   the glints' count and how many sizes they come in.
// - masc: the masculine drawings' markup at five levels and 6x screenshots
//   of the companion figure (stand, sit, lie) and a full mark, from the
//   app's files and from REF_DIR's: which markup differs and how many
//   pixels differ in each shot (both should be none and 0).
// - motion: the glint layers' running animations with motion on, with the
//   system's reduced motion and with Avatar animation Off.
// - cost: main-thread time (CDP TaskDuration) over 8s with the feminine
//   companion figure, and separately a 208px full mark, animating, minus the
//   same page without either; the median of RUNS, and with REF_DIR the same
//   for the files from before and the change in percent.
const { boot } = require('./lib.js');
const fs = require('fs');
const crypto = require('crypto');
const PARTS = (process.env.PART || 'fringe,wisps,masc,motion,cost').split(',');
const RUNS = Number(process.env.RUNS || 3);
const { execFileSync } = require('child_process');
const PY = process.env.PY || '/home/user/MemoryMap-AI/.venv/bin/python';
//: Pixels that differ between two PNGs of one size (the count), and the
//: alpha at given device pixels, each the largest in a 3x3 patch.
const DIFF = 'import sys\nfrom PIL import Image, ImageChops\na=Image.open(sys.argv[1]).convert("RGBA");b=Image.open(sys.argv[2]).convert("RGBA")\nprint(-1 if a.size!=b.size else sum(1 for p in ImageChops.difference(a,b).getdata() if max(p)>2))';
const ALPHA = 'import sys,json\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert("RGBA");w,h=im.size\nout=[]\nfor t,x,y in json.loads(sys.argv[2]):\n  out.append([t,max(im.getpixel((min(w-1,max(0,x+dx)),min(h-1,max(0,y+dy))))[3] for dx in (-1,0,1) for dy in (-1,0,1))])\nprint(json.dumps(out))';
const REF_DIR = process.env.REF_DIR || '';

const GEOMETRY = () => {
  //: Outline points every 0.1 unit along a closed path, and the largest
  //: turn between successive steps.
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
    try { atlasMoodNow = 'calm'; } catch (e) {}
    const fig = atlasFigure(); Object.assign(fig.style, { position: 'relative', display: 'block', width: '64px', height: '92px' });
    for (const svg of fig.querySelectorAll('svg')) atlasApply(svg, 'calm');
    holder.append(fig); box.append(holder); document.body.append(box);
    if (extra.still) for (const el of box.querySelectorAll('*')) el.style.animation = 'none';
  }, { look, extra });
}

//: The masculine look, drawn by the app's files and (with REF_DIR) by the
//: files from before, in the same run: a hash of each level's markup and a
//: 6x screenshot of the companion figure in three poses and of a full mark.
async function mascSnapshot(ref) {
  if (ref) { process.env.OVERRIDE_JS = `atlas.js=${REF_DIR}/atlas.js`; process.env.OVERRIDE_CSS = `08-consistency.css=${REF_DIR}/08-consistency.css`; }
  else { delete process.env.OVERRIDE_JS; delete process.env.OVERRIDE_CSS; }
  const { browser, page } = await boot({ viewport: { width: 520, height: 700 }, scale: 6 });
  await page.evaluate(() => { document.documentElement.dataset.avatarMotion = 'off'; });
  const marks = await page.evaluate(() => {
    localStorage.setItem('atlas-look', 'masculine');
    const html = {};
    for (const [size, level] of [[400, 'full'], [208, 'bust'], [64, 'head'], [20, 'tiny']]) html[level] = atlasDraw(size, 'calm', level).outerHTML;
    const span = document.createElement('span'); span.append(atlasDraw(92, 'calm', 'figure'));
    html.figure = span.innerHTML;
    return html;
  });
  const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
  const out = Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, hash(v)]));
  const files = {};
  for (const pose of ['stand', 'sit', 'lie']) {
    await mountFigure(page, 'masculine', { still: true, pose });
    await page.waitForTimeout(1500);
    files[pose] = `${process.env.SCRATCH || '/tmp'}/atlasluster-masc-${pose}-${ref ? 'ref' : 'now'}.png`;
    await (await page.$('#luster-box')).screenshot({ path: files[pose] });
  }
  await page.evaluate(() => { document.getElementById('luster-box')?.remove(); const s = atlasDraw(400, 'calm', 'full'); s.id = 'luster-full'; Object.assign(s.style, { position: 'fixed', left: '0', top: '0', zIndex: '9999', background: '#f3f4fa' }); document.body.append(s); });
  await page.waitForTimeout(800);
  files.full = `${process.env.SCRATCH || '/tmp'}/atlasluster-masc-full-${ref ? 'ref' : 'now'}.png`;
  await (await page.$('#luster-full')).screenshot({ path: files.full });
  await page.evaluate(() => localStorage.removeItem('atlas-look'));
  await browser.close();
  return { hashes: out, files };
}

(async () => {
  const out = {};
  if (PARTS.includes('masc')) {
    const now = await mascSnapshot(false);
    if (REF_DIR) {
      const ref = await mascSnapshot(true);
      const markup = Object.keys(now.hashes).filter((k) => now.hashes[k] !== ref.hashes[k]);
      const pixels = Object.fromEntries(Object.keys(now.files).map((k) => [k, +execFileSync(PY, ['-c', DIFF, now.files[k], ref.files[k]]).toString()]));
      out.masc = { markupDiffers: markup, pixelsDiffering: pixels };
    } else out.masc = { hashes: now.hashes, note: 'set REF_DIR to compare' };
  }
  if (PARTS.some((p) => ['fringe', 'wisps'].includes(p))) {
    const { browser, page } = await boot({ viewport: { width: 520, height: 700 }, scale: 6 });
    await page.evaluate(GEOMETRY);
    await page.evaluate(() => { document.documentElement.dataset.avatarMotion = 'off'; });
    if (PARTS.includes('fringe')) {
      out.fringe = await page.evaluate(() => {
        localStorage.setItem('atlas-look', 'feminine');
        const svg = atlasDraw(400, 'calm', 'full');
        document.body.append(svg);
        const spec = ATLAS_LOOKS.feminine;
        const locks = [...svg.querySelectorAll('.atl-fringe-lock')].map((p, i) => {
          const { pts, turn } = window.__lusterOutline(p);
          const seg = (spec.fringe || [])[i]?.seg;
          const w = (t) => seg ? +window.__lusterWidth(pts, atlasSegsAt(seg, t)).toFixed(2) : null;
          const root = w(0.04);
          const tip = w(0.96);
          return { turn, root, tip, taper: root ? +(tip / root).toFixed(2) : null };
        });
        const cap = svg.querySelector('.atl-cap-fill');
        const capTurn = cap ? window.__lusterOutline(cap).turn : null;
        const fly = svg.querySelectorAll('.atl-flyaway').length;
        const sheen = svg.querySelectorAll('.atl-fringe-sheen').length;
        const under = svg.querySelectorAll('.atl-fringe-under').length;
        svg.remove();
        return { locks: locks.length, maxTurn: locks.length ? Math.max(...locks.map((l) => l.turn)) : null, maxTaper: locks.length ? Math.max(...locks.map((l) => l.taper)) : null, capTurn, flyaways: fly, sheens: sheen, underlayers: under, each: locks };
      });
    }
    if (PARTS.includes('wisps')) {
      out.wisps = await page.evaluate(() => {
        localStorage.setItem('atlas-look', 'feminine');
        const svg = atlasDraw(400, 'calm', 'full');
        document.body.append(svg);
        const spec = ATLAS_LOOKS.feminine;
        const each = [...svg.querySelectorAll('.atl-astral-core')].map((p, i) => {
          const { pts, turn } = window.__lusterOutline(p);
          const seg = spec.wisps[i].seg;
          const w = (t) => +window.__lusterWidth(pts, atlasSegsAt(seg, t)).toFixed(2);
          return { turn, w03: w(0.03), w30: w(0.3), w97: w(0.97) };
        });
        //: Each core alone on a clear page, its centre points in device
        //: pixels, for the alpha read below.
        window.__lusterCore = (i) => {
          document.getElementById('luster-only')?.remove();
          const st = document.createElement('style'); st.id = 'luster-only';
          st.textContent = '#luster-svg, #luster-svg * { visibility: hidden; } #luster-svg .luster-on { visibility: visible; }';
          document.head.append(st);
          for (const el of svg.querySelectorAll('.luster-on')) el.classList.remove('luster-on');
          const core = svg.querySelectorAll('.atl-astral-core')[i];
          core.classList.add('luster-on');
          const m = core.getScreenCTM();
          const box = svg.getBoundingClientRect();
          return [0.01, 0.04, 0.3, 0.5, 0.96, 0.99].map((t) => {
            const [x, y] = atlasSegsAt(spec.wisps[i].seg, t);
            const q = new DOMPoint(x, y).matrixTransform(m);
            return [t, Math.round((q.x - box.left) * 6), Math.round((q.y - box.top) * 6)];
          });
        };
        svg.id = 'luster-svg';
        const glints = [...svg.querySelectorAll('.atl-wisp-glint')];
        const sizes = new Set(glints.map((g) => g.dataset.k));
        const dots = svg.querySelectorAll('.atl-astral-sparkle').length;
        return { count: each.length, glints: glints.length, glintSizes: sizes.size, oldDots: dots, each };
      });
      Object.assign(await page.evaluate(() => { const s = document.getElementById('luster-svg'); Object.assign(s.style, { position: 'fixed', left: '0', top: '0', zIndex: '9999' }); return 0; }) || {}, {});
      for (let i = 0; i < out.wisps.count; i += 1) {
        const pts = await page.evaluate((i) => window.__lusterCore(i), i);
        await page.waitForTimeout(300);
        const file = `${process.env.SCRATCH || '/tmp'}/atlasluster-core${i}.png`;
        await (await page.$('#luster-svg')).screenshot({ path: file, omitBackground: true });
        const alpha = JSON.parse(execFileSync(PY, ['-c', ALPHA, file, JSON.stringify(pts)]).toString());
        out.wisps.each[i].alpha = alpha;
      }
      await page.evaluate(() => { document.getElementById('luster-svg')?.remove(); document.getElementById('luster-only')?.remove(); });
    }
    await page.evaluate(() => localStorage.removeItem('atlas-look'));
    await browser.close();
  }
  if (PARTS.includes('motion')) {
    out.motion = {};
    for (const [name, opts, attr] of [['on', {}, 'always'], ['reduced', { reducedMotion: 'reduce' }, 'always'], ['off', {}, 'off']]) {
      const { browser, page } = await boot({ viewport: { width: 520, height: 700 }, ...opts });
      await page.evaluate((attr) => { document.documentElement.dataset.avatarMotion = attr; }, attr);
      await mountFigure(page, 'feminine');
      await page.waitForTimeout(1200);
      out.motion[name] = await page.evaluate(() => {
        const layers = [...document.querySelectorAll('#luster-box [class*="atl-layer-glint"]')];
        const running = layers.reduce((n, el) => n + el.getAnimations().length, 0);
        const inside = layers.reduce((n, el) => n + el.getAnimations({ subtree: true }).length, 0);
        const opacity = layers.map((el) => getComputedStyle(el).opacity);
        return { layers: layers.length, running, inside, opacity };
      });
      await page.evaluate(() => localStorage.removeItem('atlas-look'));
      await browser.close();
    }
  }
  if (PARTS.includes('cost')) {
    //: `what`: 'none', 'figure' (the companion's layered figure) or 'mark'
    //: (a 208px full drawing, one svg). `ref`: serve REF_DIR's atlas.js and
    //: 08-consistency.css in place of the app's (lib.js's OVERRIDE_*), so
    //: before and after are measured interleaved, under the same load.
    const measure = async (what, ref) => {
      if (ref) { process.env.OVERRIDE_JS = `atlas.js=${REF_DIR}/atlas.js`; process.env.OVERRIDE_CSS = `08-consistency.css=${REF_DIR}/08-consistency.css`; }
      else { delete process.env.OVERRIDE_JS; delete process.env.OVERRIDE_CSS; }
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
      return (b.TaskDuration - a.TaskDuration) * 1000;
    };
    const median = (xs) => xs.slice().sort((x, y) => x - y)[Math.floor(xs.length / 2)];
    const sides = REF_DIR ? ['now', 'ref'] : ['now'];
    const runs = {};
    for (let i = 0; i < RUNS; i += 1) {
      for (const side of sides) {
        for (const what of ['none', 'figure', 'mark']) {
          (runs[`${side}-${what}`] ||= []).push(await measure(what, side === 'ref'));
        }
      }
    }
    out.cost = {};
    for (const side of sides) {
      const none = median(runs[`${side}-none`]);
      out.cost[side] = Object.fromEntries(['figure', 'mark'].map((w) => [w, +(median(runs[`${side}-${w}`]) - none).toFixed(1)]));
      out.cost[side].noneMs = +none.toFixed(1);
    }
    if (REF_DIR) out.cost.change = Object.fromEntries(['figure', 'mark'].map((w) => [w, `${(100 * (out.cost.now[w] / out.cost.ref[w] - 1)).toFixed(1)}%`]));
    out.cost.runs = Object.fromEntries(Object.entries(runs).map(([k, v]) => [k, v.map((x) => +x.toFixed(0))]));
  }
  console.log(JSON.stringify(out, null, 1));
})();
