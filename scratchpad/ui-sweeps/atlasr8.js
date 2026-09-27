// Atlas round 8's close-ups (the owner's shots: hands, feet, the feminine
// hair's roots, the feminine waist, the nebula): the full drawing at 1100px
// tall, cropped in the drawing's own units, per look, into one sheet.
// Writes $SCRATCH/shots/atlas-r8-<look>-<TAG>.png.
//
//   BASE=... SCRATCH=/tmp/x TAG=before LOOKS=masculine,feminine node atlasr8.js
const { boot } = require("./lib.js");

const CROPS = {
  masculine: [["hand", 39, 49, 12, 11], ["feet", 18, 82, 26, 11], ["waist", 16, 40, 32, 32], ["whole", -12, -10, 88, 110]],
  feminine: [["hand", 34, 38, 24, 22], ["hair root", 10, -4, 48, 36], ["waist", 14, 40, 36, 36], ["whole", -12, -10, 88, 110]],
};

(async () => {
  const tag = process.env.TAG || "now";
  for (const look of (process.env.LOOKS || "masculine,feminine").split(",")) {
    const { page, browser, OUT } = await boot({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 1 });
    const size = 1100;
    await page.evaluate(([look, size]) => {
      document.documentElement.dataset.avatarMotion = "off";
      localStorage.setItem("atlas-look", look);
      const ground = document.createElement("div");
      ground.id = "r8-ground";
      for (const [k, v] of Object.entries({ position: "fixed", left: "0px", top: "0px", width: "1400px", height: "1200px", zIndex: "100", background: "var(--bg)", overflow: "hidden" })) ground.style[k] = v;
      document.body.appendChild(ground);
      const svg = atlasDraw(size, "calm", "full");
      svg.style.position = "absolute"; svg.style.left = "0px"; svg.style.top = "0px";
      ground.appendChild(svg);
    }, [look, size]);
    await page.waitForTimeout(300);
    const k = size / 110;
    const cells = [];
    for (const [name, cx, cy, cw, ch] of CROPS[look]) {
      const clip = { x: Math.max(0, (cx + 12) * k), y: Math.max(0, (cy + 10) * k), width: Math.min(1400, cw * k), height: Math.min(1200, ch * k) };
      const shot = await page.screenshot({ clip });
      cells.push([name, shot.toString("base64"), clip.width / clip.height]);
    }
    await page.evaluate(([cells, title]) => {
      const g = document.getElementById("r8-ground");
      g.replaceChildren();
      g.style.background = "#14151f";
      g.style.padding = "16px";
      g.style.display = "flex";
      g.style.flexWrap = "wrap";
      g.style.gap = "12px";
      g.style.alignItems = "flex-start";
      g.style.color = "#eee";
      g.style.font = "600 15px system-ui";
      const h = document.createElement("div");
      h.textContent = title;
      h.style.width = "100%";
      g.appendChild(h);
      for (const [name, b64, ratio] of cells) {
        const fig = document.createElement("figure");
        fig.style.margin = "0";
        const img = document.createElement("img");
        img.src = `data:image/png;base64,${b64}`;
        img.style.height = name === "whole" ? "560px" : "300px";
        img.style.width = `${(name === "whole" ? 560 : 300) * ratio}px`;
        img.style.display = "block";
        const cap = document.createElement("figcaption");
        cap.textContent = name;
        fig.append(img, cap);
        g.appendChild(fig);
      }
    }, [cells, `Atlas ${look}, ${tag}`]);
    await page.waitForTimeout(400);
    const out = `${OUT}/atlas-r8-${look}-${tag}.png`;
    await page.screenshot({ path: out, fullPage: false });
    console.log(out);
    await browser.close();
  }
})();
