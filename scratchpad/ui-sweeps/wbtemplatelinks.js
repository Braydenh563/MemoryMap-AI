// INBOX 746: "while dragging shapes, the arrows and lines dont move with".
// Every built-in board template with connectors is started, each of its
// linked shapes dragged by hand (button held, then released), and each
// connector's two ends measured against the outlines of the shapes it names.
//   BASE=http://127.0.0.1:8783 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbtemplatelinks.js
const { boot } = require("./lib.js");
let fails = 0, passes = 0;
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"}  ${what}`); ok ? passes++ : fails++; };
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  const setKey = process.env.SET || "templates";
  const keys = await page.evaluate(async () => {
    await initWhiteboard();
    const r = await fetch("/board-library/templates.json").then((x) => x.json()).catch(() => null);
    return (r?.items || []).filter((i) => (i.payload?.links || []).length).map((i) => i.key);
  });
  for (const key of keys) {
    const board = await page.evaluate(async ({ setKey, key }) =>
      apiJson("/board-library/new-board", { method: "POST", body: JSON.stringify({ builtin: `${setKey}/${key}`, name: "T " + key }) }), { setKey, key });
    const id = board.id ?? board.board?.id;
    await page.evaluate(async (b) => { await openWhiteboardBoard(b); }, id);
    await page.waitForTimeout(900);
    await page.evaluate(() => wbZoomToFit({ animate: false, padding: 160 }));
    await page.waitForTimeout(500);
    //: Each end's distance from the outline of the shape it names, board units.
    const measure = () => page.evaluate(() => {
      const near = (pt, segs) => Math.min(...segs.map(([x1, y1, x2, y2]) => {
        const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((pt.x - x1) * dx + (pt.y - y1) * dy) / l));
        return Math.hypot(pt.x - (x1 + t * dx), pt.y - (y1 + t * dy));
      }));
      const outline = (kind, sid) => {
        if (kind !== "sketch") return null;
        const el = document.querySelector(`.sketch-group[data-id="${sid}"] .sketch-path`);
        const d = el?.getAttribute("d");
        return d ? wbPathPolyline(d) : null;
      };
      const out = [];
      for (const s of wbState.sketches) {
        let p; try { p = JSON.parse(s.data); } catch { continue; }
        if (!(p.type || "").startsWith("link-")) continue;
        const d = document.querySelector(`.sketch-group[data-id="${s.id}"] .sketch-path`)?.getAttribute("d") || "";
        const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
        const pts = [];
        for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
        const so = outline(p.sourceKind, p.sourceId), to = outline(p.targetKind, p.targetId);
        out.push({
          id: s.id,
          source: so && pts.length ? Math.round(near(pts[0], so) * 10) / 10 : null,
          target: to && pts.length ? Math.round(Math.min(...pts.map((q) => near(q, to))) * 10) / 10 : null,
        });
      }
      return out;
    });
    const shapes = await page.evaluate(() => wbState.sketches.filter((s) => { try { return !(JSON.parse(s.data).type || "").startsWith("link-"); } catch { return false; } }).map((s) => s.id));
    for (const [n, sid] of shapes.entries()) {
      const r = await page.evaluate((sid) => {
        const el = document.querySelector(`.sketch-group[data-id="${sid}"] .sketch-path`);
        const b = el?.getBoundingClientRect();
        return b && { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      }, sid);
      if (!r) continue;
      const under = await page.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName}.${e.className?.baseVal ?? e.className}#${e.id}` : "none"; }, r);
      if (process.env.DEBUG) console.log("under", n + 1, under);
      await page.mouse.move(r.x, r.y);
      await page.mouse.down();
      for (let i = 1; i <= 5; i++) await page.mouse.move(r.x + i * 18 * (n % 2 ? -1 : 1), r.y + i * 9, { steps: 2 });
      await page.waitForTimeout(100);
      const mid = await measure();
      await page.mouse.up();
      await page.waitForTimeout(700);
      const after = await measure();
      const moved = await page.evaluate((sid) => {
        const b = document.querySelector(`.sketch-group[data-id="${sid}"] .sketch-path`)?.getBoundingClientRect();
        return b && { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      }, sid);
      check(moved && Math.hypot(moved.x - r.x, moved.y - r.y) > 50, `${key}: shape ${n + 1} moved (${moved ? Math.round(Math.hypot(moved.x - r.x, moved.y - r.y)) : "gone"}px)`);
      for (const [when, rows] of [["mid-drag", mid], ["after", after]]) {
        const worst = Math.max(...rows.flatMap((x) => [x.source ?? 99, x.target ?? 99]));
        check(worst <= 2, `${key}: shape ${n + 1} ${when}: every connector end on its shape (worst ${worst})`);
      }
    }
  }
  console.log(`${passes}/${passes + fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
