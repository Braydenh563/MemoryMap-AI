// INBOX 904 B26: "these dropdowns don't show anything". Opens every group of
// the board's shape library (the sidebar's Library tab) one at a time and
// measures what shows: tiles drawn, their box, and their picture.
// Usage: BASE=http://127.0.0.1:8783 [VIEWPORT=1440x900] node shapegroups904.js
const { boot, openBoardsTab, waitForBoardOpen } = require("./lib.js");
const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`); };
(async () => {
  const { browser, page, OUT } = await boot({ viewport: { width: vw, height: vh } });
  await openBoardsTab(page);
  await page.evaluate(() => wbNewUntitledBoard("board"));
  await waitForBoardOpen(page, 0);
  await page.waitForTimeout(800);
  await page.keyboard.press("Escape");
  await page.evaluate(() => wbOpenSidebar("library"));
  await page.waitForTimeout(2500);
  const groups = await page.evaluate(() => [...document.querySelectorAll("#wb-lib-list .wb-lib-group")].map((d) => ({ key: d.dataset.group, title: d.querySelector("summary span")?.textContent, open: d.open, count: d.querySelector(".wb-lib-count")?.textContent })));
  console.log("groups", JSON.stringify(groups));
  for (const g of groups) {
    // open it by pressing its summary, as a person does
    await page.evaluate((key) => { const d = document.querySelector(`#wb-lib-list .wb-lib-group[data-group="${key}"]`); if (!d.open) d.querySelector("summary").click(); }, g.key);
    await page.waitForTimeout(1500);
    const m = await page.evaluate((key) => {
      const d = document.querySelector(`#wb-lib-list .wb-lib-group[data-group="${key}"]`);
      const grid = d.querySelector(".wb-lib-grid");
      const tiles = [...d.querySelectorAll(".wb-lib-tile")];
      const gb = grid.getBoundingClientRect();
      const first = tiles[0]?.getBoundingClientRect();
      const art = tiles[0]?.querySelector("svg, img, canvas, .wb-lib-art");
      const ab = art?.getBoundingClientRect();
      const note = d.querySelector(".wb-lib-note")?.textContent || "";
      const list = document.getElementById("wb-lib-list");
      const lb = list.getBoundingClientRect();
      const sb = d.querySelector("summary").getBoundingClientRect();
      const inView = tiles.filter((t) => { const r = t.getBoundingClientRect(); return r.bottom > lb.top && r.top < lb.bottom && r.height > 0; }).length;
      return { listH: Math.round(lb.height), listScroll: list.scrollHeight - list.clientHeight, headInView: sb.top >= lb.top && sb.bottom <= lb.bottom, inView, open: d.open, tiles: tiles.length, visible: tiles.filter((t) => t.offsetParent !== null).length, gridH: Math.round(gb.height), gridW: Math.round(gb.width), firstBox: first ? [Math.round(first.width), Math.round(first.height)] : null, art: ab ? [Math.round(ab.width), Math.round(ab.height)] : null, artNodes: art ? art.querySelectorAll("*").length : 0, note };
    }, g.key);
    console.log(g.title, JSON.stringify(m));
    if (g.key !== 'lib:yours' && !/yours/i.test(g.title)) ok(`${g.title}: opens, and tiles are on screen without scrolling`, m.open && m.visible > 0 && m.gridH > 20 && m.art && m.art[0] > 4 && m.artNodes > 0 && m.inView > 0, JSON.stringify(m));
    await page.evaluate((key) => { const d = document.querySelector(`#wb-lib-list .wb-lib-group[data-group="${key}"]`); if (d.open) d.querySelector("summary").click(); }, g.key);
    await page.waitForTimeout(200);
  }
  if (process.env.SHOT) {
    await page.evaluate(() => { const d = document.querySelector('#wb-lib-list .wb-lib-group[data-group="set:drawio-basic"]') || document.querySelector('#wb-lib-list .wb-lib-group[data-group^="set:drawio-"]'); if (d && !d.open) d.querySelector("summary").click(); d?.scrollIntoView({ block: "start" }); });
    await page.waitForTimeout(1200);
  }
  if (process.env.SHOT) await page.screenshot({ path: `${OUT}/shapegroups904.png` });
  await browser.close();
  console.log(bad ? `${bad} FAILED` : "all passed");
  process.exit(bad ? 1 : 0);
})();
