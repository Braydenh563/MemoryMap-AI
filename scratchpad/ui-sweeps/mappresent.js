// MINDMAP_PLAN.md decision 21: a map presents by branch.
//
// A map of a trunk (Trip) and three branches (Pack with Passport under it,
// Book, Go). The View menu offers Present branches on a map and not Present
// frames; it fills the window, hides the chrome and shows the whole map
// first ("1 of 4: Trip"), then each branch fitted (Pack's step holds Pack and
// Passport and fills a good share of the screen, clear of the bar). The arrows
// and End walk; Delete edits nothing; Escape puts the camera, the window and
// the chrome back.
//
//   BASE=http://127.0.0.1:8809 SCRATCH=/tmp/x THEME=light VW=1440 VH=900 \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mappresent.js
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
  const mapId = await page.evaluate(async () =>
    (await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `Present map ${Date.now()}`, type: "map", layout: "tree-right" }) })).id
  );
  await page.evaluate((bid) => openWhiteboardBoard(bid), mapId);
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  const ids = await page.evaluate(async () => {
    const root = wbMapIndex().roots[0] || (await wbMapCreateNode({ parentId: null, text: "Trip" }));
    const pack = await wbMapCreateNode({ parentId: root.id, text: "Pack" });
    const passport = await wbMapCreateNode({ parentId: pack.id, text: "Passport" });
    await wbMapCreateNode({ parentId: root.id, text: "Book" });
    await wbMapCreateNode({ parentId: root.id, text: "Go" });
    await wbMapTidy({ quiet: true });
    renderWhiteboardNow();
    wbZoomToFit({ animate: false });
    return { root: root.id, pack: pack.id, passport: passport.id };
  });
  await page.waitForTimeout(700);
  const rows = await page.evaluate(() => {
    const shown = (sel) => {
      const el = document.querySelector(sel);
      return Boolean(el && !el.hidden && !el.closest("[hidden]"));
    };
    return {
      branches: shown('.wb-board-menu [data-wb-fn="present"][data-wb-surface="map"]'),
      frames: shown('.wb-board-menu [data-wb-fn="present"][data-wb-surface="board"]'),
    };
  });
  ok("a map's View menu offers Present branches, not Present frames", rows.branches && !rows.frames, JSON.stringify(rows));
  const before = await page.evaluate(() => {
    const t = d3.zoomTransform(document.getElementById("whiteboard-container"));
    return { k: t.k, x: t.x, y: t.y, count: wbState.objects.length };
  });
  await page.evaluate(() => document.querySelector('.wb-board-menu [data-wb-fn="present"][data-wb-surface="map"]').click());
  await page.waitForTimeout(900);
  const state = () =>
    page.evaluate((ids) => {
      const host = document.getElementById("library-view-whiteboard");
      const bar = document.getElementById("wb-present-bar").getBoundingClientRect();
      const c = document.getElementById("whiteboard-container").getBoundingClientRect();
      const box = (id) => document.querySelector(`.wb-object[data-id="${id}"]`)?.getBoundingClientRect();
      const [p, q] = [box(ids.pack), box(ids.passport)];
      const span = p && q ? { l: Math.min(p.left, q.left), r: Math.max(p.right, q.right), t: Math.min(p.top, q.top), b: Math.max(p.bottom, q.bottom) } : null;
      return {
        presenting: host.classList.contains("wb-presenting"),
        full: host.classList.contains("wb-fullscreen"),
        topbar: Boolean(document.querySelector(".wb-topbar")?.getBoundingClientRect().width),
        title: document.getElementById("wb-present-count").textContent,
        packInside: span ? span.l >= c.left - 1 && span.r <= c.right + 1 && span.t >= c.top - 1 && span.b <= bar.top + 0.5 : false,
        packFill: span ? Math.max((span.r - span.l) / c.width, (span.b - span.t) / c.height) : 0,
      };
    }, ids);
  const s1 = await state();
  ok("Present branches fills the window, hides the chrome and starts with the whole map", s1.presenting && s1.full && !s1.topbar && s1.title === "1 of 4: Trip", JSON.stringify(s1));
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  const s2 = await state();
  ok("the next step is the first branch, fitted and clear of the bar", s2.title === "2 of 4: Pack" && s2.packInside && s2.packFill >= 0.5, JSON.stringify(s2));
  await page.keyboard.press("Delete");
  await page.keyboard.press("End");
  await page.waitForTimeout(700);
  const s3 = await state();
  const kept = await page.evaluate(() => wbState.objects.length);
  ok("End is the last branch, and Delete edited nothing", s3.title === "4 of 4: Go" && kept === before.count, JSON.stringify({ title: s3.title, kept, was: before.count }));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => {
    const t = d3.zoomTransform(document.getElementById("whiteboard-container"));
    const host = document.getElementById("library-view-whiteboard");
    return { k: t.k, x: t.x, y: t.y, presenting: host.classList.contains("wb-presenting"), full: host.classList.contains("wb-fullscreen") };
  });
  ok("Escape puts the camera, the window and the chrome back", !after.presenting && !after.full && Math.abs(after.k - before.k) < 0.001 && Math.abs(after.x - before.x) < 1 && Math.abs(after.y - before.y) < 1, JSON.stringify({ before, after }));
  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${pass}/${pass + fail} at ${VW}x${VH} ${process.env.THEME || "light"}`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
