// The mind map topic strip's Shape menu, opened: is the Fill row there?
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({ viewport: { width: 1440, height: 900 } });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  const id = await page.evaluate(async () => {
    const board = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `menu ${Date.now()}`, type: "map" }) });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    const root = await apiJson("/whiteboard/objects", { method: "POST", body: JSON.stringify({ board_id: board.id, kind: "topic", x: 300, y: 300, width: 170, height: 52, data: { content: "Tasks" } }) });
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    return root.id;
  });
  await page.waitForTimeout(800);
  await page.click(`.wb-object[data-id="${id}"]`);
  await page.waitForTimeout(500);
  await page.click('[aria-controls="wb-map-shape-menu"]');
  await page.waitForTimeout(500);
  const out = await page.evaluate(() => {
    const menu = document.getElementById("wb-map-shape-menu");
    const fill = document.getElementById("wb-map-fill");
    const row = fill?.closest("label, .row, div");
    return { menuShown: !!menu && !menu.classList.contains("hidden"), fillInMenu: !!menu?.contains(fill), fillVisible: !!row && row.getClientRects().length > 0, text: menu?.innerText.replace(/\s+/g, " ").slice(0, 300) };
  });
  console.log(JSON.stringify(out));
  await (await page.$("#wb-map-shape-menu"))?.screenshot({ path: process.env.OUT_PNG }).catch(() => null);
  await browser.close();
})();
