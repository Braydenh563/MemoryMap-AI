// Atlas's preview sheet (atlas.js): every mood at the full size (104px),
// the head (48px and 28px) and the inline size (16px), on the app's own
// card in the theme asked for, with animation off so each expression is its
// resting frame. Writes $SCRATCH/shots/atlas-<theme>.png.
//
//   BASE=http://127.0.0.1:8817 THEME=dark SCRATCH=/tmp/x \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlassheet.js
// SCALE=2 for device pixels; BIG=calm,happy draws those moods at 240, 64,
// 28 and 20px instead (atlas-<theme>-big.png); ACCENT=#hex sets the accent.
const { boot } = require("./lib.js");

(async () => {
  const scale = Number(process.env.SCALE || 1);
  const big = (process.env.BIG || "").split(",").filter(Boolean);
  const { page, browser, OUT } = await boot({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: scale });
  const theme = process.env.THEME || "light";
  const info = await page.evaluate(([big, accent]) => {
    document.documentElement.dataset.avatarMotion = "off";
    if (accent) document.documentElement.style.setProperty("--accent", accent);
    //: The app's own mood changes (the greeting, the resting mood) would
    //: repaint every mark on the sheet; the sheet holds each one still.
    clearTimeout(atlasMoodTimer);
    atlasApply = () => {};
    const sheet = document.createElement("div");
    sheet.id = "atlas-sheet";
    for (const [k, v] of Object.entries({
      position: "fixed", inset: "0", zIndex: "9999", overflow: "auto", padding: "16px",
      display: "grid", gridTemplateColumns: `repeat(${big.length ? 3 : 5}, max-content)`, gap: "8px",
      alignContent: "start", background: "var(--bg)",
    })) sheet.style[k] = v;
    document.body.appendChild(sheet);
    const moods = big.length ? big : Object.keys(ATLAS_MOODS);
    for (const mood of moods) {
      const cell = document.createElement("div");
      for (const [k, v] of Object.entries({ display: "grid", justifyItems: "center", gap: "4px", padding: "12px", borderRadius: "12px", background: "var(--card)", border: "1px solid var(--border)" })) cell.style[k] = v;
      const row = document.createElement("div");
      for (const [k, v] of Object.entries({ display: "flex", alignItems: "flex-end", gap: "8px" })) row.style[k] = v;
      const sizes = big.length ? [240, 64, 28, 20] : [104, 48, 28, 16];
      for (const size of sizes) {
        const svg = atlasDraw(size, "calm");
        svg.dataset.atlasMood = mood;
        row.appendChild(svg);
      }
      const label = document.createElement("small");
      label.textContent = mood;
      label.style.color = "var(--ink)";
      cell.append(row, label);
      sheet.appendChild(cell);
    }
    const errors = [];
    for (const svg of sheet.querySelectorAll("svg")) {
      const box = svg.getBoundingClientRect();
      if (!box.width || !box.height) errors.push("zero box");
    }
    return { moods: moods.length, svgs: sheet.querySelectorAll("svg").length, errors };
  }, [big, process.env.ACCENT || ""]);
  await page.waitForTimeout(400);
  const file = `${OUT}/atlas-${theme}${big.length ? "-big" : ""}${process.env.ACCENT ? "-" + process.env.ACCENT.slice(1) : ""}.png`;
  await (await page.$("#atlas-sheet")).screenshot({ path: file });
  console.log(JSON.stringify(info), file);
  await browser.close();
})();
