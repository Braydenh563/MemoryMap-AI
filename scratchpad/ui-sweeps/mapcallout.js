// canvasdepth2: a callout on a topic (XMind), measured: added through the
// prompt, drawn over the words inside the card, the tidy makes room (no
// overlap), it survives a reopen, and one Undo takes it off.
//   BASE=http://127.0.0.1:8860 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapcallout.js
const { openFresh, checker, openMap, overlapIn, contrast } = require("./cd2lib.js");
const OUTLINE = ["# Trip", "- Trip", "  - Book", "    - Flights", "    - Hotel", "    - Car", "  - Pack", "    - Clothes", "    - Charger"].join("\n");
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, errors } = await openFresh({ width: W });
  const { check, summary } = checker();
  await openMap(page, OUTLINE);
  await page.evaluate(() => wbMapSetLayout("tree-right"));
  await page.waitForTimeout(800);
  const hotel = await page.evaluate(() => wbMapIndex().nodes.find((o) => wbMapLabel(o) === "Hotel").id);
  const h0 = await page.evaluate((id) => document.querySelector(`.wb-object[data-id="${id}"]`).offsetHeight, hotel);
  await page.evaluate(async (id) => {
    window.promptDialog = async () => "Near the station, check in after 3";
    await wbMapEditCallout(wbState.objects.find((o) => o.id === id));
  }, hotel);
  await page.waitForTimeout(900);
  const read = await page.evaluate((id) => {
    const el = document.querySelector(`.wb-object[data-id="${id}"]`);
    const c = el.querySelector(".wb-map-callout");
    const t = el.querySelector(".wb-map-text");
    const cr = c.getBoundingClientRect(), tr = t.getBoundingClientRect(), er = el.getBoundingClientRect();
    const cs = getComputedStyle(c);
    return { shown: !c.hidden && cr.height > 0, text: c.textContent, above: cr.bottom <= tr.top + 0.5, inside: cr.left >= er.left - 0.5 && cr.right <= er.right + 0.5 && cr.top >= er.top - 0.5, h: el.offsetHeight, bg: cs.backgroundColor, color: cs.color };
  }, hotel);
  check("the callout is drawn over the words, inside the card", read.shown && read.above && read.inside, read);
  check("its words read on its bubble (4.5:1)", contrast(read.color, read.bg) >= 4.5, { ratio: contrast(read.color, read.bg), ...read });
  console.log("    card height", h0, "to", read.h, "contrast", contrast(read.color, read.bg));
  check("the card grows to hold it", read.h > h0 + 10, { before: h0, after: read.h });
  const pairs = await overlapIn(page);
  check("the tidy makes room: nothing overlaps", pairs === 0, pairs);
  await page.evaluate(async (id) => { window.promptDialog = async () => "Second words"; await wbMapEditCallout(wbState.objects.find((o) => o.id === id)); }, hotel);
  await page.waitForTimeout(500);
  const undone = await page.evaluate(async (id) => { await wbUndo(); return wbState.objects.find((o) => o.id === id)?.data?.callout; }, hotel);
  check("one Undo puts the earlier words back", undone === "Near the station, check in after 3", undone);
  await page.evaluate(async () => { await wbRedo(); await wbUndo(); });
  await page.waitForTimeout(400);
  const back = await page.evaluate(async (id) => { await openWhiteboardBoard(window.currentBoardId); return wbState.objects.find((o) => o.id === id)?.data?.callout; }, hotel);
  check("the callout survives a reopen", back === "Near the station, check in after 3", back);
  await page.waitForTimeout(600);
  const shownAgain = await page.evaluate((id) => !document.querySelector(`.wb-object[data-id="${id}"] .wb-map-callout`).hidden, hotel);
  check("and is drawn again on the reopened map", shownAgain);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/callout-${W}-${process.env.THEME || "light"}.png` });
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
