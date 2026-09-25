// Atlas against its reference (atlas.js, the design note's measured
// table): the reference's `stand` cell under the figure at the same scale
// as an onion skin, and the two side by side. REF=<png of the cell>,
// REF_ORIGIN=x,y (the reference pixel that lands on unit 31,0),
// REF_SCALE (units per reference px, 0.608), ATLAS_LOOK, THEME. Writes
// $SCRATCH/shots/atlas-trace-<look>-<theme>.png.
//
//   BASE=http://127.0.0.1:8820 SCRATCH=/tmp/x REF=/tmp/x/ref34-cell.png \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlastrace.js
const { boot } = require("./lib.js");
const fs = require("fs");

(async () => {
  const look = process.env.ATLAS_LOOK || "masculine";
  const theme = process.env.THEME || "light";
  const ref = fs.readFileSync(process.env.REF).toString("base64");
  const [ox, oy] = (process.env.REF_ORIGIN || "81,12").split(",").map(Number);
  const unitsPerPx = Number(process.env.REF_SCALE || 0.608);
  const k = Number(process.env.K || 4);
  const { page, browser, OUT } = await boot({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  const stage = await page.evaluate(([look, ref, ox, oy, unitsPerPx, k]) => {
    document.documentElement.dataset.avatarMotion = "off";
    localStorage.setItem("atlas-look", look);
    clearTimeout(atlasMoodTimer);
    atlasApply = ((apply) => (svg, mood) => apply(svg, svg.dataset.keep || mood))(atlasApply);
    const svg = atlasDraw(92, "calm", "figure");
    svg.dataset.keep = "calm";
    return { svg: svg.outerHTML, css: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href), attrs: [...document.documentElement.attributes].map((a) => [a.name, a.value]) };
  }, [look, ref, ox, oy, unitsPerPx, k]);
  const sheet = await browser.newPage({ viewport: { width: 64 * k * 3 + 120, height: 120 * k }, deviceScaleFactor: 1 });
  //: The reference scaled so one of its px is `unitsPerPx` units, placed so
  //: its origin lands on unit (31, 0) of the figure's box.
  const scale = k * unitsPerPx;
  const left = (31 - ox * unitsPerPx) * k;
  const top = (0 - oy * unitsPerPx) * k;
  const cell = (inner, label, i) => `<div style="position:absolute;left:${20 + i * (64 * k + 40)}px;top:20px;width:${64 * k}px;height:${104 * k}px;overflow:hidden;background:${theme === "dark" ? "#1d1d38" : "#e9e9f2"}">${inner}<div style="position:absolute;left:4px;top:4px;font:12px sans-serif;color:#333">${label}</div></div>`;
  const img = (op) => `<img src="data:image/png;base64,${ref}" style="position:absolute;left:${left}px;top:${top}px;width:${Math.round(175 * scale)}px;height:auto;opacity:${op}">`;
  const fig = (op) => `<div class="nm-figure atl-figure-box" style="position:absolute;left:0;top:0;width:64px;height:92px;transform:scale(${k});transform-origin:0 0;opacity:${op}">${stage.svg}</div>`;
  await sheet.setContent(`<!doctype html><html ${stage.attrs.map(([k, v]) => `${k}="${v}"`).join(" ")} data-mode="${theme}" data-theme="${theme}" data-avatar-motion="off"><head>${stage.css.map((h) => `<link rel="stylesheet" href="${h}">`).join("")}
  <style>body{margin:0!important;padding:0!important;display:block!important;position:relative;background:${theme === "dark" ? "#141427" : "#f4f3f8"}}</style></head><body>
  ${cell(img(1), "reference", 0)}${cell(img(0.45) + fig(0.85), "onion skin", 1)}${cell(fig(1), "render", 2)}</body></html>`);
  await sheet.waitForTimeout(600);
  const out = `${OUT}/atlas-trace-${look}-${theme}${process.env.TAG ? "-" + process.env.TAG : ""}.png`;
  await sheet.screenshot({ path: out, fullPage: true });
  console.log(out);
  await browser.close();
})();
