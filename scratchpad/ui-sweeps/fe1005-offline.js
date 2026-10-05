// fe1005: does the app ask any other host for anything? Boots in a French
// locale (p5's translations loader used to reach for a CDN in any language
// but English), visits every tab, and lists each request that is not to the
// app's own origin, including ones the CSP refused.
//   BASE=http://127.0.0.1:8842 node fe1005-offline.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, ctx, page } = await boot({ locale: "fr-FR" });
  const origin = new URL(process.env.BASE || "http://127.0.0.1:8781").origin;
  const outside = [];
  ctx.on("request", (r) => {
    const url = r.url();
    if (!url.startsWith(origin) && !/^(data|blob|about|chrome-extension):/.test(url)) outside.push(url);
  });
  page.on("console", (m) => {
    if (/Content Security Policy|Translations failed|jsdelivr/i.test(m.text())) outside.push("console: " + m.text().slice(0, 160));
  });
  for (const tab of ["dashboard", "notes", "library", "chat", "graph", "timeline", "reminders"]) {
    await page.click(`[data-tab="${tab}"]`).catch(() => {});
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(4000);
  console.log(JSON.stringify({ outside }));
  await browser.close();
})();
