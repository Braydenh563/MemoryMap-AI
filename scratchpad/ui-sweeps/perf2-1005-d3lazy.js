// perf2-1005 (audit FE-07): d3 arrives with the Graph tab and with the
// Library's bundle (the whiteboard), and both surfaces still draw.
//   BASE=http://127.0.0.1:8859 node perf2-1005-d3lazy.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const d3s = [];
  page.on("request", (r) => /d3\.v7/.test(r.url()) && d3s.push(r.url().split("/").pop()));
  const out = { atBoot: await page.evaluate(() => typeof d3) };
  await page.click('[data-tab="graph"]');
  await page.waitForTimeout(5000);
  out.graph = await page.evaluate(() => ({
    d3: typeof d3,
    canvas: !!document.querySelector("#graph-canvas, #tab-graph canvas"),
    nodes: typeof graphNodes !== "undefined" ? graphNodes.length : null,
  }));
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(3000);
  out.board = await page.evaluate(async () => {
    const ok = await ensureModule("library");
    return { ok, d3: typeof d3, wbZoom: typeof wbZoom, zoomIsD3: typeof wbZoom?.scaleExtent === "function" };
  });
  out.d3Requests = d3s;
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
