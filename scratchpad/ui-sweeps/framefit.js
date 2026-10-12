// INBOX 821: double-click an edge handle fits that edge to what the frame holds
// plus 32 units; a corner fits two; the menu fits all four; an empty frame stays;
// one Undo step. Gap 32 +/- 1 and nothing held falls outside, at 1440 and 390.
const { boot, openBoardsTab } = require("./lib.js");
(async () => {
  let fails = 0;
  const bad = (m) => { fails++; console.log("FAIL", m); };
  for (const [W, H] of [[1440, 900], [390, 844]]) {
    const { browser, page } = await boot({ viewport: { width: W, height: H } });
    await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
    await openBoardsTab(page);
    const ids = await page.evaluate(async () => {
      const b = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Fit " + Date.now() }) });
      await openWhiteboardBoard(b.id); await new Promise((r) => setTimeout(r, 1500));
      const frame = await wbCreateObject("frame", { content: "Fit me" }, 0, 0, 900, 600, 1);
      const held = [];
      for (const [i, [x, y]] of [[100, 120], [300, 200], [420, 300]].entries()) held.push((await wbCreateObject("text", { content: `In ${i + 1}` }, x, y, 120, 40, 2 + i)).id);
      const empty = await wbCreateObject("frame", { content: "Empty" }, 1200, 0, 300, 200, 1);
      renderWhiteboardNow(); await new Promise((r) => setTimeout(r, 600));
      wbZoomToFit({ animate: false }); await new Promise((r) => setTimeout(r, 600));
      return { frame: frame.id, held, empty: empty.id };
    });
    const state = () => page.evaluate((ids) => {
      const f = wbState.objects.find((o) => o.id === ids.frame);
      const boxes = ids.held.map((id) => wbItemBBox("object", wbState.objects.find((o) => o.id === id)));
      const m = { minX: Math.min(...boxes.map((b) => b.minX)), minY: Math.min(...boxes.map((b) => b.minY)), maxX: Math.max(...boxes.map((b) => b.maxX)), maxY: Math.max(...boxes.map((b) => b.maxY)) };
      return { n: Math.round(m.minY - f.y), w: Math.round(m.minX - f.x), s: Math.round(f.y + f.height - m.maxY), e: Math.round(f.x + f.width - m.maxX), f: [f.x, f.y, f.width, f.height] };
    }, ids);
    const select = () => page.evaluate((ids) => { selectWbItem("object", ids.frame); }, ids);
    const dbl = async (handle) => {
      await select(); await page.waitForTimeout(300);
      const box = await page.locator(`.wb-object[data-id="${ids.frame}"] .wb-resize-handle[data-handle="${handle}"]`).boundingBox();
      await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(500);
    };
    const near = (v) => Math.abs(v - 32) <= 1;
    const reset = () => page.evaluate(async (ids) => { const f = wbState.objects.find((o) => o.id === ids.frame); Object.assign(f, { x: 0, y: 0, width: 900, height: 600 }); await wbSaveObject(f); renderWhiteboardNow(); }, ids);
    await dbl("e");
    let st = await state(); console.log(W, "e", JSON.stringify(st));
    if (!near(st.e) || st.n === 32 || st.w === 32 === false && false) {}
    if (!near(st.e)) bad("e edge " + st.e);
    if (st.s < 100 || st.w < 100 - 1) bad("e moved other edges");
    await reset(); await page.waitForTimeout(300);
    await dbl("nw"); st = await state(); console.log(W, "nw", JSON.stringify(st));
    if (!near(st.n) || !near(st.w) || st.e < 100) bad("corner nw " + JSON.stringify(st));
    await reset(); await page.waitForTimeout(300);
    // the menu, through the command
    await select();
    await page.evaluate((ids) => wbFrameFit(wbState.objects.find((o) => o.id === ids.frame), "nesw"), ids);
    await page.waitForTimeout(500);
    st = await state(); console.log(W, "all", JSON.stringify(st));
    if (![st.n, st.e, st.s, st.w].every(near)) bad("all four " + JSON.stringify(st));
    // one undo step restores the frame
    await page.evaluate(() => wbUndo?.());
    await page.waitForTimeout(600);
    st = await state(); console.log(W, "undo", JSON.stringify(st.f));
    if (st.f.join() !== "0,0,900,600") bad("undo " + st.f.join());
    // an empty frame does not move
    const emptyBefore = await page.evaluate((ids) => { const f = wbState.objects.find((o) => o.id === ids.empty); return [f.x, f.y, f.width, f.height].join(); }, ids);
    await page.evaluate((ids) => wbFrameFit(wbState.objects.find((o) => o.id === ids.empty), "nesw"), ids);
    const emptyAfter = await page.evaluate((ids) => { const f = wbState.objects.find((o) => o.id === ids.empty); return [f.x, f.y, f.width, f.height].join(); }, ids);
    if (emptyBefore !== emptyAfter) bad("empty frame moved");
    await browser.close();
  }
  console.log(fails ? `FAIL: ${fails}` : "PASS");
  process.exit(fails ? 1 : 0);
})();
