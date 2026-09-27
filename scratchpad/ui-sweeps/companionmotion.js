// Round 7 (INBOX 430): "far more lifelike, organic motion and transitions:
// moving between places, changing poses". Moves the companion (Atlas) from
// standing to sitting 320px away and samples, every frame: where it is
// (the host), the character's `scale` (the crouch before it sets off and
// the squash when it lands), and a leg layer's rotation (easing into the
// sitting pose rather than snapping). Exits 1 when it sets off without a
// crouch, lands without a squash, or the leg reaches its new angle in one
// frame. Env: BASE, LOOK (masculine).
const { boot } = require("./lib.js");

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate((look) => {
    localStorage.setItem("atlas-look", look);
    const b = document.getElementById("avatar-buddy");
    b.value = "atlas";
    b.dispatchEvent(new Event("change", { bubbles: true }));
  }, process.env.LOOK || "masculine");
  await page.waitForTimeout(2000);
  const r = await page.evaluate(async () => {
    const buddy = document.getElementById("nm-buddy");
    clearTimeout(nmb.timer);
    nameMarkBuddySchedule = () => {};
    nameMarkBuddyTick = () => {};
    nameMarkBuddyRide(null, 500, 300);
    nameMarkBuddyMoveTo(buddy, { kind: "card", pose: "stand", legs: "", x: 500, y: 300 }, true);
    await new Promise((res) => setTimeout(res, 700));
    const char = buddy.querySelector(".nm-buddy-char");
    const leg = buddy.querySelector(".atl-layer-leg-l");
    const angle = () => {
      const m = new DOMMatrix(getComputedStyle(leg).transform);
      return Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI * 10) / 10;
    };
    const frames = [];
    const t0 = performance.now();
    nameMarkBuddyMoveTo(buddy, { kind: "card", pose: "sit", legs: "", x: 820, y: 300 });
    await new Promise((res) => {
      const tick = () => {
        const b = buddy.getBoundingClientRect();
        const sc = getComputedStyle(char).scale.split(" ").map(Number);
        frames.push({ t: Math.round(performance.now() - t0), x: Math.round(b.left), sy: sc[1] ?? sc[0], angle: leg ? angle() : 0 });
        if (performance.now() - t0 < 1500) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    const sq = nmb.squashAnim;
    frames.info = sq ? { tag: char.tagName, dur: sq.effect.getComputedTiming().duration, kf: sq.effect.getKeyframes().map((k) => [k.computedOffset.toFixed(2), k.scale]), rate: sq.playbackRate } : null;
    return { frames, info: frames.info };
  }).then((o) => { if (process.env.VERBOSE) console.log(JSON.stringify(o.info)); return o.frames; });
  const x0 = r[0].x;
  const started = r.find((f) => Math.abs(f.x - x0) > 2);
  const before = r.filter((f) => !started || f.t < started.t);
  const crouch = Math.min(...before.map((f) => f.sy || 1));
  const arrived = r.find((f) => Math.abs(f.x - r[r.length - 1].x) < 1);
  const after = r.filter((f) => arrived && f.t >= arrived.t - 80);
  const land = Math.min(...after.map((f) => f.sy || 1));
  const angles = [...new Set(r.map((f) => f.angle))];
  if (process.env.VERBOSE) console.log(JSON.stringify(r.slice(0, 16)));
  console.log(`sets off at ${started?.t}ms after a crouch to scaleY ${crouch}; arrives at ${arrived?.t}ms, lands to scaleY ${land}; leg angle passes through ${angles.length} values (${angles[0]} to ${angles[angles.length - 1]})`);
  const bad = !(crouch < 0.97) || !(land < 0.96) || angles.length < 4;
  console.log(bad ? "FAIL" : "PASS");
  process.exitCode = bad ? 1 : 0;
  await browser.close();
})();
