// canvasdepth2: the hand-drawn look (Excalidraw's), measured: the View menu's
// board switch roughens shapes and connectors but not the pen, the drawn
// path is the same on a second render (seeded by the item), its hit band
// keeps the true shape, an item can opt out in the Format panel, and the
// switch is one Undo step.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbrough.js
const { openFresh, checker } = require("./cdlib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, errors } = await openFresh({ width: W });
  const { check, summary } = checker();
  const ids = await page.evaluate(async () => {
    const mk = async (blob) => { const s = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify(blob), board_id: window.currentBoardId, z: 5 }) }); wbState.sketches.push(s); return s.id; };
    const rect = await mk({ d: "M100 100 L300 100 L300 220 L100 220 Z", shape: "rect", color: "#333333", width: 2, fill: "#ffe08a", fillOpacity: 1 });
    const pen = await mk({ d: "M100 300 L140 320 L180 300 L220 330", shape: "draw", color: "#333333", width: 3 });
    const line = await mk({ d: "M350 100 L520 200", shape: "line", color: "#333333", width: 2 });
    renderWhiteboardNow();
    return { rect, pen, line };
  });
  await page.waitForTimeout(400);
  const read = () => page.evaluate((ids) => Object.fromEntries(Object.entries(ids).map(([k, id]) => {
    const g = [...document.querySelectorAll(".sketch-group")].find((x) => x.__data__?.id === id);
    return [k, { d: g?.querySelector(".sketch-path")?.getAttribute("d") || "", hit: g?.querySelector(".sketch-hitbox")?.getAttribute("d") || "" }];
  })), ids);
  const plain = await read();
  await page.evaluate(() => { const t = document.getElementById("wb-rough-toggle"); t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(900);
  const rough = await read();
  check("the board switch roughens a shape", rough.rect.d !== plain.rect.d && (rough.rect.d.match(/M/g) || []).length === 2, rough.rect.d.slice(0, 80));
  check("and a line", rough.line.d !== plain.line.d, rough.line.d.slice(0, 60));
  check("but not the freehand pen", rough.pen.d === plain.pen.d);
  check("the hit band keeps the true shape", rough.rect.hit === plain.rect.hit);
  const bbox = await page.evaluate((id) => { const g = [...document.querySelectorAll(".sketch-group")].find((x) => x.__data__?.id === id); const b = g.querySelector(".sketch-path").getBBox(); return [b.x, b.y, b.width, b.height].map(Math.round); }, ids.rect);
  check("the rough rectangle stays within 4px of the true one", Math.abs(bbox[0] - 100) <= 4 && Math.abs(bbox[1] - 100) <= 4 && Math.abs(bbox[2] - 200) <= 8 && Math.abs(bbox[3] - 120) <= 8, bbox);
  await page.evaluate(() => renderWhiteboardNow());
  const again = await read();
  check("the same drawing on the next render", again.rect.d === rough.rect.d);
  const reopened = await page.evaluate(async () => { await openWhiteboardBoard(window.currentBoardId); return wbBoardBackground().rough; });
  await page.waitForTimeout(700);
  const after = await read();
  check("the look survives a reopen, drawn the same", reopened === true && after.rect.d === rough.rect.d, reopened);
  // One item opts out from the Format panel.
  await page.evaluate((id) => { wbHandleItemClick("sketch", id, { shiftKey: false }); wbFormatOpen("style", { focus: false }); }, ids.rect);
  await page.waitForTimeout(400);
  const row = await page.evaluate(() => { const r = document.querySelector('[data-fmt="rough"]'); const box = document.getElementById("wb-fmt-rough"); return { shown: r && !r.hidden, checked: box?.checked }; });
  check("the Format panel shows Hand-drawn, ticked", row.shown && row.checked, row);
  await page.evaluate(() => { const t = document.getElementById("wb-fmt-rough"); t.checked = false; t.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(800);
  const opted = await read();
  check("unticked, that shape is drawn plain on a rough board", opted.rect.d === plain.rect.d && opted.line.d === rough.line.d);
  const undone = await page.evaluate(async () => { await wbUndo(); await wbUndo(); return wbBoardBackground().rough ?? false; });
  await page.waitForTimeout(600);
  check("two Undos take the opt-out and the board's look back", undone === false && (await read()).rect.d === plain.rect.d, undone);
  if (process.env.SHOTS) { await page.evaluate(async () => { await wbRedo(); }); await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.SHOTS}/rough-${W}.png` }); }
  const t0 = await page.evaluate(() => { const t = performance.now(); for (let i = 0; i < 200; i++) wbRoughD("M0 0 L400 0 L400 300 L0 300 Z", 1000 + i); return Math.round(performance.now() - t); });
  console.log(`    200 fresh rectangles roughened in ${t0} ms`);
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
