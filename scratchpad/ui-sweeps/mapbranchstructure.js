// canvasdepth2: a structure per branch (XMind), measured: one main branch as
// an org chart and one as a fishbone inside a tree-right map; nothing
// overlaps, the org chart's topics sit under its top, the lines follow, the
// choice survives a reopen, and one Undo takes it back.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapbranchstructure.js
const { openFresh, checker, openMap, overlapIn } = require("./cd2lib.js");
const OUTLINE = ["# Plan", "- Plan", "  - Alpha", "    - A1", "    - A2", "    - A3", "  - Beta", "    - B1", "    - B2", "      - B21", "  - Gamma", "    - G1", "    - G2"].join("\n");
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, errors } = await openFresh({ width: W });
  const { check, summary } = checker();
  await openMap(page, OUTLINE);
  await page.evaluate(() => wbMapSetLayout("tree-right"));
  await page.waitForTimeout(900);
  const named = (label) => page.evaluate((l) => wbMapIndex().nodes.find((o) => wbMapLabel(o) === l)?.id, label);
  const alpha = await named("Alpha");
  const beta = await named("Beta");
  // Through the topic's menu, the route a person takes.
  await page.evaluate((id) => {
    const node = wbState.objects.find((o) => o.id === id);
    wbHandleItemClick("object", id, { shiftKey: false });
    const r = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect();
    wbOpenMapNodeMenu(node, r.x + 10, r.y + 10);
  }, alpha);
  await page.waitForTimeout(400);
  const menu = await page.evaluate(() => [...document.querySelectorAll(".wb-ctx-menu:not(.hidden) [role=menuitem], .wb-ctx-menu:not(.hidden) button")].map((b) => b.textContent.trim()).filter(Boolean).slice(0, 80));
  check("the topic menu offers Structure", menu.some((t) => /^Structure/.test(t)), menu);
  await page.keyboard.press("Escape");
  await page.evaluate(async ([a, b]) => {
    await wbMapSetBranchLayout(wbState.objects.find((o) => o.id === a), "tree-down");
    await wbMapSetBranchLayout(wbState.objects.find((o) => o.id === b), "fishbone");
  }, [alpha, beta]);
  await page.waitForTimeout(900);
  const read = await page.evaluate((a) => {
    const index = wbMapIndex();
    const top = index.byId.get(a);
    const kids = index.childrenOf.get(a);
    const ts = wbMapNodeSize(top);
    return {
      under: kids.every((k) => k.y >= top.y + ts.h - 1),
      bl: kids.map((k) => k._bl),
      edges: kids.map((k) => document.querySelector(`.wb-map-edge[data-child="${k.id}"], .wb-map-edge[data-to="${k.id}"]`)?.getAttribute("d") || null),
      allEdges: document.querySelectorAll("#wb-zoom-group .wb-map-edges .wb-map-edge").length,
      topics: index.nodes.length,
    };
  }, alpha);
  check("the org chart's topics sit under its top", read.under, read);
  check("each topic in it knows its branch's structure", read.bl.every((b) => b === "tree-down"), read.bl);
  check("a line to every topic but the centre", read.allEdges >= read.topics - 1, read);
  const undone = await page.evaluate(async (b) => { await wbUndo(); return wbState.objects.find((o) => o.id === b)?.data?.branch_layout ?? null; }, beta);
  check("one Undo takes the last structure off", undone === null, undone);
  const redone = await page.evaluate(async (b) => { await wbRedo(); return wbState.objects.find((o) => o.id === b)?.data?.branch_layout ?? null; }, beta);
  check("and Redo puts it back", redone === "fishbone", redone);
  await page.waitForTimeout(500);
  const pairs = await overlapIn(page);
  check("nothing overlaps with two structures in a tree map", pairs === 0, pairs);
  for (const layout of ["tree-both", "radial", "timeline", "tree-table"]) {
    await page.evaluate((l) => wbMapSetLayout(l), layout);
    await page.waitForTimeout(900);
    const p = await overlapIn(page);
    check(`nothing overlaps in a ${layout} map`, p === 0, p);
  }
  // Free: only the structured branches are laid out, round their own topic.
  const free = await page.evaluate(async ([a, b]) => {
    await wbMapSetLayout("free");
    const index = wbMapIndex();
    const inside = new Set([...wbMapSubtree(index, a), ...wbMapSubtree(index, b)].map((o) => o.id));
    const before = new Map(index.nodes.map((o) => [o.id, [o.x, o.y]]));
    const positions = wbMapTidyPositions(index, "free");
    return { moved: [...positions.keys()].filter((id) => !inside.has(id)).length, kept: [...before].filter(([id]) => !inside.has(id)).every(([id, p]) => { const o = wbMapIndex().byId.get(id); return o.x === p[0] && o.y === p[1]; }), laid: positions.size };
  }, [alpha, beta]);
  check("on a Free map only the structured branches are laid out", free.moved === 0 && free.laid >= 8, free);
  await page.evaluate(() => wbMapSetLayout("tree-right"));
  await page.waitForTimeout(700);
  const reopen = await page.evaluate(async (a) => { await openWhiteboardBoard(window.currentBoardId); return wbState.objects.find((o) => o.id === a)?.data?.branch_layout; }, alpha);
  check("the structure survives a reopen", reopen === "tree-down", reopen);
  await page.waitForTimeout(600);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/branchstructure-${W}.png` });
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
