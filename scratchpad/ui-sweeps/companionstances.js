// INBOX 430: Atlas's stances at rest (arms folded, a hand on the hip for
// the masculine look; clasped hands, a sway for the feminine). Holds each on
// the real companion, shoots it, and counts layouts and paints over 3s of
// the stance held (CDP Performance metrics): a stance, once in, must cost
// nothing a second. Also checks Reduce actions: Off leaves no gesture in
// 400 decisions. Writes $SCRATCH/shots/stance-<name>.png. Exits 1 on a miss.
const { boot } = require("./lib.js");

(async () => {
  let bad = false;
  for (const [look, stances] of [["masculine", ["fold", "hip"]], ["feminine", ["clasp", "sway"]]]) {
    const { browser, page, OUT } = await boot({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
    await page.evaluate((look) => {
      const t = document.getElementById("reduce-motion-toggle");
      if (t) { t.checked = false; t.dispatchEvent(new Event("change", { bubbles: true })); }
      localStorage.setItem("atlas-look", look);
      const b = document.getElementById("avatar-buddy");
      b.value = "atlas";
      b.dispatchEvent(new Event("change", { bubbles: true }));
    }, look);
    await page.waitForTimeout(1500);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    const metric = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
    for (const stance of stances) {
      await page.evaluate((stance) => {
        const buddy = document.getElementById("nm-buddy");
        clearTimeout(nmb.timer);
        nameMarkBuddySchedule = () => {};
        nameMarkBuddyTick = () => {};
        nameMarkBuddyRide(null, 500, 300);
        nameMarkBuddyMoveTo(buddy, { kind: "air", pose: "stand", legs: "", x: 500, y: 300 }, true);
        nameMarkBuddyAct(stance, 60000);
      }, stance);
      await page.waitForTimeout(1200);
      const a = await metric();
      await page.waitForTimeout(3000);
      const b = await metric();
      const layouts = (b.LayoutCount - a.LayoutCount) / 3;
      const r = await page.evaluate(() => {
        const arm = document.querySelector("#nm-buddy .atl-layer-body .nmb-arm-r");
        const box = document.querySelector("#nm-buddy .atl-figure-box");
        return { arm: arm ? getComputedStyle(arm).transform : "none", box: box.getAnimations().map((x) => x.animationName).join(",") };
      });
      const moved = r.arm !== "none" || r.box.includes("atl-stance-sway");
      console.log(`${look} ${stance}: arm ${r.arm.slice(0, 40)}, box ${r.box || "-"}, layouts ${layouts.toFixed(1)}/s`);
      if (!moved || layouts > 0.4) bad = true;
      const clip = await page.evaluate(() => { const r = document.querySelector("#nm-buddy .nm-figure").getBoundingClientRect(); return { x: r.left - 30, y: r.top - 30, width: r.width + 60, height: r.height + 60 }; });
      await page.screenshot({ path: `${OUT}/stance-${look}-${stance}.png`, clip });
    }
    if (look === "masculine") {
      const counts = await page.evaluate(() => {
        localStorage.setItem("avatar-buddy-actions", "off");
        nmb.pose = "stand";
        nmb.cool = {};
        const out = {};
        for (let i = 0; i < 400; i += 1) {
          nmb.lastAct = "";
          const a = nameMarkBuddyDecide();
          out[a] = (out[a] || 0) + 1;
        }
        localStorage.setItem("avatar-buddy-actions", "fewer");
        return out;
      });
      const gestures = Object.entries(counts).filter(([a]) => !NMB_QUIET.includes(a));
      console.log("Reduce actions Off, 400 decisions:", JSON.stringify(counts));
      if (gestures.length) bad = true;
    }
    await browser.close();
  }
  console.log(bad ? "FAIL" : "PASS");
  process.exitCode = bad ? 1 : 0;
})();
const NMB_QUIET = ["blink", "look", "glance", "turn", "yawn", "nap", "dangle", "shift", "fold", "hip", "clasp", "sway"];
