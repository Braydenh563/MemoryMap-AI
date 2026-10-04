// Two interactions the graph look change touches (INBOX 443 (1)):
//
//  1. Hovering a note names it whole (the cut-at-a-word label is for the
//     crowd; the pointed-at one is `GC_LABEL_FULL`).
//  2. A curved link (the default now) is found by the pointer where it is
//     drawn: `gcEdgeAtWorld` samples the same quadratic the paint strokes.
//
//   BASE=http://127.0.0.1:8793 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/graphlookhover.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const results = [];
  const check = (label, ok, detail) => {
    results.push(Boolean(ok));
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
  };
  try {
    await page.evaluate(() => switchTab('graph'));
    await page.waitForTimeout(7000);
    // 1. a note whose title is long enough to be cut in the crowd
    const target = await page.evaluate(() => {
      const s = gcTab;
      const t = s.transform;
      const long = s.nodes.filter((n) => n.preview && n.preview.length > 30 && Number.isFinite(n.x)).sort((a, b) => b.r - a.r)[0];
      const box = s.canvas.getBoundingClientRect();
      return { id: long.id, preview: long.preview, x: box.left + long.x * t.k + t.x, y: box.top + long.y * t.k + t.y };
    });
    await page.mouse.move(target.x, target.y);
    await page.waitForTimeout(500);
    const hovered = await page.evaluate((id) => {
      const box = gcTab.labelBoxes.find((b) => b.id === id);
      return box ? box.text : null;
    }, target.id);
    check('the pointed-at note is named whole', hovered === target.preview, `label "${hovered}" preview "${target.preview}"`);
    check('a name cut in the crowd ends on a word, not a small one', await page.evaluate(() => gcLabelCut('Quarterly planning with the platform team', 26) === 'Quarterly planning…'));
    // 2. the middle of a curved link answers the pointer
    await page.mouse.move(5, 5);
    const edge = await page.evaluate(() => {
      const s = gcTab;
      const t = s.transform;
      const box = s.canvas.getBoundingClientRect();
      const curved = gcCurvedLinks(s);
      const e = s.edges.find((x) => x.kind === 'link' && Math.hypot(x.source.x - x.target.x, x.source.y - x.target.y) > 90);
      const c = gcBowPoint(e.source, e.target);
      // the curve's own midpoint (t = 0.5)
      const mx = 0.25 * e.source.x + 0.5 * c.x + 0.25 * e.target.x;
      const my = 0.25 * e.source.y + 0.5 * c.y + 0.25 * e.target.y;
      const found = gcEdgeAtWorld(mx, my, s);
      const straightMx = (e.source.x + e.target.x) / 2;
      const straightMy = (e.source.y + e.target.y) / 2;
      return { curved, hitCurveMiddle: found === e, bowPx: Math.hypot(mx - straightMx, my - straightMy), screenX: box.left + mx * t.k + t.x };
    });
    check('curved links are on by default', edge.curved);
    check('the middle of a curved link is hit where it is drawn', edge.hitCurveMiddle, `bow ${edge.bowPx.toFixed(1)}px off the chord`);
  } finally {
    await browser.close();
  }
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
