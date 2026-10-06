// The force layout's legibility, as numbers (INBOX 692 and 693, the owner:
// "bit of overlap", links drawn behind other notes' dots, and "more visually
// appealing and understandable and profesional ... and intentional").
//
// Opens the Graph on whatever notebook the server holds (seed it with
// seed-showcase.py), waits for the layout to end and the fit to land, then
// reads positions from `gcTab` and prints one JSON row:
//
//   labelOnDot      placed labels covering another note's dot (landmarks too)
//   labelOnLine     placed labels a drawn link passes through
//   linkThroughDot  (link, dot) pairs where a link passes within a dot's
//                   drawn radius of a note it does not join
//   overlap/touch   dot pairs whose discs overlap / sit closer than 2px
//   minGap          the smallest edge-to-edge gap between two dots, px
//   purity          of each dot's four nearest, the share in its category
//   sepRatio        median over dots of (nearest other-category gap) over
//                   (nearest same-category gap): above 1 is clear space
//   moat            the 10th percentile of each dot's nearest
//                   other-category gap, px (the narrow end of the space)
//   hubCentral      top-degree note per category: distance from its
//                   category's centroid over the category's mean radius
//   fitK, settleMs
//
// RESHUFFLE=1 presses Physics > Reshuffle layout after the first settle and
// measures the result instead (and checks that it moved and was fitted).
//
//   bash scratchpad/ui-sweeps/serve.sh 8838 $SCRATCH/mm-g
//   .venv/bin/python scratchpad/ui-sweeps/seed-showcase.py 8838 $SCRATCH/mm-g
//   BASE=http://127.0.0.1:8838 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/graph692.js        (THEME=dark for dark)
const { boot, OUT } = require('./lib.js');

async function settle(page, from) {
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(250);
    const st = await page.evaluate(() => ({ alpha: gcTab.alpha, ticks: gcTab.ticks, n: gcTab.nodes.length, worker: Boolean(gcTab.worker) }));
    if (st.n && st.ticks > 5 && st.alpha < 0.002) return Date.now() - from;
  }
  return null;
}

function measure(page) {
  return page.evaluate(() => {
    const s = gcTab;
    const t = s.transform;
    const k = t.k;
    const sx = (n) => n.x * k + t.x;
    const sy = (n) => n.y * k + t.y;
    const nodes = s.nodes.filter((n) => Number.isFinite(n.x));
    const R = (n) => n.r * k;
    const deg = (n) => (s.adj.get(n.id) || { size: 0 }).size;
    let overlap = 0;
    let touch = 0;
    let minGap = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const gap = Math.hypot(sx(nodes[i]) - sx(nodes[j]), sy(nodes[i]) - sy(nodes[j])) - R(nodes[i]) - R(nodes[j]);
        if (gap < 0) overlap += 1;
        if (gap < 2) touch += 1;
        minGap = Math.min(minGap, gap);
      }
    }
    const boxes = (s.labelBoxes || []).map((b) => ({ id: b.id, left: b.left * k + t.x, right: b.right * k + t.x, top: b.top * k + t.y, bottom: b.bottom * k + t.y }));
    let labelOnDot = 0;
    for (const box of boxes) {
      for (const n of nodes) {
        if (n.id === box.id) continue;
        const nx = Math.max(box.left, Math.min(sx(n), box.right));
        const ny = Math.max(box.top, Math.min(sy(n), box.bottom));
        if ((nx - sx(n)) ** 2 + (ny - sy(n)) ** 2 < R(n) ** 2) { labelOnDot += 1; break; }
      }
    }
    const curved = gcCurvedLinks(s) && !s.tree;
    const drawn = s.edges.filter((e) => e.source && e.target && Number.isFinite(e.source.x) && Number.isFinite(e.target.x));
    const poly = (e) => {
      const a = e.source, b = e.target;
      const pts = [];
      if (curved) {
        const c = gcBowPoint(a, b);
        for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push([sx({ x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * c.x + u * u * b.x, y: 0 }), sy({ x: 0, y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * c.y + u * u * b.y })]); }
      } else pts.push([sx(a), sy(a)], [sx(b), sy(b)]);
      return pts;
    };
    const segHits = (box, ax, ay, bx, by) => {
      let t0 = 0, t1 = 1;
      const dx = bx - ax, dy = by - ay;
      for (const [p, q] of [[-dx, ax - box.left], [dx, box.right - ax], [-dy, ay - box.top], [dy, box.bottom - ay]]) {
        if (p === 0) { if (q < 0) return false; continue; }
        const r = q / p;
        if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
      }
      return true;
    };
    const segDist = (px, py, ax, ay, bx, by) => {
      const dx = bx - ax, dy = by - ay;
      const l = dx * dx + dy * dy || 1;
      const u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
      return Math.hypot(px - (ax + u * dx), py - (ay + u * dy));
    };
    const polys = drawn.map((e) => ({ e, pts: poly(e) }));
    const onLine = new Set();
    for (const box of boxes) {
      for (const { pts } of polys) {
        let hit = false;
        for (let i = 1; i < pts.length && !hit; i++) hit = segHits(box, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
        if (hit) { onLine.add(box.id); break; }
      }
    }
    let linkThroughDot = 0;
    for (const { e, pts } of polys) {
      for (const n of nodes) {
        if (n === e.source || n === e.target) continue;
        let d = Infinity;
        for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(sx(n), sy(n), pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
        if (d < R(n)) linkThroughDot += 1;
      }
    }
    // Category separation.
    const cat = (n) => n.category || '';
    const sameGap = [], otherGap = [];
    let same = 0, total = 0;
    for (const a of nodes) {
      let ns = Infinity, no = Infinity;
      const near = [];
      for (const b of nodes) {
        if (b === a) continue;
        const g = Math.hypot(sx(a) - sx(b), sy(a) - sy(b)) - R(a) - R(b);
        if (cat(b) === cat(a)) ns = Math.min(ns, g); else no = Math.min(no, g);
        near.push([g, b]);
      }
      near.sort((p, q) => p[0] - q[0]);
      for (const [, b] of near.slice(0, 4)) { total += 1; if (cat(b) === cat(a)) same += 1; }
      if (Number.isFinite(ns) && Number.isFinite(no)) { sameGap.push(Math.max(ns, 1)); otherGap.push(no); }
    }
    const ratios = otherGap.map((g, i) => g / sameGap[i]).sort((p, q) => p - q);
    const og = [...otherGap].sort((p, q) => p - q);
    // Hubs at the heart of their category.
    const groups = new Map();
    for (const n of nodes) { if (!groups.has(cat(n))) groups.set(cat(n), []); groups.get(cat(n)).push(n); }
    const hub = [];
    for (const list of groups.values()) {
      if (list.length < 4) continue;
      const cx = list.reduce((p, n) => p + sx(n), 0) / list.length, cy = list.reduce((p, n) => p + sy(n), 0) / list.length;
      const mean = list.reduce((p, n) => p + Math.hypot(sx(n) - cx, sy(n) - cy), 0) / list.length || 1;
      const top = list.reduce((p, n) => (deg(n) > deg(p) ? n : p), list[0]);
      if (deg(top) > 1) hub.push(Math.hypot(sx(top) - cx, sy(top) - cy) / mean);
    }
    // Label-label overlap, spacing evenness, the lines between categories,
    // and the map's shape against the canvas's (the owner's addendum).
    let labelOverlap = 0;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) labelOverlap += 1;
    }
    const nn = nodes.map((a) => Math.min(...nodes.filter((b) => b !== a).map((b) => Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r)));
    const nnMean = nn.reduce((p, q) => p + q, 0) / nn.length;
    const nnCV = Math.sqrt(nn.reduce((p, q) => p + (q - nnMean) ** 2, 0) / nn.length) / nnMean;
    const crossLens = drawn.filter((e) => cat(e.source) !== cat(e.target)).map((e) => Math.hypot(e.source.x - e.target.x, e.source.y - e.target.y));
    const innerLens = drawn.filter((e) => cat(e.source) === cat(e.target)).map((e) => Math.hypot(e.source.x - e.target.x, e.source.y - e.target.y));
    const mean = (xs) => (xs.length ? xs.reduce((p, q) => p + q, 0) / xs.length : 0);
    const xs = nodes.map(sx), ys = nodes.map(sy);
    const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
    const aspect = (bw / bh) / (s.dims.w / s.dims.h);
    return {
      labelOverlap, nnCV: +nnCV.toFixed(2),
      crossMean: +mean(crossLens).toFixed(0), crossMax: +Math.max(0, ...crossLens).toFixed(0), innerMean: +mean(innerLens).toFixed(0),
      crossOverInner: +(mean(crossLens) / (mean(innerLens) || 1)).toFixed(2),
      aspectVsCanvas: +aspect.toFixed(2),
      n: nodes.length, links: drawn.length, labels: boxes.length, fitK: +k.toFixed(2),
      labelOnDot, labelOnLine: onLine.size, linkThroughDot, overlap, touch, minGap: +minGap.toFixed(1),
      purity: +(same / (total || 1)).toFixed(2),
      sepRatio: +(ratios[Math.floor(ratios.length / 2)] || 0).toFixed(2),
      moat: +(og[Math.floor(og.length * 0.1)] || 0).toFixed(1),
      hubCentral: +(hub.reduce((p, q) => p + q, 0) / (hub.length || 1)).toFixed(2),
      positions: nodes.map((n) => [n.x, n.y]),
    };
  });
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  try {
    await page.evaluate(() => switchTab('graph'));
    // The options panel is remembered open; a measurement is of the map alone.
    const closeOptions = () => page.evaluate(() => {
      if (!document.getElementById('graph-options').classList.contains('hidden')) document.getElementById('graph-options-toggle').click();
    });
    await page.waitForTimeout(300);
    await closeOptions();
    const t0 = Date.now();
    let settleMs = await settle(page, t0);
    await page.waitForTimeout(1500);
    let m = await measure(page);
    const theme = process.env.THEME || 'light';
    if (process.env.RESHUFFLE) {
      const before = m.positions;
      await page.click('#graph-options-toggle');
      await page.evaluate(() => { const d = document.getElementById('graph-physics'); if (d) d.open = true; });
      const t1 = Date.now();
      await page.click('#graph-reshuffle', { force: true });
      await page.waitForTimeout(400);
      await closeOptions();
      const mid = await page.evaluate(() => ({ alpha: gcTab.alpha }));
      settleMs = await settle(page, t1);
      await page.waitForTimeout(1500);
      m = await measure(page);
      const moved = before.filter((p, i) => m.positions[i] && Math.hypot(p[0] - m.positions[i][0], p[1] - m.positions[i][1]) > 20).length;
      m.reshuffle = { moved, of: before.length, alphaAfter400ms: +(mid.alpha || 0).toFixed(2) };
    }
    await page.screenshot({ path: `${OUT}/graph692-${theme}${process.env.RESHUFFLE ? '-reshuffle' : ''}.png` });
    delete m.positions;
    console.log(JSON.stringify({ theme, settleMs, ...m }));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
