// WHITEBOARD_PLAN decision 18: a frame is an export scope, and frames nest.
//
// An outer frame holding an inner frame (with a sticky in it) and a locked
// rectangle, and a card outside both. The outer frame's right-click menu
// offers "Export this frame…", which opens the export dialog on Selection;
// the export holds the sticky, the inner frame's title and the locked shape,
// not the card, and its box is the frame's plus the export's margin. Dragging
// the outer frame's title carries the inner frame and what is in it.
//
//   BASE=http://127.0.0.1:8809 SCRATCH=/tmp/x THEME=light VW=1440 VH=900 \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbframeexport.js
const { boot } = require("./lib.js");

let pass = 0;
let fail = 0;
function ok(label, good, detail) {
  if (good) pass += 1;
  else fail += 1;
  console.log(`${good ? "OK  " : "FAIL"} ${label}${detail ? "  " + detail : ""}`);
}
const VW = Number(process.env.VW || 1440);
const VH = Number(process.env.VH || 900);

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
    (await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `Frame export ${Date.now()}` }) })).id
  );
  await page.evaluate((bid) => openWhiteboardBoard(bid), boardId);
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  const ids = await page.evaluate(async (phone) => {
    const outer = await wbCreateObject("frame", { content: "Outer" }, 40, 80, 620, 420, -2);
    const inner = await wbCreateObject("frame", { content: "Inner" }, 80, 140, 300, 220, -1);
    const sticky = await wbCreateObject("text", { content: "Inside both", bg: "#fff4a3" }, 110, 190, 160, 100);
    const d = "M420 200 L560 200 L560 300 L420 300 Z";
    const rect = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify({ d, color: "#333333", width: 2, shape: "rect", locked: true }), board_id: window.currentBoardId }) });
    const note = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "Outside the frame" }) });
    if (typeof allEntries !== "undefined") allEntries.push(note);
    const card = await apiJson("/whiteboard/nodes", { method: "POST", body: JSON.stringify({ entry_id: note.id, board_id: window.currentBoardId, x: 760, y: 120, z: 1 }) });
    await fetchWhiteboardState();
    renderWhiteboardNow();
    if (phone) d3.select("#whiteboard-container").call(wbZoom.transform, d3.zoomIdentity.translate(0, 120).scale(0.5));
    else d3.select("#whiteboard-container").call(wbZoom.transform, d3.zoomIdentity);
    return { outer: outer.id, inner: inner.id, sticky: sticky.id, rect: rect.id, card: card.id };
  }, phone);
  await page.waitForTimeout(700);

  const title = await page.evaluate((id) => {
    const r = document.querySelector(`.wb-object[data-id="${id}"] .wb-frame-title`).getBoundingClientRect();
    return { x: r.left + Math.min(20, r.width / 2), y: r.top + r.height / 2 };
  }, ids.outer);
  await page.mouse.click(title.x, title.y);
  await page.waitForTimeout(300);
  await page.mouse.click(title.x, title.y, { button: "right" });
  await page.waitForTimeout(400);
  const rows = await page.evaluate(() => [...document.querySelectorAll(".wb-ctx-menu:not(.hidden) .menu-item")].map((b) => b.textContent.trim()));
  ok("a frame's menu offers Export this frame…", rows.includes("Export this frame…"), JSON.stringify(rows));
  await page.evaluate(() => [...document.querySelectorAll(".wb-ctx-menu:not(.hidden) .menu-item")].find((b) => b.textContent.trim() === "Export this frame…")?.click());
  await page.waitForTimeout(600);
  const dialog = await page.evaluate(() => {
    const overlay = document.querySelector(".wb-export-overlay");
    const chosen = overlay ? [...overlay.querySelectorAll("[aria-checked='true'], [aria-pressed='true'], .active")].map((b) => b.textContent.trim()) : [];
    return { open: Boolean(overlay), chosen };
  });
  ok("the export dialog opens on Selection", dialog.open && dialog.chosen.some((t) => /selection/i.test(t)), JSON.stringify(dialog));
  const svg = await page.evaluate(() => {
    const out = wbBuildExportSvg("selection");
    return typeof out === "string" ? out : out?.svg || "";
  });
  const box = (svg.match(/viewBox="([^"]+)"/) || [])[1];
  ok("the export holds the frame's contents, the inner frame and the locked shape", svg.includes("Inside both") && svg.includes("Inner") && svg.includes("M420 200"), String(svg.length));
  ok("and not the card outside it", !svg.includes("Outside the frame"));
  ok("its box is the frame's and the margin", box === "0 40 700 500", box);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // Nesting: the outer frame's title carries the inner one and what is in it.
  if (process.env.CLEAR) await page.evaluate(() => clearWbSelection());
  if (process.env.DEBUG) console.log("dbg", await page.evaluate(() => JSON.stringify({ k: d3.zoomTransform(document.getElementById("whiteboard-container")).k, sel: [...wbMultiSelection], one: wbSelectedItem })));
  const before = await page.evaluate((ids) => ({ inner: wbState.objects.find((o) => o.id === ids.inner).x, sticky: wbState.objects.find((o) => o.id === ids.sticky).x }), ids);
  const t2 = await page.evaluate((id) => {
    const r = document.querySelector(`.wb-object[data-id="${id}"] .wb-frame-title`).getBoundingClientRect();
    return { x: r.left + Math.min(20, r.width / 2), y: r.top + r.height / 2 };
  }, ids.outer);
  await page.mouse.move(t2.x, t2.y);
  await page.mouse.down();
  await page.mouse.move(t2.x + 60, t2.y + 30, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  const after = await page.evaluate((ids) => ({ inner: wbState.objects.find((o) => o.id === ids.inner).x, sticky: wbState.objects.find((o) => o.id === ids.sticky).x }), ids);
  ok("dragging the outer frame carries the inner frame and its sticky", after.inner > before.inner + 5 && Math.abs((after.inner - before.inner) - (after.sticky - before.sticky)) < 0.5, JSON.stringify({ before, after }));
  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${pass}/${pass + fail} at ${VW}x${VH} ${process.env.THEME || "light"}`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
