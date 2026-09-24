// What Atlas costs while it sits there: main-thread time (CDP TaskDuration)
// over 10s idle with Atlas drawn at the viewer's 208px, the dashboard's 46px
// and a persona row's 36px, animation "always", against the same page with
// no marks. MODE=old serves OLD_AVATARS (avatars.js from before atlas.js,
// whose atlasMark drew the disc face) and an empty atlas.js, for the before.
//
//   BASE=http://127.0.0.1:8817 MODE=new PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlascost.js
//   BASE=... MODE=old OLD_AVATARS=/path/avatars-old.js node atlascost.js
// Prints the median of RUNS (default 3) for marks and for none, in ms.
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs");

const BASE = process.env.BASE || "http://127.0.0.1:8817";
const MODE = process.env.MODE || "new";
const RUNS = Number(process.env.RUNS || 3);

async function measure(withMarks) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("onboardingDone", "1");
      localStorage.setItem("tourDone", "1");
    } catch (e) {}
  });
  if (MODE === "old") {
    const body = fs.readFileSync(process.env.OLD_AVATARS, "utf8");
    await ctx.route("**/avatars.js*", (route) => route.fulfill({ body, contentType: "application/javascript" }));
    await ctx.route("**/atlas.js*", (route) => route.fulfill({ body: "", contentType: "application/javascript" }));
  }
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#lock-password", { state: "visible", timeout: 20000 });
  await page.fill("#lock-password", "testpassword123");
  await page.click("#lock-submit");
  await page.waitForTimeout(4000);
  await page.evaluate((withMarks) => {
    document.documentElement.dataset.avatarMotion = "always";
    document.getElementById("onboarding-overlay")?.classList.add("hidden");
    const stage = document.createElement("div");
    stage.id = "cost-stage";
    for (const [k, v] of Object.entries({ position: "fixed", right: "16px", top: "80px", zIndex: "9999", display: "flex", gap: "8px", alignItems: "end" })) stage.style[k] = v;
    document.body.appendChild(stage);
    if (withMarks) for (const size of [208, 46, 36]) stage.appendChild(nameMarkLive("Atlas", size));
  }, withMarks);
  await page.waitForTimeout(2000);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Performance.enable");
  const read = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const a = await read();
  await page.waitForTimeout(10000);
  const b = await read();
  await browser.close();
  return (b.TaskDuration - a.TaskDuration) * 1000;
}

(async () => {
  const marks = [];
  const none = [];
  for (let i = 0; i < RUNS; i += 1) {
    marks.push(await measure(true));
    none.push(await measure(false));
  }
  const median = (xs) => xs.slice().sort((x, y) => x - y)[Math.floor(xs.length / 2)];
  console.log(JSON.stringify({ mode: MODE, marksMs: median(marks).toFixed(1), noneMs: median(none).toFixed(1), atlasMs: (median(marks) - median(none)).toFixed(1), marks: marks.map((x) => x.toFixed(0)), none: none.map((x) => x.toFixed(0)) }));
})();
