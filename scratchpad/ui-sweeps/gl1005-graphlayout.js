// gl1005: INBOX 579, "switching the graph layout does nothing". Opens the
// graph's gear, presses each Layout segment (Force, Tree, Radial, Arc) the
// way a person does, and samples 20 node positions after each, so a layout
// that leaves the drawing where it was is a number, not a screenshot.
//   BASE=http://127.0.0.1:8861 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   [VIEWPORT=390x844] [THEME=dark] [RENDERER=svg] node gl1005-graphlayout.js
const { boot } = require("./lib.js");
const [W, H] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
const phone = W < 600;
(async () => {
  const { page, browser } = await boot({ viewport: { width: W, height: H }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  if (process.env.RENDERER) {
    await page.evaluate((r) => localStorage.setItem("graph-renderer", r), process.env.RENDERER);
  }
  await page.evaluate(() => localStorage.setItem("graph-layout", "force"));
  await page.evaluate(() => document.getElementById("tab-btn-graph")?.click());
  await page.waitForTimeout(3000);
  const sample = () =>
    page.evaluate(() => {
      //: `graphNodesRef` is what both renderers draw from (the canvas's
      //: `__graphDebug` only knows the canvas), and the SVG renderer has no
      //: layout field, so its drawn layout is read from the tree's own mark:
      //: a computed layout holds every note with fx/fy.
      const g = window.__graphDebug;
      const refs = (typeof graphNodesRef !== "undefined" && graphNodesRef) || [];
      const geo = refs.filter((n) => /^\d+$/.test(String(n.id))).map((n) => ({ id: n.id, x: Math.round(n.x * 10) / 10, y: Math.round(n.y * 10) / 10 }));
      geo.sort((a, b) => a.id - b.id);
      const computed = refs.some((n) => n.isGroup);
      const layout = g.renderer === "canvas" ? g.layout : computed ? `computed:${graphLayout()}` : "force";
      return { renderer: g.renderer, layout, n: refs.length, pts: geo.filter((_, i) => i % Math.max(1, Math.floor(geo.length / 20)) === 0).slice(0, 20).map((n) => [n.id, n.x, n.y]) };
    });
  const open = await page.evaluate(() => !document.getElementById("graph-options").classList.contains("hidden"));
  if (!open) await page.click("#graph-options-toggle");
  await page.waitForTimeout(400);
  const results = {};
  const shapes = {};
  for (const kind of ["tree", "radial", "arc", "force"]) {
    const label = page.locator(`#graph-layout label:has(input[value="${kind}"])`);
    await label.scrollIntoViewIfNeeded();
    await label.click();
    await page.waitForTimeout(kind === "force" ? 3500 : 1500);
    const s = await sample();
    const checked = await page.evaluate(() => document.querySelector('input[name="graph-layout"]:checked')?.value);
    const stored = await page.evaluate(() => localStorage.getItem("graph-layout"));
    shapes[kind] = s.pts;
    results[kind] = { renderer: s.renderer, drawnLayout: s.layout, checked, stored, nodes: s.n, first3: s.pts.slice(0, 3) };
  }
  // Mean distance per pair of layouts, over the same 20 notes (spread over
  // the notebook, so replies are among them), after normalising each axis of
  // each arrangement to 0..100: a layout that is only the same picture moved
  // or scaled is not a different arrangement, and an axis with no spread (the
  // arc's baseline) stays at 0.
  const norm = (pts) => {
    const axis = (i) => {
      const v = pts.map((p) => p[i]);
      const lo = Math.min(...v), span = Math.max(...v) - lo;
      return (x) => (span > 1 ? ((x - lo) / span) * 100 : 0);
    };
    const fx = axis(1), fy = axis(2);
    return pts.map(([id, x, y]) => [id, fx(x), fy(y)]);
  };
  const dist = (a, b) => {
    const mb = new Map(norm(b).map(([id, x, y]) => [id, [x, y]]));
    let sum = 0, c = 0;
    for (const [id, x, y] of norm(a)) {
      const p = mb.get(id);
      if (!p) continue;
      sum += Math.hypot(x - p[0], y - p[1]);
      c++;
    }
    return c ? Math.round(sum / c) : null;
  };
  const kinds = ["force", "tree", "radial", "arc"];
  const pairs = {};
  for (let i = 0; i < kinds.length; i++) for (let j = i + 1; j < kinds.length; j++) pairs[`${kinds[i]}-${kinds[j]}`] = dist(shapes[kinds[i]], shapes[kinds[j]]);
  const vals = Object.values(pairs).filter((v) => v != null);
  const minPair = vals.length === 6 ? Math.min(...vals) : 0;
  const drawnOk = kinds.every((k) => (results[k].drawnLayout === k || (results[k].renderer === "svg" && results[k].drawnLayout === `computed:${k}`)) && results[k].checked === k && results[k].stored === k && shapes[k].length >= 5);
  console.log(JSON.stringify({ viewport: `${W}x${H}`, theme: process.env.THEME || "light", renderer: results.force.renderer, nodes: results.tree.nodes, drawn: kinds.map((k) => results[k].drawnLayout), pairs, minPair, errors }));
  console.log(drawnOk && minPair >= 10 && !errors.length ? "PASS" : "FAIL");
  await browser.close();
})();
