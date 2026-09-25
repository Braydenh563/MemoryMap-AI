// The Atlas avatar where it is worn (atlas.js, `atlasAvatar`): the Atlas
// guide's head, the popup agent's head and Find anything's Atlas row, each
// clipped to its own box while it is open. THEME=dark for dark. Writes
// $SCRATCH/shots/atlas-avatar-<surface>-<theme>.png and says whether each
// box holds the drawing.
//
//   BASE=http://127.0.0.1:8820 SCRATCH=/tmp/x PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlasavatar.js
const { boot } = require("./lib.js");

(async () => {
  const theme = process.env.THEME || "light";
  const { page, browser, OUT } = await boot({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  const out = [];
  const shoot = async (name, sel) => {
    const clip = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const svg = el.querySelector("svg.nm-atlas");
      const b = svg ? svg.getBoundingClientRect() : null;
      return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.width + 16, height: r.height + 16, svg: b ? [Math.round(b.width), Math.round(b.height)] : null };
    }, sel);
    if (!clip) {
      out.push(`${name}: box missing`);
      return;
    }
    const file = `${OUT}/atlas-avatar-${name}-${theme}.png`;
    await page.screenshot({ path: file, clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height } });
    out.push(`${name}: ${clip.svg ? `avatar ${clip.svg.join("x")}px` : "NO avatar"} ${file}`);
  };
  await page.evaluate(() => openHelpChat());
  await page.waitForTimeout(500);
  await shoot("guide", '[data-sheet="guide"] .sheet-head');
  await page.evaluate(() => document.querySelector('[data-sheet="guide"] .sheet-close')?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => toggleAgentPalette());
  await page.waitForTimeout(400);
  await shoot("agent", "#command-palette-overlay .command-palette-head");
  await page.evaluate(() => toggleAgentPalette());
  await page.evaluate(() => openPalette());
  await page.waitForTimeout(300);
  await page.fill("#palette-input", "atlas");
  await page.waitForTimeout(300);
  await shoot("find", "#palette-list");
  console.log(out.join("\n"));
  await browser.close();
})();
