// Scan widths for a layout that will not settle: one page, resized through
// WIDTHS, the top bar and the dashboard hero sampled 6 times over 3s at each.
// INBOX 430 ("the layout flickers between two states every second").
//   TOUCH=0 DSF=2 TAB=notes WIDTHS=600,700 ... to vary.
const { boot } = require("./lib.js");

const WIDTHS = (process.env.WIDTHS || "600,640,700,760,800,860,900,960,1000,1100,1200").split(",").map(Number);
(async () => {
  const touch = process.env.TOUCH !== "0";
  const { page, browser } = await boot({
    viewport: { width: WIDTHS[0], height: 900 },
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
    ...(process.env.DSF ? { deviceScaleFactor: Number(process.env.DSF) } : {}),
  });
  if (process.env.TAB) await page.evaluate((t) => switchTab(t), process.env.TAB);
  let bad = 0;
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(800);
    const seen = new Set();
    for (let i = 0; i < 6; i += 1) {
      seen.add(await page.evaluate(() => {
        const h = document.getElementById("top-bar");
        const hero = document.querySelector(".dash-hero, #dash-hero, .dashboard-hero");
        const hb = hero ? Math.round(hero.getBoundingClientRect().height) : "-";
        return `bar ${Math.round(h.getBoundingClientRect().height)} [${h.className}] strip-in:${document.getElementById("tab-bar")?.parentElement?.id} hero ${hb}`;
      }));
      await page.waitForTimeout(500);
    }
    if (seen.size > 1) bad += 1;
    console.log(`${seen.size > 1 ? "FLIP" : "ok  "} ${w}: ${[...seen].join(" | ")}`);
  }
  await browser.close();
  console.log(bad ? `${bad} widths flip` : "no width flips");
})();
