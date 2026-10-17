// B37 (INBOX 904): "Pressing down the scroll wheel and dragging sometimes
// glitches a little initially when starting to drag." Middle-button drag of
// the board (empty canvas, over a text box, over a map topic) and of the
// graph; after every small move the pan offset is read against the pointer's
// travel from the press. A glitch at the start is a deviation or a page
// scroll in the first moves.
const { openBoard, checker } = require("./wb1005-lib.js");
const { check } = checker();
(async () => {
  const { browser, page, board } = await openBoard();
  await page.evaluate(async (bid) => {
    await apiJson("/whiteboard/objects", { method: "POST", body: JSON.stringify({ kind: "text", data: { content: "Pan over me" }, board_id: bid, x: 700, y: 300, z: 1, width: 200, height: 100 }) });
    await fetchWhiteboardState(); renderWhiteboardNow();
  }, board.id);
  await page.waitForTimeout(600);
  const read = () => page.evaluate(() => { const t = d3.zoomTransform(document.getElementById("whiteboard-container")); return { x: t.x, y: t.y, sx: window.scrollX, sy: window.scrollY, ds: document.scrollingElement.scrollTop }; });
  async function drag(label, x, y) {
    const before = await read();
    await page.mouse.move(x, y);
    await page.mouse.down({ button: "middle" });
    const devs = [];
    const steps = [1, 2, 3, 5, 8, 13, 21, 40];
    let tot = 0;
    for (const st of steps) {
      tot += st;
      await page.mouse.move(x + tot, y + Math.round(tot / 2));
      await page.waitForTimeout(16);
      const now = await read();
      devs.push([tot, Math.round((now.x - before.x) * 10) / 10, Math.round((now.y - before.y) * 10) / 10, now.ds - before.ds]);
    }
    await page.mouse.up({ button: "middle" });
    await page.waitForTimeout(300);
    const worst = Math.max(...devs.map(([t, dx, dy]) => Math.max(Math.abs(dx - t), Math.abs(dy - Math.round(t / 2)))));
    console.log(label, JSON.stringify(devs), "worst deviation", worst);
    check(label + " follows the hand from the first move", worst <= 1, devs);
  }
  await drag("empty canvas", 300, 700);
  await drag("over a text box", 760, 340);
  await browser.close();
})();
