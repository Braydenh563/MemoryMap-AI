// A close look at one part of Atlas's full drawing: draws it at SIZE px on
// the page's ground and screenshots the crop CROP=x,y,w,h given in the
// drawing's own units (the full level's viewBox is -12 -10 88 110).
//
//   BASE=... SCRATCH=/tmp/x LOOK=feminine SIZE=900 CROP=10,34,44,40 TAG=arms node atlaszoom.js
const { boot } = require("./lib.js");

(async () => {
  const look = process.env.LOOK || "masculine";
  const size = Number(process.env.SIZE || 900);
  const [cx, cy, cw, ch] = (process.env.CROP || "-12,-10,88,110").split(",").map(Number);
  const theme = process.env.THEME || "dark";
  const { page, browser, OUT } = await boot({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
  const box = await page.evaluate(([look, size]) => {
    document.documentElement.dataset.avatarMotion = "off";
    localStorage.setItem("atlas-look", look);
    const ground = document.createElement("div");
    for (const [k, v] of Object.entries({ position: "fixed", left: "0px", top: "0px", width: "1400px", height: "1000px", zIndex: "100", background: "var(--bg)", overflow: "hidden" })) ground.style[k] = v;
    document.body.appendChild(ground);
    const svg = atlasDraw(size, process_mood(), "full");
    function process_mood() { return "calm"; }
    svg.style.position = "absolute"; svg.style.left = "0px"; svg.style.top = "0px";
    ground.appendChild(svg);
    const r = svg.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }, [look, size]);
  // The full level's viewBox: -12 -10 88 110.
  const k = box.h / 110;
  const clip = { x: Math.max(0, (cx + 12) * k), y: Math.max(0, (cy + 10) * k), width: Math.min(1400, cw * k), height: Math.min(1000, ch * k) };
  const out = `${OUT}/atlas-zoom-${look}-${theme}-${process.env.TAG || "part"}.png`;
  await page.screenshot({ path: out, clip });
  console.log(out, JSON.stringify(clip));
  await browser.close();
})();
