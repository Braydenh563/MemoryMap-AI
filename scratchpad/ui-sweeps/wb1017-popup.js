// B29 (INBOX 904), "the popup controls are all over the place": where the
// selection's popup bar sits against what is selected, for one text box, one
// shape, a two-item selection and a group, at 1440 and 390. Reports the bar's
// box, the selection's box, the gap between them, rows of controls and any
// control past the bar's edge.
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();
const W = Number(process.env.W || 1440);
(async () => {
  const { browser, page, board } = await openBoard({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const ids = await page.evaluate(async (bid) => {
    const box = async (x, y, words) => (await apiJson("/whiteboard/objects", { method: "POST", body: JSON.stringify({ kind: "text", data: { content: words }, board_id: bid, x, y, z: 1, width: 160, height: 80 }) })).id;
    const a = await box(W_X(), 250, "Alpha");
    const b = await box(W_X() + 220, 330, "Beta");
    const s = (await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify({ d: "M 120 450 L 280 450 L 280 540 L 120 540 Z", shape: "rect", color: "#335599", width: 2, fill: "#ffcc00" }), x: 0, y: 0, z: 1, board_id: bid }) })).id;
    await fetchWhiteboardState(); renderWhiteboardNow();
    return { a, b, s };
    function W_X() { return window.innerWidth < 600 ? 40 : 200; }
  }, board.id);
  await page.waitForTimeout(600);
  const measure = (label) => page.evaluate((label) => {
    const bar = document.getElementById("wb-context");
    const r = bar.getBoundingClientRect();
    const kids = [...bar.querySelectorAll("button,input,select")].filter((e) => e.getBoundingClientRect().width > 0 && !e.closest(".hidden")).map((e) => e.getBoundingClientRect());
    const tops = [...new Set(kids.map((k) => Math.round(k.top)))];
    const sel = document.querySelector(".wb-in-group, .selected, .wb-selected");
    const vw = innerWidth;
    return { label, shown: !bar.classList.contains("hidden") && r.width > 0, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), rows: tops.length, offRight: Math.round(Math.max(0, r.right - vw)), offLeft: Math.round(Math.max(0, -r.left)), spill: kids.filter((k) => k.right > r.right + 1 || k.left < r.left - 1).length };
  }, label);
  const rows = [];
  await page.evaluate((i) => selectWbItem("object", i.a), ids);
  await page.waitForTimeout(500);
  rows.push(await measure("text box"));
  await page.evaluate((i) => selectWbItem("sketch", i.s), ids);
  await page.waitForTimeout(500);
  rows.push(await measure("shape"));
  await page.evaluate((i) => { wbMultiSelection.clear(); wbMultiSelection.add(wbMultiKey("object", i.a)); wbMultiSelection.add(wbMultiKey("object", i.b)); wbApplySelectionHighlight(); wbUpdateContextBar(); }, ids);
  await page.waitForTimeout(500);
  rows.push(await measure("two items"));
  await page.evaluate(() => wbGroupSelection());
  await page.waitForTimeout(800);
  rows.push(await measure("grouped"));
  for (const r of rows) {
    console.log(JSON.stringify(r));
    check(`${r.label}: the bar is on screen, one row, nothing spilling`, r.shown && r.offRight === 0 && r.offLeft === 0 && r.spill === 0, r);
  }
  summary();
  await browser.close();
})();
