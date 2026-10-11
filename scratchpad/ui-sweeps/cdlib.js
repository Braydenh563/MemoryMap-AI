// canvasdepth sweeps: boot, open the board surface (waiting on the lazy
// bundle, not a sleep) and a fresh board of `type`.
const { boot, openBoardsTab, waitForBoardOpen } = require("./lib.js");
const { checker } = require("./wb1005-lib.js");
async function openFresh({ width = 1440, type = "board", title = "canvasdepth" } = {}) {
  const phone = width < 600;
  const b = await boot({ viewport: { width, height: phone ? 844 : 900 }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  const { page } = b;
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/401/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  await openBoardsTab(page);
  await page.evaluate(() => { window.confirmDialog = async () => true; });
  const board = await page.evaluate(async ([t, k]) => apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `${t} ${Date.now()}`, type: k }) }), [title, type]);
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, board.id);
  await waitForBoardOpen(page, 0);
  await page.waitForTimeout(400);
  return { ...b, errors, board, phone };
}
module.exports = { openFresh, checker };
