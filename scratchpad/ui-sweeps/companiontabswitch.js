// INBOX 430: "the companion lingers on the old tab for a second, then pops
// in elsewhere". Wanted: hidden with its tab at once, back as it was when
// the person comes straight back, following only after 1.5 to 3s on a new
// tab, and coming in by a walk, a climb or a materialise, never a pop.
// Samples the companion's visibility every frame through: a flick Dashboard
// > Notes > Dashboard inside 600ms, a run of quick switches, and a stay on
// the Library. Exits 1 when it shows on a tab it has not followed to, when
// a flick makes it disappear for longer than the flick, or when it arrives
// with no entrance animation.
const { boot } = require("./lib.js");

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { localStorage.removeItem("nm-buddy-spots"); const b = document.getElementById("avatar-buddy"); b.value = "atlas"; b.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.evaluate(() => switchTab("dashboard"));
  await page.waitForTimeout(3500);
  const state = () => page.evaluate(() => {
    const b = document.getElementById("nm-buddy");
    const cs = getComputedStyle(b);
    return { shown: cs.visibility !== "hidden" && Number(cs.opacity) > 0.05, tab: nmb.tab, away: !!nmb.away, anims: b.getAnimations().map((a) => a.effect?.getKeyframes?.().map((k) => Object.keys(k).filter((p) => !["offset", "easing", "composite", "computedOffset"].includes(p))).flat()).flat() };
  });
  let bad = false;
  //: The app's own Reduce motion switch is kept with the notebook; another
  //: sweep may have left it on, and this one is about the motion.
  //: Performance mode reduces motion too (Auto turns it on for a small
  //: machine, which this sandbox is), so it is set Off here.
  await page.evaluate(() => {
    const t = document.getElementById("reduce-motion-toggle");
    if (t) { t.checked = false; t.dispatchEvent(new Event("change", { bubbles: true })); }
    const perf = document.getElementById("perf-mode");
    if (perf && perf.value !== "off") { perf.value = "off"; perf.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(600);
  console.log("motion:", JSON.stringify(await page.evaluate(() => ({ pm: appearancePref("motion"), perf: appearancePref("perf"), small: smallMachine(), less: lessTransparencyWanted(), still: nameMarkBuddyStill(), noTravel: nameMarkBuddyNoTravel(), avatar: document.documentElement.dataset.avatarMotion, motion: document.documentElement.dataset.motion }))));
  const before = await state();
  console.log("start:", JSON.stringify(before));
  // 1. A flick away and straight back.
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(80);
  const onNotes = await state();
  await page.waitForTimeout(400);
  await page.evaluate(() => switchTab("dashboard"));
  await page.waitForTimeout(80);
  const back = await state();
  console.log("flick: on notes", JSON.stringify(onNotes), "back", JSON.stringify(back));
  if (onNotes.shown || !back.shown || back.tab !== "dashboard") bad = true;
  // 2. Quick switches: it never shows on a tab it has not followed to.
  let shownWhileAway = 0;
  for (const tab of ["notes", "chat", "graph", "timeline", "reminders"]) {
    await page.evaluate((t) => switchTab(t), tab);
    for (let i = 0; i < 5; i += 1) {
      await page.waitForTimeout(100);
      const s = await state();
      if (s.shown) shownWhileAway += 1;
    }
  }
  console.log("quick switches, frames shown on a tab it was not on:", shownWhileAway);
  if (shownWhileAway) bad = true;
  // 3. Stay on the Library: it follows within 1.5 to 3s, with an entrance.
  await page.evaluate(() => switchTab("library"));
  const t0 = Date.now();
  let arrived = null;
  let entrance = [];
  while (Date.now() - t0 < 4500) {
    const s = await page.evaluate(() => {
      const b = document.getElementById("nm-buddy");
      const cs = getComputedStyle(b);
      const anims = b.getAnimations({ subtree: true }).filter((a) => a.playState === "running").map((a) => a.effect?.getKeyframes?.().map((k) => Object.keys(k).filter((p) => ["translate", "opacity", "scale"].includes(p))).flat()).flat();
      return { shown: cs.visibility !== "hidden", tab: nmb.tab, anims: [...new Set(anims)], how: nmb.enteredBy, perch: nmb.perch };
    });
    if (s.shown && s.tab === "library" && arrived === null) {
      arrived = Date.now() - t0;
      entrance = s.anims;
      console.log("entered by", s.how, "to a", s.perch);
    }
    if (arrived !== null) break;
    await page.waitForTimeout(50);
  }
  console.log(`stayed: followed after ${arrived}ms, entering with ${entrance.join("+") || "nothing"}`);
  if (arrived === null || arrived < 1400 || arrived > 3200 || !entrance.length) bad = true;
  console.log(bad ? "FAIL" : "PASS");
  process.exitCode = bad ? 1 : 0;
  await browser.close();
})();
