// canvasdepth2: a table on the board (draw.io's), measured: Insert, Table
// places a 3 by 3 grid that fills its box; double-click and type fills a
// cell, Tab walks to the next; the menu adds and removes rows and columns at
// the cell pressed, growing the box; a resize resizes every cell; the words
// survive a reopen; Undo takes a change back.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbtable.js
const { openFresh, checker } = require("./cdlib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, errors, phone } = await openFresh({ width: W });
  const { check, summary } = checker();
  await page.evaluate(() => wbRunCommand("insert-table"));
  await page.waitForTimeout(800);
  const t = await page.evaluate(() => {
    const d = wbState.objects.find((o) => o.kind === "table");
    const el = document.querySelector(`.wb-object[data-id="${d.id}"]`);
    const g = el.querySelector(".wb-table-grid").getBoundingClientRect(), e = el.getBoundingClientRect();
    return { id: d.id, cells: el.querySelectorAll(".wb-table-cell").length, fill: Math.abs(g.width - e.width) < 3 && Math.abs(g.height - e.height) < 3, w: d.width, h: d.height, head: getComputedStyle(el.querySelector('.wb-table-cell[data-r="0"]')).fontWeight };
  });
  check("Insert, Table places a 3 by 3 grid filling its box", t.cells === 9 && t.fill, t);
  check("its first row is a header (bold)", Number(t.head) >= 600, t.head);
  const cell = async (r, c) => page.evaluate(([id, r, c]) => { const b = document.querySelector(`.wb-object[data-id="${id}"] .wb-table-cell[data-r="${r}"][data-c="${c}"]`).getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height }; }, [t.id, r, c]);
  const c00 = await cell(0, 0);
  await page.mouse.dblclick(c00.x, c00.y);
  await page.waitForTimeout(200);
  await page.keyboard.type("Name");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Owner");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  const typed = await page.evaluate((id) => wbState.objects.find((o) => o.id === id).data.cells, t.id);
  check("double-click, type, Tab, type, Enter fills two cells", typed[0][0] === "Name" && typed[0][1] === "Owner", typed[0]);
  const c11 = await cell(1, 1);
  await page.mouse.click(c11.x, c11.y);
  await page.waitForTimeout(300);
  const rows = await page.evaluate((id) => wbTableMenuRows(wbState.objects.find((o) => o.id === id)).map(([l]) => l), t.id);
  check("the menu offers rows and columns at the cell pressed", rows.includes("Add a row below") && rows.includes("Delete this column"), rows);
  await page.evaluate(async (id) => { const d = wbState.objects.find((o) => o.id === id); await wbTableMenuRows(d).find(([l]) => l === "Add a row below")[2](); }, t.id);
  await page.waitForTimeout(500);
  await page.evaluate(async (id) => { const d = wbState.objects.find((o) => o.id === id); await wbTableMenuRows(d).find(([l]) => l === "Add a column to the right")[2](); }, t.id);
  await page.waitForTimeout(700);
  const grown = await page.evaluate((id) => { const d = wbState.objects.find((o) => o.id === id); return { rows: d.data.cells.length, cols: d.data.cells[0].length, w: d.width, h: d.height, newRow: d.data.cells[2].every((x) => x === ""), drawn: document.querySelectorAll(`.wb-object[data-id="${id}"] .wb-table-cell`).length }; }, t.id);
  check("a row went in under row 2 and a column after column 2", grown.rows === 4 && grown.cols === 4 && grown.newRow && grown.drawn === 16, grown);
  check("the box grew by one row and one column", Math.round(grown.h - t.h) === 40 && Math.round(grown.w - t.w) === 120, { before: [t.w, t.h], after: [grown.w, grown.h] });
  const undone = await page.evaluate(async (id) => { await wbUndo(); const d = wbState.objects.find((o) => o.id === id); return [d.data.cells.length, d.data.cells[0].length, d.width]; }, t.id);
  check("Undo takes the column back out", undone[0] === 4 && undone[1] === 3 && undone[2] === t.w, undone);
  const resized = await page.evaluate(async (id) => { const d = wbState.objects.find((o) => o.id === id); d.width = 600; await wbSaveObject(d); renderWhiteboardNow(); await new Promise((r) => setTimeout(r, 200)); const c = document.querySelector(`.wb-object[data-id="${id}"] .wb-table-cell`).getBoundingClientRect(); return { cellW: c.width }; }, t.id);
  const c00b = await cell(0, 0);
  check("a wider table widens every cell", c00b.w > c00.w * 1.2, { before: c00.w, after: c00b.w });
  const back = await page.evaluate(async (id) => { await openWhiteboardBoard(window.currentBoardId); return wbState.objects.find((o) => o.id === id)?.data.cells; }, t.id);
  await page.waitForTimeout(600);
  const shown = await page.evaluate((id) => document.querySelector(`.wb-object[data-id="${id}"] .wb-table-cell`)?.textContent, t.id);
  check("the words survive a reopen", back?.[0]?.[0] === "Name" && shown === "Name", { back: back?.[0], shown });
  const rowsMenu = await page.evaluate(() => [...document.querySelectorAll('#wb-insert-menu [data-wb-cmd="insert-table"]')].length);
  check("the Insert menu has Table", rowsMenu === 1);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/table-${W}.png` });
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
