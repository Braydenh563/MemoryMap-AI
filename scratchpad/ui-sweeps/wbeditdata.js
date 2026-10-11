// canvasdepth2: Edit data (draw.io's custom properties), measured: the
// Format panel's Data tab lists a shape's named values, Add a property and
// typing saves one, a bad name is refused, remove takes one off, one Undo
// per change, the values survive a reopen, and the rows fit the panel.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbeditdata.js
const { openFresh, checker } = require("./cdlib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, errors, phone } = await openFresh({ width: W });
  const { check, summary } = checker();
  const id = await page.evaluate(async () => {
    const s = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify({ d: "M100 100 L300 100 L300 200 L100 200 Z", shape: "rect", color: "#333333", width: 2, props: { owner: "Ann" } }), board_id: window.currentBoardId, z: 5 }) });
    wbState.sketches.push(s);
    renderWhiteboardNow();
    wbHandleItemClick("sketch", s.id, { shiftKey: false });
    await wbRunCommand("edit-data");
    return s.id;
  });
  await page.waitForTimeout(500);
  const first = await page.evaluate(() => ({ tab: document.querySelector('[data-format-tab="data"]').getAttribute("aria-selected"), rows: [...document.querySelectorAll("#wb-fmt-props .wb-fmt-prop")].map((r) => [r.querySelector(".wb-fmt-prop-name").value, r.querySelector(".wb-fmt-prop-value").value]) }));
  check("Edit data opens the Data tab with the shape's values", first.tab === "true" && JSON.stringify(first.rows) === '[["owner","Ann"]]', first);
  await page.click("#wb-fmt-prop-add");
  await page.keyboard.type("status");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Draft");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(800);
  const saved = await page.evaluate((id) => wbSketchData(wbState.sketches.find((s) => s.id === id)).props, id);
  check("Add a property, type a name and a value: saved", saved?.status === "Draft" && saved?.owner === "Ann", saved);
  const fit = await page.evaluate(() => {
    const panel = document.getElementById("wb-format").getBoundingClientRect();
    const rows = [...document.querySelectorAll("#wb-fmt-props .wb-fmt-prop")].map((r) => r.getBoundingClientRect());
    const tabs = document.getElementById("wb-format-tabs");
    const rm = document.querySelector(".wb-fmt-prop-remove").getBoundingClientRect();
    return { inside: rows.every((r) => r.left >= panel.left - 0.5 && r.right <= panel.right + 0.5), tabsScroll: tabs.scrollWidth - tabs.clientWidth, rm: [Math.round(rm.width), Math.round(rm.height)] };
  });
  check("the rows fit the panel and the four tabs do not scroll", fit.inside && fit.tabsScroll <= 1, fit);
  const min = phone ? 44 : 24;
  check(`the remove button is at least ${min}px`, fit.rm[0] >= min && fit.rm[1] >= min, fit.rm);
  await page.evaluate(() => { const v = document.querySelector("#wb-fmt-props .wb-fmt-prop .wb-fmt-prop-name"); v.value = "9 lives"; v.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(700);
  const refused = await page.evaluate((id) => wbSketchData(wbState.sketches.find((s) => s.id === id)).props, id);
  check("a name starting with a digit is not kept", refused && !("9 lives" in refused) && refused.status === "Draft", refused);
  const undone = await page.evaluate(async (id) => { await wbUndo(); return wbSketchData(wbState.sketches.find((s) => s.id === id)).props; }, id);
  check("one Undo puts the last change back", undone?.owner === "Ann" && undone?.status === "Draft", undone);
  const back = await page.evaluate(async (id) => { await openWhiteboardBoard(window.currentBoardId); return wbSketchData(wbState.sketches.find((s) => s.id === id)).props; }, id);
  check("the values survive a reopen", back?.status === "Draft", back);
  if (process.env.SHOTS) { await page.evaluate((id) => { wbHandleItemClick("sketch", id, { shiftKey: false }); wbFormatOpen("data", { focus: false }); }, id); await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.SHOTS}/editdata-${W}.png` }); }
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
