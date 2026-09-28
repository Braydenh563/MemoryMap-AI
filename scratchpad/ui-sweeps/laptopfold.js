// What a small laptop sees (WORLD_CLASS_PLAN 22.1 item 2): "At 1093x614 the
// top bar, sub-tabs, the list toolbar and the status bar take about 36% of
// the height: the Notes list shows 2.3 cards and the Dashboard's widgets
// start below the fold." Gate: 4 note cards and the first dashboard widget
// above the fold at 1093x614@1.25. Per size: the chrome's rows and heights,
// the note cards wholly or partly on screen, and where the first widget is.
//   SIZES=1093x614@1.25,1280x720,1440x900 TAG=before node scratchpad/ui-sweeps/laptopfold.js
const path = require("path");
const { boot } = require("./lib.js");
const TAG = process.env.TAG || "after";
const SIZES = (process.env.SIZES || "1093x614@1.25,1280x720,1440x900").split(",").map((s) => {
  const [dims, dsf] = s.split("@");
  const [w, h] = dims.split("x").map(Number);
  return { w, h, dsf: Number(dsf || 1) };
});
(async () => {
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail !== undefined ? ": " + detail : ""}`);
  };
  for (const { w, h, dsf } of SIZES) {
    const { page, browser } = await boot({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
    const box = (sel) => page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el || !el.getClientRects().length) return null;
      const b = el.getBoundingClientRect();
      return [Math.round(b.top), Math.round(b.bottom)];
    }, sel);
    await page.evaluate(() => switchTab("notes"));
    await page.waitForTimeout(2000);
    const notes = await page.evaluate(() => {
      const status = document.getElementById("status-bar");
      const floor = status && status.getClientRects().length ? status.getBoundingClientRect().top : innerHeight;
      const cards = [...document.querySelectorAll("#entry-list > li")].filter((li) => li.getClientRects().length);
      const whole = cards.filter((li) => { const b = li.getBoundingClientRect(); return b.top >= 0 && b.bottom <= floor; }).length;
      const partial = cards.filter((li) => { const b = li.getBoundingClientRect(); return b.top < floor && b.bottom > 0; }).length;
      const first = cards[0]?.getBoundingClientRect();
      return {
        density: document.documentElement.dataset.density,
        floor: Math.round(floor),
        firstCardTop: first ? Math.round(first.top) : null,
        cardH: first ? Math.round(first.height) : null,
        whole,
        partial,
      };
    });
    const chrome = {
      topBar: await box("#top-bar"),
      subtabs: await box("#notes-subtabs"),
      dock: await box('#tab-notes [data-dock-name="notes"]'),
      status: await box("#status-bar"),
    };
    console.log(`     ${w}x${h}@${dsf} notes`, JSON.stringify({ ...notes, chrome }));
    await page.screenshot({ path: path.join(__dirname, "..", "shots", "phone430", `fold-${TAG}-${w}-notes.png`) });
    if (w === 1093) check(`${w}: at least 4 note cards on screen`, notes.whole >= 4, `${notes.whole} whole, ${notes.partial} in part`);
    await page.evaluate(() => switchTab("dashboard"));
    await page.waitForTimeout(2500);
    const dash = await page.evaluate(() => {
      const status = document.getElementById("status-bar");
      const floor = status && status.getClientRects().length ? status.getBoundingClientRect().top : innerHeight;
      const widget = [...document.querySelectorAll("#dash-grid .dash-widget")].find((el) => el.getClientRects().length);
      const b = widget?.getBoundingClientRect();
      return { floor: Math.round(floor), widgetTop: b ? Math.round(b.top) : null, widgetHead: b ? Math.round(b.top + 48) : null };
    });
    console.log(`     ${w}x${h}@${dsf} dashboard`, JSON.stringify(dash));
    await page.screenshot({ path: path.join(__dirname, "..", "shots", "phone430", `fold-${TAG}-${w}-dash.png`) });
    //: "Above the fold": its head (the first 48px, its title row) is on screen.
    if (w === 1093) check(`${w}: the first dashboard widget is above the fold`, dash.widgetHead != null && dash.widgetHead <= dash.floor, `widget at ${dash.widgetTop}, floor ${dash.floor}`);
    await browser.close();
  }
  console.log(fails ? `${fails} FAILED` : "the laptop sees its notes");
  process.exit(fails ? 1 : 0);
})();
