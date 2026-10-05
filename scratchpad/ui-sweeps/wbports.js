// Connection points (wb-phase2 step 5). With Select, pointing at a diamond
// shows eight points on the diamond itself (its tips and side middles, not
// its box's corners); a drag from its right tip to a rectangle makes one
// elbow connector with an arrow, anchored at both ends, selected, one Undo
// step; a selected item shows no points (its grips are there); dragging a
// shape by its middle still moves it; a link anchored at a box corner before
// keeps its end.
//   BASE=http://127.0.0.1:8795 W=390 H=844 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbports.js
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();

(async () => {
  const W = Number(process.env.W || 1440), H = Number(process.env.H || 900);
  const { browser, page, errors, board } = await openBoard({ viewport: { width: W, height: H } });
  const ids = await page.evaluate(async (bid) => {
    const post = async (data) => (await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify(data), x: 0, y: 0, z: 1, board_id: bid }) })).id;
    const diamond = await post({ d: "M 60 0 L 120 50 L 60 100 L 0 50 Z", shape: "diamond", color: "#335599", width: 2 });
    const rect = await post({ d: "M 300 20 h 120 v 60 h -120 Z", shape: "rect", color: "#335599", width: 2 });
    await fetchWhiteboardState();
    renderWhiteboardNow();
    wbZoomToFit();
    clearWbSelection();
    wbSelectToolRef?.("select");
    return { diamond, rect };
  }, board.id);
  await page.waitForTimeout(700);
  const screenOf = (x, y) => page.evaluate(([x, y]) => {
    const svg = document.getElementById("wb-svg-layer");
    const pt = svg.createSVGPoint();
    pt.x = x; pt.y = y;
    const s = pt.matrixTransform(document.getElementById("wb-zoom-group").getScreenCTM());
    return { x: s.x, y: s.y };
  }, [x, y]);
  const hints = () => page.evaluate(() => [...document.querySelectorAll("#wb-anchor-hints circle")].map((c) => [Math.round(Number(c.getAttribute("cx"))), Math.round(Number(c.getAttribute("cy")))]));

  const mid = await screenOf(60, 50);
  await page.mouse.move(mid.x, mid.y, { steps: 3 });
  await page.waitForTimeout(200);
  const shown = await hints();
  const want = [[60, 0], [120, 50], [60, 100], [0, 50], [90, 25], [90, 75], [30, 75], [30, 25]];
  const same = shown.length === 8 && want.every(([x, y]) => shown.some(([a, b]) => Math.abs(a - x) <= 1 && Math.abs(b - y) <= 1));
  check("pointing at a diamond shows its eight points, on the diamond", same, shown);

  // Drag from the right tip to the rectangle's left side.
  const tip = await screenOf(120, 50);
  const into = await screenOf(302, 50);
  await page.mouse.move(tip.x - 1, tip.y, { steps: 2 });
  await page.waitForTimeout(150);
  const before = await page.evaluate(() => ({ n: wbState.sketches.length, undo: wbUndoStack.length }));
  await page.mouse.down();
  await page.mouse.move((tip.x + into.x) / 2, tip.y + 10, { steps: 6 });
  const preview = await page.evaluate(() => Boolean(document.querySelector(".wb-port-preview")));
  await page.mouse.move(into.x, into.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  const made = await page.evaluate(([ids, before]) => {
    const link = wbState.sketches.slice(before.n).map((s) => ({ id: s.id, data: JSON.parse(s.data) }))[0];
    const diamond = wbItemBBox("sketch", wbFindItem("sketch", ids.diamond));
    return {
      link: link?.data, selected: wbSelectedItem?.id === link?.id,
      undo: wbUndoStack.length - before.undo, diamondMoved: Math.round(diamond.minX) !== 0,
      preview: Boolean(document.querySelector(".wb-port-preview")),
    };
  }, [ids, before]);
  check("a dashed preview follows the drag", preview, preview);
  check("a drag from a point makes an elbow connector with an arrow, both ends anchored", made.link && made.link.route === "elbow" && made.link.endCap === "arrow" && made.link.sourceId === ids.diamond && made.link.targetId === ids.rect && made.link.sourceAnchor?.x === 1 && made.link.sourceAnchor?.y === 0.5 && made.link.targetAnchor, made);
  check("the diamond did not move, the new connector is selected, one Undo step, no preview left", !made.diamondMoved && made.selected && made.undo === 1 && !made.preview, made);
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(800);
  const undone = await page.evaluate((n) => wbState.sketches.length === n, before.n);
  check("Undo takes the connector away", undone, undone);

  // Selected: no points (its grips are there).
  await page.evaluate((id) => selectWbItem("sketch", id), ids.diamond);
  await page.waitForTimeout(300);
  await page.mouse.move(mid.x + 3, mid.y + 3, { steps: 2 });
  await page.waitForTimeout(200);
  check("a selected item shows no points", (await hints()).length === 0, await hints());
  await page.evaluate(() => clearWbSelection());

  // A drag from the middle still moves the shape.
  const body = await screenOf(60, 60);
  await page.mouse.move(body.x, body.y, { steps: 2 });
  await page.mouse.down();
  await page.mouse.move(body.x + 40, body.y + 30, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  const moved = await page.evaluate((id) => wbItemBBox("sketch", wbFindItem("sketch", id)), ids.diamond);
  check("dragging a shape by its middle still moves it", moved.minX > 5 && moved.minY > 5, moved);

  // A link anchored at a box corner (the old eight) keeps its end there.
  const corner = await page.evaluate(async ([bid, ids]) => {
    const made = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify({ type: "link-straight", sourceId: ids.diamond, sourceKind: "sketch", sourceAnchor: { x: 0, y: 0 }, targetId: ids.rect, targetKind: "sketch", width: 2 }), x: 0, y: 0, z: 1, board_id: bid }) });
    wbState.sketches.push(made);
    renderWhiteboardNow();
    const d = document.querySelector(`.sketch-group[data-id="${made.id}"] .sketch-path`).getAttribute("d");
    const box = wbItemBBox("sketch", wbFindItem("sketch", ids.diamond));
    const m = d.match(/^M (-?[\d.]+) (-?[\d.]+)/);
    return { start: [Number(m[1]), Number(m[2])], corner: [box.minX, box.minY] };
  }, [board.id, ids]);
  check("a link anchored at an old box corner keeps its end", Math.abs(corner.start[0] - corner.corner[0]) < 0.6 && Math.abs(corner.start[1] - corner.corner[1]) < 0.6, corner);

  check("no console errors", errors.length === 0, errors.slice(0, 5));
  const ok = summary();
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
