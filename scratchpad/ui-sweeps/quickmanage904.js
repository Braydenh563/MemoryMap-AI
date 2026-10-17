// INBOX 904 B13: unchecking a row in the Quick access manager must not move the
// list. The row leaves "On your dashboard" for "More commands" far below, and
// focusing it there used to scroll the list to it, so each further uncheck meant
// scrolling back up. Also prints the dashboard strip's tile sizes (B12, B64).
// Usage: BASE=http://127.0.0.1:8783 node quickmanage.js
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`); };
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => switchTab("dashboard"));
  await page.waitForTimeout(2500);
  const strip = await page.evaluate(() => [...document.querySelectorAll("#dash-quicklinks .launch-row > *")].map((e) => {
    const r = e.getBoundingClientRect();
    return [Math.round(r.width), Math.round(r.height)];
  }));
  console.log("strip tiles w,h:", JSON.stringify(strip));
  await page.evaluate(async () => {
    await saveQuickAccess(["tab:notes", "tab:graph", "tab:chat", "tab:documents", "tab:timeline"].filter((id) => quickCatalogue().has(id) || QUICK_START.some((l) => l.id === id)));
    renderQuickLinks();
  });
  await page.evaluate(async () => { await lazyScript("/css/quick-access-lazy.css"); await lazyScript("/js/quick-access.js"); });
  await page.evaluate(() => quickAccessManage(quickAccessCurrent().map((l) => l.id)));
  await page.waitForTimeout(600);
  const m = () => page.evaluate(() => {
    const s = document.querySelector(".quick-manage-scroll");
    return { top: Math.round(s.scrollTop), range: s.scrollHeight - s.clientHeight, on: document.querySelectorAll(".quick-manage-list")[0].children.length };
  });
  console.log("open", JSON.stringify(await m()));
  for (let i = 0; i < 3; i += 1) {
    await page.evaluate(() => document.querySelector(".quick-manage-list .note-picker-box").click());
    await page.waitForTimeout(300);
    const after = await m();
    console.log(`uncheck ${i + 1}`, JSON.stringify(after));
    ok(`uncheck ${i + 1}: list stays at the top`, after.top === 0, `scrollTop ${after.top} of ${after.range}`);
  }
  await browser.close();
  console.log(bad ? `${bad} FAILED` : "all passed");
  process.exit(bad ? 1 : 0);
})();
