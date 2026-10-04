// How the Graph's shape looks, as numbers (INBOX 443 (1), the owner: "the graph
// shape could look nicer as well": uneven spacing, isolated nodes floating far
// from the cluster, truncated labels, large glowing nodes).
//
// Seeds ~60 notes in 5 categories with links (ring + hubs + a few bridges,
// eight notes left unlinked), opens the Graph, waits for the layout to settle,
// then reads positions from `gcTab` and prints:
//
//   overlap      pairs of dots whose drawn discs touch (screen px, at the fit)
//   labelOver    pairs of placed labels that overlap (must stay 0)
//   labels       placed / total / truncated with an ellipsis
//   crossings    link-link crossings between edges that share no end
//   fill         the nodes' bounding box over the canvas (area) and the
//                larger-axis share
//   isoDist      isolated dots' mean distance from the linked cluster's centre
//                over the cluster's own radius (p90 of linked dots)
//   edgeCV       coefficient of variation of the drawn link lengths
//   nnCV         CV of every dot's nearest-neighbour gap (the "uneven
//                spacing" number)
//   settle       ms from data to the layout's end; frame ms while settling
//
// Light and dark shots go to $SCRATCH/shots (graphlook-light/dark.png).
//
//   bash scratchpad/ui-sweeps/serve.sh 8793 /tmp/mm-graph
//   BASE=http://127.0.0.1:8793 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/graphlook.js         (THEME=dark for dark)
const { boot, OUT } = require('./lib.js');

const CATS = ['Work', 'Reading', 'Ideas', 'Personal', 'Research'];
const TITLES = {
  Work: ['Quarterly planning with the platform team', 'Onboarding checklist for new engineers', 'Retro: what slowed the release down', 'Budget review notes for the spring', 'Hiring loop feedback summary', 'Customer interview synthesis', 'Roadmap draft for the second half', 'Vendor contract renewal questions', 'On-call handover template', 'Weekly sync agenda', 'Incident write-up: the slow search', 'Design review: settings redesign'],
  Reading: ['Notes on Thinking in Systems', 'Highlights from The Pragmatic Programmer', 'Essay: how to read a paper quickly', 'Book list for the winter', 'Quotes worth keeping', 'Summary of Deep Work chapters one to four', 'Article: local-first software principles', 'Podcast notes on sleep and memory', 'Reading queue and priorities', 'A short history of the index card', 'Review of the new sci-fi novel', 'Notes on writing clearly'],
  Ideas: ['An app that files notes by itself', 'Idea: a calm graph view', 'Side project: tiny habit tracker', 'What if every note had a summary line', 'Weekend build: a recipe scaler', 'Names for the newsletter', 'Sketch of a flashcard flow', 'Could links explain themselves', 'Pitch for the offsite talk', 'Experiment: voice capture on a walk', 'Small tools I keep wishing for', 'Games to prototype this year'],
  Personal: ['Trip plan for Lisbon in May', 'Gift ideas for the family', 'Garden jobs for the weekend', 'Fitness plan and the long run', 'Move checklist and the lease', 'Recipes to cook this month', 'Doctor appointment questions', 'Photos to sort and print', 'Birthday dinner shortlist', 'Home repair list', 'Letters to write', 'Tax paperwork folder'],
  Research: ['Embedding models compared for notes', 'Force layouts and why they clump', 'Literature review on spaced repetition', 'Benchmark of local language models', 'How retrieval ranking is scored', 'Survey of knowledge graph tools', 'Reading list on cognitive load', 'Notes on tokenisation quirks', 'Experiment log for the filing eval', 'Open questions on summarisation', 'Datasets worth trying', 'Paper: attention is cheaper than it looks'],
};

const stats = (xs) => {
  const m = xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length || 1);
  return { mean: m, sd: Math.sqrt(v), cv: m ? Math.sqrt(v) / m : 0 };
};

async function seed(page) {
  return page.evaluate(async ({ CATS, TITLES }) => {
    const have = await api('/entries?limit=500').then((r) => r.json());
    if ((Array.isArray(have) ? have : have.entries || have.items || []).length >= 60) return 'present';
    const ids = {};
    for (const cat of CATS) {
      ids[cat] = [];
      for (const title of TITLES[cat]) {
        const r = await api('/entries', { method: 'POST', body: JSON.stringify({ category: cat, content: `${title}\n\nA few lines about ${title.toLowerCase()}.`, tags: [cat.toLowerCase()] }) });
        const e = await r.json();
        if (e && e.id) ids[cat].push(e.id);
      }
    }
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pairs = new Set();
    const link = async (a, b, reason) => {
      if (!a || !b || a === b) return;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (pairs.has(key)) return;
      pairs.add(key);
      await api(`/entries/${a}/links`, { method: 'POST', body: JSON.stringify(reason ? { target_id: b, reason } : { target_id: b }) }).catch(() => null);
    };
    const hubs = [];
    for (const cat of CATS) {
      // Ten of twelve linked; the last two are left isolated (eight overall
      // with the cross-category pick below).
      const linked = ids[cat].slice(0, 10);
      const hub = linked[0];
      hubs.push(hub);
      for (let i = 1; i < linked.length; i++) {
        await link(linked[i], i < 4 ? hub : linked[Math.floor(rnd() * i)], i % 3 === 0 ? `Both filed under ${cat}` : null);
      }
    }
    for (let i = 0; i < hubs.length; i++) await link(hubs[i], hubs[(i + 1) % hubs.length], 'Two threads that keep meeting');
    const all = CATS.flatMap((c) => ids[c].slice(0, 10));
    for (let i = 0; i < 8; i++) await link(all[Math.floor(rnd() * all.length)], all[Math.floor(rnd() * all.length)], null);
    return 'seeded';
  }, { CATS, TITLES });
}

function measure(page) {
  return page.evaluate(() => {
    const s = gcTab;
    const t = s.transform;
    const k = t.k;
    const sx = (n) => n.x * k + t.x;
    const sy = (n) => n.y * k + t.y;
    const nodes = s.nodes.filter((n) => Number.isFinite(n.x));
    const deg = (n) => (s.adj.get(n.id) || { size: 0 }).size;
    const R = (n) => n.r * k;
    // dots that overlap
    let overlap = 0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = Math.hypot(sx(nodes[i]) - sx(nodes[j]), sy(nodes[i]) - sy(nodes[j]));
        if (d < R(nodes[i]) + R(nodes[j])) overlap += 1;
      }
    }
    // labels
    const boxes = s.labelBoxes || [];
    let labelOver = 0;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) labelOver += 1;
    }
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const truncated = boxes.filter((b) => byId.get(b.id) && byId.get(b.id).preview !== b.text).length;
    // crossings among link-kind edges that share no end
    const segs = s.edges.filter((e) => e.source && e.target && Number.isFinite(e.source.x) && e.kind !== 'similar').map((e) => [sx(e.source), sy(e.source), sx(e.target), sy(e.target), e.source.id, e.target.id]);
    const ccw = (ax, ay, bx, by, cx, cy) => (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
    let crossings = 0;
    for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
      const p = segs[i], q = segs[j];
      if (p[4] === q[4] || p[4] === q[5] || p[5] === q[4] || p[5] === q[5]) continue;
      if (ccw(p[0], p[1], q[0], q[1], q[2], q[3]) !== ccw(p[2], p[3], q[0], q[1], q[2], q[3]) && ccw(p[0], p[1], p[2], p[3], q[0], q[1]) !== ccw(p[0], p[1], p[2], p[3], q[2], q[3])) crossings += 1;
    }
    // fill
    const xs = nodes.map(sx), ys = nodes.map(sy);
    const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
    const fillArea = (bw * bh) / (s.dims.w * s.dims.h);
    const fillAxis = Math.max(bw / s.dims.w, bh / s.dims.h);
    // isolated distance from the main cluster
    const linked = nodes.filter((n) => deg(n) > 0), iso = nodes.filter((n) => deg(n) === 0);
    const cx = linked.reduce((a, n) => a + sx(n), 0) / linked.length, cy = linked.reduce((a, n) => a + sy(n), 0) / linked.length;
    const dl = linked.map((n) => Math.hypot(sx(n) - cx, sy(n) - cy)).sort((a, b) => a - b);
    const p90 = dl[Math.floor(dl.length * 0.9)] || 1;
    const di = iso.map((n) => Math.hypot(sx(n) - cx, sy(n) - cy));
    const isoRatio = di.length ? di.reduce((a, b) => a + b, 0) / di.length / p90 : 0;
    const isoMax = di.length ? Math.max(...di) / p90 : 0;
    // edge length spread
    const lens = segs.map((p) => Math.hypot(p[0] - p[2], p[1] - p[3]));
    // nearest-neighbour gap spread (edge to edge)
    const nn = nodes.map((a) => Math.min(...nodes.filter((b) => b !== a).map((b) => Math.hypot(sx(a) - sx(b), sy(a) - sy(b)) - R(a) - R(b))));
    const radii = nodes.map((n) => n.r);
    const rel = s.edges.filter((e) => e.kind !== 'similar' && e.source && e.target);
    const cohesion = rel.length ? rel.filter((e) => e.source.category === e.target.category).length / rel.length : 1;
    // linked dots only: spacing evenness of the cluster itself
    const nnLinked = linked.map((a) => Math.min(...linked.filter((b) => b !== a).map((b) => Math.hypot(sx(a) - sx(b), sy(a) - sy(b)) - R(a) - R(b))));
    // each isolated dot's gap to its nearest linked dot, over the cluster's median gap
    const medNN = [...nnLinked].sort((p, q) => p - q)[Math.floor(nnLinked.length / 2)] || 1;
    const isoGapList = iso.map((a) => Math.min(...linked.map((b) => Math.hypot(sx(a) - sx(b), sy(a) - sy(b)) - R(a) - R(b))));
    const isoGap = isoGapList.length ? isoGapList.reduce((p, q) => p + q, 0) / isoGapList.length / medNN : 0;
    // category purity: of each dot's 4 nearest dots, the share of its colour
    let same = 0, total = 0;
    for (const a of nodes) {
      const near = nodes.filter((b) => b !== a).map((b) => [Math.hypot(sx(a) - sx(b), sy(a) - sy(b)), b]).sort((p, q) => p[0] - q[0]).slice(0, 4);
      for (const [, b] of near) { total += 1; if (b.colour === a.colour) same += 1; }
    }
    // placed labels (not the hubs allowed over a dot) that cover another dot
    let labelOnDot = 0;
    for (const box of boxes) {
      if (box.landmark) continue;
      for (const n of nodes) {
        if (n.id === box.id) continue;
        const x = sx(n), y = sy(n), r = R(n);
        if (x + r > box.left * k + t.x && x - r < box.right * k + t.x && y + r > box.top * k + t.y && y - r < box.bottom * k + t.y) { labelOnDot += 1; break; }
      }
    }
    // placed labels drawn over a line (INBOX 493, "labels in white over the
    // lines"): pairs of a label box and a drawn link (curved ones sampled
    // along their bow) that passes through it, in world units.
    const curved = typeof gcCurvedLinks === 'function' && gcCurvedLinks(s) && !s.tree;
    const segHits = (box, ax, ay, bx, by) => {
      // Liang-Barsky clip of the segment against the box.
      let t0 = 0, t1 = 1;
      const dx = bx - ax, dy = by - ay;
      for (const [p, q] of [[-dx, ax - box.left], [dx, box.right - ax], [-dy, ay - box.top], [dy, box.bottom - ay]]) {
        if (p === 0) { if (q < 0) return false; continue; }
        const r = q / p;
        if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
      }
      return true;
    };
    let labelOverEdge = 0;
    const crossed = new Set();
    const drawnEdges = s.edges.filter((e) => e.source && e.target && Number.isFinite(e.source.x));
    for (const box of boxes) {
      for (const e of drawnEdges) {
        const a = e.source, b = e.target;
        const pts = [];
        if (curved) {
          const c = gcBowPoint(a, b);
          for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([(1 - u) ** 2 * a.x + 2 * (1 - u) * u * c.x + u * u * b.x, (1 - u) ** 2 * a.y + 2 * (1 - u) * u * c.y + u * u * b.y]); }
        } else pts.push([a.x, a.y], [b.x, b.y]);
        let hit = false;
        for (let i = 1; i < pts.length && !hit; i++) hit = segHits(box, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
        if (hit) labelOverEdge += 1;
        if (hit) crossed.add(box.id);
      }
    }
    return {
      labelOverEdge, labelsOnALine: crossed.size,
      purity: +(same / total).toFixed(2), cohesion: +cohesion.toFixed(2), labelOnDot, nnLinked, isoGap: +isoGap.toFixed(2),
      n: nodes.length, iso: iso.length, edges: segs.length, k: +k.toFixed(2),
      overlap, labelOver, labelsPlaced: boxes.length, truncated,
      crossings, fillArea: +fillArea.toFixed(3), fillAxis: +fillAxis.toFixed(3),
      isoRatio: +isoRatio.toFixed(2), isoMax: +isoMax.toFixed(2),
      edgeMean: +(lens.reduce((a, b) => a + b, 0) / lens.length).toFixed(1),
      edgeLens: lens, nn, radii,
    };
  });
}

(async () => {
  const { browser, page } = await boot();
  try {
    console.log('seed:', await seed(page));
    await page.evaluate(() => { window.__frames = []; switchTab('graph'); });
    const t0 = Date.now();
    // Frame ms while settling: sample the renderer's own last-frame time.
    const frames = [];
    let settledAt = null;
    for (let i = 0; i < 80; i++) {
      await page.waitForTimeout(250);
      const st = await page.evaluate(() => ({ alpha: gcTab.alpha, ticks: gcTab.ticks, last: gcTab.timing.lastFrame, running: Boolean(gcTab.worker), frames: gcTab.timing.frames, n: gcTab.nodes.length }));
      if (st.n) frames.push(st.last);
      if (st.n && st.ticks > 5 && st.alpha < 0.002 && settledAt === null) { settledAt = Date.now() - t0; break; }
    }
    await page.waitForTimeout(1500); // the auto-fit lands after the end
    const m = await measure(page);
    const e = stats(m.edgeLens), nn = stats(m.nn), nl = stats(m.nnLinked), r = stats(m.radii);
    const f = frames.filter(Number.isFinite).sort((a, b) => a - b);
    const theme = process.env.THEME || 'light';
    await page.screenshot({ path: `${OUT}/graphlook-${theme}.png` });
    const row = {
      nodes: m.n, isolated: m.iso, links: m.edges, fitK: m.k,
      purity: m.purity, cohesion: m.cohesion, labelOverEdge: m.labelOverEdge, labelsOnALine: m.labelsOnALine, labelOnDot: m.labelOnDot, dotOverlap: m.overlap, labelOverlap: m.labelOver, labelsPlaced: m.labelsPlaced, labelsTruncated: m.truncated,
      crossings: m.crossings, fillArea: m.fillArea, fillAxis: m.fillAxis,
      isoDistRatio: m.isoRatio, isoMaxRatio: m.isoMax,
      edgeMean: m.edgeMean, edgeCV: +e.cv.toFixed(2), nnCV: +nn.cv.toFixed(2), nnLinkedCV: +nl.cv.toFixed(2), isoGap: m.isoGap, radiusCV: +r.cv.toFixed(2),
      settleMs: settledAt, frameMsMedian: f.length ? +f[Math.floor(f.length / 2)].toFixed(2) : null, frameMsMax: f.length ? +f[f.length - 1].toFixed(2) : null,
    };
    console.log(JSON.stringify(row));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
