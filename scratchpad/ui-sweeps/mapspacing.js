// The owner, 2026-10-10: "the spacing is really close to the other things and
// bunched up", and "I want more mindmap appearance options". How this map
// looks, The whole map, Spacing: Compact, Normal or Roomy. Measured: the gap
// between sibling topics and between a topic and its children after the map
// is laid out again, no two topics overlapping, the choice kept on a re-read.
//   BASE=http://127.0.0.1:8783 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapspacing.js
const { boot } = require("./lib.js");
let fails = 0, passes = 0;
const check = (ok, what, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${what}${detail ? "  " + detail : ""}`); ok ? passes++ : fails++; };
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.click('[data-tab="library"]'); await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]'); await page.waitForTimeout(1200);
  await page.evaluate(async () => { await initWhiteboard(); });
  const map = await page.evaluate(async () => apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# S\n- Root\n  - A\n    - A1\n  - B\n  - C", name: "Spacing " + Date.now() }) }));
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, map.id); await page.waitForTimeout(1500);
  const measure = () => page.evaluate(() => {
    const idx = wbMapIndex();
    const by = (t) => idx.nodes.find((n) => wbMapLabel(n) === t);
    const box = (n) => { const s = wbMapNodeSize(n); return { x: n.x, y: n.y, w: s.w, h: s.h }; };
    const a = box(by("A")), b = box(by("B")), a1 = box(by("A1"));
    const v = idx.nodes.map(box); let overlaps = 0;
    for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) { const p = v[i], q = v[j]; if (p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h) overlaps++; }
    return { siblings: Math.round(b.y - (a.y + a.h)), depth: Math.round(a1.x - (a.x + a.w)), overlaps };
  });
  const set = async (value) => { await page.evaluate(async (v) => { await wbMapSetTheme({ spacing: v }); }, value); await page.waitForTimeout(1200); };
  await page.evaluate(async () => { await wbMapTidy({ quiet: true }); }); await page.waitForTimeout(800);
  const normal = await measure();
  await set("compact");
  const compact = await measure();
  await set("roomy");
  const roomy = await measure();
  check(compact.depth < normal.depth && roomy.depth > normal.depth, "the gap to the children follows the spacing", JSON.stringify({ compact: compact.depth, normal: normal.depth, roomy: roomy.depth }));
  check(compact.siblings <= normal.siblings && roomy.siblings > normal.siblings, "the gap between siblings follows it too", JSON.stringify({ compact: compact.siblings, normal: normal.siblings, roomy: roomy.siblings }));
  check(!compact.overlaps && !roomy.overlaps, "nothing overlaps at either end", JSON.stringify({ compact: compact.overlaps, roomy: roomy.overlaps }));
  await page.evaluate(async () => { await wbRefreshMapState(); renderWhiteboardNow(); });
  const kept = await page.evaluate(() => wbMapTheme().spacing);
  check(kept === "roomy", "the map keeps its spacing", String(kept));
  const offered = await page.evaluate(() => WB_MAP_THEME_GROUPS.some((g) => g.fields.some((f) => f.key === "spacing")));
  check(offered, "How this map looks offers Spacing");
  await set(null);
  const back = await measure();
  check(back.depth === normal.depth, "Normal puts it back", JSON.stringify({ back, normal }));
  check(!errors.length, "no page errors", errors.join(" | ").slice(0, 300));
  console.log(`${passes}/${passes + fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
