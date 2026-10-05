// **A stale session goes to the lock screen, not a dashboard of failed widgets** (INBOX 597).
// node stalelock.js login; restart the server (tokens are in memory); node stalelock.js reload.
// Pass: {"sawFailedWidget":false,"sawDashboardBeforeLock":false,"lockAtEnd":true}. Base: true/true/false.
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const phase = process.argv[2];
(async () => {
  const b = await chromium.launchPersistentContext("/tmp/claude-0/stale-profile", {});
  const p = b.pages()[0] || await b.newPage();
  await p.goto("http://127.0.0.1:8812/", { waitUntil: "domcontentloaded" });
  if (phase === "login") {
    await p.waitForTimeout(3000);
    if (await p.locator("#lock-password").isVisible().catch(() => false)) { await p.fill("#lock-password", "testpassword123"); await p.click("#lock-submit"); }
    await p.waitForTimeout(4000);
    console.log("logged in, lock hidden:", await p.locator("#lock-overlay").evaluate((e) => e.classList.contains("hidden")));
  } else {
    let sawFailedWidget = false, sawDashboard = false;
    for (let i = 0; i < 40; i++) {
      await p.waitForTimeout(150);
      const st = await p.evaluate(() => ({
        failed: /Couldn't load this widget/.test(document.body.innerText),
        lockVisible: !document.getElementById("lock-overlay").classList.contains("hidden"),
        splash: !!document.getElementById("boot-splash"),
      }));
      if (st.failed && !st.lockVisible) sawFailedWidget = true;
      if (!st.lockVisible && !st.splash) sawDashboard = true;
    }
    const lock = await p.evaluate(() => !document.getElementById("lock-overlay").classList.contains("hidden"));
    console.log(JSON.stringify({ sawFailedWidget, sawDashboardBeforeLock: sawDashboard, lockAtEnd: lock }));
  }
  await b.close();
})();
