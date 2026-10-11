// Whiteboard follow-ups (OPEN.md, canvasui and canvasdepth): an item's eye or lock on a hidden or locked
// named layer says the layer decides, and a hollow link end stops the shaft at its edge.
//   BASE=http://127.0.0.1:8856 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbfollowups.js
const { openFresh, checker } = require("./cdlib.js");
const { check, summary } = checker();

(async () => {
  const { browser, page } = await openFresh({ width: 1440 }); const board = { id: await page.evaluate(() => window.currentBoardId) };
  const ids = await page.evaluate(async (bid) => {
    const box = async (x, words, extra = {}) => (await apiJson("/whiteboard/objects", { method: "POST", body: JSON.stringify({
      kind: "text", data: { content: words, ...extra }, board_id: bid, x, y: 0, z: 1, width: 160, height: 80,
    }) })).id;
    await fetchWhiteboardState();
    await wbSaveNamedLayers([{ id: "lback", name: "Back", hidden: true, locked: true }], { undo: false });
    const a = await box(0, "On the back layer", { layer: "lback" });
    const b = await box(400, "Free card");
    const link = (await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({
      data: JSON.stringify({ type: "link-straight", sourceId: b, sourceKind: "object", targetId: b, targetKind: "object", color: "#335599", width: 3, endCap: "diamond", startCap: "circle" }), x: 0, y: 0, z: 5, board_id: bid,
    }) })).id;
    await fetchWhiteboardState();
    renderWhiteboardNow();
    wbOpenSidebar("layers");
    return { a, b, link };
  }, board.id);
  await page.waitForTimeout(700);
  const row = await page.evaluate((id) => {
    const li = document.querySelector(`#wb-layers-tree [data-key="object:${id}"]`);
    if (!li) return null;
    const eye = li.querySelector(".wb-layer-eye"), lock = li.querySelector(".wb-layer-lock");
    return { eye: eye.title, eyeCls: eye.className, lock: lock.title, label: li.getAttribute("aria-label"), eyeOpacity: getComputedStyle(eye).opacity };
  }, ids.a);
  check("the eye of an item on a hidden layer names the layer", row && /Hidden by its layer, Back/.test(row.eye) && /is-by-layer/.test(row.eyeCls), row);
  check("the lock of an item on a locked layer names the layer", row && /Locked by its layer, Back/.test(row.lock), row);
  await page.evaluate((id) => document.querySelector(`#wb-layers-tree [data-key="object:${id}"] .wb-layer-eye`).click(), ids.a);
  await page.waitForTimeout(500);
  const after = await page.evaluate((id) => ({
    flag: (wbState.objects.find((o) => o.id === id).data || {}).hidden,
    toast: [...document.querySelectorAll(".toast")].map((t) => t.textContent).join("|"),
  }), ids.a);
  check("pressing it changes nothing and says why", !after.flag && /hidden by its layer/.test(after.toast), after);
  // Path numbers: the shaft ends at the shape's edge for hollow ends, runs to the tip otherwise.
  const paths = await page.evaluate(() => {
    const s = { x: 0, y: 0 }, t = { x: 200, y: 0 };
    const first = (d) => d.split(" M ")[0].trim();
    return {
      none: first(wbLinkPathD("link-straight", s, t, { startCap: "none", endCap: "none" }, 3)),
      diamond: first(wbLinkPathD("link-straight", s, t, { startCap: "none", endCap: "diamond" }, 3)),
      circle: first(wbLinkPathD("link-straight", s, t, { startCap: "circle", endCap: "none" }, 3)),
      square: first(wbLinkPathD("link-straight", s, t, { startCap: "none", endCap: "square" }, 3)),
      triangle: first(wbLinkPathD("link-straight", s, t, { startCap: "none", endCap: "triangle" }, 3)),
      elbow: first(wbLinkPathD("link-straight", s, t, { startCap: "none", endCap: "diamond" }, 3, null, { route: "elbow", points: [] })),
      curved: first(wbLinkPathD("link-curved", { ...s, dir: { x: 1, y: 0 } }, { ...t, dir: { x: -1, y: 0 } }, { startCap: "none", endCap: "diamond" }, 3)),
    };
  });
  console.log(JSON.stringify(paths));
  check("a diamond end stops the shaft at its rear point (200 - 19.8)", /L 180\.2 0$/.test(paths.diamond), paths.diamond);
  check("a circle start begins at its far edge (12)", /^M 12 0/.test(paths.circle), paths.circle);
  check("a square end stops at its far edge", /L 1(7\d|8\d)(\.\d+)? 0$/.test(paths.square), paths.square);
  check("a solid triangle and no cap run to the tip", /L 200 0$/.test(paths.triangle) && /L 200 0$/.test(paths.none), [paths.triangle, paths.none]);
  check("an elbow and a curve stop short too", /L 180\.2 0$/.test(paths.elbow) && /180\.2 0$/.test(paths.curved), [paths.elbow, paths.curved]);
  await page.screenshot({ path: process.env.SCRATCH + "/wbfollowups.png" });
  await browser.close();
  process.exit(summary() ? 0 : 1);
})();
