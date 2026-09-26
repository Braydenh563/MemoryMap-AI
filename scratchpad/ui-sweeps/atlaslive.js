// Atlas in the running app: the welcome card (screenshot), moods changing
// every mark in place (not a redraw), the change eased, the loops only on
// screen, still under Avatar animation Off, slower under Reduce motion, and
// the app's own faces (persona picker, dashboard mark) drawing Atlas.
//
//   BASE=http://127.0.0.1:8817 SCRATCH=/tmp/x PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlaslive.js
const { boot } = require("./lib.js");

(async () => {
  const { page, browser, OUT } = await boot({ viewport: { width: 1280, height: 860 } });
  const facts = {};
  // The welcome's first card, as a new person sees it.
  await page.evaluate(() => {
    onboardingIndex = 0;
    document.getElementById("onboarding-overlay").classList.remove("hidden");
    renderOnboardingSlide();
  });
  await page.waitForTimeout(1200);
  const card = await page.$("#onboarding-overlay .modal-card, #onboarding-overlay .card");
  if (card) await card.screenshot({ path: `${OUT}/atlas-welcome.png` });
  facts.welcome = await page.evaluate(() => {
    const svg = document.querySelector("#onboarding-atlas .nm-atlas");
    return svg ? { level: svg.getAttribute("class"), mood: svg.dataset.atlasMood, h: svg.getBoundingClientRect().height, anims: svg.getAnimations({ subtree: true }).length } : null;
  });
  await page.evaluate(() => document.getElementById("onboarding-overlay").classList.add("hidden"));

  facts.surfaces = await page.evaluate(() => {
    const stage = document.createElement("div");
    stage.id = "atl-live";
    for (const [k, v] of Object.entries({ position: "fixed", left: "16px", top: "80px", zIndex: "9999", display: "flex", gap: "8px" })) stage.style[k] = v;
    document.body.appendChild(stage);
    const marks = [nameMarkLive("Atlas", 160), nameMarkLive("Atlas", 46), nameMark("Atlas", 20)];
    stage.append(...marks);
    const off = document.createElement("div");
    off.style.position = "fixed";
    off.style.top = "3000px";
    off.appendChild(nameMark("Atlas", 40));
    document.body.appendChild(off);
    const persona = document.createElement("span");
    fillPersonaMark(persona, aiNameNow(), 20);
    return {
      persona: persona.querySelector(".nm-atlas")?.getAttribute("class"),
      character: characterFor("Atlas").kind,
      moods: characterFor("Atlas").moods.length,
      figure: Boolean(characterFor("Atlas").figure().querySelector(".nm-buddy-head .name-mark .nm-blinks")),
    };
  });
  await page.waitForTimeout(800);
  facts.motion = await page.evaluate(() => {
    const [big, mid, small] = document.querySelectorAll("#atl-live .nm-atlas");
    const offscreen = document.querySelector("[style*='3000px'] .nm-atlas");
    return {
      big: big.getAnimations({ subtree: true }).length,
      mid: mid.getAnimations({ subtree: true }).length,
      small: small.getAnimations({ subtree: true }).length,
      offscreen: offscreen ? offscreen.getAnimations({ subtree: true }).length : null,
    };
  });
  // A mood change: the same element, the new attribute, and a transition
  // running on the parts that moved.
  facts.mood = await page.evaluate(async () => {
    const big = document.querySelector("#atl-live .nm-atlas");
    setAtlasMood("thinking");
    await new Promise((r) => setTimeout(r, 40));
    const running = big.getAnimations({ subtree: true }).filter((a) => a instanceof CSSTransition).length;
    const same = document.querySelector("#atl-live .nm-atlas") === big;
    const all = [...document.querySelectorAll(".nm-atlas")].map((s) => s.dataset.atlasMood);
    setAtlasMood("calm");
    return { same, transitions: running, all: [...new Set(all)] };
  });
  facts.off = await page.evaluate(async () => {
    document.documentElement.dataset.avatarMotion = "off";
    await new Promise((r) => setTimeout(r, 100));
    const n = document.querySelector("#atl-live .nm-atlas").getAnimations({ subtree: true }).filter((a) => a instanceof CSSAnimation).length;
    document.documentElement.dataset.avatarMotion = "always";
    return n;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(200);
  facts.reduced = await page.evaluate(() => {
    const big = document.querySelector("#atl-live .nm-atlas");
    const durations = big.getAnimations({ subtree: true }).map((a) => a.effect.getTiming().duration);
    //: Something that is not a face keeps the global kill.
    const probe = document.createElement("div");
    probe.style.animation = "atl-drift 5s linear infinite";
    document.body.appendChild(probe);
    const other = getComputedStyle(probe).animationDuration;
    probe.remove();
    return { count: durations.length, min: Math.min(...durations), other };
  });
  console.log(JSON.stringify(facts, null, 1));
  await browser.close();
})();
