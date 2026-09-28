// INBOX 430: "in devtools responsive mode, the layout flickers between two
// states every second (a full desktop top bar, then a wrapped tab strip with
// a big greeting)". Samples the layout 10 times over 5s at each size with
// touch on (devtools' responsive mode turns touch emulation on), and fails if
// any sample differs from the first.
//
//   BASE=http://127.0.0.1:8797 node scratchpad/ui-sweeps/layoutflicker.js
//   SIZES=390x844,768x1024,1024x768 TOUCH=0 ... to vary.
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { boot } = require("./lib.js");

const SIZES = (process.env.SIZES || "390x844,768x1024,1024x768").split(",").map((s) => s.split("x").map(Number));
const TOUCH = process.env.TOUCH !== "0";

(async () => {
  let fails = 0;
  for (const [width, height] of SIZES) {
    const { page, browser } = await boot({
      viewport: { width, height },
      ...(TOUCH ? { hasTouch: true, isMobile: true } : {}),
    });
    await page.waitForTimeout(1500);
    const sample = () => page.evaluate(() => {
      const r = (sel) => {
        const el = document.querySelector(sel);
        if (!el || !el.getClientRects().length) return "-";
        const b = el.getBoundingClientRect();
        return `${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.width)}x${Math.round(b.height)}`;
      };
      return {
        bar: r("header#top-bar, #top-bar"),
        tabs: r("#tabs, .tabs, nav.tabs"),
        greet: r(".dash-greeting, #dash-greeting, .greeting h1, .dashboard-hero h1"),
        html: document.documentElement.className.replace(/\s+/g, " ").trim(),
        body: document.body.className.replace(/\s+/g, " ").trim(),
        data: Object.entries(document.documentElement.dataset).map(([k, v]) => `${k}=${v}`).sort().join(" "),
        vw: `${innerWidth}x${innerHeight} ${document.documentElement.clientWidth} scale ${window.visualViewport ? visualViewport.scale.toFixed(2) : "?"}`,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        scrollH: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      };
    });
    const first = await sample();
    const diffs = [];
    for (let i = 1; i < 10; i += 1) {
      await page.waitForTimeout(500);
      const s = await sample();
      for (const key of Object.keys(first)) {
        if (String(s[key]) !== String(first[key])) diffs.push(`#${i} ${key}: ${first[key]} -> ${s[key]}`);
      }
    }
    const ok = diffs.length === 0;
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${width}x${height}${TOUCH ? " touch" : ""}: ${ok ? "10 samples alike" : diffs.length + " changes"}`);
    console.log("     first", JSON.stringify(first));
    for (const d of diffs.slice(0, 12)) console.log("     " + d);
    await browser.close();
  }
  console.log(fails ? `${fails} FAILED` : "the layout holds still");
  process.exit(fails ? 1 : 0);
})();
