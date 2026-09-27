// What is painted at points of Atlas's full drawing (in its own units):
// draws it 1100px tall and lists the elements under each point, top first.
// POINTS="x,y;x,y", LOOK.
const { boot } = require("./lib.js");

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1400, height: 1200 } });
  const pts = (process.env.POINTS || "23.4,72").split(";").map((p) => p.split(",").map(Number));
  const r = await page.evaluate(([look, pts]) => {
    document.documentElement.dataset.avatarMotion = "off";
    localStorage.setItem("atlas-look", look);
    const ground = document.createElement("div");
    for (const [k, v] of Object.entries({ position: "fixed", left: "0px", top: "0px", width: "1400px", height: "1200px", zIndex: "100", background: "white" })) ground.style[k] = v;
    document.body.appendChild(ground);
    const svg = atlasDraw(1100, "calm", "full");
    svg.style.position = "absolute"; svg.style.left = "0px"; svg.style.top = "0px";
    ground.appendChild(svg);
    const k = 1100 / 110;
    return pts.map(([x, y]) => {
      const els = document.elementsFromPoint((x + 12) * k, (y + 10) * k).filter((e) => svg.contains(e) && e !== svg).slice(0, 6);
      return `${x},${y}: ` + els.map((e) => {
        const cs = getComputedStyle(e);
        return `${e.tagName}.${e.getAttribute("class")} fill=${cs.fill.slice(0, 30)} stroke=${cs.stroke.slice(0, 24)} sw=${cs.strokeWidth} op=${cs.opacity}`;
      }).join(" | ");
    });
  }, [process.env.LOOK || "masculine", pts]);
  console.log(r.join("\n"));
  await browser.close();
})();
