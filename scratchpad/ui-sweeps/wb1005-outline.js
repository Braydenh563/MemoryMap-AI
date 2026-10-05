// The Outline tab on a mind map (MINDMAP §12.2 item 8, the first cut): the
// topics as a tree in sibling order, each row a named treeitem at its depth;
// Enter selects the topic; Left goes to the parent. And an open Layers tab
// follows the board: a shape drawn with it open is listed.
//   BASE=http://127.0.0.1:8845 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wb1005-outline.js
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();
const W = Number(process.env.W || 1440);

(async () => {
  const { browser, page, errors, board } = await openBoard({ type: "map", viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const ids = await page.evaluate(async (bid) => {
    //: The map's own route, which is how a topic gets its parent.
    const topic = async (text, parent) => (await apiJson(`/whiteboard/boards/${bid}/nodes`, { method: "POST", body: JSON.stringify({
      kind: "topic", parent_id: parent, text,
    }) })).id;
    await fetchWhiteboardState();
    const existing = (wbState.objects || []).filter((o) => o.kind === "topic");
    for (const o of existing) await apiJson(`/whiteboard/objects/${o.id}`, { method: "DELETE" });
    const root = await topic("Trip", null);
    const a = await topic("Packing", root);
    const b = await topic("Route", root);
    const a1 = await topic("Tent", a);
    await fetchWhiteboardState();
    renderWhiteboardNow();
    wbOpenSidebar("outline");
    return { root, a, b, a1 };
  }, board.id);
  await page.waitForTimeout(700);
  const rows = await page.evaluate(() => [...document.querySelectorAll("#wb-outline-tree [role='treeitem']")].map((r) => [r.getAttribute("aria-label"), r.getAttribute("aria-level")]));
  const want = [["Trip", "1"], ["Packing", "2"], ["Tent", "3"], ["Route", "2"]];
  check("the outline is the map in sibling order, each row at its depth", JSON.stringify(rows.filter((r) => want.some((w) => w[0] === r[0]))) === JSON.stringify(want), rows);
  await page.focus(`#wb-outline-tree [data-id="${ids.a1}"]`);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  const sel = await page.evaluate(() => wbSelectedItem);
  check("Enter selects the topic on the map", sel?.id === ids.a1, sel);
  await page.keyboard.press("ArrowLeft");
  const parent = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  check("Left goes to its parent", parent === "Packing", parent);
  check("no console errors", errors.length === 0, errors);
  await browser.close();

  // An open Layers tab follows the board.
  const second = await openBoard({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const before = await second.page.evaluate(async () => {
    wbOpenSidebar("layers", { focus: false });
    await new Promise((r) => setTimeout(r, 300));
    return document.querySelectorAll("#wb-layers-tree [role='treeitem']").length;
  });
  await second.page.evaluate(async () => {
    const s = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({
      data: JSON.stringify({ d: "M 0 0 L 100 0 L 100 60 L 0 60 Z", shape: "rect", color: "#335599", width: 2 }), x: 0, y: 0, z: 1, board_id: window.currentBoardId,
    }) });
    wbState.sketches.push(s);
    wbScheduleRender();
  });
  await second.page.waitForTimeout(900);
  const after = await second.page.evaluate(() => document.querySelectorAll("#wb-layers-tree [role='treeitem']").length);
  check("a shape drawn with Layers open is listed", after === before + 1, { before, after });
  check("no console errors on the board", second.errors.length === 0, second.errors);
  summary();
  await second.browser.close();
})();
