// harness-wb-1004 item 1: a frame's title at a phone's fitted zoom. It was
// about 7px tall at k 0.24, a press-drag aimed at it moved nothing, and with
// a selection held the inner frame and its sticky moved by different amounts.
// Here: the title's hit area is at least `--target-min` on screen, a drag on
// it moves the frame, and every member moves by one delta (alone, with the
// frame selected, and with everything selected).
//
//   BASE=http://127.0.0.1:8846 VW=390 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/left1005-frametitle.js
const { boot } = require("./lib.js");

let pass = 0;
let fail = 0;
function ok(label, good, detail) {
  if (good) pass += 1;
  else fail += 1;
  console.log(`${good ? "OK  " : "FAIL"} ${label}${detail ? "  " + detail : ""}`);
}
const VW = Number(process.env.VW || 390);
const VH = Number(process.env.VH || (VW < 600 ? 844 : 900));

(async () => {
  const phone = VW < 600;
  const { browser, page } = await boot({
    viewport: { width: VW, height: VH },
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.evaluate(() => document.querySelector('[data-tab="library"]').click());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-target="library-view-whiteboard"]').click());
  await page.waitForTimeout(700);
  const boardId = await page.evaluate(async () =>
    (await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `Frame title ${Date.now()}` }) })).id
  );
  await page.evaluate((bid) => openWhiteboardBoard(bid), boardId);
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  const ids = await page.evaluate(async () => {
    const outer = await wbCreateObject("frame", { content: "Outer" }, 40, 80, 620, 420, -2);
    const inner = await wbCreateObject("frame", { content: "Inner" }, 80, 140, 300, 220, -1);
    const sticky = await wbCreateObject("text", { content: "Inside both", bg: "#fff4a3" }, 110, 190, 160, 100);
    // Far away, so the fit zooms right out, as a real board's does.
    await wbCreateObject("text", { content: "Far corner" }, 1000, 1300, 160, 100);
    await fetchWhiteboardState();
    renderWhiteboardNow();
    return { outer: outer.id, inner: inner.id, sticky: sticky.id };
  });
  await page.waitForTimeout(400);
  // Fitted, then nudged down clear of the board's top bar, which a fit's
  // padding leaves the outer title just under at 1440.
  await page.evaluate(() => {
    wbZoomToFit({ animate: false });
    const c = document.getElementById("whiteboard-container");
    const t = d3.zoomTransform(c);
    d3.select(c).call(wbZoom.transform, d3.zoomIdentity.translate(t.x, t.y + 90).scale(t.k));
  });
  await page.waitForTimeout(700);

  const k = await page.evaluate(() => d3.zoomTransform(document.getElementById("whiteboard-container")).k);
  const hit = await page.evaluate((id) => {
    const title = document.querySelector(`.wb-object[data-id="${id}"] .wb-frame-title`);
    const r = title.getBoundingClientRect();
    const after = getComputedStyle(title, "::after");
    const min = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--target-min")) * parseFloat(getComputedStyle(document.documentElement).fontSize);
    // What a press at the hit area's middle lands on.
    const ah = r.height;
    const cy = r.bottom - Math.max(ah, r.height) / 2;
    const at = document.elementFromPoint(r.left + 4, cy);
    return { titleH: r.height, afterH: ah, min, lands: at === title || title.contains(at) };
  }, ids.outer);
  ok(`the title's hit area is at least --target-min on screen (k ${k.toFixed(2)})`, hit.afterH >= hit.min - 0.5 && hit.lands, JSON.stringify(hit));

  const pos = () => page.evaluate((ids) => Object.fromEntries(["outer", "inner", "sticky"].map((n) => [n, (({ x, y }) => ({ x, y }))(wbState.objects.find((o) => o.id === ids[n]))])), ids);
  const drag = async (label, setup, grab = "outer", movers = ["outer", "inner", "sticky"]) => {
    await page.evaluate(setup, ids);
    await page.waitForTimeout(200);
    const before = await pos();
    const p = await page.evaluate((id) => {
      const title = document.querySelector(`.wb-object[data-id="${id}"] .wb-frame-title`);
      const r = title.getBoundingClientRect();
      // Near the hit area's top: the grown part, not the words.
      const at = document.elementFromPoint(r.left + 4, r.top + 3);
      return { x: r.left + 4, y: r.top + 3, on: at === title, at: at ? `${at.tagName}.${[...at.classList].join(".")}#${at.id}` : null };
    }, ids[grab]);
    if (!p.on) console.log("press lands on", p.at);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + 60, p.y + 30, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(900);
    const after = await pos();
    const d = (n) => ({ dx: +(after[n].x - before[n].x).toFixed(1), dy: +(after[n].y - before[n].y).toFixed(1) });
    const all = { outer: d("outer"), inner: d("inner"), sticky: d("sticky") };
    const o = all[grab];
    const same = movers.every((n) => Math.abs(all[n].dx - o.dx) < 0.5 && Math.abs(all[n].dy - o.dy) < 0.5)
      && Object.keys(all).filter((n) => !movers.includes(n)).every((n) => all[n].dx === 0 && all[n].dy === 0);
    // Within a grid step and the guides' pull of the pointer's own travel.
    const expect = 60 / k;
    ok(`${label}: the frame and both members move by one delta near the pointer's`, o.dx > 5 && same && Math.abs(o.dx - expect) < expect * 0.25, JSON.stringify({ ...all, expect: +expect.toFixed(1) }));
  };
  await drag("nothing selected", () => clearWbSelection());
  await drag("the frame selected", (ids) => { clearWbSelection(); selectWbItem("object", ids.outer); });
  await drag("everything selected", () => { clearWbSelection(); wbSelectAllItems(); });
  // The drag's own start, the shape of the 2026-10-05 report: the inner frame
  // and its sticky held in a selection, the outer frame's title dragged.
  await drag("the inner frame and its sticky selected", (ids) => {
    clearWbSelection();
    for (const n of ["inner", "sticky"]) wbMultiSelection.add(wbMultiKey("object", ids[n]));
    wbApplySelectionHighlight();
  });
  await drag("the inner frame and its sticky selected, the inner title dragged", (ids) => {
    clearWbSelection();
    for (const n of ["inner", "sticky"]) wbMultiSelection.add(wbMultiKey("object", ids[n]));
    wbApplySelectionHighlight();
  }, "inner", ["inner", "sticky"]);
  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${pass}/${pass + fail} at ${VW}x${VH} ${process.env.THEME || "light"}`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
