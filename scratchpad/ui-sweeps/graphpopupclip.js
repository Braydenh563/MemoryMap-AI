// The owner, 2026-10-11: "the graph popups get cut off now at the bottom".
// Opens the graph's note popup on a long note, clicked low on the map, and
// measures the action dock's bottom against the status bar's top and the
// window, at W x H (default 1440x900; also 1280x720 and 390x844), THEME.
// Also #graph-new (the same recipe). Prints one JSON line; ok when every
// bottom is at or above the status bar's top.
const { boot } = require("./lib.js");
(async () => {
  const W = Number(process.env.W || 1440), H = Number(process.env.H || 900);
  const phone = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: H }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  const id = await page.evaluate(async () => {
    const body = Array.from({ length: 30 }, (_, i) => `Line ${i + 1} of a long note about the schedule, the plan and the week.`).join("\n");
    const e = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "Clip probe\n" + body, tags: ["schedule"] }) }).catch((x) => ({ err: String(x) }));
    return e.id;
  });
  await page.evaluate(() => switchTab("graph"));
  await page.waitForTimeout(3500);
  const measure = () => page.evaluate((sel) => {
    const pop = document.querySelector(sel);
    const sb = document.getElementById("status-bar");
    const sbr = sb && getComputedStyle(sb).display !== "none" ? sb.getBoundingClientRect() : null;
    const dock = pop.querySelector(".graph-popup-actions") || pop.lastElementChild;
    pop.scrollTop = 0;
    const r = pop.getBoundingClientRect(), d = dock.getBoundingClientRect();
    const limit = sbr && sbr.height ? sbr.top : innerHeight;
    return { sel, popTop: Math.round(r.top), popBottom: Math.round(r.bottom), dockBottom: Math.round(d.bottom), dockH: Math.round(d.height), statusTop: sbr ? Math.round(sbr.top) : null, inner: innerHeight, scrolls: pop.scrollHeight > pop.clientHeight + 1, dockGap: Math.round(r.bottom - d.bottom), dockBg: getComputedStyle(dock).backgroundImage.slice(0, 30), ok: Math.round(r.bottom) <= Math.ceil(limit) && Math.round(d.bottom) <= Math.ceil(limit) && d.height > 0 };
  }, sel);
  // Placed again on every size change (a ResizeObserver, a frame later): on
  // a loaded machine that lands well after a fixed wait, so wait for it.
  const settle = (sel) => page.evaluate(async (sel) => {
    const el = document.querySelector(sel); let last = "", same = 0;
    for (let i = 0; i < 60 && same < 4; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const r = el.getBoundingClientRect(); const key = `${Math.round(r.top)},${Math.round(r.height)}`;
      same = key === last ? same + 1 : 0; last = key;
    }
  }, sel);
  let sel = "#graph-popup";
  const box = await page.evaluate(() => { const b = document.getElementById("graph-box").getBoundingClientRect(); return [b.left, b.top, b.width, b.height, b.bottom]; });
  await page.evaluate(async ([id, x, y]) => {
    await openGraphPopup({ stopPropagation() {}, clientX: x, clientY: y }, { id, preview: "Clip probe" });
  }, [id, box[0] + box[2] * 0.5, box[1] + box[3] - 30]);
  await page.waitForTimeout(500);
  await settle("#graph-popup");
  const a = await measure();
  await page.evaluate(() => document.getElementById("graph-popup-close").click());
  sel = "#graph-new";
  await page.evaluate((y) => openGraphNewNote({ clientX: 300, clientY: y }), box[1] + box[3] - 30).catch(() => null);
  await page.waitForTimeout(300);
  await settle("#graph-new");
  const b = await page.evaluate(() => !document.getElementById("graph-new").classList.contains("hidden")) ? await measure() : { sel, skipped: true };
  console.log(JSON.stringify({ W, H, theme: process.env.THEME || "light", graphBox: box.map(Math.round), popup: a, newNote: b }));
  await browser.close();
})();
