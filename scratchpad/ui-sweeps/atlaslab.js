// The avatar lab (tools/avatar-lab.html) served by the app: opens it, runs
// every view, reports console errors and how many drawings each view
// made, and screenshots the page. Writes $SCRATCH/shots/atlas-r3-lab-<view>.png.
//
//   BASE=http://127.0.0.1:8820 SCRATCH=/tmp/x PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlaslab.js
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const OUT = `${process.env.SCRATCH || "."}/shots`;
require("fs").mkdirSync(OUT, { recursive: true });

(async () => {
  const base = process.env.BASE || "http://127.0.0.1:8820";
  const page = process.env.PAGE || "avatar-lab.html";
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1.5 });
  const tab = await ctx.newPage();
  const errors = [];
  tab.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  tab.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await tab.goto(`${base}/tools/${page}`, { waitUntil: "domcontentloaded" });
  await tab.waitForTimeout(1200);
  const status = await tab.evaluate(() => document.getElementById("status")?.textContent);
  console.log(`status: ${status}`);
  const views = (process.env.VIEWS || "hero,compare,moods,sizes,poses,avatar,gallery,ab").split(",");
  for (const view of views) {
    if (view === "ab") {
      await tab.click('[data-do="snap-a"]');
      await tab.evaluate(() => { document.getElementById("tune-bodyWidth").value = 1.3; document.getElementById("tune-bodyWidth").dispatchEvent(new Event("input")); });
      await tab.waitForTimeout(400);
      await tab.click('[data-do="snap-b"]');
    }
    const button = await tab.$(`[data-do="${view}"]`);
    if (!button) { console.log(`${view}: no button`); continue; }
    await tab.evaluate(() => document.getElementById("clear").click());
    await button.click();
    await tab.waitForTimeout(900);
    const count = await tab.evaluate(() => document.querySelectorAll("#canvas svg").length);
    const overlap = await tab.evaluate(() => {
      //: Two specimens whose boxes overlap is the layout bug the owner saw.
      const boxes = [...document.querySelectorAll("#canvas .spec")].map((el) => el.getBoundingClientRect());
      let hits = 0;
      for (let i = 0; i < boxes.length; i += 1) for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i], b = boxes[j];
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) hits += 1;
      }
      return hits;
    });
    await tab.screenshot({ path: `${OUT}/atlas-r3-lab-${view}.png`, fullPage: false });
    console.log(`${view}: ${count} drawings, ${overlap} overlapping specimens`);
  }
  console.log(errors.length ? `errors:\n${errors.join("\n")}` : "errors: none");
  await browser.close();
})();
