// What draws at the top right of the companion's figure: every element of
// its layers whose box lies above the head line, with its tag, classes,
// layer and computed paint, for a stray mark seen there.
const { boot } = require("./lib.js");

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1400, height: 900 } });
  const out = await page.evaluate(async () => {
    const b = document.getElementById("avatar-buddy");
    b.value = "atlas";
    b.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 1500));
    const buddy = document.getElementById("nm-buddy");
    const box = buddy.getBoundingClientRect();
    const found = [];
    for (const el of buddy.querySelectorAll("svg *")) {
      if (typeof el.getBBox !== "function") continue;
      let r;
      try { r = el.getBoundingClientRect(); } catch (e) { continue; }
      if (r.width === 0 || r.height === 0) continue;
      const cx = r.left + r.width / 2 - box.left;
      const cy = r.top + r.height / 2 - box.top;
      if (cx > 46 && cy < 14 && r.width < 20 && r.height < 20) {
        const cs = getComputedStyle(el);
        found.push({ tag: el.tagName, cls: el.getAttribute("class"), layer: el.closest("svg")?.dataset.atlasLayer, cx: +cx.toFixed(1), cy: +cy.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), fill: cs.fill, stroke: cs.stroke, opacity: cs.opacity, vis: cs.visibility });
      }
    }
    //: And what the browser hits at that spot, whatever it is.
    const hits = [];
    for (const [dx, dy] of [[60, 2], [58, 4], [56, 0], [61, 6]]) {
      for (const el of document.elementsFromPoint(box.left + dx, box.top + dy).slice(0, 4)) {
        const cs = getComputedStyle(el);
        hits.push({ at: [dx, dy], tag: el.tagName, cls: (el.getAttribute("class") || "").slice(0, 60), id: el.id, outline: cs.outlineStyle + " " + cs.outlineColor, border: cs.borderStyle, bg: cs.backgroundColor });
      }
    }
    const children = [...buddy.children].map((el) => `${el.tagName}.${(el.getAttribute("class") || "").slice(0, 50)}`);
    const boxKids = [...(buddy.querySelector(".atl-figure-box")?.children || [])].map((el) => `${el.tagName}.${(el.getAttribute("class") || "").slice(0, 40)}`);
    return { found, hits, children, boxKids };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
