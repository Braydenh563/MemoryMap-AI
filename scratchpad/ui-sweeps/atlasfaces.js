// Atlas's expressions beside the reference's expression grid (atlas.js):
// the reference row on top (REF, a crop of the sheet's grid), the same
// moods as head marks under it at the cell height, for both looks.
// Writes $SCRATCH/shots/atlas-faces-<theme>.png.
//
//   BASE=http://127.0.0.1:8820 SCRATCH=/tmp/x REF=/tmp/x/ref32-faces.png \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlasfaces.js
const { boot } = require("./lib.js");
const fs = require("fs");

const MOODS = ["calm", "happy", "delighted", "laughing", "thinking", "surprised", "sleepy", "sad", "proud", "shy"];

(async () => {
  const theme = process.env.THEME || "light";
  const ref = fs.readFileSync(process.env.REF).toString("base64");
  const cell = Number(process.env.CELL || 66);
  const { page, browser, OUT } = await boot({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  const stage = await page.evaluate(([moods, cell]) => {
    document.documentElement.dataset.avatarMotion = "off";
    clearTimeout(atlasMoodTimer);
    atlasApply = ((apply) => (svg, mood) => apply(svg, svg.dataset.keep || mood))(atlasApply);
    const rows = {};
    for (const look of ["masculine", "feminine"]) {
      localStorage.setItem("atlas-look", look);
      rows[look] = moods.map((mood) => {
        const svg = atlasDraw(cell * 2, mood, "head");
        svg.dataset.keep = mood;
        return svg.outerHTML;
      });
    }
    return { rows, css: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href), attrs: [...document.documentElement.attributes].map((a) => [a.name, a.value]) };
  }, [MOODS, cell]);
  const sheet = await browser.newPage({ viewport: { width: cell * 2 * MOODS.length + 40, height: cell * 2 * 3 + 80 }, deviceScaleFactor: 1 });
  const row = (svgs, label) => `<div style="display:flex;gap:0;align-items:flex-start"><div style="width:0;overflow:visible;position:relative"><span style="position:absolute;left:4px;top:4px;font:12px sans-serif;color:#333">${label}</span></div>${svgs.map((s) => `<div style="width:${cell * 2}px;height:${cell * 2}px;display:grid;place-items:center">${s}</div>`).join("")}</div>`;
  await sheet.setContent(`<!doctype html><html ${stage.attrs.map(([k, v]) => `${k}="${v}"`).join(" ")} data-mode="${theme}" data-theme="${theme}" data-avatar-motion="off"><head>${stage.css.map((h) => `<link rel="stylesheet" href="${h}">`).join("")}
  <style>body{margin:0!important;padding:20px!important;display:block!important;background:${theme === "dark" ? "#141427" : "#eef0f6"}}</style></head><body>
  <img src="data:image/png;base64,${ref}" style="display:block;height:${cell * 2}px;width:auto;margin-bottom:8px">
  ${row(stage.rows.masculine, "masculine")}${row(stage.rows.feminine, "feminine")}</body></html>`);
  await sheet.waitForTimeout(600);
  const out = `${OUT}/atlas-faces-${theme}${process.env.TAG ? "-" + process.env.TAG : ""}.png`;
  await sheet.screenshot({ path: out, fullPage: true });
  console.log(out);
  await browser.close();
})();
