// fe1005: the Graph at the fitted view (small dots batched) and zoomed in
// (sprites), screenshots for a look, with the debug numbers beside them.
//   SCRATCH=/tmp/x BASE=http://127.0.0.1:8842 THEME=dark node fe1005-graphshot.js
const { boot, OUT } = require("./lib.js");
(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const { browser, page } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 } });
  await page.click('[data-tab="graph"]').catch(() => {});
  if (width < 600) await page.evaluate(() => switchTab && switchTab("graph")).catch(() => {});
  await page.waitForFunction(() => window.__graphDebug && window.__graphDebug.nodes > 0, null, { timeout: 60000 });
  await page.waitForTimeout(Number(process.env.WAIT || 28000));
  const theme = process.env.THEME || "light";
  const info = async (name) => {
    const d = await page.evaluate(() => {
      const g = window.__graphDebug;
      return { nodes: g.nodes, lod: g.lodNodes, k: Math.round(g.transform.k * 100) / 100, alpha: g.alpha };
    });
    await page.screenshot({ path: `${OUT}/fe1005-graph-${name}-${theme}-${width}.png` });
    console.log(name, JSON.stringify(d));
  };
  await info("fitted");
  //: The zoom-in control, as a person would press it.
  const plus = await page.$$eval("button", (all) => {
    const b = all.find((x) => /zoom in/i.test(x.getAttribute("aria-label") || x.title || ""));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  for (let i = 0; plus && i < 6; i++) {
    await page.mouse.click(plus.x, plus.y);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1200);
  await info("zoomed");
  await browser.close();
})();
