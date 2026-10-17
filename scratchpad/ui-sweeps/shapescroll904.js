// INBOX 904 B26: opening a draw.io shape group re-renders the whole library
// when its file arrives, and the list jumped back to the top, so a group opened
// low in the list showed nothing where the person was looking. A real mouse
// press on the group's header; reads the list's scrollTop and the header's
// place before and after the shapes arrive.
// Usage: BASE=http://127.0.0.1:8783 [VIEWPORT=1440x900] node shapescroll904.js
const { boot, openBoardsTab, waitForBoardOpen } = require("./lib.js");
const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`); };
(async () => {
  const { browser, page } = await boot({ viewport: { width: vw, height: vh } });
  await openBoardsTab(page);
  await page.evaluate(() => wbNewUntitledBoard("board"));
  await waitForBoardOpen(page, 0);
  await page.waitForTimeout(800);
  await page.keyboard.press("Escape");
  await page.evaluate(() => wbOpenSidebar("library", { focus: false }));
  await page.waitForTimeout(2500);
  for (const key of ["set:drawio-bpmn", "set:drawio-networks", "set:drawio-arrows"]) {
    const sel = `#wb-lib-list .wb-lib-group[data-group="${key}"] > summary`;
    await page.evaluate((s) => { document.querySelector(s).scrollIntoView({ block: "center" }); }, sel);
    await page.waitForTimeout(300);
    const read = () => page.evaluate((s) => {
      const list = document.getElementById("wb-lib-list");
      const d = document.querySelector(s)?.parentElement;
      const sb = d?.querySelector("summary").getBoundingClientRect();
      const lb = list.getBoundingClientRect();
      const tiles = [...(d?.querySelectorAll(".wb-lib-tile") || [])];
      const shown = tiles.filter((t) => { const r = t.getBoundingClientRect(); return r.bottom > lb.top && r.top < lb.bottom; }).length;
      return { scrollTop: Math.round(list.scrollTop), open: !!d?.open, head: d ? Math.round(sb.top - lb.top) : null, tiles: tiles.length, tilesOnScreen: shown };
    }, sel);
    const before = await read();
    await page.click(sel);
    await page.waitForTimeout(2000);
    const after = await read();
    console.log(key, "before", JSON.stringify(before), "after", JSON.stringify(after));
    ok(`${key}: the list stays where it was when the shapes arrive`, Math.abs(after.scrollTop - before.scrollTop) < 4, `${before.scrollTop} to ${after.scrollTop}`);
    ok(`${key}: the opened group's tiles are on screen`, after.open && after.tilesOnScreen > 0, JSON.stringify(after));
  }
  await browser.close();
  console.log(bad ? `${bad} FAILED` : "all passed");
  process.exit(bad ? 1 : 0);
})();
