//: Measures the three CSS-and-label facts from this batch that a screenshot
//: cannot settle: the status bar's word and tooltip, the map node icon
//: scaling with its node's own font size, and the grips row sitting above the
//: node rather than in its bottom left corner with the add buttons.
const { boot } = require("./lib.js");

(async () => {
  const { page, browser } = await boot();
  const out = await page.evaluate(() => {
    const guide = document.getElementById("status-guide");
    const host = document.createElement("div");
    host.className = "wb-map-node";
    host.style.fontSize = "40px";
    host.style.position = "relative";
    const icon = document.createElement("i");
    icon.className = "ph ph-star wb-map-node-icon";
    const grips = document.createElement("div");
    grips.className = "wb-map-grips";
    host.append(icon, grips);
    document.body.appendChild(host);
    const iconSize = getComputedStyle(icon).fontSize;
    const gripStyle = getComputedStyle(grips);
    const result = {
      guideWord: guide ? guide.textContent.trim() : null,
      guideTitle: guide ? guide.title : null,
      nodeFont: getComputedStyle(host).fontSize,
      iconFont: iconSize,
      gripTop: gripStyle.top,
      gripBottom: gripStyle.bottom,
      gripLeft: gripStyle.left,
    };
    host.remove();
    return result;
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
