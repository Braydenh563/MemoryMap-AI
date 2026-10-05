// fe1005: what each lock and unlock leaves behind (audit 2026-10-05, FE-08).
// Four cycles, then an idle 62 s: /reminders should be asked once, and the
// page should not keep growing.
//   BASE=http://127.0.0.1:8842 node fe1005-lockleak.js
const { boot, PW } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  const nodes = () => page.evaluate(() => document.getElementsByTagName("*").length);
  const counts = [await nodes()];
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => lockNow());
    await page.waitForSelector("#lock-password", { state: "visible", timeout: 20000 });
    await page.fill("#lock-password", PW);
    await page.click("#lock-submit");
    await page.waitForTimeout(4000);
    counts.push(await nodes());
  }
  const seen = [];
  page.on("request", (r) => {
    if (/\/reminders(\?|$)/.test(r.url())) seen.push(r.url());
  });
  await page.waitForTimeout(62000);
  console.log(JSON.stringify({ elementsPerCycle: counts, remindersInIdleMinute: seen.length }));
  await browser.close();
})();
