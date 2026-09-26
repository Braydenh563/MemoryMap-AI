// atlas.js's tune (window.ATLAS_TUNE, `atlasRetune`): sets values, redraws
// and reports what changed, so the lab's knobs are known to reach the
// drawing. Writes $SCRATCH/shots/atlas-r3-tune.png: the default beside
// a tuned figure.
const { boot } = require("./lib.js");

(async () => {
  const { page, browser, OUT } = await boot({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 2 });
  const out = await page.evaluate(() => {
    document.documentElement.dataset.avatarMotion = "off";
    const errors = [];
    window.addEventListener("error", (e) => errors.push(e.message));
    const torsoOf = (svg) => svg.querySelector(".nmb-torso .atl-skin").getAttribute("d");
    const tailOf = (svg) => svg.querySelector(".atl-tail-swish .atl-skin").getAttribute("d");
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:20px;top:20px;display:flex;gap:40px;background:var(--card);padding:20px;z-index:99";
    document.body.appendChild(host);
    const before = atlasDraw(300, "calm", "full");
    host.appendChild(before);
    const tune = atlasRetune({ bodyWidth: 1.3, headSize: 1.12, tailLength: 1.25, tailCurl: 25, strandOpacity: 0.5, starSize: 1.4, starRays: 8, lockCount: 2, colours: { hi: "#ffffff", md: "#b8c8ff" } });
    const after = atlasDraw(300, "calm", "full");
    host.appendChild(after);
    const same = { torso: torsoOf(before) === torsoOf(after), tail: tailOf(before) === tailOf(after), locks: before.querySelectorAll(".atl-mane .atl-lock").length + " vs " + after.querySelectorAll(".atl-mane .atl-lock").length };
    const rays = after.querySelectorAll(".atl-core-rays").length;
    const vars = ["--atl-tune-head", "--atl-tune-star", "--atl-tune-strand", "--atl-hi"].map((k) => [k, after.style.getPropertyValue(k)]);
    const reset = atlasRetune({ bodyWidth: 1, headSize: 1, tailLength: 1, tailCurl: 0, strandOpacity: 1, starSize: 1, starRays: 4, lockCount: 0, colours: { hi: "", md: "" } });
    const again = atlasDraw(300, "calm", "full");
    return { errors, tune, same, rays, vars, restored: torsoOf(before) === torsoOf(again) && tailOf(before) === tailOf(again), resetHi: reset.colours.hi };
  });
  console.log(JSON.stringify(out, null, 1));
  await page.screenshot({ path: `${OUT}/atlas-r3-tune.png`, clip: { x: 0, y: 0, width: 900, height: 420 } });
  await browser.close();
})();
