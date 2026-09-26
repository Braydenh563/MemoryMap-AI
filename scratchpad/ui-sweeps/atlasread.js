// How Atlas reads at the sizes that matter: the companion's figure at 1:1
// (64 by 92 px) and the icon at 24, 20 and 16 px, captured at device
// scale 1 and shown beside a 4x nearest-neighbour blow-up, both looks,
// light and dark. Writes $SCRATCH/shots/atlas-r5-read-<theme>.png.
const { boot } = require("./lib.js");
const { PNG } = (() => { try { return require("/opt/node22/lib/node_modules/pngjs"); } catch (e) { return {}; } })();

(async () => {
  const theme = process.env.THEME || "light";
  const { page, browser, OUT } = await boot({ viewport: { width: 900, height: 500 }, deviceScaleFactor: 1 });
  await page.evaluate((theme) => {
    document.documentElement.dataset.avatarMotion = "off";
    clearTimeout(atlasMoodTimer);
    atlasApply = ((apply) => (svg, mood) => apply(svg, svg.dataset.keep || mood))(atlasApply);
    const host = document.createElement("div");
    host.id = "atl-read";
    host.style.cssText = `position:fixed;left:0;top:0;width:900px;height:500px;z-index:99;background:${theme === "dark" ? "#1d1d38" : "#f4f3f8"};display:flex;gap:24px;padding:20px;align-items:flex-start`;
    for (const look of ["masculine", "feminine"]) {
      window.atlasLook = () => look;
      const col = document.createElement("div");
      col.style.cssText = "display:flex;flex-direction:column;gap:12px;align-items:flex-start";
      const fig = atlasFigure();
      fig.style.cssText = "position:relative;display:block;width:64px;height:92px";
      col.appendChild(fig);
      const row = document.createElement("div");
      row.style.cssText = "display:flex;gap:10px;align-items:flex-end";
      for (const n of [24, 20, 16]) row.appendChild(atlasDraw(n, "calm"));
      col.appendChild(row);
      host.appendChild(col);
    }
    document.body.appendChild(host);
  }, theme);
  await page.waitForTimeout(600);
  const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 330, height: 180 } });
  const fs = require("fs");
  const small = `${OUT}/atlas-r5-read-${theme}-1x.png`;
  fs.writeFileSync(small, shot);
  console.log(small);
  await browser.close();
})();
