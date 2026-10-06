// The dashboard heatmap's Narrow sticks: after pressing it, a re-render and a
// reload both draw the heatmap in one column (it was the only default wide
// widget, and an empty wide list brought the default back).
//   BASE=http://127.0.0.1:8791 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/heatmapnarrow.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  // A notebook with nothing in it shows a welcome card instead of widgets.
  await page.evaluate(async () => {
    await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "A first note so the dashboard has widgets." }) });
    await loadEntries();
  });
  await page.click('[data-tab="dashboard"]');
  await page.waitForTimeout(1500);
  const width = () => page.evaluate(() => {
    const card = document.querySelector('[data-widget="heatmap"]');
    return card ? Math.round(card.getBoundingClientRect().width) : null;
  });
  const before = await width();
  await page.evaluate(async () => { await toggleDashWidgetWide("heatmap"); renderDashboard(); });
  await page.waitForTimeout(800);
  const after = await width();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const lock = await page.$("#lock-password");
  if (lock && await lock.isVisible()) { await page.fill("#lock-password", "testpassword123"); await page.click("#lock-submit"); await page.waitForTimeout(2000); }
  await page.click('[data-tab="dashboard"]').catch(() => {});
  await page.waitForTimeout(1500);
  const reloaded = await width();
  await page.evaluate(async () => { await toggleDashWidgetWide("heatmap"); renderDashboard(); });
  await page.waitForTimeout(800);
  const wideAgain = await width();
  console.log(`heatmap width: default ${before}, after Narrow ${after}, after reload ${reloaded}, after Wide ${wideAgain}`);
  const ok = before > after && reloaded === after && wideAgain === before;
  console.log(ok ? "PASS  Narrow and Wide stick" : "FAIL");
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
