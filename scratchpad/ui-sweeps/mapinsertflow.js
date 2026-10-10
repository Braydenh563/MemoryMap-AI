// The owner, 2026-10-10: "when I added a mindmap node in between, it changed
// the colour of the other nodes in the branch and the spacing is really
// close to the other things and bunched up"; "New mind map nodes don't take
// into account direction of flow for that branch". On a both-sides map:
// Root > A(A1, A2), B(B1), C(C1, C2), D(D1). A child added under a left
// branch goes left and no branch crosses the trunk; a topic inserted between
// Root and B takes B's colour, side and slot, and no other topic changes
// colour; the gaps hold and nothing overlaps. Then the same insert on a
// sideways tree. Before (base scripts): 8 topics changed colour, C and D
// crossed sides.
//   BASE=http://127.0.0.1:8783 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapinsertflow.js
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
  const snap = () => page.evaluate(() => {
    const idx = wbMapIndex(); const colors = wbMapColors(idx);
    const out = {};
    for (const n of idx.nodes) { const s = wbMapNodeSize(n); out[wbMapLabel(n).trim()] = { id: n.id, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(s.w), h: Math.round(s.h), c: colors.get(n.id), p: n.parent_id }; }
    return out;
  });
  const gaps = (s) => { const cols = {}; for (const v of Object.values(s)) (cols[v.x] = cols[v.x] || []).push(v); let min = Infinity; for (const list of Object.values(cols)) { list.sort((a, b) => a.y - b.y); for (let i = 1; i < list.length; i++) min = Math.min(min, list[i].y - (list[i - 1].y + list[i - 1].h)); } return min; };
  const overlaps = (s) => { const v = Object.values(s); let n = 0; for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) { const a = v[i], b = v[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) n++; } return n; };
  for (const layout of ["tree-both", "tree-right"]) {
    const md = "# F\n- Root\n  - A\n    - A1\n    - A2\n  - B\n    - B1\n  - C\n    - C1\n    - C2\n  - D\n    - D1";
    const map = await page.evaluate(async (md) => apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: md, name: "Flow " + Date.now() }) }), md);
    await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, map.id); await page.waitForTimeout(1400);
    await page.evaluate(async (l) => { await wbMapSetLayout(l); }, layout);
    await page.waitForTimeout(1200);
    const side = (s, k) => (s[k].x + s[k].w / 2 < s.Root.x + s.Root.w / 2 ? "L" : "R");
    const sides = (s) => ["A", "B", "C", "D"].map((k) => k + side(s, k)).join(" ");
    const s0 = await snap();
    if (layout === "tree-both") {
      const left = ["A", "B", "C", "D"].find((k) => side(s0, k) === "L");
      await page.evaluate(async (id) => { await wbMapAddChild(id); }, s0[left].id);
      await page.waitForTimeout(500); await page.keyboard.type("New kid"); await page.keyboard.press("Escape"); await page.waitForTimeout(1200);
      const s1 = await snap();
      check(s1["New kid"] && s1["New kid"].x + s1["New kid"].w <= s1[left].x, `${layout}: a child of a left branch goes left`, JSON.stringify({ kid: s1["New kid"], parent: s1[left] }));
      check(sides(s1) === sides(s0), `${layout}: no branch crosses the trunk when one grows`, `${sides(s0)} -> ${sides(s1)}`);
    }
    const s1 = await snap();
    const slot = (s, parentId, id) => page.evaluate(({ parentId, id }) => { const idx = wbMapIndex(); return [...(idx.childrenOf.get(parentId) || [])].sort(wbMapBySiblingOrder).map((n) => n.id).indexOf(id); }, { parentId, id });
    const bSlot = await slot(s1, s1.Root.id, s1.B.id);
    await page.evaluate(async ({ root, b }) => { await wbMapInsertBetween(root, b); }, { root: s1.Root.id, b: s1.B.id });
    await page.waitForTimeout(500); await page.keyboard.type("Mid"); await page.keyboard.press("Escape"); await page.waitForTimeout(1300);
    const s2 = await snap();
    const changed = Object.keys(s1).filter((k) => s2[k] && s2[k].c !== s1[k].c);
    check(!changed.length && s2.Mid?.c === s1.B.c, `${layout}: the inserted topic takes B's colour and no other topic changes`, JSON.stringify({ changed, mid: s2.Mid?.c, b: s1.B.c }));
    check(side(s2, "Mid") === side(s1, "B") && (layout !== "tree-both" || sides(s2).replace(/B./, "") === sides(s1).replace(/B./, "")), `${layout}: on B's side, and the others stay`, `${sides(s1)} -> Mid${side(s2, "Mid")} ${sides(s2)}`);
    const midSlot = await slot(s2, s2.Root.id, s2.Mid.id);
    check(midSlot === bSlot, `${layout}: in B's slot among the trunk's branches`, JSON.stringify({ bSlot, midSlot }));
    const g1 = gaps(s1), g2 = gaps(s2);
    check(g2 >= Math.min(g1, 20) && overlaps(s2) === 0, `${layout}: the gaps hold, nothing overlaps`, JSON.stringify({ before: g1, after: g2, overlaps: overlaps(s2) }));
  }
  check(!errors.length, "no page errors", errors.join(" | ").slice(0, 300));
  console.log(`${passes}/${passes + fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
