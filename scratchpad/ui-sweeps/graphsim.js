// INBOX 422 (the owner, 2026-09-24): "when I tick similarity on the graph,
// this happens, is there a way to make it more visually understandable or
// parsable??". A screenshot of a hairball and a screenshot of a clean map are
// the same bytes to a sweep, so this counts the things a hairball is made of,
// on the canvas renderer's own geometry, with Similarity on:
//
//   - similarity lines drawn, and every line per note (mean degree);
//   - edge crossings: pairs of drawn segments that properly intersect, in
//     screen space, ignoring pairs that share a note;
//   - label overlaps: drawn label boxes that intersect each other, and drawn
//     labels that sit on another note's disc;
//   - labels wanted against labels drawn.
//
//   BASE=http://127.0.0.1:8783 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/graphsim.js [tag]
//
// THEME=dark for the dark screenshot. Writes <OUT>/graphsim-<tag>-<theme>.png
// and a second shot with the best-connected note hovered.
const { boot } = require('./lib.js');

(async () => {
  const tag = process.argv[2] || 'now';
  const theme = process.env.THEME || 'light';
  const { page, browser, OUT } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    const box = document.getElementById('graph-similarity');
    if (!box.checked) {
      box.checked = true;
      box.dispatchEvent(new Event('change'));
    }
  });
  // The worker settles in a second or two; the auto-fit lands after it.
  await page.waitForTimeout(6000);

  const measure = () =>
    page.evaluate(() => {
      const s = gcTab;
      const t = s.transform;
      const P = (n) => [n.x * t.k + t.x, n.y * t.k + t.y];
      // What the frame actually strokes: an edge the renderer skips (a pruned
      // similarity line) is not part of the picture.
      const drawnEdges = s.edges.filter((e) =>
        typeof gcEdgeDrawn === 'function' ? gcEdgeDrawn(e, s) : true
      );
      const sim = drawnEdges.filter((e) => e.kind === 'similar');
      const notes = s.nodes.filter((n) => !n.isGroup);
      const segs = drawnEdges.map((e) => ({ a: e.source.id, b: e.target.id, p: P(e.source), q: P(e.target) }));
      const cross = (p1, p2, p3, p4) => {
        const d = (a, b, c) => (c[0] - a[0]) * (b[1] - a[1]) - (b[0] - a[0]) * (c[1] - a[1]);
        const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
        return d1 * d2 < 0 && d3 * d4 < 0;
      };
      let crossings = 0;
      for (let i = 0; i < segs.length; i++) {
        for (let j = i + 1; j < segs.length; j++) {
          const A = segs[i], B = segs[j];
          if (A.a === B.a || A.a === B.b || A.b === B.a || A.b === B.b) continue;
          if (cross(A.p, A.q, B.p, B.q)) crossings++;
        }
      }
      // Label boxes are in world units; to screen.
      const boxes = s.labelBoxes.map((b) => ({
        id: b.id,
        l: b.left * t.k + t.x, r: b.right * t.k + t.x,
        t: b.top * t.k + t.y, b: b.bottom * t.k + t.y,
      }));
      let labelOverlaps = 0;
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const A = boxes[i], B = boxes[j];
          if (A.l < B.r && A.r > B.l && A.t < B.b && A.b > B.t) labelOverlaps++;
        }
      }
      let labelOnNode = 0;
      for (const b of boxes) {
        for (const n of notes) {
          if (n.id === b.id) continue;
          const [x, y] = P(n);
          const r = n.r * t.k;
          const cx = Math.max(b.l, Math.min(x, b.r));
          const cy = Math.max(b.t, Math.min(y, b.b));
          if ((cx - x) ** 2 + (cy - y) ** 2 < r * r) { labelOnNode++; break; }
        }
      }
      const perNode = new Map();
      for (const e of sim) {
        perNode.set(e.source.id, (perNode.get(e.source.id) || 0) + 1);
        perNode.set(e.target.id, (perNode.get(e.target.id) || 0) + 1);
      }
      return {
        notes: notes.length,
        edgesLoaded: s.edges.length,
        similarLoaded: s.edges.filter((e) => e.kind === 'similar').length,
        similarDrawn: sim.length,
        maxSimilarPerNote: Math.max(0, ...perNode.values()),
        meanEdgesPerNote: +((2 * drawnEdges.length) / Math.max(1, notes.length)).toFixed(2),
        crossings,
        labelsWanted: s.labelsWanted,
        labelsDrawn: s.labelsDrawn,
        labelOverlaps,
        labelOnNode,
        zoom: +t.k.toFixed(2),
      };
    });

  const rest = await measure();
  console.log('rest ', JSON.stringify(rest));
  await page.screenshot({ path: `${OUT}/graphsim-${tag}-${theme}.png` });

  // Hover the best-connected note: the spotlight is where a reader goes to
  // ask "what is this one like".
  const hub = await page.evaluate(() => {
    const s = gcTab;
    const t = s.transform;
    let best = null;
    for (const n of s.nodes) {
      const d = (s.adj.get(n.id) || { size: 0 }).size;
      if (!best || d > best.d) best = { d, id: n.id, x: n.x * t.k + t.x, y: n.y * t.k + t.y };
    }
    const r = document.getElementById('graph-canvas').getBoundingClientRect();
    return { ...best, x: best.x + r.left, y: best.y + r.top };
  });
  await page.mouse.move(hub.x, hub.y);
  await page.waitForTimeout(800);
  const hover = await page.evaluate(() => {
    const pills = gcTab.simScoreLabels || [];
    const hit = (A, B) => A.left < B.right && A.right > B.left && A.top < B.bottom && A.bottom > B.top;
    let pillOverlaps = 0;
    for (let i = 0; i < pills.length; i++) {
      for (let j = i + 1; j < pills.length; j++) if (hit(pills[i], pills[j])) pillOverlaps++;
      for (const label of gcTab.labelBoxes) if (hit(pills[i], label)) pillOverlaps++;
    }
    return {
      hovered: gcTab.hoveredId,
      scoreLabels: pills.length,
      pillsOnFreeSpot: pills.filter((p) => p.placed).length,
      pillOverlaps,
    };
  });
  console.log('hover', JSON.stringify(hover));
  await page.screenshot({ path: `${OUT}/graphsim-${tag}-${theme}-hover.png` });

  // The same note at 2.5x the fitted zoom, centred: the gesture a reader
  // makes to read a cluster, and where the pills have room.
  const zoomed = await page.evaluate((id) => {
    const s = gcTab;
    const node = s.byId.get(id);
    const k = s.transform.k * 2.5;
    const t = d3.zoomIdentity.translate(s.dims.w / 2 - node.x * k, s.dims.h / 2 - node.y * k).scale(k);
    graphSvg.call(graphZoom.transform, t);
    const r = document.getElementById('graph-canvas').getBoundingClientRect();
    return { x: r.left + s.dims.w / 2, y: r.top + s.dims.h / 2 };
  }, hub.id);
  await page.waitForTimeout(400);
  await page.mouse.move(zoomed.x + 30, zoomed.y + 30);
  await page.mouse.move(zoomed.x, zoomed.y);
  await page.waitForTimeout(800);
  const hover2 = await page.evaluate(() => {
    const pills = gcTab.simScoreLabels || [];
    const hit = (A, B) => A.left < B.right && A.right > B.left && A.top < B.bottom && A.bottom > B.top;
    let pillOverlaps = 0;
    for (let i = 0; i < pills.length; i++) {
      for (let j = i + 1; j < pills.length; j++) if (hit(pills[i], pills[j])) pillOverlaps++;
      for (const label of gcTab.labelBoxes) if (hit(pills[i], label)) pillOverlaps++;
    }
    const lines = gcTab.edges.filter(
      (e) => e.kind === 'similar' && (e.source.id === gcTab.hoveredId || e.target.id === gcTab.hoveredId)
    ).length;
    return { zoom: +gcTab.transform.k.toFixed(2), hovered: gcTab.hoveredId, similarLines: lines, pills: pills.length, pillOverlaps };
  });
  console.log('zoom ', JSON.stringify(hover2));
  await page.screenshot({ path: `${OUT}/graphsim-${tag}-${theme}-zoom.png` });
  await browser.close();
})();
