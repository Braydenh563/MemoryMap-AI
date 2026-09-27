// Shoots Atlas's large view with only some layers showing (LAYERS, comma
// separated, e.g. neb or neb,back), to see one part of the drawing on its
// own. Writes $SCRATCH/shots/atlas-layer-<look>-<layers>-<TAG>.png.
const { boot } = require("./lib.js");

(async () => {
  const look = process.env.LOOK || "masculine";
  const layers = (process.env.LAYERS || "neb").split(",");
  const { browser, page, OUT } = await boot({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
  await page.evaluate((look) => {
    document.documentElement.dataset.avatarMotion = "off";
    localStorage.setItem("atlas-look", look);
  }, look);
  const box = await page.evaluate((layers) => {
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "100px";
    host.style.top = "100px";
    host.style.width = "64px";
    host.style.height = "92px";
    host.style.scale = "6";
    host.style.transformOrigin = "0 0";
    host.style.zIndex = "99999";
    host.style.background = "white";
    host.appendChild(atlasFigure());
    document.body.appendChild(host);
    for (const svg of host.querySelectorAll("svg.atl-layer")) if (!layers.includes(svg.dataset.atlasLayer)) svg.style.display = "none";
    if (!layers.includes("orbits")) host.querySelector(".atl-orbits")?.remove();
    return { x: 40, y: 40, width: 64 * 6 + 120, height: 92 * 6 + 120 };
  }, layers);
  await page.waitForTimeout(400);
  const file = `${OUT}/atlas-layer-${look}-${layers.join("+")}-${process.env.TAG || "now"}.png`;
  await page.screenshot({ path: file, clip: box });
  console.log(file);
  await browser.close();
})();
