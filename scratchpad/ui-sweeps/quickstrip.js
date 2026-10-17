// INBOX 904 B12 + B64: the dashboard's Quick access strip "looks small on the
// full view" and "sometimes loses its full form". Measures the tile box, the
// hint line and the page's data-density at a tall window, a short one, and
// after resizing short -> tall and tall -> short.
// Usage: BASE=http://127.0.0.1:8783 node quickstrip.js
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`); };
const read = (page) => page.evaluate(() => {
  const tile = document.querySelector("#dash-quicklinks .quick-link");
  const hint = tile?.querySelector(".quick-link-hint");
  const r = tile?.getBoundingClientRect();
  return {
    vh: innerHeight,
    appDensity: document.documentElement.dataset.density,
    pageDensity: document.getElementById("tab-dashboard")?.dataset.density,
    stored: prefs.get("dash-density", null),
    tileH: r ? Math.round(r.height) : null,
    tileW: r ? Math.round(r.width) : null,
    hintShown: !!hint && getComputedStyle(hint).display !== "none",
  };
});
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => switchTab("dashboard"));
  await page.waitForTimeout(2500);
  const tall = await read(page);
  console.log("tall", JSON.stringify(tall));
  // Nothing chosen: a short window is Compact, and the View menu must say so.
  await page.setViewportSize({ width: 1440, height: 650 });
  await page.waitForTimeout(800);
  const auto = await read(page);
  const ticked = await page.evaluate(() => dashCustomiseItems().find((i) => i.label === "ph:layout View").items.filter((i) => i.label.startsWith("ph:check")).map((i) => i.label));
  console.log("short, nothing chosen", JSON.stringify(auto), JSON.stringify(ticked));
  // Full chosen: it holds in the short window.
  await page.evaluate(() => applyDashDensity("full"));
  await page.waitForTimeout(500);
  const held = await read(page);
  console.log("short, Full chosen", JSON.stringify(held));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(800);
  const back = await read(page);
  console.log("tall again", JSON.stringify(back));
  await page.evaluate(() => prefs.remove("dash-density"));
  ok("tall window: full tile with its hint", tall.hintShown && tall.tileH >= 70, `${tall.tileH}px`);
  ok("short window, Full chosen, keeps the tile (B12/B64)", held.hintShown && held.tileH >= 70, `${held.tileH}px x ${held.tileW}px, page ${held.pageDensity}`);
  ok("short window, nothing chosen: the View menu ticks Compact", auto.pageDensity === "compact" && ticked.length === 1 && /Compact/.test(ticked[0]), JSON.stringify(ticked));
  ok("tall again returns to the same tile", back.tileH === tall.tileH && back.hintShown, `${back.tileH}px`);
  await browser.close();
  console.log(bad ? `${bad} FAILED` : "all passed");
  process.exit(bad ? 1 : 0);
})();
