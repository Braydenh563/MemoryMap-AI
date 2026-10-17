// B37 (INBOX 904), graph half: a middle-button press on the graph canvas. Does
// the press get its default (Windows autoscroll) prevented, and does a drag
// pan the camera?
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(async () => {
    const have = (await apiJson("/entries?limit=50")).length;
    for (let i = have; i < 12; i += 1) await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: `Graph probe ${i} about gardens and cooking.` }) });
  });
  await page.click('[data-tab="graph"]');
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    window.__md = [];
    window.addEventListener("mousedown", (e) => setTimeout(() => window.__md.push({ b: e.button, prevented: e.defaultPrevented, t: e.target.tagName + "#" + e.target.id }), 0), true);
    window.addEventListener("pointerdown", (e) => setTimeout(() => window.__md.push({ pb: e.button, prevented: e.defaultPrevented }), 0), true);
  });
  const cv = await page.evaluate(() => { const c = document.querySelector("#tab-graph canvas"); const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, id: c.id }; });
  console.log("canvas", JSON.stringify(cv));
  const cam = () => page.evaluate(() => { const c = document.querySelector("#tab-graph canvas"); const t = d3.zoomTransform(c); return [Math.round(t.x * 10) / 10, Math.round(t.y * 10) / 10, Math.round(t.k * 100) / 100]; });
  // empty corner of the canvas
  const px = cv.x + 60, py = cv.y + cv.h - 60;
  const c0 = await cam();
  await page.mouse.move(px, py);
  await page.mouse.down({ button: "middle" });
  for (const t of [1, 3, 6, 11, 19, 32, 53, 93]) { await page.mouse.move(px + t, py - Math.round(t / 2)); await page.waitForTimeout(16); }
  const c1 = await cam();
  await page.mouse.up({ button: "middle" });
  console.log("camera before", c0, "after middle drag of 93px", c1);
  console.log("events", JSON.stringify(await page.evaluate(() => window.__md)));
  // left drag for the reference
  await page.mouse.move(px, py);
  await page.mouse.down();
  await page.mouse.move(px + 93, py - 46, { steps: 8 });
  await page.mouse.up();
  console.log("camera after left drag of 93px", await cam());
  await browser.close();
})();
