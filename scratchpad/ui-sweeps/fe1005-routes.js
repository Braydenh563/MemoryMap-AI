// fe1005: how long the routes behind a first Timeline and Dashboard visit
// take at 5,000 notes (audit FE-13), three times each, and how big they are.
//   BASE=http://127.0.0.1:8842 node fe1005-routes.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  const seen = new Map();
  page.on("requestfinished", async (r) => {
    const t = r.timing();
    const path = new URL(r.url()).pathname;
    if (!/^\/(js|css|vendor)\//.test(path)) {
      const list = seen.get(path) || [];
      list.push(Math.round(t.responseEnd));
      seen.set(path, list);
    }
  });
  for (const tab of ["timeline", "dashboard", "timeline", "dashboard"]) {
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(4000);
  }
  const slow = [...seen.entries()]
    .map(([k, v]) => [k, Math.max(...v)])
    .filter(([, ms]) => ms > 150)
    .sort((a, b) => b[1] - a[1]);
  console.log(JSON.stringify(slow));
  await browser.close();
})();
