// The top bar's layout mode must be a pure function of the width (INBOX: at
// 1500 it showed tabs-wrapped while 1440 showed tabs-centred, depending on the
// order the window had been resized in). Steps 1024 -> 2560 -> 1024 in 16px
// steps; fails when a width gets two modes, or when the strip is wrapped
// although it fits beside the groups.
//   BASE=http://127.0.0.1:8813 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/topbarmode.js
const { boot } = require("./lib.js");
const STEP = Number(process.env.STEP || 16);
const LO = Number(process.env.LO || 1024), HI = Number(process.env.HI || 2560);
(async () => {
  const { page, browser } = await boot({ viewport: { width: LO, height: 800 } });
  const seen = {}; // width -> {up, down}
  const widths = [];
  for (let w = LO; w <= HI; w += STEP) widths.push(["up", w]);
  for (let w = HI; w >= LO; w -= STEP) widths.push(["down", w]);
  let fails = 0;
  for (const [dir, w] of widths) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.waitForTimeout(120);
    const m = await page.evaluate(() => {
      const h = document.getElementById("top-bar");
      const mode = h.classList.contains("tabs-wrapped") ? "wrapped" : h.classList.contains("tabs-centred") ? "centred" : "gap";
      return { mode, ctl: Math.round(document.querySelector("#top-bar .header-controls").getBoundingClientRect().width), needed: Math.round(tabContentWidth()), space: Math.round(tabRowSpace()), centre: Math.round(tabCentreSpace()) };
    });
    (seen[w] = seen[w] || {})[dir] = m;
    if (process.env.VERBOSE) console.log(dir, w, JSON.stringify(m));
    if (m.mode === "wrapped" && m.needed <= m.space) { fails++; console.log(`FAIL ${dir} ${w}: wrapped though it fits`, JSON.stringify(m)); }
  }
  for (const w of Object.keys(seen)) {
    const s = seen[w];
    if (s.up && s.down && s.up.mode !== s.down.mode) { fails++; console.log(`FAIL ${w}: up=${s.up.mode} down=${s.down.mode}`, JSON.stringify(s)); }
  }
  const modes = {};
  for (const w of Object.keys(seen)) modes[w] = (seen[w].up || seen[w].down).mode;
  let prev = null, from = null, line = [];
  for (const w of Object.keys(modes)) { if (modes[w] !== prev) { if (prev) line.push(`${from}-${w - STEP}: ${prev}`); prev = modes[w]; from = w; } }
  line.push(`${from}-${HI}: ${prev}`);
  console.log(line.join(" | "));
  await browser.close();
  console.log(fails ? `${fails} FAILED` : "the top bar mode depends on the width only");
  process.exit(fails ? 1 : 0);
})();
