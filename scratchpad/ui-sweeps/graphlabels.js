// Which notes on a big map have a readable name, at the overview and zoomed in.
//
// A map is read by its landmarks: the best-connected notes. On the 417-note
// fixture (`scratchpad/graph-fixture.js 400 1200`) the canvas renderer drew
// no label at all at the fitted zoom (k 0.49, above GC_LABEL_ALL_MAX so the
// zoom gate applied), and zoomed in to k 2 it drew 30 of 259 wanted, mostly
// on the thin edge of the map: a label is placed under its dot or not at
// all, and in the dense middle, where the hubs are, "under" always lands on
// another dot. This measures, from the renderer's own placed boxes
// (`__graphDebug`):
//
//   drawn     labels placed this frame
//   hubs      of the ten best-connected notes in view, how many are named
//   overlaps  placed boxes that overlap each other (must stay 0)
//   onDots    placed boxes that cover a dot in view other than their own (must
//             stay 0; a dot just past the window's edge is not drawn)
//
// at the fit and at k about 2. The gate: at the fit, at least 6 of the top ten
// named; zoomed, at least 8 of 10 and more labels than before; 0 overlaps and
// 0 labels on a dot in both.
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/graphlabels.js
const { boot } = require('./lib.js');

const results = [];
const check = (label, ok, detail) => {
  results.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
};

function read(page) {
  return page.evaluate(() => {
    const s = gcTab;
    const t = s.transform;
    const k = t.k;
    const w = s.dims.w;
    const h = s.dims.h;
    const inView = (n) => {
      const x = n.x * k + t.x;
      const y = n.y * k + t.y;
      return x >= 0 && x <= w && y >= 0 && y <= h;
    };
    const boxes = s.labelBoxes;
    const named = new Set(boxes.map((b) => b.id));
    const deg = (n) => (s.adj.get(n.id) || { size: 0 }).size;
    const top = s.nodes.filter(inView).sort((a, b) => deg(b) - deg(a)).slice(0, 10);
    let overlaps = 0;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps += 1;
      }
    }
    let onDots = 0;
    for (const box of boxes) {
      if (box.rank < 2 || box.landmark) continue;
      for (const n of s.nodes) {
        if (n.id === box.id || !Number.isFinite(n.x) || !inView(n)) continue;
        const r = n.r + (n._grow || 0);
        const nx = Math.max(box.left, Math.min(n.x, box.right));
        const ny = Math.max(box.top, Math.min(n.y, box.bottom));
        if ((nx - n.x) ** 2 + (ny - n.y) ** 2 < r * r) { onDots += 1; break; }
      }
    }
    return { k: Math.round(k * 100) / 100, drawn: boxes.length, wanted: s.labelsWanted, hubs: top.filter((n) => named.has(n.id)).length, overlaps, onDots };
  });
}

(async () => {
  const { browser, page } = await boot({});
  await page.evaluate(() => switchTab('graph'));
  await page.evaluate(() => {
    const box = document.getElementById('graph-labels');
    if (box && !box.checked) { box.checked = true; box.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.waitForTimeout(8000);
  await page.mouse.move(5, 5);
  const fit = await read(page);
  console.log('fit   ', JSON.stringify(fit));
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/graph-labels-fit-${process.env.TAG || 'run'}.png` });
  check('at the fit, most of the ten best-connected notes in view are named', fit.hubs >= 6, `${fit.hubs}/10`);
  check('at the fit, no two labels overlap', fit.overlaps === 0, `${fit.overlaps}`);
  check('at the fit, no label covers another dot', fit.onDots === 0, `${fit.onDots}`);

  await page.evaluate(() => {
    const s = gcTab;
    const c = s.canvas;
    const t = s.transform;
    // Zoom to k 2 about the middle of the view.
    const cx = s.dims.w / 2;
    const cy = s.dims.h / 2;
    const wx = (cx - t.x) / t.k;
    const wy = (cy - t.y) / t.k;
    d3.select(c).call(s.zoom.transform, d3.zoomIdentity.translate(cx - wx * 2, cy - wy * 2).scale(2));
  });
  await page.waitForTimeout(800);
  const zoom = await read(page);
  console.log('zoomed', JSON.stringify(zoom));
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/graph-labels-zoom-${process.env.TAG || 'run'}.png` });
  check('zoomed to 2x, at least 8 of the ten best-connected notes in view are named', zoom.hubs >= 8, `${zoom.hubs}/10`);
  check('zoomed to 2x, half again the 31 labels the under-only placement managed', zoom.drawn >= 46, `${zoom.drawn} of ${zoom.wanted}`);
  check('zoomed, no two labels overlap', zoom.overlaps === 0, `${zoom.overlaps}`);
  check('zoomed, no label covers another dot', zoom.onDots === 0, `${zoom.onDots}`);

  await browser.close();
  const failed = results.filter((x) => !x).length;
  console.log(`${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
