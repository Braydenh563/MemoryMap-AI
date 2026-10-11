// canvasdepth2: reaction stamps and votes on a topic (Miro; MINDMAP_PLAN
// 14.4), measured: the menu's Stamps group adds one, a press on the chip adds
// another without dragging the topic, the chip is a touch target on a phone,
// the tidy makes room, counts survive a reopen, Undo takes one back.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapstamps.js
const { openFresh, checker, openMap, overlapIn, contrast } = require("./cd2lib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, errors, phone } = await openFresh({ width: W });
  const { check, summary } = checker();
  await openMap(page, ["# Ideas", "- Ideas", "  - Picnic", "  - Museum", "  - Hike"].join("\n"));
  await page.evaluate(() => wbMapSetLayout("tree-right"));
  await page.waitForTimeout(800);
  const picnic = await page.evaluate(() => wbMapIndex().nodes.find((o) => wbMapLabel(o) === "Picnic").id);
  await page.evaluate((id) => {
    const node = wbState.objects.find((o) => o.id === id);
    wbHandleItemClick("object", id, { shiftKey: false });
    const r = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect();
    wbOpenMapNodeMenu(node, r.x + 10, r.y + 10);
  }, picnic);
  await page.waitForTimeout(400);
  const group = await page.evaluate(() => [...document.querySelectorAll(".wb-ctx-menu:not(.hidden) button")].map((b) => b.textContent.trim()).find((t) => /Stamps/.test(t)));
  check("the topic menu has a Stamps group", Boolean(group), group);
  await page.keyboard.press("Escape");
  await page.evaluate(async (id) => { await wbMapAddStamp(wbState.objects.find((o) => o.id === id), "up"); }, picnic);
  await page.waitForTimeout(700);
  const before = await page.evaluate((id) => { const o = wbState.objects.find((x) => x.id === id); return [o.x, o.y]; }, picnic);
  const chip = await page.evaluate((id) => { const b = document.querySelector(`.wb-object[data-id="${id}"] .wb-map-stamp[data-stamp="up"]`); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, text: b.textContent.trim(), boardH: b.offsetHeight }; }, picnic);
  check("the chip shows the count", chip.text === "1", chip);
  //: In board units, before the canvas zoom, as every control on a topic is.
  const min = phone ? 44 : 20;
  check(`the chip is at least ${min} board px tall`, chip.boardH >= min - 0.5, chip);
  if (phone) await page.touchscreen.tap(chip.x, chip.y); else await page.mouse.click(chip.x, chip.y);
  await page.waitForTimeout(900);
  const after = await page.evaluate((id) => { const o = wbState.objects.find((x) => x.id === id); return { count: o.data.stamps?.up, x: o.x, y: o.y, text: document.querySelector(`.wb-object[data-id="${id}"] .wb-map-stamp`)?.textContent.trim() }; }, picnic);
  check("a press on the chip adds one (a vote)", after.count === 2 && after.text === "2", after);
  check("and does not drag the topic", Math.abs(after.x - before[0]) < 1 && Math.abs(after.y - before[1]) < 1, { before, after });
  const read = await page.evaluate((id) => { const b = document.querySelector(`.wb-object[data-id="${id}"] .wb-map-stamp`); const cs = getComputedStyle(b); return { bg: cs.backgroundColor, color: cs.color, pinned: wbState.objects.find((o) => o.id === id).data.pinned || false }; }, picnic);
  check("not pinned by the press", read.pinned === false, read);
  check("its count reads (4.5:1)", contrast(read.color, read.bg) >= 4.5, { ratio: contrast(read.color, read.bg) });
  check("the tidy makes room: nothing overlaps", (await overlapIn(page)) === 0);
  const undone = await page.evaluate(async (id) => { await wbUndo(); return wbState.objects.find((o) => o.id === id).data.stamps?.up; }, picnic);
  check("one Undo takes the last vote back", undone === 1, undone);
  const back = await page.evaluate(async (id) => { await openWhiteboardBoard(window.currentBoardId); return wbState.objects.find((o) => o.id === id)?.data?.stamps; }, picnic);
  check("the count survives a reopen", back?.up === 1, back);
  console.log("    chip", Math.round(chip.w), "x", Math.round(chip.h), "contrast", contrast(read.color, read.bg));
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
