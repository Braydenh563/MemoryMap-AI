// canvasdepth: named layers, measured: add, move the selection, hide, lock, undo.
//   BASE=http://127.0.0.1:8850 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbnamedlayers.js
const { openFresh, checker } = require("./cdlib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, errors, phone } = await openFresh({ width: W });
  const { check, summary } = checker();
  await page.evaluate(async () => {
    window.promptDialog = async (_t, value) => value;
    for (let i = 0; i < 3; i++) await wbCreateObject("text", { content: `Box ${i}` }, i * 160, 0, 140, 60);
    clearWbSelection();
    for (const o of wbState.objects.slice(0, 2)) wbMultiSelection.add(wbMultiKey("object", o.id));
    wbApplySelectionHighlight();
    wbOpenSidebar("layers");
  });
  await page.waitForSelector(".wb-named-layer-add", { state: "visible" });
  await page.waitForTimeout(300);
  await page.click(".wb-named-layer-add");
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => ({
    layers: wbState.layers, on: wbState.objects.filter((o) => o.data?.layer).length,
    rows: [...document.querySelectorAll(".wb-named-layer")].map((r) => { const b = r.getBoundingClientRect(); return { h: b.height, w: b.width, right: b.right, count: r.querySelector(".wb-lib-count")?.textContent }; }),
    panelRight: document.querySelector(".wb-sidebar-panel")?.getBoundingClientRect().right,
    buttons: [...document.querySelectorAll(".wb-named-layer > button, .wb-named-layer > .menu-wrap > button")].map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }),
  }));
  check("+ makes a layer with the selection on it", after.layers?.length === 1 && after.on === 2 && after.rows[0]?.count === "2", after);
  check("row inside the panel", after.rows.every((r) => r.right <= after.panelRight + 0.5), after.rows);
  const min = phone ? 44 : 24;
  check(`row buttons at least ${min}px`, after.buttons.every(([w, h]) => w >= min && h >= min), after.buttons);
  const visible = () => page.evaluate(() => [...document.querySelectorAll("#whiteboard-container .wb-object")].filter((e) => getComputedStyle(e).display !== "none").length);
  const before = await visible();
  await page.click(".wb-named-layer button[aria-pressed]");
  await page.waitForTimeout(600);
  const hidden = await visible();
  check("the eye hides both items on the board", before - hidden === 2, { before, hidden });
  const reload = await page.evaluate(async () => { await openWhiteboardBoard(window.currentBoardId); return wbState.layers?.[0]?.hidden; });
  await page.waitForTimeout(800);
  check("hidden survives a reopen", reload === true && (await visible()) === hidden, reload);
  await page.evaluate(() => wbOpenSidebar("layers"));
  await page.waitForTimeout(400);
  await page.click(".wb-named-layer button[aria-pressed]");
  await page.waitForTimeout(600);
  check("the eye shows them again", (await visible()) === before);
  const locked = await page.evaluate(async () => {
    await wbNamedLayerSet(wbState.layers[0].id, { locked: true });
    return wbState.objects.map((o) => wbIsLocked("object", o));
  });
  check("lock locks the layer's items only", JSON.stringify(locked) === JSON.stringify([true, true, false]), locked);
  const undone = await page.evaluate(async () => { await wbUndo(); return wbState.layers[0].locked; });
  check("Ctrl+Z puts the lock back", undone === false, undone);
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
