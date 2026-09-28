// A collapsed sidebar's vertical name, centred under its toggle.
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector("#tab-notes .sidebar-collapse-toggle")?.click());
  await page.waitForTimeout(800);
  console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll(".sidebar-collapsed > .sidebar-rail-name")].filter((n) => n.getClientRects().length).map((n) => {
    const r = document.createRange(); r.selectNodeContents(n); const t = r.getBoundingClientRect(); const b = n.getBoundingClientRect();
    const g = n.parentElement.querySelector(".sidebar-collapse-toggle").getBoundingClientRect(); const a = n.parentElement.getBoundingClientRect(); return { text: n.textContent.trim(), textMid: Math.round(t.left + t.width / 2), boxMid: Math.round(b.left + b.width / 2), toggleMid: Math.round(g.left + g.width / 2), asideMid: Math.round(a.left + a.width / 2), aside: Math.round(a.width), client: n.parentElement.clientWidth };
  }))));
  await browser.close();
})();
