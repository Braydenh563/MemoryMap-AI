// How far Atlas's drawing reaches past the companion's hit shape
// (`nameMarkBuddyShape`) in each pose: the union of the painted layers'
// boxes (the tail and the nebula included) against the shape's union,
// relative to the companion's own x and y. Env: LOOK (masculine).
const { boot } = require("./lib.js");

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate((look) => {
    localStorage.setItem("atlas-look", look);
    const b = document.getElementById("avatar-buddy");
    b.value = "atlas";
    b.dispatchEvent(new Event("change", { bubbles: true }));
  }, process.env.LOOK || "masculine");
  await page.waitForTimeout(1500);
  for (const pose of ["stand", "sit", "hang", "float"]) {
    await page.evaluate((pose) => {
      const buddy = document.getElementById("nm-buddy");
      clearTimeout(nmb.timer);
      nameMarkBuddySchedule = () => {};
      nameMarkBuddyTick = () => {};
      nameMarkBuddyRide(null, 600, 300);
      buddy.dataset.pose = nmb.pose = pose;
      buddy.dataset.legs = "";
      nameMarkBuddyPut(buddy, 600, 300);
    }, pose);
    await page.waitForTimeout(1200);
    const r = await page.evaluate((pose) => {
      const buddy = document.getElementById("nm-buddy");
      const u = { l: 1e9, t: 1e9, r: -1e9, b: -1e9 };
      //: What is painted: the tail and the body, not the nebula's haze.
      for (const el of buddy.querySelectorAll(".atl-layer-tail .atl-tail-core, .atl-layer-tail path, .atl-layer-body .nmb-torso path, .atl-layer-leg-l path, .atl-layer-leg-r path, .atl-layer-lower path")) {
        const b = el.getBoundingClientRect();
        if (!b.width) continue;
        u.l = Math.min(u.l, b.left); u.t = Math.min(u.t, b.top); u.r = Math.max(u.r, b.right); u.b = Math.max(u.b, b.bottom);
      }
      const s = { l: 1e9, t: 1e9, r: -1e9, b: -1e9 };
      for (const p of nameMarkBuddyShape(600, 300, pose, "")) {
        s.l = Math.min(s.l, p.left); s.t = Math.min(s.t, p.top); s.r = Math.max(s.r, p.right); s.b = Math.max(s.b, p.bottom);
      }
      const f = (o) => [o.l - 600, o.t - 300, o.r - 600, o.b - 300].map(Math.round);
      return { drawn: f(u), shape: f(s) };
    }, pose);
    console.log(`${pose}: drawn ${r.drawn} shape ${r.shape} (left, top, right, bottom from x, y)`);
  }
  await browser.close();
})();
