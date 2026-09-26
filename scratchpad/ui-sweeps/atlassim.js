// The companion simulator (tools/companion-sim.html) served by the app:
// opens it, lets the companion settle, scrolls fast, moves the panels,
// opens the menu, and reports where the companion went and any errors.
// Writes $SCRATCH/shots/atlas-r3-sim-<step>.png.
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const OUT = `${process.env.SCRATCH || "."}/shots`;
require("fs").mkdirSync(OUT, { recursive: true });

(async () => {
  const base = process.env.BASE || "http://127.0.0.1:8820";
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const tab = await ctx.newPage();
  const errors = [];
  tab.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  tab.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 300)}`); });
  await tab.goto(`${base}/tools/companion-sim.html`, { waitUntil: "domcontentloaded" });
  await tab.waitForTimeout(2500);
  const read = () => tab.evaluate(() => ({ status: document.getElementById("status")?.textContent, where: document.getElementById("where")?.textContent, buddy: !!document.getElementById("nm-buddy"), svg: !!document.querySelector("#nm-buddy svg"), points: SIM.points.length }));
  console.log("settled:", JSON.stringify(await read()));
  await tab.screenshot({ path: `${OUT}/atlas-r3-sim-settled.png` });
  await tab.click("#scroll");
  await tab.waitForTimeout(1800);
  console.log("after scroll:", JSON.stringify(await read()));
  await tab.screenshot({ path: `${OUT}/atlas-r3-sim-scrolled.png` });
  await tab.click("#shuffle");
  await tab.waitForTimeout(1800);
  console.log("after move:", JSON.stringify(await read()));
  await tab.click("#menu");
  await tab.waitForTimeout(700);
  const menu = await tab.evaluate(() => { const m = document.querySelector(".action-menu"); if (!m) return null; const r = m.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; });
  console.log("menu box:", JSON.stringify(menu));
  await tab.screenshot({ path: `${OUT}/atlas-r3-sim-menu.png` });
  console.log(errors.length ? `errors:\n${[...new Set(errors)].slice(0, 12).join("\n")}` : "errors: none");
  await browser.close();
})();
