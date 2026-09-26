// What the companion's Atlas figure is made of: nodes by tag and class,
// the animations running on it at rest, and which elements they run on.
// The count behind "455 nodes", and the list behind "what animates".
const { boot } = require("./lib.js");

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1400, height: 900 } });
  const out = await page.evaluate(async () => {
    const b = document.getElementById("avatar-buddy");
    b.value = "atlas";
    b.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 1500));
    const buddy = document.getElementById("nm-buddy");
    if (!buddy) return { buddy: null };
    const svgs = [...buddy.querySelectorAll("svg")];
    const all = [...buddy.querySelectorAll("svg *")];
    const byTag = {};
    for (const el of all) byTag[el.tagName] = (byTag[el.tagName] || 0) + 1;
    const specks = buddy.querySelectorAll("circle.atl-speck, circle.atl-speck-soft").length;
    const anims = buddy.getAnimations({ subtree: true }).map((a) => `${a.animationName || a.constructor.name}@${a.effect?.target?.tagName}.${(a.effect?.target?.getAttribute("class") || "").split(" ").slice(0, 2).join(".")}`);
    const counts = {};
    for (const a of anims) counts[a] = (counts[a] || 0) + 1;
    return { svgs: svgs.length, nodes: all.length, byTag, specks, animations: counts, motion: document.documentElement.dataset.avatarMotion, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
