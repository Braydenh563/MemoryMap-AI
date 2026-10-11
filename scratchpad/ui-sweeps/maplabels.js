// canvasdepth2: labels under a topic (XMind), measured: added through the
// prompt as a row of chips under the words inside the card, the tidy makes
// room, they read in both themes, survive a reopen, and Undo takes them off.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/maplabels.js
const { openFresh, checker, openMap, overlapIn, contrast } = require("./cd2lib.js");
const OUTLINE = ["# Trip", "- Trip", "  - Book", "    - Flights", "    - Hotel", "    - Car", "  - Pack", "    - Clothes"].join("\n");
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, errors } = await openFresh({ width: W });
  const { check, summary } = checker();
  await openMap(page, OUTLINE);
  await page.evaluate(() => wbMapSetLayout("tree-right"));
  await page.waitForTimeout(800);
  const hotel = await page.evaluate(() => wbMapIndex().nodes.find((o) => wbMapLabel(o) === "Hotel").id);
  await page.evaluate(async (id) => {
    window.promptDialog = async () => "booked, paid ,  receipt, booked";
    await wbMapEditLabels(wbState.objects.find((o) => o.id === id));
  }, hotel);
  await page.waitForTimeout(900);
  const read = await page.evaluate((id) => {
    const el = document.querySelector(`.wb-object[data-id="${id}"]`);
    const tags = [...el.querySelectorAll(".wb-map-tag")];
    const tr = el.querySelector(".wb-map-text").getBoundingClientRect(), er = el.getBoundingClientRect();
    const rs = tags.map((t) => t.getBoundingClientRect());
    const cs = tags[0] ? getComputedStyle(tags[0]) : null;
    return { words: tags.map((t) => t.textContent), under: rs.every((r) => r.top >= tr.bottom - 0.5), inside: rs.every((r) => r.left >= er.left - 0.5 && r.right <= er.right + 0.5 && r.bottom <= er.bottom + 0.5), h: el.offsetHeight, bg: cs?.backgroundColor, color: cs?.color, data: wbState.objects.find((o) => o.id === id).data.labels };
  }, hotel);
  console.log("    labels", JSON.stringify(read.words), "card", read.h, "contrast", read.bg && contrast(read.color, read.bg));
  check("three labels, trimmed and without the repeat", JSON.stringify(read.words) === '["booked","paid","receipt"]', read);
  check("drawn under the words, inside the card", read.under && read.inside, read);
  check("they read on their chips (4.5:1)", contrast(read.color, read.bg) >= 4.5, read);
  check("the tidy makes room: nothing overlaps", (await overlapIn(page)) === 0);
  const undone = await page.evaluate(async (id) => { await wbUndo(); return wbState.objects.find((o) => o.id === id)?.data?.labels ?? null; }, hotel);
  check("one Undo takes them off", undone === null, undone);
  await page.evaluate(async () => { await wbRedo(); });
  await page.waitForTimeout(500);
  const back = await page.evaluate(async (id) => { await openWhiteboardBoard(window.currentBoardId); return wbState.objects.find((o) => o.id === id)?.data?.labels; }, hotel);
  check("Redo puts them back and they survive a reopen", JSON.stringify(back) === '["booked","paid","receipt"]', back);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/labels-${W}-${process.env.THEME || "light"}.png` });
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
