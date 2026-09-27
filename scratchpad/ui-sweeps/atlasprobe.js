// Where the companion is and what it holds, after the sheet scripts' setup:
// a probe for when a pose render comes back empty.
const { boot } = require("./lib.js");

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  const out = await page.evaluate(() => {
    const errors = [];
    try {
      document.documentElement.dataset.avatarMotion = "off";
      localStorage.setItem("avatar-buddy", "persona");
      syncNameMarkBuddy();
    } catch (e) {
      errors.push("sync: " + e.message);
    }
    const buddy = document.getElementById("nm-buddy");
    if (!buddy) return { buddy: null, errors };
    try {
      buddy.style.left = "660px";
      buddy.style.top = "400px";
      buddy.style.translate = "";
    } catch (e) {
      errors.push("place: " + e.message);
    }
    const r = buddy.getBoundingClientRect();
    const cs = getComputedStyle(buddy);
    return {
      errors,
      rect: [r.x, r.y, r.width, r.height].map(Math.round),
      transform: cs.transform,
      translate: cs.translate,
      position: cs.position,
      display: cs.display,
      opacity: cs.opacity,
      visibility: cs.visibility,
      classes: buddy.className,
      svg: !!buddy.querySelector("svg.nm-atlas"),
      char: buddy.querySelector(".nm-buddy-char") ? getComputedStyle(buddy.querySelector(".nm-buddy-char")).transform : null,
      hasSchedule: typeof nameMarkBuddySchedule,
      hasTick: typeof nameMarkBuddyTick,
      nmb: typeof nmb === "object" ? Object.keys(nmb).slice(0, 12) : typeof nmb,
    };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
