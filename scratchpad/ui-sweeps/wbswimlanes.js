// canvasdepth: the Swimlanes presets from the Frames set, measured on screen.
//   BASE=http://127.0.0.1:8850 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbswimlanes.js
const { openFresh, checker } = require("./cdlib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, errors } = await openFresh({ width: W });
  const { check, summary } = checker();
  await page.evaluate(() => wbOpenSidebar("library"));
  await page.waitForTimeout(1200);
  await page.fill("#wb-lib-search", "swimlane");
  await page.evaluate(() => document.getElementById("wb-lib-search").dispatchEvent(new Event("input", { bubbles: true })));
  await page.waitForTimeout(400);
  const found = await page.evaluate(() => [...document.querySelectorAll('#wb-lib-list [data-group="search"] .wb-lib-tile')].map((t) => t.dataset.ref));
  check("search 'swimlane' finds both presets", found.includes("builtin:frames/swimlanes-rows") && found.includes("builtin:frames/swimlanes-columns"), found);
  const r = await page.evaluate(async () => {
    const entry = wbLibEntries().find((e) => e.ref === "builtin:frames/swimlanes-rows");
    await wbLibPlace(entry);
    if (typeof wbFitToContent === "function") wbFitToContent();
    await new Promise((res) => setTimeout(res, 600));
    const els = [...document.querySelectorAll("#whiteboard-container .wb-object")].filter((e) => e.classList.contains("wb-object-frame"));
    const boxes = els.map((e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, title: e.textContent.trim().slice(0, 20) }; });
    const titles = els.map((e, i) => { const t = e.querySelector(".wb-frame-title"); if (!t) return null; const r = document.createRange(); r.selectNodeContents(t); const b = r.getBoundingClientRect(); return { own: i, x: b.x, y: b.y, w: b.width, h: b.height }; }).filter(Boolean);
    return { boxes, titles };
  });
  check("four frames drawn", r.boxes.length === 4, r.boxes);
  const pool = r.boxes.reduce((a, b) => (a.w * a.h > b.w * b.h ? a : b), r.boxes[0] || { w: 0, h: 0 });
  const lanes = r.boxes.filter((b) => b !== pool);
  check("each lane drawn inside the pool", lanes.length === 3 && lanes.every((l) => l.x >= pool.x && l.y >= pool.y && l.x + l.w <= pool.x + pool.w + 0.5 && l.y + l.h <= pool.y + pool.h + 0.5), { pool, lanes });
  const ov = lanes.some((a, i) => lanes.some((b, j) => i < j && a.y < b.y + b.h && b.y < a.y + a.h && a.x < b.x + b.w && b.x < a.x + a.w));
  check("lanes do not overlap", !ov);
  const hit = r.titles.filter((t) => lanes.some((l) => l !== r.boxes[t.own] && t.y < l.y + l.h - 0.5 && l.y < t.y + t.h - 0.5 && t.x < l.x + l.w && l.x < t.x + t.w)).length;
  check("no frame title sits on a lane", hit === 0, { hit, titles: r.titles });
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
