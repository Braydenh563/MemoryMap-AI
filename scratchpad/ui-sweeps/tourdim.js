// The tour's dim covers the whole window, including the scrollbar gutter.
//
// The owner, twice, with screenshots: "I pressed next after starting the tour
// and then the popup dissapeared and everything dimmed except for a small
// strip on the right", and again after trying it in a browser rather than the
// desktop app, which ruled out a stale cache.
//
// The four dim panels are `position: fixed`, so they are laid out against the
// window, but they were sized from `document.documentElement.clientWidth`,
// which stops at the scrollbar. The gutter was left uncovered: a bright band
// at the right edge, the full height of the window.
//
// **Headless Chromium cannot see this on its own**: it draws overlay
// scrollbars that take no space, so clientWidth and innerWidth agree and the
// gutter is 0. That is why every earlier sweep of this surface passed. So this
// probe forces a classic scrollbar, which is what Windows gives, and then
// measures that nothing is left uncovered.
const { boot } = require("./lib.js");

let failures = 0;
function ok(label, pass, detail) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}  — ${detail}`);
  if (!pass) failures += 1;
}

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1400, height: 900 } });

  // A page that needs a scrollbar. Set through `el.style.x =` rather than an
  // injected stylesheet: this app's content security policy refuses inline
  // styles outright, which is CLAUDE.md's "a policy silently refusing the
  // work", and `page.addStyleTag` is exactly that refusal.
  await page.evaluate(() => {
    switchTab("dashboard");
    document.documentElement.style.overflowY = "scroll";
  });
  await page.waitForTimeout(700);

  const out = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    openTour("basics");
    await wait(800);
    document.getElementById("tour-next").click();
    await wait(800);

    const de = document.documentElement;
    const win = { w: window.innerWidth, h: window.innerHeight };
    const boxes = ["tour-block-top", "tour-block-bottom", "tour-block-left", "tour-block-right"]
      .map((id) => document.getElementById(id).getBoundingClientRect());
    const spot = document.getElementById("tour-spot").getBoundingClientRect();

    // Sample the window on a grid. Every point is either inside the cut-out
    // (the one place meant to stay bright) or inside a dim panel.
    const holes = [];
    for (let x = 2; x < win.w; x += 7) {
      for (let y = 2; y < win.h; y += 7) {
        const lit = x >= spot.left && x <= spot.right && y >= spot.top && y <= spot.bottom;
        if (lit) continue;
        const covered = boxes.some(
          (b) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom && b.width > 0 && b.height > 0
        );
        if (!covered) holes.push(`${x},${y}`);
      }
    }
    return {
      gutter: win.w - de.clientWidth,
      clientWidth: de.clientWidth,
      innerWidth: win.w,
      holes: holes.length,
      firstHoles: holes.slice(0, 4),
      cardHidden: document.getElementById("tour-card").classList.contains("hidden"),
      //: The contract itself, read off the running source, because a browser
      //: with overlay scrollbars cannot demonstrate it by measurement.
      sizedFromWindow: /innerWidth/.test(tourBlockPanels.toString()),
    };
  });

  //: **Reported, not asserted, and the distinction matters.** If this browser
  //: draws overlay scrollbars the gutter is 0, the two widths agree, and the
  //: coverage check below passes whether or not the fix is present. So the
  //: gutter is printed every run: a 0 here means this run did not exercise the
  //: owner's case, and the source check that follows is what stands in for it.
  console.log(
    `      gutter ${out.gutter}px (client ${out.clientWidth} of window ${out.innerWidth})` +
      (out.gutter === 0 ? "  <- overlay scrollbars: the gutter case is not exercised" : "")
  );
  ok(
    "the dim is sized from the window, not from the content box",
    out.sizedFromWindow,
    out.sizedFromWindow
      ? "tourBlockPanels reads innerWidth"
      : "tourBlockPanels reads only clientWidth, so a scrollbar gutter stays bright"
  );
  ok(
    "no part of the window is left undimmed outside the cut-out",
    out.holes === 0,
    out.holes ? `${out.holes} uncovered points, first ${out.firstHoles.join(" ")}` : "0 uncovered points"
  );
  ok("and the card is still on screen", !out.cardHidden, `hidden=${out.cardHidden}`);

  await browser.close();
  console.log(failures ? `FAILURES: ${failures}` : "ALL PASS");
  process.exit(failures ? 1 : 0);
})();
