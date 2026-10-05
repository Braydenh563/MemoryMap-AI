// FEAT-07: Bring forward is one step; Ctrl+] is the front. The command table
// drives the Arrange menu, the palette and the shortcut sheet (FEAT-11, 19).
//   BASE=http://127.0.0.1:8845 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wb1005-zorder.js
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();

(async () => {
  const { browser, page, errors, board } = await openBoard({ viewport: { width: +(process.env.W || 1440), height: 900 } });
  const ids = await page.evaluate(async (bid) => {
    const out = [];
    for (const [i, color] of [["A", "#d33"], ["B", "#3d3"], ["C", "#33d"]].entries()) {
      const x = 100 + i * 30;
      const d = `M${x} 100 L${x + 120} 100 L${x + 120} 220 L${x} 220 Z`;
      const made = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({
        data: JSON.stringify({ d, color: color[1], width: 3, shape: "rect", fill: color[1], fillOpacity: 1 }),
        x: 0, y: 0, z: 5, board_id: bid,
      }) });
      out.push(made.id);
    }
    await fetchWhiteboardState();
    renderWhiteboardNow();
    return out;
  }, board.id);
  const domOrder = () => page.evaluate((ids) => [...document.querySelectorAll("#wb-zoom-group g.sketch-group")]
    .map((g) => ["A", "B", "C"][ids.indexOf(Number(g.__data__?.id))]).filter(Boolean).join(""), ids);
  check("three tied shapes paint A, B, C", (await domOrder()) === "ABC", await domOrder());
  await page.evaluate((id) => { selectWbItem("sketch", id); }, ids[0]);
  await page.focus("#whiteboard-container");
  await page.keyboard.press("]");
  await page.waitForTimeout(600);
  check("] on A passes one shape: B, A, C", (await domOrder()) === "BAC", await domOrder());
  await page.keyboard.press("Control+]");
  await page.waitForTimeout(600);
  check("Ctrl+] takes A to the front", (await domOrder()) === "BCA", await domOrder());
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(600);
  check("Undo puts the front back to one step", (await domOrder()) === "BAC", await domOrder());
  await page.keyboard.press("[");
  await page.waitForTimeout(600);
  check("[ on A sends it back one: A, B, C", (await domOrder()) === "ABC", await domOrder());
  check("the step is announced", (await page.textContent("#wb-announcer")).length > 0);

  // The Arrange menu: the four order rows, Group and Lock.
  await page.click('[aria-controls="wb-arrange-menu"]');
  await page.waitForTimeout(300);
  const rows = await page.evaluate(() => [...document.querySelectorAll("#wb-arrange-menu [data-wb-cmd]")]
    .filter((b) => b.offsetParent).map((b) => b.dataset.wbCmd));
  check("Arrange shows the four order rows and Group and Lock",
    ["order-forward", "order-backward", "order-front", "order-back", "group", "lock"].every((c) => rows.includes(c)), rows);
  const muted = await page.evaluate(() => document.querySelector('#wb-arrange-menu [data-wb-cmd="align-left"]').getAttribute("aria-disabled"));
  check("align is muted with one item selected", muted === "true", muted);
  await page.click('#wb-arrange-menu [data-wb-cmd="order-front"]');
  await page.waitForTimeout(600);
  check("the menu's Bring to front runs", (await domOrder()) === "BCA", await domOrder());

  // The palette's board group.
  await page.keyboard.press("Escape");
  await page.evaluate((id) => selectWbItem("sketch", id), ids[1]);
  const palette = await page.evaluate(() => wbPaletteCommands().map((r) => r.label));
  check("the palette lists 40 or more board commands with a shape selected", palette.length >= 40, palette.length);
  await page.focus("#whiteboard-container");
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(500);
  await page.keyboard.type("bring to front");
  await page.waitForTimeout(500);
  const found = await page.evaluate(() => document.querySelector("#palette-overlay")?.innerText || "");
  check("typing a board action's name finds it", /Bring to front/.test(found), found.slice(0, 300));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // The shortcut sheet's whiteboard section.
  await page.evaluate(() => openShortcuts());
  await page.waitForTimeout(400);
  const sheet = await page.evaluate(() => document.querySelectorAll("#shortcut-list-whiteboard li").length);
  check("the shortcut sheet lists the board's keys", sheet >= 30, sheet);
  await page.evaluate(() => closeShortcuts());

  // The right-click menu: the same four words.
  await page.evaluate((id) => selectWbItem("sketch", id), ids[1]);
  const menu = await page.evaluate(() => {
    const m = wbBuildContextMenu("sketch");
    return m.innerText;
  });
  check("the right-click menu names the four steps", ["Bring forward", "Send backward", "Bring to front", "Send to back"].every((w) => menu.includes(w)), menu);
  check("no console errors", errors.length === 0, errors);
  summary();
  await browser.close();
})();
