// The owner, 2026-10-11: "more arrow options". The tool chooses the mark, a
// plain line shows the end lists, each change is one Undo.
//   BASE=http://127.0.0.1:8800 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbcolour-ends.js
const { openBoard } = require("./wbcolour-lib.js");
const { checker } = require("./wb1005-lib.js");
const { check, summary } = checker();
(async () => {
  const { browser, page, errors } = await openBoard();
  const drag = async (y) => { await page.mouse.move(400, y); await page.mouse.down(); await page.mouse.move(550, y + 20, { steps: 4 }); await page.mouse.move(700, y + 40, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(700); };
  await page.evaluate(() => wbSelectToolRef("arrow"));
  await page.waitForTimeout(300);
  const toolBar = await page.evaluate(() => {
    const head = document.getElementById("wb-arrow-head");
    return { shown: Boolean(head.closest(".select-shell") && !head.closest(".select-shell").classList.contains("hidden")), n: head.options.length };
  });
  check("the Arrow tool's bar offers the mark, every kind but none", toolBar.shown && toolBar.n >= 16, toolBar);
  await page.evaluate(() => { const h = document.getElementById("wb-arrow-head"); h.value = "circle-filled"; h.dispatchEvent(new Event("change", { bubbles: true })); const s = document.getElementById("wb-arrow-style"); s.value = "both"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await drag(300);
  const drawn = await page.evaluate(() => JSON.parse(wbState.sketches[wbState.sketches.length - 1].data));
  check("the arrow is drawn with a filled circle at both ends", drawn.startCap === "circle-filled" && drawn.endCap === "circle-filled" && (drawn.d.match(/Z/g) || []).length >= 6, { s: drawn.startCap, e: drawn.endCap });
  await page.evaluate(() => wbSelectToolRef("line"));
  await page.evaluate(() => { const s = document.getElementById("wb-arrow-style"); s.value = "none"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await drag(500);
  const line = await page.evaluate(async () => {
    const s = wbState.sketches[wbState.sketches.length - 1];
    wbSelectToolRef("select");
    selectWbItem("sketch", s.id);
    await new Promise((r) => setTimeout(r, 400));
    const caps = document.querySelector('#wb-context [data-wb-ctx="caps"]');
    return { id: s.id, plain: (s.data.match(/M/g) || []).length, capsShown: !caps.classList.contains("hidden") };
  });
  check("a plain line (one subpath) shows the end lists", line.plain === 1 && line.capsShown, line);
  await page.click("#wb-prop-endcap + .select-opener");
  await page.waitForTimeout(400);
  await page.click('.select-menu:not(.hidden) [data-value="triangle-open"]');
  await page.waitForTimeout(700);
  const after = await page.evaluate((id) => JSON.parse(wbFindItem("sketch", id).data), line.id);
  check("its end becomes an open triangle", after.endCap === "triangle-open" && (after.d.match(/M/g) || []).length === 2, after.endCap);
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(700);
  const undone = await page.evaluate((id) => JSON.parse(wbFindItem("sketch", id).data), line.id);
  check("one Undo puts the plain end back", (undone.endCap || "none") === "none" && (undone.d.match(/M/g) || []).length === 1, undone.endCap);
  await page.keyboard.press("Control+Shift+P");
  await page.waitForTimeout(500);
  const fmt = await page.evaluate(() => [...document.querySelectorAll('#wb-format [data-fmt="caps"]')].map((r) => !r.hidden));
  check("the Format panel shows Start and End for a drawn line", fmt.length === 2 && fmt.every(Boolean), fmt);
  check("no console errors", errors.length === 0, errors);
  summary();
  await browser.close();
})();
