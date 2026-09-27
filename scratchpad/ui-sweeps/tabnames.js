// Do the tabs keep their names on a laptop? (WORLD_CLASS_PLAN 22.1.3 as the
// coordinator named it, INBOX 430's re-scope: "the desktop that matters is
// a small uni laptop, 1366x768 at 125% = 1093x614 CSS px, and 1280x720".)
// Per size: how many tab captions are drawn, the header's height and rows,
// and the strip's placement. DSF 1.25 for the 125% laptop.
//   SIZES=1093x614@1.25,1280x720,1024x768,820x1180 node scratchpad/ui-sweeps/tabnames.js
const path = require("path");
const { boot } = require("./lib.js");
const TAG = process.env.TAG || "after";
const SIZES = (process.env.SIZES || "1093x614@1.25,1280x720,1366x768,1024x768t,820x1180t").split(",").map((s) => {
  const touch = s.endsWith("t");
  const [dims, dsf] = s.replace(/t$/, "").split("@");
  const [w, h] = dims.split("x").map(Number);
  return { w, h, dsf: Number(dsf || 1), touch };
});
(async () => {
  let fails = 0;
  for (const { w, h, dsf, touch } of SIZES) {
    const { page, browser } = await boot({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => {
      const header = document.getElementById("top-bar");
      const strip = document.getElementById("tab-bar");
      const tabs = [...strip.querySelectorAll('button[role="tab"]')];
      const named = tabs.filter((t) => {
        const label = t.querySelector(".tab-label");
        return label && label.getClientRects().length && label.getBoundingClientRect().width > 4;
      }).length;
      const first = tabs[0].getBoundingClientRect();
      const last = tabs[tabs.length - 1].getBoundingClientRect();
      return {
        named: `${named}/${tabs.length}`,
        header: Math.round(header.getBoundingClientRect().height),
        mode: header.classList.contains("tabs-wrapped") ? "own row" : header.classList.contains("tabs-centred") ? "window" : "gap",
        strip: [Math.round(first.left), Math.round(last.right)],
        offCentre: Math.round((first.left + last.right) / 2 - innerWidth / 2),
      };
    });
    //: A laptop and up keeps every name on one header row; a tablet keeps
    //: them too, on a second row if it must.
    const laptop = !touch && w >= 1000;
    const ok = m.named.startsWith("7/") && (!laptop || m.mode !== "own row");
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${w}x${h}${dsf !== 1 ? "@" + dsf : ""}${touch ? " touch" : ""}: ${JSON.stringify(m)}`);
    await page.screenshot({ path: path.join(__dirname, "..", "shots", "phone430", `tabnames-${TAG}-${w}.png`), clip: { x: 0, y: 0, width: w, height: 140 } });
    await browser.close();
  }
  console.log(fails ? `${fails} FAILED` : "the tabs keep their names");
  process.exit(fails ? 1 : 0);
})();
