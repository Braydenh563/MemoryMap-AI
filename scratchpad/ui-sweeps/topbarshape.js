// The top bar's shape at each width (INBOX 430, "the top bar isn't centred at
// smaller widths: the tab strip sits left while the icons sit right"): the
// strip's centre against the window's, each row's items, and a shot per width
// into scratchpad/shots/phone430/topbar-<tag>-<w>.png.
//   WIDTHS=768,1024,1100 TAG=before node scratchpad/ui-sweeps/topbarshape.js
const path = require("path");
const fs = require("fs");
const { boot } = require("./lib.js");

const WIDTHS = (process.env.WIDTHS || "600,768,900,1024,1100,1200,1280,1440").split(",").map(Number);
const TAG = process.env.TAG || "after";
const SHOTS = path.join(__dirname, "..", "shots", "phone430");
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const { page, browser } = await boot({ viewport: { width: WIDTHS[0], height: 800 }, hasTouch: true, isMobile: true });
  let fails = 0;
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.waitForTimeout(700);
    const m = await page.evaluate(() => {
      const header = document.getElementById("top-bar");
      const strip = document.getElementById("tab-bar");
      const hb = header.getBoundingClientRect();
      const tabs = [...strip.children].filter((c) => !c.classList.contains("hidden") && c.getClientRects().length);
      const first = tabs[0].getBoundingClientRect();
      const last = tabs[tabs.length - 1].getBoundingClientRect();
      const mid = (first.left + last.right) / 2;
      //: The gaps to the two groups, when the strip shares their row.
      const sw = document.querySelector("#top-bar .space-switcher, #top-bar #space-switcher");
      const ctl = document.querySelector("#top-bar .header-controls");
      const gapL = sw ? Math.round(first.left - sw.getBoundingClientRect().right) : null;
      const gapR = ctl ? Math.round(ctl.getBoundingClientRect().left - last.right) : null;
      return {
        mode: header.classList.contains("tabs-wrapped") ? "own row" : header.classList.contains("tabs-centred") ? "window" : "gap",
        gapL,
        gapR,
        h: Math.round(hb.height),
        wrapped: header.classList.contains("tabs-wrapped"),
        tabsLeft: Math.round(first.left),
        tabsRight: Math.round(innerWidth - last.right),
        offCentre: Math.round(mid - innerWidth / 2),
      };
    });
    //: Centred on the window within 24px (on its own row, or placed there);
    //: or, sharing the row without the room for that, centred in the gap
    //: between the two groups. On a phone it is the bottom bar.
    const ok = w < 600 || (m.mode === "gap" ? Math.abs(m.gapL - m.gapR) <= 24 && m.gapL >= 8 : Math.abs(m.offCentre) <= 24);
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${w}: ${JSON.stringify(m)}`);
    await page.screenshot({ path: path.join(SHOTS, `topbar-${TAG}-${w}.png`), clip: { x: 0, y: 0, width: w, height: 140 } });
  }
  await browser.close();
  console.log(fails ? `${fails} FAILED` : "the tab strip is centred");
  process.exit(fails ? 1 : 0);
})();
