// INBOX 394 e: on Full, the "Your dashboard" bar ends the first screen (its
// bottom within the page's bottom padding of the visible bottom) at three
// window sizes, and Compact clears the room. Run: BASE=http://127.0.0.1:8781 node dashfold.js
const { boot } = require("./lib.js");
(async () => {
  let failures = 0;
  for (const [w, h] of [[1440, 900], [1920, 1080], [1280, 720]]) {
    const { browser, page } = await boot({ viewport: { width: w, height: h } });
    await page.evaluate(() => { applyDashDensity("full"); switchTab("dashboard"); });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const p = document.getElementById("tab-dashboard");
      const b = p.querySelector(":scope > .dash-toolbar");
      const pad = parseFloat(getComputedStyle(p).paddingBottom) || 0;
      const bottom = p.getBoundingClientRect().top + p.clientHeight - pad;
      return { gap: bottom - b.getBoundingClientRect().bottom };
    });
    const ok = Math.abs(r.gap) <= 2;
    if (!ok) failures++;
    console.log(`${ok ? "ok  " : "FAIL"} ${w}x${h} bar ends ${r.gap.toFixed(1)}px above the fold`);
    const compact = await page.evaluate(async () => {
      applyDashDensity("compact");
      await new Promise((res) => setTimeout(res, 400));
      const s = document.getElementById("dash-stats").style.marginTop;
      applyDashDensity("full");
      return s;
    });
    if (compact) failures++;
    console.log(`${compact ? "FAIL" : "ok  "} ${w}x${h} compact leaves no room ("${compact}")`);
    await browser.close();
  }
  console.log(failures ? `${failures} failed` : "all ok");
  process.exit(failures ? 1 : 0);
})();
